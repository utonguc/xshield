import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const SOURCES = {
  customers: {
    label: "Müşteriler",
    from: "FROM customers c",
    columns: {
      company_name:   { label: "Şirket Adı",           expr: "c.company_name",  type: "text"   },
      contact_name:   { label: "İletişim Kişisi",       expr: "c.contact_name",  type: "text"   },
      contact_email:  { label: "E-posta",               expr: "c.contact_email", type: "text"   },
      contact_phone:  { label: "Telefon",               expr: "c.contact_phone", type: "text"   },
      city:           { label: "Şehir",                 expr: "c.city",          type: "text"   },
      country:        { label: "Ülke",                  expr: "c.country",       type: "text"   },
      status:         { label: "Durum",                 expr: "c.status",        type: "select" },
      monthly_fee:    { label: "Aylık Ücret",           expr: "c.monthly_fee",   type: "number" },
      currency:       { label: "Para Birimi",           expr: "c.currency",      type: "text"   },
      contract_start: { label: "Sözleşme Başlangıç",   expr: "c.contract_start",type: "date"   },
      contract_end:   { label: "Sözleşme Bitiş",       expr: "c.contract_end",  type: "date"   },
      sla_response_hours:   { label: "SLA Yanıt (saat)",   expr: "c.sla_response_hours",   type: "number" },
      sla_resolution_hours: { label: "SLA Çözüm (saat)",   expr: "c.sla_resolution_hours", type: "number" },
      created_at:     { label: "Kayıt Tarihi",         expr: "c.created_at",    type: "date"   },
    },
  },
  tickets: {
    label: "Talepler",
    from: "FROM tickets t LEFT JOIN customers c ON c.id=t.customer_id LEFT JOIN ticket_categories tc ON tc.id=t.category_id LEFT JOIN ticket_subcategories ts ON ts.id=t.subcategory_id",
    columns: {
      company_name:    { label: "Müşteri",             expr: "c.company_name",                        type: "text"   },
      subject:         { label: "Konu",                expr: "t.subject",                             type: "text"   },
      status:          { label: "Durum",               expr: "t.status",                              type: "select" },
      priority:        { label: "Öncelik",             expr: "t.priority",                            type: "select" },
      category:        { label: "Kategori",            expr: "COALESCE(tc.name,'Kategorisiz')",        type: "text"   },
      subcategory:     { label: "Alt Kategori",        expr: "COALESCE(ts.name,'—')",                 type: "text"   },
      source:          { label: "Kaynak",              expr: "t.source",                              type: "text"   },
      from_email:      { label: "Gönderen E-posta",    expr: "t.from_email",                          type: "text"   },
      created_at:      { label: "Oluşturma Tarihi",    expr: "t.created_at",                          type: "date"   },
      resolved_at:     { label: "Çözüm Tarihi",        expr: "t.resolved_at",                         type: "date"   },
      hours_to_resolve:{ label: "Çözüm Süresi (saat)", expr: "ROUND((EXTRACT(EPOCH FROM (COALESCE(t.resolved_at,now())-t.created_at))/3600)::numeric,1)", type: "number" },
    },
  },
  payments: {
    label: "Ödemeler",
    from: "FROM payments p JOIN customers c ON c.id=p.customer_id",
    columns: {
      company_name: { label: "Müşteri",       expr: "c.company_name", type: "text"   },
      amount:       { label: "Tutar",         expr: "p.amount",       type: "number" },
      currency:     { label: "Para Birimi",   expr: "p.currency",     type: "text"   },
      due_date:     { label: "Vade Tarihi",   expr: "p.due_date",     type: "date"   },
      paid_date:    { label: "Ödeme Tarihi",  expr: "p.paid_date",    type: "date"   },
      status:       { label: "Durum",         expr: "p.status",       type: "select" },
      invoice_no:   { label: "Fatura No",     expr: "p.invoice_no",   type: "text"   },
      period:       { label: "Dönem",         expr: "p.period",       type: "text"   },
      created_at:   { label: "Kayıt Tarihi",  expr: "p.created_at",   type: "date"   },
    },
  },
  quotes: {
    label: "Teklifler",
    from: "FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id",
    columns: {
      quote_no:       { label: "Teklif No",           expr: "q.quote_no",       type: "text"   },
      company_name:   { label: "Müşteri",             expr: "c.company_name",   type: "text"   },
      contact_person: { label: "İlgili Kişi",         expr: "q.contact_person", type: "text"   },
      status:         { label: "Durum",               expr: "q.status",         type: "select" },
      currency:       { label: "Para Birimi",         expr: "q.currency",       type: "text"   },
      subtotal:       { label: "Ara Toplam",          expr: "q.subtotal",       type: "number" },
      tax_amount:     { label: "KDV",                 expr: "q.tax_amount",     type: "number" },
      total:          { label: "Genel Toplam",        expr: "q.total",          type: "number" },
      quote_date:     { label: "Teklif Tarihi",       expr: "q.quote_date",     type: "date"   },
      valid_until:    { label: "Geçerlilik Tarihi",   expr: "q.valid_until",    type: "date"   },
      prepared_by:    { label: "Hazırlayan",          expr: "q.prepared_by",    type: "text"   },
      created_at:     { label: "Oluşturma Tarihi",    expr: "q.created_at",     type: "date"   },
    },
  },
  inventory: {
    label: "Envanter",
    from: "FROM inventory_items i LEFT JOIN customers c ON c.id=i.customer_id",
    columns: {
      company_name:   { label: "Müşteri",             expr: "c.company_name",   type: "text"   },
      name:           { label: "Cihaz Adı",           expr: "i.name",           type: "text"   },
      category:       { label: "Kategori",            expr: "i.category",       type: "text"   },
      brand:          { label: "Marka",               expr: "i.brand",          type: "text"   },
      model:          { label: "Model",               expr: "i.model",          type: "text"   },
      serial_no:      { label: "Seri No",             expr: "i.serial_no",      type: "text"   },
      asset_tag:      { label: "Zimmet No",           expr: "i.asset_tag",      type: "text"   },
      status:         { label: "Durum",               expr: "i.status",         type: "select" },
      purchase_date:  { label: "Satın Alma Tarihi",   expr: "i.purchase_date",  type: "date"   },
      purchase_price: { label: "Satın Alma Fiyatı",   expr: "i.purchase_price", type: "number" },
      warranty_end:   { label: "Garanti Bitiş",       expr: "i.warranty_end",   type: "date"   },
      assigned_date:  { label: "Zimmet Tarihi",       expr: "i.assigned_date",  type: "date"   },
      created_at:     { label: "Kayıt Tarihi",        expr: "i.created_at",     type: "date"   },
    },
  },
  suppliers: {
    label: "Tedarikçi Ürünleri",
    from: "FROM supplier_products sp",
    columns: {
      source:       { label: "Kaynak",            expr: "sp.source",       type: "text"   },
      product_code: { label: "Ürün Kodu",         expr: "sp.product_code", type: "text"   },
      title:        { label: "Ürün Adı",          expr: "sp.title",        type: "text"   },
      category:     { label: "Kategori",          expr: "sp.category",     type: "text"   },
      price_havale: { label: "Havale Fiyatı",     expr: "sp.price_havale", type: "number" },
      price_kk:     { label: "KK Fiyatı",         expr: "sp.price_kk",     type: "number" },
      currency:     { label: "Para Birimi",       expr: "sp.currency",     type: "text"   },
      stock_status: { label: "Stok Durumu",       expr: "sp.stock_status", type: "text"   },
      last_synced:  { label: "Son Güncelleme",    expr: "sp.last_synced",  type: "date"   },
    },
  },
} as const;

