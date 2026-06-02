import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const src = await queryOne<{
    customer_id: number | null; contact_person: string | null;
    valid_until: string | null; currency: string; tax_rate: number;
    notes: string | null; terms: string | null; prepared_by: string | null;
  }>(
    `SELECT customer_id, contact_person, valid_until, currency,
            tax_rate, notes, terms, prepared_by
     FROM quotes WHERE id=$1`,
    [Number(id)]
  );
  if (!src) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const srcItems = await query<{
    sort_order: number; product_code: string | null; description: string;
    quantity: number; unit_price: number; total_price: number;
    cost_price: number | null; margin_pct: number | null; supplier_note: string | null;
  }>(
    "SELECT sort_order, product_code, description, quantity, unit_price, total_price, cost_price, margin_pct, supplier_note FROM quote_items WHERE quote_id=$1 ORDER BY sort_order",
    [Number(id)]
  );

  // Generate new quote_no (same pattern as POST /api/quotes)
  const year = new Date().getFullYear();
  const countRow = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM quotes WHERE quote_no LIKE $1",
    [`TKL-${year}-%`]
  );
  const nextNum = (Number(countRow?.count ?? 0) + 1).toString().padStart(4, "0");
  const newQuoteNo = `TKL-${year}-${nextNum}`;
  const today = new Date().toISOString().split("T")[0];

  // Recalculate totals from items
  let subtotal = 0;
  for (const it of srcItems) subtotal += Number(it.total_price);
  subtotal = parseFloat(subtotal.toFixed(2));
  const taxAmt     = parseFloat((subtotal * (Number(src.tax_rate) / 100)).toFixed(2));
  const grandTotal = parseFloat((subtotal + taxAmt).toFixed(2));

  const newRow = await queryOne<{ id: number }>(
    `INSERT INTO quotes
       (quote_no, customer_id, contact_person, quote_date, valid_until,
        currency, tax_rate, subtotal, tax_amount, total,
        notes, terms, prepared_by, created_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft')
     RETURNING id`,
    [
      newQuoteNo, src.customer_id, src.contact_person,
      today, src.valid_until,
      src.currency, src.tax_rate, subtotal, taxAmt, grandTotal,
      src.notes, src.terms, src.prepared_by ?? session.username, session.id,
    ]
  );
  const newId = newRow!.id;

  for (const it of srcItems) {
    await query(
      `INSERT INTO quote_items
         (quote_id, sort_order, product_code, description, quantity,
          unit_price, total_price, cost_price, margin_pct, supplier_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        newId, it.sort_order, it.product_code, it.description,
        it.quantity, it.unit_price, it.total_price,
        it.cost_price, it.margin_pct, it.supplier_note,
      ]
    );
  }

  return NextResponse.json({ id: newId, quote_no: newQuoteNo });
}
