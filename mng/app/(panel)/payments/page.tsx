import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { DeleteButton } from "@/components/DeleteButton";

export const metadata: Metadata = { title: "Ödemeler — xShield MNG" };
export const dynamic = "force-dynamic";

/* ─── Server Actions ──────────────────────── */

async function markPaid(fd: FormData) {
  "use server";
  const id = fd.get("id");
  const paidDate = (fd.get("paid_date") as string)?.trim() || new Date().toISOString().split("T")[0];
  const invoiceNo = (fd.get("invoice_no") as string)?.trim() || null;
  await query(
    "UPDATE payments SET status='paid',paid_date=$1,invoice_no=$2 WHERE id=$3",
    [paidDate, invoiceNo, id]
  );
  redirect(`/payments?_toast=${encodeURIComponent("Ödeme kaydedildi")}&_tt=success`);
}

async function addPayment(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  await query(
    `INSERT INTO payments (customer_id,amount,currency,due_date,period,invoice_no,notes,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
    [Number(get("customer_id")), Number(get("amount")),
     get("currency") || "USD", get("due_date"), get("period"),
     get("invoice_no"), get("notes")]
  );
  redirect(`/payments?_toast=${encodeURIComponent("Ödeme eklendi")}&_tt=success`);
}

async function generateMonthly(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;

  const month = (fd.get("month") as string)?.trim();
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return;

  const [yearStr, monStr] = month.split("-");
  const year = Number(yearStr);
  const mon = Number(monStr);
  // new Date(year, mon, 0) gives the last day of month `mon` (1-based)
  const daysInMonth = new Date(year, mon, 0).getDate();

  const result = await query<{ id: number }>(
    `WITH eligible AS (
       SELECT
         c.id                                                          AS customer_id,
         c.monthly_fee                                                 AS amount,
         c.currency,
         make_date($1, $2, LEAST(COALESCE(c.billing_day,1), $3))      AS due_date
       FROM customers c
       WHERE c.status = 'active'
         AND c.monthly_fee IS NOT NULL
         AND c.monthly_fee > 0
         AND NOT EXISTS (
           SELECT 1 FROM payments p WHERE p.customer_id=c.id AND p.period=$4
         )
     )
     INSERT INTO payments (customer_id,amount,currency,due_date,period,status)
     SELECT customer_id, amount, currency, due_date, $4, 'pending' FROM eligible
     RETURNING id`,
    [year, mon, daysInMonth, month]
  );

  const created = result.length;
  redirect(
    `/payments?_toast=${encodeURIComponent(
      created > 0 ? `${created} ödeme oluşturuldu` : "Tüm müşteriler için bu ay zaten ödeme var"
    )}&_tt=${created > 0 ? "success" : "info"}`
  );
}

/* ─── Helpers ─────────────────────────────── */
const CURR_SYM: Record<string, string> = { USD: "$", TRY: "₺", EUR: "€" };
const STATUS_LABEL: Record<string, string> = { paid: "Ödendi", pending: "Bekliyor", overdue: "Gecikmiş", cancelled: "İptal" };
const STATUS_COLOR: Record<string, string> = { paid: "#22c55e", pending: "#f59e0b", overdue: "#ef4444", cancelled: "#64748b" };

function fmtMoney(amount: number, currency: string) {
  const sym = CURR_SYM[currency] ?? currency;
  return `${sym}${Number(amount).toLocaleString("tr-TR")}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Page ────────────────────────────────── */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; customer?: string }>;
}) {
  const { status, customer } = await searchParams;
  const session = await getSession();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [payments, customers, eligibleCount] = await Promise.all([
    query<{
      id: number; customer_id: number; company_name: string;
      amount: number; currency: string; due_date: string;
      paid_date: string | null; period: string | null;
      status: string; invoice_no: string | null; notes: string | null;
    }>(
      `SELECT p.id, p.customer_id, p.amount, p.currency, p.due_date, p.paid_date,
              p.period, p.invoice_no, p.notes, c.company_name,
              CASE WHEN p.status='pending' AND p.due_date<CURRENT_DATE THEN 'overdue'
                   ELSE p.status END AS status
       FROM payments p JOIN customers c ON c.id=p.customer_id
       WHERE ($1::text IS NULL OR
              (CASE WHEN p.status='pending' AND p.due_date<CURRENT_DATE THEN 'overdue'
                    ELSE p.status END)=$1)
         AND ($2::text IS NULL OR p.customer_id=$2::int)
       ORDER BY
         CASE WHEN p.status='pending' AND p.due_date<CURRENT_DATE THEN 0
              WHEN p.status='pending' THEN 1
              ELSE 2 END,
         p.due_date DESC`,
      [status || null, customer || null]
    ),
    query<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE status='active' ORDER BY company_name"
    ),
    session?.role === "admin"
      ? queryOne<{ count: string }>(
          "SELECT COUNT(*)::text AS count FROM customers WHERE status='active' AND monthly_fee>0"
        )
      : Promise.resolve(null),
  ]);

  // Summary totals grouped by currency
  function sumByCurrency(st: string) {
    const map: Record<string, number> = {};
    payments.filter((p) => p.status === st)
      .forEach((p) => { map[p.currency] = (map[p.currency] ?? 0) + Number(p.amount); });
    return Object.entries(map).filter(([, v]) => v > 0)
      .map(([c, v]) => `${CURR_SYM[c] ?? c}${v.toLocaleString("tr-TR")}`).join(" / ") || "—";
  }

  return (
    <>
      <style>{css}</style>
      <div className="page">

        {/* ── Header ── */}
        <div className="page-header">
          <h1 className="title">Ödemeler</h1>
          {session?.role === "admin" && (
            <Link href="#add-form" className="btn-primary">+ Yeni Ödeme</Link>
          )}
        </div>

        {/* ── Summary cards ── */}
        <div className="summary">
          {(["overdue", "pending", "paid"] as const).map((st) => {
            const c = STATUS_COLOR[st];
            return (
              <div key={st} className="sum-card">
                <div className="sum-label" style={{ color: c }}>{STATUS_LABEL[st]}</div>
                <div className="sum-val" style={{ color: c }}>{sumByCurrency(st)}</div>
              </div>
            );
          })}
        </div>

        {/* ── Filters ── */}
        <div className="toolbar">
          <div className="filter-chips">
            {(["", "overdue", "pending", "paid", "cancelled"] as const).map((s) => {
              const active = (status || "") === s;
              const c = s ? STATUS_COLOR[s] : undefined;
              return (
                <Link key={s} href={s ? `/payments?status=${s}` : "/payments"}
                  className={`chip${active ? " chip-active" : ""}`}
                  style={active && c ? { color: c, background: `${c}18`, borderColor: `${c}35` } : {}}>
                  {s === "" ? "Tümü" : STATUS_LABEL[s]}
                </Link>
              );
            })}
          </div>
          <div className="filter-chips">
            <span className="filter-label">Müşteri</span>
            <Link href={status ? `/payments?status=${status}` : "/payments"}
              className={`chip${!customer ? " chip-active" : ""}`}>Tümü</Link>
            {customers.map((c) => (
              <Link key={c.id}
                href={`/payments?${status ? `status=${status}&` : ""}customer=${c.id}`}
                className={`chip${customer === String(c.id) ? " chip-active" : ""}`}>
                {c.company_name}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Auto-generate (admin) ── */}
        {session?.role === "admin" && (
          <details className="panel">
            <summary className="panel-summary">Otomatik Aylık Ödeme Oluştur</summary>
            <div className="panel-body">
              <p className="panel-desc">
                Seçilen ay için, aylık ücreti belirlenmiş tüm aktif müşterilere
                ({eligibleCount?.count ?? 0} müşteri) otomatik olarak bekleyen ödeme kaydı oluşturur.
                Zaten kaydı olan müşteriler atlanır.
              </p>
              <form action={generateMonthly} className="gen-form">
                <input type="month" name="month" defaultValue={currentMonth}
                  className="month-input" required />
                <button type="submit" className="btn-generate">Oluştur</button>
              </form>
            </div>
          </details>
        )}

        {/* ── Add payment form (admin) ── */}
        {session?.role === "admin" && (
          <details className="panel" id="add-form">
            <summary className="panel-summary">+ Yeni Ödeme Ekle</summary>
            <div className="panel-body">
              <form action={addPayment} className="add-form">
                <div className="add-grid">
                  <div className="field">
                    <label>Müşteri *</label>
                    <select name="customer_id" required>
                      <option value="">— Seçiniz —</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Tutar *</label>
                    <input name="amount" type="number" step="0.01" min="0" required />
                  </div>
                  <div className="field">
                    <label>Para Birimi</label>
                    <select name="currency">
                      <option value="USD">USD — $</option>
                      <option value="TRY">TRY — ₺</option>
                      <option value="EUR">EUR — €</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Vade Tarihi *</label>
                    <input name="due_date" type="date" required />
                  </div>
                  <div className="field">
                    <label>Dönem</label>
                    <input name="period" placeholder="2026-05" />
                  </div>
                  <div className="field">
                    <label>Fatura / Makbuz No</label>
                    <input name="invoice_no" placeholder="INV-2026-001" />
                  </div>
                  <div className="field field-notes">
                    <label>Not</label>
                    <input name="notes" />
                  </div>
                </div>
                <button type="submit" className="btn-add">Ekle</button>
              </form>
            </div>
          </details>
        )}

        {/* ── Table ── */}
        {payments.length === 0 ? (
          <div className="empty">Ödeme bulunamadı.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Dönem / Fatura</th>
                  <th>Tutar</th>
                  <th>Vade</th>
                  <th>Ödeme Tarihi</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const sc = STATUS_COLOR[p.status] ?? "#64748b";
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/customers/${p.customer_id}`} className="company-link">
                          {p.company_name}
                        </Link>
                      </td>
                      <td>
                        <span className="period-val">{p.period || "—"}</span>
                        {p.invoice_no && <div className="invoice-val">{p.invoice_no}</div>}
                      </td>
                      <td className="amount-col">{fmtMoney(p.amount, p.currency)}</td>
                      <td className="date-col">{fmtDate(p.due_date)}</td>
                      <td className="date-col">{fmtDate(p.paid_date)}</td>
                      <td>
                        <span className="badge"
                          style={{ color: sc, background: `${sc}18`, borderColor: `${sc}30` }}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="actions-td">
                        <div className="row-actions">
                          {p.status !== "paid" && p.status !== "cancelled" && (
                            <details className="paid-wrap">
                              <summary className="paid-summary">Ödendi İşaretle</summary>
                              <form action={markPaid} className="paid-form">
                                <input type="hidden" name="id" value={p.id} />
                                <div className="paid-field">
                                  <label>Tarih</label>
                                  <input type="date" name="paid_date"
                                    defaultValue={todayStr} className="paid-input" />
                                </div>
                                <div className="paid-field">
                                  <label>Fatura No</label>
                                  <input type="text" name="invoice_no"
                                    placeholder="INV-001" className="paid-input" />
                                </div>
                                <button type="submit" className="paid-save">Kaydet</button>
                              </form>
                            </details>
                          )}
                          <Link href={`/payments/${p.id}/edit`} className="edit-link">
                            Düzenle
                          </Link>
                          {session?.role === "admin" && (
                            <DeleteButton
                              entityId={p.id}
                              label="Sil"
                              confirmMsg="Bu ödeme kaydını silmek istiyor musunuz?"
                              action="/api/payments/delete"
                              redirectTo="/payments"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const css = `
.page{padding:28px;display:flex;flex-direction:column;gap:16px}
@media(max-width:640px){.page{padding:16px;gap:12px}}
.page-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.btn-primary{background:#2563eb;color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;white-space:nowrap}
.btn-primary:hover{background:#1d4ed8}

/* Summary */
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:480px){.summary{grid-template-columns:1fr}}
.sum-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px}
.sum-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px}
.sum-val{font-size:20px;font-weight:800;letter-spacing:-0.3px;word-break:break-all}

/* Filters */
.toolbar{display:flex;flex-direction:column;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.filter-chips{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.filter-label{font-size:10px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.07em;white-space:nowrap;width:52px;flex-shrink:0}
.chip{padding:5px 11px;border-radius:6px;font-size:12px;font-weight:600;color:var(--text-dim);border:1px solid transparent;transition:all 0.12s;text-decoration:none;white-space:nowrap}
.chip:hover{color:var(--text-muted);background:var(--input-bg)}
.chip-active{background:var(--nav-active-bg);color:var(--nav-active-text);border-color:rgba(59,130,246,0.2)}

/* Collapsible panels */
.panel{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.panel-summary{padding:13px 18px;font-size:13px;font-weight:600;color:#3b82f6;cursor:pointer;list-style:none;user-select:none}
.panel-summary::-webkit-details-marker{display:none}
.panel[open] .panel-summary{border-bottom:1px solid var(--divider)}
.panel-body{padding:16px 18px}
.panel-desc{font-size:12px;color:var(--text-dim);margin-bottom:12px;line-height:1.6}

/* Generate form */
.gen-form{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.month-input{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:13px;outline:none}
.month-input:focus{border-color:#3b82f6}
.btn-generate{padding:9px 20px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer;min-height:40px}
.btn-generate:hover{background:#1d4ed8}

/* Add form */
.add-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
@media(max-width:640px){.add-grid{grid-template-columns:1fr 1fr}}
@media(max-width:400px){.add-grid{grid-template-columns:1fr}}
.field-notes{grid-column:span 2}
@media(max-width:640px){.field-notes{grid-column:span 2}}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select{background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:9px 11px;color:var(--text);outline:none;font-size:13px}
.field input:focus,.field select:focus{border-color:#3b82f6}
.btn-add{padding:9px 20px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}

/* Table */
.empty{padding:48px;text-align:center;color:var(--text-ghost);font-size:13px}
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow-x:auto}
.table{width:100%;border-collapse:collapse;min-width:680px}
.table th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--divider);background:var(--input-bg);white-space:nowrap}
.table td{padding:11px 14px;border-bottom:1px solid var(--row-border);font-size:13px;color:var(--text-sub);vertical-align:top}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:var(--row-hover)}
.company-link{font-weight:600;color:var(--text-sub)}
.company-link:hover{color:#3b82f6}
.period-val{font-weight:600;color:var(--text-muted);font-size:13px}
.invoice-val{font-size:11px;color:var(--text-ghost);margin-top:2px;font-family:monospace}
.amount-col{font-weight:800;color:var(--text);white-space:nowrap}
.date-col{color:var(--text-dim);font-size:12px;white-space:nowrap}
.badge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid;white-space:nowrap}

/* Row actions */
.actions-td{vertical-align:top;white-space:nowrap}
.row-actions{display:flex;flex-direction:column;gap:5px;align-items:flex-start}

/* Mark paid inline */
.paid-wrap{}
.paid-summary{font-size:11px;font-weight:700;color:#22c55e;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);padding:4px 10px;border-radius:6px;cursor:pointer;list-style:none;display:inline-block;user-select:none}
.paid-summary::-webkit-details-marker{display:none}
.paid-wrap[open] .paid-summary{border-radius:6px 6px 0 0;margin-bottom:0}
.paid-form{background:var(--card2);border:1px solid var(--border);border-radius:0 6px 6px 6px;padding:10px;display:flex;flex-direction:column;gap:7px;min-width:170px}
.paid-field{display:flex;flex-direction:column;gap:3px}
.paid-field label{font-size:9px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.paid-input{background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;padding:6px 8px;color:var(--text);font-size:12px;outline:none;width:100%}
.paid-input:focus{border-color:#22c55e}
.paid-save{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;background:#22c55e;color:#fff;border:none;cursor:pointer;align-self:flex-start;min-height:32px}
.paid-save:hover{background:#16a34a}

/* Edit / other row links */
.edit-link{font-size:11px;font-weight:600;color:var(--text-dim);padding:4px 8px;border-radius:5px;border:1px solid var(--border2);background:transparent}
.edit-link:hover{color:var(--text);border-color:var(--border)}
`;
