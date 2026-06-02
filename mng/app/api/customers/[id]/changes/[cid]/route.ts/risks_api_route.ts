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
    id: number; title: string; description: string | null; category: string;
    impact: number; likelihood: number; owner: string | null;
    mitigation_plan: string | null; status: string; target_date: string | null;
    closed_at: string | null; created_by: string | null; created_at: string;
  }>(
    `SELECT id,title,description,category,impact,likelihood,owner,mitigation_plan,
            status,target_date,closed_at,created_by,created_at
     FROM customer_risks WHERE customer_id=$1
     ORDER BY (impact*likelihood) DESC, created_at DESC`,
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

  const row = await queryOne<{ id: number }>(
    `INSERT INTO customer_risks (customer_id,title,description,category,impact,likelihood,owner,mitigation_plan,status,target_date,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [Number(id), b.title.trim(), b.description||null, b.category||"other",
     Number(b.impact)||3, Number(b.likelihood)||3, b.owner||null,
     b.mitigation_plan||null, b.status||"open", b.target_date||null, session.username]
  );
  return NextResponse.json({ id: row!.id });
}
