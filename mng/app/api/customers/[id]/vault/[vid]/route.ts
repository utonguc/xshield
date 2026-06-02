import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { encryptPassword } from "@/lib/vault-crypto";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string; vid: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, vid } = await params;
  const b = await req.json();
  if (!b.label?.trim()) return NextResponse.json({ error: "label gerekli" }, { status: 400 });

  if (b.password) {
    const { encrypted, iv, tag } = encryptPassword(b.password);
    await query(
      `UPDATE credential_vaults SET label=$1,category=$2,username=$3,encrypted_pass=$4,
         pass_iv=$5,pass_tag=$6,url=$7,port=$8,notes=$9,updated_at=now()
       WHERE id=$10 AND customer_id=$11`,
      [b.label.trim(), b.category||"other", b.username||null, encrypted, iv, tag,
       b.url||null, b.port?Number(b.port):null, b.notes||null, Number(vid), Number(id)]
    );
  } else {
    await query(
      `UPDATE credential_vaults SET label=$1,category=$2,username=$3,url=$4,port=$5,notes=$6,updated_at=now()
       WHERE id=$7 AND customer_id=$8`,
      [b.label.trim(), b.category||"other", b.username||null,
       b.url||null, b.port?Number(b.port):null, b.notes||null, Number(vid), Number(id)]
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, vid } = await params;
  await query("DELETE FROM credential_vaults WHERE id=$1 AND customer_id=$2", [Number(vid), Number(id)]);
  return NextResponse.json({ ok: true });
}
