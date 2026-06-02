import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const rows = await query(
    `SELECT id, name, category, vendor, license_key, quantity, start_date, end_date,
            cost, currency, auto_renew, notes, created_at
     FROM customer_licenses WHERE customer_id=$1
     ORDER BY CASE WHEN end_date IS NULL THEN 1 ELSE 0 END, end_date ASC`,
    [Number(id)]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "name gerekli" }, { status: 400 });
  const row = await queryOne<{ id: number }>(
    `INSERT INTO customer_licenses
       (customer_id,name,category,vendor,license_key,quantity,start_date,end_date,cost,currency,auto_renew,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [Number(id), b.name.trim(), b.category||"other", b.vendor||null, b.license_key||null,
     Number(b.quantity)||1, b.start_date||null, b.end_date||null,
     b.cost?parseFloat(b.cost):null, b.currency||"TRY", !!b.auto_renew, b.notes||null]
  );
  return NextResponse.json({ id: row!.id });
}
