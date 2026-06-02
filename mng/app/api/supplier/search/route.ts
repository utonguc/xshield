import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const rows = await query<{
    source: string;
    product_code: string;
    title: string;
    price_havale: string | null;
    currency: string;
    stock_status: string | null;
  }>(
    `SELECT source, product_code, title, price_havale, currency, stock_status
     FROM supplier_products
     WHERE (title ILIKE $1 OR product_code ILIKE $1)
       AND stock_status IS NOT NULL
       AND stock_status NOT ILIKE '%yok%'
       AND stock_status != '0'
     ORDER BY
       CASE WHEN product_code ILIKE $2 THEN 0 ELSE 1 END,
       title
     LIMIT 10`,
    [`%${q}%`, `${q}%`]
  );

  return NextResponse.json(rows);
}
