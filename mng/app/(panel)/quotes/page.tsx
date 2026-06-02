import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import CopyQuoteBtn from "./CopyQuoteBtn";

export const metadata: Metadata = { title: "Teklifler — xShield MNG" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak", sent: "Gönderildi", accepted: "Onaylandı",
  rejected: "Reddedildi", expired: "Süresi Doldu",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#64748b", sent: "#3b82f6", accepted: "#22c55e",
  rejected: "#ef4444", expired: "#f59e0b",
};
const CUR_SYM: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function fmt(n: number, cur: string) {
  return `${CUR_SYM[cur] ?? cur}${Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

type Row = {
  id: number; quote_no: string; company_name: string | null;
  contact_person: string | null; quote_date: string;
  valid_until: string | null; status: string;
  currency: string; total: number; created_at: string; prepared_by: string | null;
};

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { status, q } = await searchParams;

  const [quotes, totals] = await Promise.all([
    query<Row>(
      `SELECT q.id, q.quote_no, c.company_name, q.contact_person, q.quote_date,
              q.valid_until, q.status, q.currency, q.total, q.created_at, q.prepared_by
       FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id
       WHERE ($1::text IS NULL OR q.status=$1)
         AND ($2::text IS NULL OR
              q.quote_no ILIKE '%'||$2||'%' OR
              c.company_name ILIKE '%'||$2||'%' OR
              q.contact_person ILIKE '%'||$2||'%')
       ORDER BY q.created_at DESC`,
      [status || null, q || null]
    ),
    query<{ status: string; total_sum: string; cnt: string }>(
      `SELECT status,
              COALESCE(SUM(total),0)::text AS total_sum,
              COUNT(*)::text AS cnt
       FROM quotes GROUP BY status`
    ),
  ]);

  const totalMap: Record<string, { sum: number; cnt: number }> = {};
  for (const r of totals) totalMap[r.status] = { sum: Number(r.total_sum), cnt: Number(r.cnt) };

  function buildHref(ov: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const base = { status, q, ...ov };
    Object.entries(base).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/quotes${p.toString() ? `?${p}` : ""}`;
  }

  return (
    <>
      <style>{css}</style>
      <div className="page">

        <div className="header">
          <div>
            <h1 className="title">Teklifler</h1>
            <div className="subtitle">Fiyat tekliflerini oluşturun, düzenleyin ve gönderin</div>
          </div>
          <Link href="/quotes/new" className="btn-new">+ Yeni Teklif</Link>
        </div>

        {/* Summary chips */}
        <div className="chips-row">
          {(["draft","sent","accepted","rejected","expired"] as const).filter(s => totalMap[s]).map(s => {
            const col = STATUS_COLOR[s];
            const active = status === s;
            return (
              <Link key={s} href={buildHref({ status: active ? undefined : s })}
                className="chip" style={{
                  color: active ? col : "var(--text-dim)",
                  background: active ? `${col}15` : "var(--card)",
                  borderColor: active ? `${col}40` : "var(--border)",
                }}>
                <span className="chip-label">{STATUS_LABEL[s]}</span>
                <span className="chip-count">{totalMap[s].cnt}</span>
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form method="GET" className="search-form">
          <input name="q" defaultValue={q} placeholder="Teklif no, firma veya ilgili kişi ara…" className="search-input" />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        {quotes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📄</div>
            <div>Teklif bulunamadı</div>
            <Link href="/quotes/new" className="btn-new" style={{ marginTop: 12, display: "inline-flex" }}>İlk Teklifi Oluştur</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Teklif No</th>
                  <th>Müşteri</th>
                  <th className="hide-sm">İlgili Kişi</th>
                  <th>Tarih</th>
                  <th className="hide-sm">Geçerlilik</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th className="hide-sm">Hazırlayan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const sc = STATUS_COLOR[q.status] ?? "#64748b";
                  const isExpired = !q.valid_until
                    ? false
                    : q.status === "sent" && new Date(q.valid_until) < new Date();
                  return (
                    <tr key={q.id}>
                      <td>
                        <Link href={`/quotes/${q.id}`} className="quote-no">{q.quote_no}</Link>
                      </td>
                      <td>
                        <span className="company">{q.company_name || <span style={{ color: "var(--text-ghost)" }}>—</span>}</span>
                      </td>
                      <td className="hide-sm dim-val">{q.contact_person || "—"}</td>
                      <td className="dim-val">{fmtDate(q.quote_date)}</td>
                      <td className={`hide-sm ${isExpired ? "expired-val" : "dim-val"}`}>
                        {fmtDate(q.valid_until)}{isExpired ? " ⚠" : ""}
                      </td>
                      <td className="amount">{fmt(q.total, q.currency)}</td>
                      <td>
                        <span className="badge" style={{ color: sc, background: `${sc}15`, borderColor: `${sc}35` }}>
                          {STATUS_LABEL[q.status] ?? q.status}
                        </span>
                      </td>
                      <td className="hide-sm dim-val">{q.prepared_by || "—"}</td>
                      <td>
                        <div className="row-btns">
                          <Link href={`/quotes/${q.id}`} className="row-btn">Görüntüle</Link>
                          <Link href={`/quotes/${q.id}/edit`} className="row-btn">Düzenle</Link>
                          <CopyQuoteBtn quoteId={q.id} />
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
.page { padding:28px; display:flex; flex-direction:column; gap:16px; }
@media(max-width:640px) { .page { padding:16px; gap:12px; } }
.header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.title { font-size:22px; font-weight:800; color:var(--text); letter-spacing:-0.5px; }
.subtitle { font-size:12px; color:var(--text-dim); margin-top:3px; }
.btn-new { background:#2563eb; color:#fff; padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
.btn-new:hover { background:#1d4ed8; }
.chips-row { display:flex; gap:8px; flex-wrap:wrap; }
.chip { display:flex; align-items:center; gap:7px; padding:7px 14px; border-radius:8px; border:1px solid; font-size:12px; font-weight:600; transition:all 0.12s; text-decoration:none; }
.chip:hover { filter:brightness(1.1); }
.chip-label {}
.chip-count { font-size:10px; font-weight:800; padding:1px 6px; border-radius:99px; background:rgba(255,255,255,0.08); }
.search-form {}
.search-input { width:100%; max-width:400px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:8px; padding:9px 14px; color:var(--text); outline:none; font-size:13px; }
.search-input:focus { border-color:#3b82f6; }
.empty { padding:64px 24px; text-align:center; color:var(--text-ghost); font-size:14px; display:flex; flex-direction:column; align-items:center; gap:8px; }
.empty-icon { font-size:40px; margin-bottom:4px; }
.table-wrap { background:var(--card); border:1px solid var(--border); border-radius:12px; overflow:auto; }
.table { width:100%; border-collapse:collapse; min-width:620px; }
.table th { padding:10px 14px; text-align:left; font-size:10px; font-weight:700; color:var(--text-dimmer); text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--divider); background:var(--input-bg); white-space:nowrap; }
.table td { padding:11px 14px; border-bottom:1px solid var(--row-border); font-size:13px; vertical-align:middle; }
.table tr:last-child td { border-bottom:none; }
.table tr:hover td { background:var(--row-hover); }
.quote-no { font-weight:700; color:#3b82f6; font-family:monospace; font-size:13px; }
.quote-no:hover { text-decoration:underline; }
.company { font-weight:600; color:var(--text-sub); }
.dim-val { color:var(--text-dim); font-size:12px; }
.expired-val { color:#f59e0b; font-size:12px; font-weight:600; }
.amount { font-weight:800; color:var(--text); white-space:nowrap; }
.badge { font-size:10px; font-weight:700; padding:3px 9px; border-radius:6px; border:1px solid; white-space:nowrap; }
.row-btns { display:flex; gap:6px; }
.row-btn { font-size:11px; font-weight:600; color:var(--text-dim); padding:4px 10px; border-radius:6px; border:1px solid var(--border2); white-space:nowrap; }
.row-btn:hover { color:var(--text); border-color:var(--border); }
@media(max-width:700px) { .hide-sm { display:none; } }
`;
