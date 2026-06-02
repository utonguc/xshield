import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string; lid: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, lid } = await params;
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "name gerekli" }, { status: 400 });
  await query(
    `UPDATE customer_licenses SET name=$1,category=$2,vendor=$3,license_key=$4,quantity=$5,
       start_date=$6,end_date=$7,cost=$8,currency=$9,auto_renew=$10,notes=$11,updated_at=now()
     WHERE id=$12 AND customer_id=$13`,
    [b.name.trim(), b.category||"other", b.vendor||null, b.license_key||null,
     Number(b.quantity)||1, b.start_date||null, b.end_date||null,
     b.cost?parseFloat(b.cost):null, b.currency||"TRY", !!b.auto_renew, b.notes||null,
     Number(lid), Number(id)]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, lid } = await params;
  await query("DELETE FROM customer_licenses WHERE id=$1 AND customer_id=$2", [Number(lid), Number(id)]);
  return NextResponse.json({ ok: true });
}
