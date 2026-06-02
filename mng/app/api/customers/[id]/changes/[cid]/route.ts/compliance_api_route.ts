import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const ALLOWED = ["application/pdf","image/jpeg","image/png","application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

// GET /api/customers/[id]/compliance — list tasks + last completion per task
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const tasks = await query<{
    id: number; title: string; description: string | null; category: string;
    frequency: string; assigned_to: string | null; next_due_date: string | null;
    is_active: boolean; created_at: string;
    last_completed_at: string | null; last_completed_by: string | null;
    last_status: string | null; completion_count: number;
  }>(
    `SELECT t.*,
       (SELECT completed_at FROM compliance_completions WHERE task_id=t.id ORDER BY completed_at DESC LIMIT 1) AS last_completed_at,
       (SELECT completed_by FROM compliance_completions WHERE task_id=t.id ORDER BY completed_at DESC LIMIT 1) AS last_completed_by,
       (SELECT status FROM compliance_completions WHERE task_id=t.id ORDER BY completed_at DESC LIMIT 1) AS last_status,
       (SELECT COUNT(*)::int FROM compliance_completions WHERE task_id=t.id) AS completion_count
     FROM compliance_tasks t
     WHERE t.customer_id=$1
     ORDER BY t.next_due_date ASC NULLS LAST, t.created_at DESC`,
    [Number(id)]
  );
  return NextResponse.json(tasks);
}

// POST /api/customers/[id]/compliance — create task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { title, description, category, frequency, assigned_to, next_due_date } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Başlık zorunlu" }, { status: 400 });

  const row = await queryOne<{ id: number }>(
    `INSERT INTO compliance_tasks (customer_id,title,description,category,frequency,assigned_to,next_due_date,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [Number(id), title.trim(), description||null, category||"other", frequency||"monthly",
     assigned_to||null, next_due_date||null, session.username]
  );
  return NextResponse.json({ id: row!.id });
}
