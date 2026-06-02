import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ödeme Düzenle — xShield MNG" };

async function updatePayment(fd: FormData) {
  "use server";
  const id = fd.get("id");
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  const amount = Number(fd.get("amount"));
  const status = get("status") ?? "pending";

  // Auto-clear paid_date when marking back to pending
  const paidDate = status === "pending" ? null : (get("paid_date") ?? null);

  await query(
    `UPDATE payments SET
       amount=$1, currency=$2, due_date=$3, paid_date=$4,
       period=$5, status=$6, invoice_no=$7, notes=$8
     WHERE id=$9`,
    [amount, get("currency") || "USD", get("due_date"), paidDate,
     get("period"), status, get("invoice_no"), get("notes"), id]
  );
  redirect(`/payments?_toast=${encodeURIComponent("Ödeme güncellendi")}&_tt=success`);
}

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session?.role !== "admin") redirect("/payments");

  const payment = await queryOne<{
    id: number; customer_id: number; company_name: string;
    amount: number; currency: string; due_date: string; paid_date: string | null;
    period: string | null; status: string; invoice_no: string | null; notes: string | null;
  }>(
    `SELECT p.*, c.company_name
     FROM payments p JOIN customers c ON c.id=p.customer_id
     WHERE p.id=$1`, [id]
  );
  if (!payment) notFound();

  const fmtDate = (v: string | null) => {
    if (!v) return "";
    return new Date(v).toISOString().split("T")[0];
  };

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="header">
          <Link href="/payments" className="back">← Ödemeler</Link>
          <h1 className="title">Ödeme Düzenle</h1>
          <div className="company-sub">{payment.company_name}</div>
        </div>

        <form action={updatePayment} className="form">
          <input type="hidden" name="id" value={payment.id} />

          <div className="section">
            <div className="sec-title">Ödeme Bilgileri</div>
            <div className="grid2">
              <div className="field full">
                <label>Müşteri</label>
                <div className="readonly-val">{payment.company_name}</div>
              </div>
              <div className="field">
                <label>Tutar *</label>
                <input name="amount" type="number" step="0.01" min="0"
                  defaultValue={Number(payment.amount)} required />
              </div>
              <div className="field">
                <label>Para Birimi</label>
                <select name="currency" defaultValue={payment.currency}>
                  <option value="USD">USD — $</option>
                  <option value="TRY">TRY — ₺</option>
                  <option value="EUR">EUR — €</option>
                </select>
              </div>
              <div className="field">
                <label>Vade Tarihi *</label>
                <input name="due_date" type="date" defaultValue={fmtDate(payment.due_date)} required />
              </div>
              <div className="field">
                <label>Dönem (ör. 2026-05)</label>
                <input name="period" placeholder="2026-05" defaultValue={payment.period ?? ""} />
              </div>
              <div className="field">
                <label>Durum</label>
                <select name="status" defaultValue={payment.status}>
                  <option value="pending">Bekliyor</option>
                  <option value="paid">Ödendi</option>
                  <option value="cancelled">İptal</option>
                </select>
              </div>
              <div className="field">
                <label>Ödeme Tarihi</label>
                <input name="paid_date" type="date" defaultValue={fmtDate(payment.paid_date)} />
              </div>
              <div className="field">
                <label>Fatura / Makbuz No</label>
                <input name="invoice_no" placeholder="INV-2026-001" defaultValue={payment.invoice_no ?? ""} />
              </div>
              <div className="field full">
                <label>Not</label>
                <textarea name="notes" rows={3} defaultValue={payment.notes ?? ""} />
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/payments" className="btn-cancel">İptal</Link>
            <button type="submit" className="btn-save">Güncelle</button>
          </div>
        </form>
      </div>
    </>
  );
}

const css = `
.page{padding:28px;max-width:640px}
@media(max-width:640px){.page{padding:16px}}
.header{margin-bottom:24px}
.back{font-size:13px;color:var(--text-dimmer);display:block;margin-bottom:8px}
.back:hover{color:var(--text-muted)}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.company-sub{font-size:13px;color:var(--text-muted);margin-top:3px}
.form{display:flex;flex-direction:column;gap:20px}
.section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:22px}
.sec-title{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:480px){.grid2{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:5px}
.field.full{grid-column:1/-1}
.field label{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select,.field textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;transition:border-color 0.15s;resize:vertical}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6}
.readonly-val{padding:10px 12px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;color:var(--text-muted);font-size:13px}
.actions{display:flex;justify-content:flex-end;gap:10px}
.btn-cancel{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent;display:inline-flex;align-items:center}
.btn-save{padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
`;
