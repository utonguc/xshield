import { query } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Müşteriler — xShield MNG" };
export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e", inactive: "#64748b", prospect: "#f59e0b", suspended: "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Aktif", inactive: "Pasif", prospect: "Aday", suspended: "Askıya Alındı",
};
const SORT_MAP: Record<string, string> = {
  name:     "c.company_name ASC",
  mrr_desc: "c.monthly_fee DESC NULLS LAST, c.company_name ASC",
  mrr_asc:  "c.monthly_fee ASC NULLS LAST, c.company_name ASC",
  created:  "c.created_at DESC",
  status:   "c.status ASC, c.company_name ASC",
};

function contractWarning(contractEnd: string | null): { label: string; color: string } | null {
  if (!contractEnd) return null;
  const d = Math.ceil((new Date(contractEnd).getTime() - Date.now()) / 86400000);
  if (d < 0)   return { label: `${Math.abs(d)}g bitti`,  color: "#ef4444" };
  if (d <= 14) return { label: `${d}g kaldı`,            color: "#f59e0b" };
  if (d <= 60) return { label: `${d}g kaldı`,            color: "#eab308" };
  return null;
}

type CustRow = {
  id: number; company_name: string; contact_name: string; contact_email: string;
  contact_phone: string; monthly_fee: number; currency: string; status: string;
  city: string; created_at: string; open_tickets: string; contract_end: string | null;
  overdue_count: string;
};

