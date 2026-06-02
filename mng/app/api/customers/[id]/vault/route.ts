import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { encryptPassword } from "@/lib/vault-crypto";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // NEVER return encrypted_pass, iv, tag to the client
  const rows = await query(
    `SELECT id, label, category, username, url, port, notes, created_by, created_at,
            (encrypted_pass IS NOT NULL) AS has_password
     FROM credential_vaults WHERE customer_id=$1 ORDER BY category, label`,
    [Number(id)]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await req.json();
  if (!b.label?.trim()) return NextResponse.json({ error: "label gerekli" }, { status: 400 });

  let enc = null, iv = null, tag = null;
  if (b.password) {
    const r = encryptPassword(b.password);
    enc = r.encrypted; iv = r.iv; tag = r.tag;
  }

  const row = await queryOne<{ id: number }>(
    `INSERT INTO credential_vaults
       (customer_id,label,category,username,encrypted_pass,pass_iv,pass_tag,url,port,notes,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [Number(id), b.label.trim(), b.category||"other", b.username||null,
     enc, iv, tag, b.url||null, b.port?Number(b.port):null, b.notes||null, session.username]
  );
  return NextResponse.json({ id: row!.id });
}
