import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// GET /api/customers/[id]/compliance/[tid]/completions — history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tid } = await params;
  const rows = await query<{
    id: number; completed_by: string; completed_at: string; status: string;
    notes: string | null; evidence_name: string | null; due_date: string | null;
  }>(
    "SELECT id,completed_by,completed_at,status,notes,evidence_name,due_date FROM compliance_completions WHERE task_id=$1 ORDER BY completed_at DESC LIMIT 20",
    [Number(tid)]
  );
  return NextResponse.json(rows);
}

// POST /api/customers/[id]/compliance/[tid]/completions — mark complete
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, tid } = await params;

  let notes: string | null = null;
  let status = "completed";
  let due_date: string | null = null;
  let evidence_name: string | null = null;
  let evidence_path: string | null = null;
  let evidence_size: number | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    notes = (fd.get("notes") as string) || null;
    status = (fd.get("status") as string) || "completed";
    due_date = (fd.get("due_date") as string) || null;
    const file = fd.get("evidence") as File | null;
    if (file && file.size > 0) {
      const dir = path.join(UPLOAD_DIR, "compliance", id);
      await mkdir(dir, { recursive: true });
      const ext = path.extname(file.name);
      const fname = `${randomUUID()}${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, fname), buf);
      evidence_name = file.name;
      evidence_path = path.join("compliance", id, fname);
      evidence_size = file.size;
    }
  } else {
    const body = await req.json();
    notes = body.notes || null;
    status = body.status || "completed";
    due_date = body.due_date || null;
  }

  // Bump next_due_date based on frequency
  const task = await queryOne<{ frequency: string; next_due_date: string | null }>(
    "SELECT frequency, next_due_date FROM compliance_tasks WHERE id=$1",
    [Number(tid)]
  );

  let nextDue: string | null = null;
  if (task) {
    const base = task.next_due_date ? new Date(task.next_due_date) : new Date();
    const d = new Date(base);
    if (task.frequency === "weekly")    d.setDate(d.getDate() + 7);
    else if (task.frequency === "monthly")  d.setMonth(d.getMonth() + 1);
    else if (task.frequency === "quarterly") d.setMonth(d.getMonth() + 3);
    else if (task.frequency === "biannual") d.setMonth(d.getMonth() + 6);
    else if (task.frequency === "annual") d.setFullYear(d.getFullYear() + 1);
    nextDue = d.toISOString().split("T")[0];
    await queryOne("UPDATE compliance_tasks SET next_due_date=$1 WHERE id=$2", [nextDue, Number(tid)]);
  }

  await queryOne(
    `INSERT INTO compliance_completions (task_id,customer_id,completed_by,status,notes,due_date,evidence_name,evidence_path,evidence_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [Number(tid), Number(id), session.username, status, notes, due_date||null,
     evidence_name, evidence_path, evidence_size]
  );
  return NextResponse.json({ ok: true, next_due_date: nextDue });
}