type SourceKey = keyof typeof SOURCES;

const ALLOWED_OPS: Record<string, string> = {
  eq: "=", neq: "!=", lt: "<", lte: "<=", gt: ">", gte: ">=",
  like: "ILIKE", nlike: "NOT ILIKE",
  is_null: "IS NULL", is_not_null: "IS NOT NULL",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const sourceKey = sp.get("source") ?? "";
  const cols = sp.getAll("col");
  const filtersRaw = sp.getAll("filter");
  const sortField = sp.get("sort") ?? "";
  const sortDir = sp.get("dir") === "desc" ? "DESC" : "ASC";
  const limitRaw = parseInt(sp.get("limit") ?? "200", 10);
  const limit = Math.min(isNaN(limitRaw) ? 200 : limitRaw, 1000);

  if (!(sourceKey in SOURCES)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const src = SOURCES[sourceKey as SourceKey];
  const colDefs = src.columns as Record<string, { label: string; expr: string; type: string }>;

  // Validate and build SELECT
  const validCols = cols.filter((c) => colDefs[c]);
  const activeCols = validCols.length > 0 ? validCols : Object.keys(colDefs);
  const selectExprs = activeCols.map((c) => `${colDefs[c].expr} AS "${c}"`);

  // Build WHERE
  const params: unknown[] = [];
  const whereClauses: string[] = [];
  for (const f of filtersRaw) {
    const parts = f.split("|");
    if (parts.length < 2) continue;
    const [field, op, ...valueParts] = parts;
    const colDef = colDefs[field];
    const sqlOp = ALLOWED_OPS[op];
    if (!colDef || !sqlOp) continue;
    if (op === "is_null" || op === "is_not_null") {
      whereClauses.push(`${colDef.expr} ${sqlOp}`);
    } else {
      const val = valueParts.join("|");
      if (!val) continue;
      params.push(op === "like" || op === "nlike" ? `%${val}%` : val);
      whereClauses.push(`${colDef.expr} ${sqlOp} $${params.length}`);
    }
  }

  // ORDER BY
  let orderClause = "";
  if (sortField && colDefs[sortField]) {
    orderClause = `ORDER BY ${colDefs[sortField].expr} ${sortDir}`;
  }

  const sql = `
    SELECT ${selectExprs.join(", ")}
    ${src.from}
    ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
    ${orderClause}
    LIMIT ${limit}
  `;

  try {
    const rows = await query(sql, params);
    const columnDefs = Object.fromEntries(
      activeCols.map((c) => [c, colDefs[c]?.label ?? c])
    );
    return NextResponse.json({ source: sourceKey, cols: activeCols, columnDefs, rows, total: rows.length });
  } catch (err: unknown) {
    console.error("[reports/query]", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
