import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const rows = await query<{
    id: number; rfc_no: string; title: string; description: string | null;
    change_type: string; impact: string; urgency: string;
    requestor: string | null; assigned_to: string | null;
    planned_date: string | null; rollback_plan: string | null;
    implementation_notes: string | null; status: string;
    approved_by: string | null; approved_at: string | null;
    completed_at: string | null; created_by: string | null; created_at: string;
  }>(
    `SELECT id,rfc_no,title,description,change_type,impact,urgency,requestor,assigned_to,
            planned_date,rollback_plan,implementation_notes,status,approved_by,approved_at,
            completed_at,created_by,created_at
     FROM change_requests WHERE customer_id=$1
     ORDER BY created_at DESC`,
    [Number(id)]
  );
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await req.json();
  if (!b.title?.trim()) return NextResponse.json({ error: "Başlık zorunlu" }, { status: 400 });

  // Generate RFC number: RFC-YYYY-NNNN
  const year = new Date().getFullYear();
  const countRow = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM change_requests WHERE rfc_no LIKE $1",
    [`RFC-${year}-%`]
  );
  const nextNum = (Number(countRow?.count ?? 0) + 1).toString().padStart(4, "0");
  const rfcNo = `RFC-${year}-${nextNum}`;

  const row = await queryOne<{ id: number }>(
    `INSERT INTO change_requests
       (customer_id,rfc_no,title,description,change_type,impact,urgency,requestor,
        assigned_to,planned_date,rollback_plan,status,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [Number(id), rfcNo, b.title.trim(), b.description||null,
     b.change_type||"normal", b.impact||"medium", b.urgency||"medium",
     b.requestor||null, b.assigned_to||null, b.planned_date||null,
     b.rollback_plan||null, "draft", session.username]
  );
  return NextResponse.json({ id: row!.id, rfc_no: rfcNo });
}
