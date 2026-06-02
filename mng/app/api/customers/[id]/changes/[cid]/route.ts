import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;
  const b = await req.json();

  const now = new Date().toISOString();
  const approved_at = b.status === "approved" ? `(SELECT COALESCE(approved_at, NOW()) FROM change_requests WHERE id=${Number(cid)})` : null;

  await queryOne(
    `UPDATE change_requests
     SET title=$1,description=$2,change_type=$3,impact=$4,urgency=$5,
         requestor=$6,assigned_to=$7,planned_date=$8,rollback_plan=$9,
         implementation_notes=$10,status=$11,
         approved_by=CASE WHEN $11='approved' THEN $12 ELSE approved_by END,
         approved_at=CASE WHEN $11='approved' THEN COALESCE(approved_at,NOW()) ELSE approved_at END,
         completed_at=CASE WHEN $11='completed' THEN COALESCE(completed_at,NOW()) ELSE completed_at END,
         updated_at=NOW()
     WHERE id=$13 AND customer_id=$14`,
    [b.title, b.description||null, b.change_type, b.impact, b.urgency,
     b.requestor||null, b.assigned_to||null, b.planned_date||null,
     b.rollback_plan||null, b.implementation_notes||null, b.status,
     session.username, Number(cid), Number(id)]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;
  await queryOne("DELETE FROM change_requests WHERE id=$1 AND customer_id=$2", [Number(cid), Number(id)]);
  return NextResponse.json({ ok: true });
}
