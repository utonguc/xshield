import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const customerId = searchParams.get("customer_id");
  const rows = await query<{
    id: number; quote_no: string; customer_id: number | null;
    company_name: string | null; contact_person: string | null;
    quote_date: string; valid_until: string | null; status: string;
    currency: string; total: number; created_at: string; prepared_by: string | null;
  }>(
    `SELECT q.id, q.quote_no, q.customer_id, c.company_name, q.contact_person,
            q.quote_date, q.valid_until, q.status, q.currency, q.total,
            q.created_at, q.prepared_by
     FROM quotes q
     LEFT JOIN customers c ON c.id = q.customer_id
     WHERE ($1::text IS NULL OR q.status = $1)
       AND ($2::int IS NULL OR q.customer_id = $2::int)
     ORDER BY q.created_at DESC`,
    [status || null, customerId ? Number(customerId) : null]
  );
  return Response.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  try {
    const body = await req.json();
    const { customer_id, contact_person, quote_date, valid_until,
            currency = "TRY", tax_rate = 20, notes, terms, prepared_by, items = [] } = body;

    const year = new Date().getFullYear();
    const countRow = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM quotes WHERE quote_no LIKE $1",
      [`TKL-${year}-%`]
    );
    const nextNum = (Number(countRow?.count ?? 0) + 1).toString().padStart(4, "0");
    const quoteNo = `TKL-${year}-${nextNum}`;

    let subtotal = 0;
    const processed = (items as any[]).map((item, idx) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const total = parseFloat((qty * price).toFixed(2));
      subtotal += total;
      return { ...item, sort_order: idx, total_price: total };
    });
    subtotal = parseFloat(subtotal.toFixed(2));
    const taxAmt = parseFloat((subtotal * (Number(tax_rate) / 100)).toFixed(2));
    const grandTotal = parseFloat((subtotal + taxAmt).toFixed(2));

    const quoteRow = await queryOne<{ id: number }>(
      `INSERT INTO quotes (quote_no, customer_id, contact_person, quote_date, valid_until,
         currency, tax_rate, subtotal, tax_amount, total, notes, terms, prepared_by, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [quoteNo, customer_id || null, contact_person || null,
       quote_date || new Date().toISOString().split("T")[0],
       valid_until || null, currency, Number(tax_rate),
       subtotal, taxAmt, grandTotal,
       notes || null, terms || null, prepared_by || session.username, session.id]
    );
    const quoteId = quoteRow!.id;

    for (const item of processed) {
      await query(
        `INSERT INTO quote_items (quote_id, sort_order, product_code, description, quantity, unit_price, total_price, cost_price, margin_pct, supplier_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [quoteId, item.sort_order, item.product_code || null,
         item.description || "", Number(item.quantity) || 1,
         Number(item.unit_price) || 0, item.total_price,
         (item.cost_price != null && item.cost_price !== "") ? Number(item.cost_price) : null,
         (item.margin_pct != null && item.margin_pct !== "") ? Number(item.margin_pct) : null,
         item.supplier_note || null]
      );
    }
    return Response.json({ id: quoteId, quote_no: quoteNo }, { status: 201 });
  } catch (err) {
    console.error("[quotes] POST error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
