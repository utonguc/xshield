import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, rid } = await params;
  const b = await req.json();

  const closed_at = b.status === "closed" ? "NOW()" : null;
  await queryOne(
    `UPDATE customer_risks
     SET title=$1,description=$2,category=$3,impact=$4,likelihood=$5,owner=$6,
         mitigation_plan=$7,status=$8,target_date=$9,
         closed_at=CASE WHEN $10='closed' THEN COALESCE(closed_at,NOW()) ELSE NULL END,
         updated_at=NOW()
     WHERE id=$11 AND customer_id=$12`,
    [b.title, b.description||null, b.category, Number(b.impact), Number(b.likelihood),
     b.owner||null, b.mitigation_plan||null, b.status, b.target_date||null,
     b.status, Number(rid), Number(id)]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, rid } = await params;
  await queryOne("DELETE FROM customer_risks WHERE id=$1 AND customer_id=$2", [Number(rid), Number(id)]);
  return NextResponse.json({ ok: true });
}
