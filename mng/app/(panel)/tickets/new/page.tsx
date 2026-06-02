import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { CategorySelect } from "@/components/CategorySelect";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Yeni Talep — xShield MNG" };
export const dynamic = "force-dynamic";

async function createTicket(fd: FormData) {
  "use server";
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  const rows = await query<{ id: number }>(
    `INSERT INTO tickets (customer_id,category_id,subcategory_id,subject,body,status,priority,source,from_email,from_name)
     VALUES ($1,$2,$3,$4,$5,'open',$6,'manual',$7,$8) RETURNING id`,
    [
      get("customer_id") ? Number(get("customer_id")) : null,
      get("category_id") ? Number(get("category_id")) : null,
      get("subcategory_id") ? Number(get("subcategory_id")) : null,
      get("subject"), get("body"),
      get("priority") || "normal", get("from_email"), get("from_name"),
    ]
  );
  redirect(`/tickets/${rows[0].id}`);
}

export default async function NewTicketPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer: preCustomer } = await searchParams;
  const [customers, rawCats] = await Promise.all([
    query<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE status='active' ORDER BY company_name"
    ),
    query<{ id: number; name: string; color: string; sub_id: number | null; sub_name: string | null }>(
      `SELECT tc.id, tc.name, tc.color, ts.id AS sub_id, ts.name AS sub_name
       FROM ticket_categories tc
       LEFT JOIN ticket_subcategories ts ON ts.category_id=tc.id
       ORDER BY tc.sort_order, tc.name, ts.sort_order, ts.name`
    ),
  ]);
  const categories = Object.values(
    rawCats.reduce<Record<number, { id: number; name: string; color: string; subcategories: { id: number; name: string }[] }>>((acc, r) => {
      if (!acc[r.id]) acc[r.id] = { id: r.id, name: r.name, color: r.color, subcategories: [] };
      if (r.sub_id) acc[r.id].subcategories.push({ id: r.sub_id, name: r.sub_name! });
      return acc;
    }, {})
  );

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="header">
          <Link href="/tickets" className="back">← Destek Talepleri</Link>
          <h1 className="title">Yeni Talep</h1>
        </div>
        <form action={createTicket} className="form">
          <div className="section">
            <div className="grid2">
              <div className="field">
                <label>Müşteri</label>
                <select name="customer_id" defaultValue={preCustomer ?? ""}>
                  <option value="">— Seçiniz (opsiyonel) —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Öncelik</label>
                <select name="priority" defaultValue="normal">
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                  <option value="critical">Kritik</option>
                </select>
              </div>
              <div className="field">
                <label>Gönderen E-posta</label>
                <input name="from_email" type="email" />
              </div>
              <div className="field">
                <label>Gönderen Ad</label>
                <input name="from_name" />
              </div>
            </div>
            {categories.length > 0 && (
              <div className="cat-row">
                <CategorySelect categories={categories} />
              </div>
            )}
            <div className="field full">
              <label>Konu *</label>
              <input name="subject" required />
            </div>
            <div className="field full">
              <label>İçerik</label>
              <textarea name="body" rows={8} />
            </div>
          </div>
          <div className="actions">
            <Link href="/tickets" className="btn-cancel">İptal</Link>
            <button type="submit" className="btn-save">Talep Oluştur</button>
          </div>
        </form>
      </div>
    </>
  );
}

const css = `
.page{padding:28px;max-width:800px}
.header{margin-bottom:24px}
.back{font-size:13px;color:var(--text-dimmer);display:block;margin-bottom:8px}
.back:hover{color:var(--text-muted)}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.form{display:flex;flex-direction:column;gap:24px}
.section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:16px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.field{display:flex;flex-direction:column;gap:6px}
.field.full{grid-column:1/-1}
.field label{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select,.field textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;transition:border-color 0.15s;resize:vertical}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6}
.field select option{background:var(--card)}
.actions{display:flex;justify-content:flex-end;gap:12px}
.btn-cancel{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent}
.btn-save{padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
.cat-row{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cat-row .cat-wrap{display:contents}
`;
