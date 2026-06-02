import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const quote = await queryOne<any>(
    `SELECT q.*, c.company_name, c.contact_email, c.contact_phone, c.address, c.city
     FROM quotes q LEFT JOIN customers c ON c.id = q.customer_id WHERE q.id = $1`,
    [Number(id)]
  );
  if (!quote) return new Response("Not Found", { status: 404 });
  const items = await query<any>(
    "SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY sort_order",
    [Number(id)]
  );
  return Response.json({ ...quote, items });
}

export async function PUT(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const quoteId = Number(id);
  try {
    const body = await req.json();
    const { customer_id, contact_person, quote_date, valid_until, status,
            currency, tax_rate, notes, terms, prepared_by, items = [] } = body;

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

    await query(
      `UPDATE quotes SET customer_id=$1, contact_person=$2, quote_date=$3, valid_until=$4,
         status=$5, currency=$6, tax_rate=$7, subtotal=$8, tax_amount=$9, total=$10,
         notes=$11, terms=$12, prepared_by=$13, updated_at=now() WHERE id=$14`,
      [customer_id || null, contact_person || null, quote_date,
       valid_until || null, status || "draft", currency || "TRY",
       Number(tax_rate) || 20, subtotal, taxAmt, grandTotal,
       notes || null, terms || null, prepared_by || null, quoteId]
    );

    await query("DELETE FROM quote_items WHERE quote_id=$1", [quoteId]);
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
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[quotes] PUT error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  await query("DELETE FROM quotes WHERE id=$1", [Number(id)]);
  return Response.json({ ok: true });
}