function riskLevel(c: CustRow): "red" | "yellow" | "ok" {
  if (Number(c.overdue_count) > 0) return "red";
  const w = contractWarning(c.contract_end);
  if (w?.color === "#ef4444") return "red";
  if (Number(c.open_tickets) > 2) return "yellow";
  if (w?.color === "#f59e0b" || w?.color === "#eab308") return "yellow";
  return "ok";
}
const RISK_COLOR = { red: "#ef4444", yellow: "#f59e0b", ok: "#22c55e" };
const RISK_TITLE = {
  red:    "Risk: gecikmiş ödeme veya süresi dolmuş sözleşme",
  yellow: "Dikkat: çok açık talep veya yaklaşan sözleşme bitişi",
  ok:     "Sağlıklı",
};
const CUR = { USD: "$", TRY: "₺", EUR: "€" } as Record<string, string>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string; risk?: string }>;
}) {
  const { status, q, sort, risk } = await searchParams;
  const sortExpr = SORT_MAP[sort ?? ""] ?? SORT_MAP.name;

  const [customers, mrrRows] = await Promise.all([
    query<CustRow>(
      `SELECT c.id,c.company_name,c.contact_name,c.contact_email,c.contact_phone,
              c.monthly_fee,c.currency,c.status,c.city,c.created_at,c.contract_end,
         (SELECT COUNT(*) FROM tickets t
          WHERE t.customer_id=c.id AND t.status NOT IN ('resolved','closed'))::text AS open_tickets,
         (SELECT COUNT(*) FROM payments p
          WHERE p.customer_id=c.id AND p.status='pending' AND p.due_date<CURRENT_DATE)::text AS overdue_count
       FROM customers c
       WHERE ($1::text IS NULL OR c.status=$1)
         AND ($2::text IS NULL OR c.company_name ILIKE '%'||$2||'%' OR c.contact_name ILIKE '%'||$2||'%')
       ORDER BY ${sortExpr}`,
      [status || null, q || null]
    ),
    query<{ currency: string; total: string }>(
      `SELECT currency, COALESCE(SUM(monthly_fee),0)::text AS total
       FROM customers WHERE status='active' AND monthly_fee IS NOT NULL
       GROUP BY currency ORDER BY currency`
    ),
  ]);

  const filtered = risk === "1" ? customers.filter(c => riskLevel(c) !== "ok") : customers;
  const mrrText  = mrrRows.filter(r => Number(r.total) > 0)
    .map(r => `${CUR[r.currency] ?? r.currency}${Number(r.total).toLocaleString("tr-TR")}`)
    .join(" / ") || "—";
  const activeCount = customers.filter(c => c.status === "active").length;
  const riskCount   = customers.filter(c => riskLevel(c) !== "ok").length;

  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const base = { status, q, sort, risk, ...overrides };
    Object.entries(base).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/customers${p.toString() ? `?${p}` : ""}`;
  }

  const SORTS = [
    { k: "name",     l: "A-Z"   },
    { k: "mrr_desc", l: "MRR ↓" },
    { k: "mrr_asc",  l: "MRR ↑" },
    { k: "created",  l: "Tarih" },
    { k: "status",   l: "Durum" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="page">

        {/* ── Başlık ── */}
        <div className="header">
          <div>
            <h1 className="title">Müşteriler</h1>
            <div className="mrr-row">
              <span className="mrr-chip">
                <span className="mrr-k">MRR</span>
                <span className="mrr-v">{mrrText}</span>
              </span>
              <span className="mrr-sep">·</span>
              <span className="mrr-chip">
                <span className="mrr-k">Aktif</span>
                <span className="mrr-v">{activeCount}</span>
              </span>
              {riskCount > 0 && (
                <>
                  <span className="mrr-sep">·</span>
                  <Link href={buildHref({ risk: risk === "1" ? undefined : "1" })} className={`risk-chip${risk === "1" ? " active" : ""}`}>
                    {riskCount} riskli
                  </Link>
                </>
              )}
            </div>
          </div>
          <Link href="/customers/new" className="btn-primary">+ Yeni Müşteri</Link>
        </div>

        {/* ── Arama + Filtre ── */}
        <div className="toolbar">
          <form method="GET" className="search-form">
            <input name="q" defaultValue={q} placeholder="Firma veya yetkili ara…" className="search-input" />
            {status && <input type="hidden" name="status" value={status} />}
            {sort   && <input type="hidden" name="sort"   value={sort}   />}
            {risk   && <input type="hidden" name="risk"   value={risk}   />}
          </form>
          <div className="filters">
            {["", "active", "inactive", "prospect", "suspended"].map((s) => (
              <Link key={s}
                href={buildHref({ status: s || undefined })}
                className={`filter-btn${(status === s || (!s && !status)) ? " active" : ""}`}>
                {s ? STATUS_LABEL[s] : "Tümü"}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Sıralama ── */}
        <div className="sort-bar">
          <span className="sort-lbl">Sırala:</span>
          {SORTS.map(({ k, l }) => (
            <Link key={k} href={buildHref({ sort: k === "name" ? undefined : k })}
              className={`sort-btn${(sort === k || (!sort && k === "name")) ? " active" : ""}`}>
              {l}
            </Link>
          ))}
        </div>

        {/* ── Tablo ── */}
        {filtered.length === 0 ? (
          <div className="empty">Müşteri bulunamadı.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="th-dot"></th>
                  <th>Firma</th>
                  <th>Yetkili</th>
                  <th className="hide-sm">Telefon</th>
                  <th>Aylık Ücret</th>
                  <th>Durum</th>
                  <th>Talep</th>
                  <th className="hide-sm">Gecikmiş</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const warn = contractWarning(c.contract_end);
                  const rl   = riskLevel(c);
                  return (
                    <tr key={c.id}>
                      <td className="td-dot">
                        <span className="dot" style={{ background: RISK_COLOR[rl] }} title={RISK_TITLE[rl]} />
                      </td>
                      <td>
                        <Link href={`/customers/${c.id}`} className="company-link">{c.company_name}</Link>
                        {c.city && <span className="city-tag">{c.city}</span>}
                        {warn && (
                          <span className="warn-badge" style={{ color: warn.color, borderColor: `${warn.color}30`, background: `${warn.color}10` }}>
                            {warn.label}
                          </span>
                        )}
                      </td>
                      <td>
                        <div>{c.contact_name || "—"}</div>
                        {c.contact_email && <div className="email-sub">{c.contact_email}</div>}
                      </td>
                      <td className="hide-sm">{c.contact_phone || "—"}</td>
                      <td className="fee">
                        {c.monthly_fee ? `${CUR[c.currency] ?? c.currency}${Number(c.monthly_fee).toLocaleString("tr-TR")}` : "—"}
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}18`, borderColor: `${STATUS_COLOR[c.status]}30` }}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td>
                        {Number(c.open_tickets) > 0
                          ? <Link href={`/tickets?customer=${c.id}`} className="ticket-count">{c.open_tickets} açık</Link>
                          : <span className="dim-val">—</span>}
                      </td>
                      <td className="hide-sm">
                        {Number(c.overdue_count) > 0
                          ? <span className="overdue-badge">{c.overdue_count} gecikmiş</span>
                          : <span className="dim-val">—</span>}
                      </td>
                      <td>
                        <Link href={`/customers/${c.id}`} className="row-action">Detay →</Link>
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
.page{padding:28px}
@media(max-width:640px){.page{padding:16px}}
.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:6px}
.mrr-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mrr-chip{display:flex;align-items:center;gap:5px}
.mrr-k{font-size:11px;color:var(--text-ghost);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.mrr-v{font-size:13px;font-weight:700;color:var(--text-muted)}
.mrr-sep{color:var(--text-ghost);font-size:12px;line-height:1}
.risk-chip{font-size:11px;font-weight:700;padding:2px 10px;border-radius:10px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);transition:background .15s}
.risk-chip:hover,.risk-chip.active{background:rgba(239,68,68,.15)}
.btn-primary{background:#2563eb;color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;white-space:nowrap;flex-shrink:0}
.btn-primary:hover{background:#1d4ed8}
.toolbar{display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap}
.search-form{flex:1;min-width:180px}
.search-input{width:100%;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:9px 14px;color:var(--text);outline:none}
.search-input:focus{border-color:#3b82f6}
.filters{display:flex;gap:6px;flex-wrap:wrap}
.filter-btn{padding:7px 13px;border-radius:7px;font-size:12px;font-weight:600;color:var(--text-dim);border:1px solid transparent;transition:all .15s}
.filter-btn:hover{color:var(--text-muted)}
.filter-btn.active{background:var(--nav-active-bg);color:var(--nav-active-text);border-color:rgba(59,130,246,.2)}
.sort-bar{display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.sort-lbl{font-size:11px;color:var(--text-ghost);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-right:2px}
.sort-btn{padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;color:var(--text-dim);border:1px solid transparent;transition:all .15s}
.sort-btn:hover{color:var(--text-muted)}
.sort-btn.active{background:var(--input-bg);border-color:var(--border2);color:var(--text-sub)}
.empty{padding:48px;text-align:center;color:var(--text-ghost)}
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:auto}
.table{width:100%;border-collapse:collapse;min-width:600px}
.table th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--divider)}
.table td{padding:12px 14px;border-bottom:1px solid var(--row-border);font-size:13px;color:var(--text-sub);vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:var(--row-hover)}
.th-dot,.td-dot{width:28px;padding-left:14px!important;padding-right:4px!important}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0}
.company-link{font-weight:600;color:var(--text-sub)}
.company-link:hover{color:#3b82f6}
.city-tag{font-size:10px;color:var(--text-dimmer);margin-left:6px;background:var(--input-bg);padding:2px 6px;border-radius:4px}
.warn-badge{font-size:10px;font-weight:700;margin-left:6px;padding:2px 6px;border-radius:4px;border:1px solid;white-space:nowrap}
.email-sub{font-size:11px;color:var(--text-dimmer);margin-top:2px}
.fee{font-weight:600;color:var(--text-muted);white-space:nowrap}
.status-badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid;white-space:nowrap}
.ticket-count{font-size:12px;color:#f59e0b;font-weight:600}
.dim-val{color:var(--text-ghost)}
.overdue-badge{font-size:11px;font-weight:700;color:#ef4444;background:rgba(239,68,68,.08);padding:2px 8px;border-radius:5px;border:1px solid rgba(239,68,68,.2);white-space:nowrap}
.row-action{font-size:12px;color:#3b82f6;font-weight:600;white-space:nowrap}
.row-action:hover{text-decoration:underline}
@media(max-width:700px){.hide-sm{display:none}}
`;
