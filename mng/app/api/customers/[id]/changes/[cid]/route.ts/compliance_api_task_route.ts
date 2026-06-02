import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT /api/customers/[id]/compliance/[tid]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, tid } = await params;
  const body = await req.json();
  const { title, description, category, frequency, assigned_to, next_due_date, is_active } = body;

  await queryOne(
    `UPDATE compliance_tasks
     SET title=$1,description=$2,category=$3,frequency=$4,assigned_to=$5,
         next_due_date=$6,is_active=$7
     WHERE id=$8 AND customer_id=$9`,
    [title, description||null, category, frequency, assigned_to||null,
     next_due_date||null, is_active !== false, Number(tid), Number(id)]
  );
  return NextResponse.json({ ok: true });
}

// DELETE /api/customers/[id]/compliance/[tid]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, tid } = await params;
  await queryOne("DELETE FROM compliance_tasks WHERE id=$1 AND customer_id=$2", [Number(tid), Number(id)]);
  return NextResponse.json({ ok: true });
}
