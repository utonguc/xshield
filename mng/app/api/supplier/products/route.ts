import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const search = sp.get("q") ?? "";
  const category = sp.get("cat") ?? "";
  const source = sp.get("source") ?? "";  // "erem" | "bilsam" | "" (all)
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = 60;
  const offset = (page - 1) * limit;

  const conds: string[] = [];
  const params: unknown[] = [];

  if (source) {
    params.push(source);
    conds.push(`source=$${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conds.push(`(product_code ILIKE $${params.length} OR title ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conds.push(`category=$${params.length}`);
  }

  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  const baseWhere = source ? `WHERE source=$1` : "";
  const baseParams = source ? [source] : [];

  const [countRows, products, cats, syncRow, sourceCounts] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM supplier_products ${where}`, params),
    query<Record<string, unknown>>(
      `SELECT id, source, product_code, title, category, price_havale, price_kk, price_vadeli, currency, stock_status, image_url, detail_url, last_synced
       FROM supplier_products ${where} ORDER BY category NULLS LAST, title LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<{ category: string; cnt: string }>(
      `SELECT category, COUNT(*)::text AS cnt FROM supplier_products ${baseWhere ? baseWhere + " AND" : "WHERE"} category IS NOT NULL GROUP BY category ORDER BY category`,
      baseParams
    ),
    query<{ last_synced: string }>(
      `SELECT MAX(last_synced)::text AS last_synced FROM supplier_products ${baseWhere}`,
      baseParams
    ),
    query<{ source: string; cnt: string }>(
      "SELECT source, COUNT(*)::text AS cnt FROM supplier_products GROUP BY source ORDER BY source"
    ),
  ]);

  const total = parseInt(countRows[0]?.count ?? "0");
  return NextResponse.json({
    products,
    total,
    page,
    pages: Math.ceil(total / limit),
    categories: cats.map(c => ({ name: c.category, count: parseInt(c.cnt) })),
    lastSynced: syncRow[0]?.last_synced ?? null,
    sourceCounts: Object.fromEntries(sourceCounts.map(r => [r.source, parseInt(r.cnt)])),
  });
}
