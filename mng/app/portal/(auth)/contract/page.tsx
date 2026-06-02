import { getPortalSession } from "@/lib/portal-auth";
import { query, queryOne } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sözleşmem" };

const CUR: Record<string, string> = { USD: "$", TRY: "₺", EUR: "€" };
function fmt(amount: number | null, currency: string) {
  if (!amount) return "—";
  return `${CUR[currency] ?? currency}${Number(amount).toLocaleString("tr-TR")}`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
function daysLeft(end: string | null): { text: string; color: string } | null {
  if (!end) return null;
  const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)   return { text: `${Math.abs(diff)} gün önce sona erdi`, color: "#ef4444" };
  if (diff <= 30) return { text: `${diff} gün kaldı`, color: "#f59e0b" };
  if (diff <= 90) return { text: `${diff} gün kaldı`, color: "#eab308" };
  return { text: `${diff} gün kaldı`, color: "#22c55e" };
}

type Customer = {
  company_name: string;
  monthly_fee: number | null;
  currency: string;
  billing_day: number | null;
  contract_start: string | null;
  contract_end: string | null;
  service_scope: string | null;
  sla_response_hours: number | null;
  sla_resolution_hours: number | null;
};

type Payment = {
  id: number;
  amount: number;
  currency: string;
  due_date: string;
  paid_date: string | null;
  period: string | null;
  status: string;
  invoice_no: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor", paid: "Ödendi", overdue: "Gecikmiş", cancelled: "İptal",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", paid: "#22c55e", overdue: "#ef4444", cancelled: "#64748b",
};

export default async function PortalContractPage() {
  const session = (await getPortalSession())!;
  const { customer_id, permissions } = session;

  if (!permissions.contract) notFound();

  const [customer, payments] = await Promise.all([
    queryOne<Customer>(
      `SELECT company_name, monthly_fee, currency, billing_day,
              contract_start, contract_end, service_scope,
              sla_response_hours, sla_resolution_hours
       FROM customers WHERE id=$1`,
      [customer_id]
    ),
    query<Payment>(
      `SELECT id, amount, currency, due_date, paid_date, period, status, invoice_no
       FROM payments WHERE customer_id=$1
       ORDER BY due_date DESC LIMIT 24`,
      [customer_id]
    ),
  ]);

  if (!customer) notFound();

  const countdown = daysLeft(customer.contract_end);

  return (
    <>
      <style>{css}</style>

      <div className="page-head">
        <h1 className="page-title">Sözleşme Bilgilerim</h1>
        <p className="page-sub">{session.company_name}</p>
      </div>

      {/* Contract details */}
      <div className="card">
        <div className="card-title">Sözleşme Detayları</div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-lbl">Aylık Ücret</span>
            <span className="info-val fee">{fmt(customer.monthly_fee, customer.currency)}</span>
          </div>
          <div className="info-item">
            <span className="info-lbl">Para Birimi</span>
            <span className="info-val">{customer.currency || "—"}</span>
          </div>
          <div className="info-item">
            <span className="info-lbl">Fatura Günü</span>
            <span className="info-val">{customer.billing_day ? `Her ayın ${customer.billing_day}. günü` : "—"}</span>
          </div>
          <div className="info-item">
            <span className="info-lbl">Sözleşme Başlangıcı</span>
            <span className="info-val">{fmtDate(customer.contract_start)}</span>
          </div>
          <div className="info-item">
            <span className="info-lbl">Sözleşme Bitişi</span>
            <div className="info-val-row">
              <span className="info-val">{fmtDate(customer.contract_end)}</span>
              {countdown && (
                <span className="countdown-badge" style={{ color: countdown.color, borderColor: countdown.color + "40", background: countdown.color + "12" }}>
                  {countdown.text}
                </span>
              )}
            </div>
          </div>
          {(customer.sla_response_hours || customer.sla_resolution_hours) && (
            <div className="info-item">
              <span className="info-lbl">SLA</span>
              <span className="info-val">
                {customer.sla_response_hours ? `İlk yanıt: ${customer.sla_response_hours} saat` : ""}
                {customer.sla_response_hours && customer.sla_resolution_hours ? " · " : ""}
                {customer.sla_resolution_hours ? `Çözüm: ${customer.sla_resolution_hours} saat` : ""}
              </span>
            </div>
          )}
        </div>

        {customer.service_scope && (
          <div className="scope-wrap">
            <div className="scope-lbl">Hizmet Kapsamı</div>
            <div className="scope-body">{customer.service_scope}</div>
          </div>
        )}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="card">
          <div className="card-title">Ödeme Geçmişi</div>
          <div className="payment-list">
            {payments.map((p) => (
              <div key={p.id} className="payment-row">
                <div className="payment-left">
                  <span className="payment-period">{p.period ?? fmtDate(p.due_date)}</span>
                  {p.invoice_no && <span className="invoice-no">#{p.invoice_no}</span>}
                </div>
                <div className="payment-right">
                  <span className="payment-amount">{fmt(p.amount, p.currency)}</span>
                  <span
                    className="payment-status"
                    style={{ color: STATUS_COLOR[p.status] ?? "#64748b", background: (STATUS_COLOR[p.status] ?? "#64748b") + "18" }}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  {p.paid_date && (
                    <span className="paid-date">{fmtDate(p.paid_date)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const css = `
.page-head{margin-bottom:24px}
.page-title{font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px;letter-spacing:-0.3px}
.page-sub{font-size:14px;color:#64748b;margin:0}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px}
.card-title{font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
.info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px 24px;margin-bottom:20px}
.info-item{display:flex;flex-direction:column;gap:4px}
.info-lbl{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}
.info-val{font-size:14px;font-weight:600;color:#1e293b}
.info-val.fee{font-size:18px;color:#3b82f6}
.info-val-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.countdown-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;border:1px solid}
.scope-wrap{border-top:1px solid #f1f5f9;padding-top:18px}
.scope-lbl{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
.scope-body{font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap}
.payment-list{display:flex;flex-direction:column}
.payment-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f8fafc;gap:12px}
.payment-row:last-child{border-bottom:none}
.payment-left{display:flex;align-items:center;gap:10px;min-width:0}
.payment-period{font-size:13px;font-weight:600;color:#1e293b}
.invoice-no{font-size:11px;color:#94a3b8;font-family:monospace;background:#f8fafc;padding:2px 6px;border-radius:4px}
.payment-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.payment-amount{font-size:14px;font-weight:700;color:#1e293b}
.payment-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px}
.paid-date{font-size:11px;color:#94a3b8}
@media(max-width:500px){.info-grid{grid-template-columns:1fr 1fr}.payment-row{flex-direction:column;align-items:flex-start}.payment-right{flex-wrap:wrap}}
`;
