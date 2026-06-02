import { query, queryOne } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kontrol Paneli — xShield MNG" };
export const dynamic = "force-dynamic";

const TICKET_STATUS_LABEL: Record<string, string> = {
  open: "Açık", in_progress: "İşlemde", waiting_customer: "Müş. Bekleniyor",
  resolved: "Çözüldü", closed: "Kapalı",
};
const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f59e0b", normal: "#3b82f6", low: "#64748b",
};
const STATUS_COLOR: Record<string, string> = {
  open: "#3b82f6", in_progress: "#f59e0b", waiting_customer: "#a78bfa",
  resolved: "#22c55e", closed: "#475569",
};
const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: "Taslak", sent: "Gönderildi", accepted: "Onaylandı",
  rejected: "Reddedildi", expired: "Süresi Doldu",
};
const QUOTE_STATUS_COLOR: Record<string, string> = {
  draft: "#64748b", sent: "#3b82f6", accepted: "#22c55e",
  rejected: "#ef4444", expired: "#f59e0b",
};
const CURR_SYM: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function fmtMoney(n: number | string, cur: string) {
  return `${CURR_SYM[cur] ?? cur}${Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtAmounts(rows: { currency: string; total: string }[]) {
  return rows.filter(r => Number(r.total) > 0)
    .map(r => `${CURR_SYM[r.currency] ?? r.currency}${Number(r.total).toLocaleString("tr-TR")}`)
    .join(" + ") || "—";
}
function payLabel(s: string) {
  return s === "paid" ? "Ödendi" : s === "overdue" ? "Gecikmiş" : "Bekliyor";
}
function payBadgeColor(s: string) {
  return s === "paid" ? "#22c55e" : s === "overdue" ? "#ef4444" : "#f59e0b";
}
function daysAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return "bugün";
  if (diff === 1) return "dün";
  return `${diff}g önce`;
}
function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}g gecikmiş`, color: "#ef4444" };
  if (diff === 0) return { label: "bugün", color: "#f59e0b" };
  if (diff <= 7) return { label: `${diff}g kaldı`, color: "#f59e0b" };
  return { label: `${diff}g kaldı`, color: "#22c55e" };
}

const MONTHS_TR = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

export default async function DashboardPage() {
  const now = new Date();
  const todayStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const [
    activeCustomers,
    openTickets,
    overduePayments,
    paidThisMonth,
    resolvedThisMonth,
    pendingQuotes,
    recentTickets,
    upcomingPayments,
    recentQuotes,
    contractExpiry,
    ticketStatusBreakdown,
    monthlyRevenue,
  ] = await Promise.all([
    query<{ count: string }>("SELECT COUNT(*) AS count FROM customers WHERE status='active'"),
    query<{ count: string; priority: string }>(
      "SELECT priority, COUNT(*) AS count FROM tickets WHERE status NOT IN ('resolved','closed') GROUP BY priority ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END"
    ),
    query<{ currency: string; count: string; total: string }>(
      "SELECT currency, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM payments WHERE status='pending' AND due_date < CURRENT_DATE GROUP BY currency ORDER BY currency"
    ),
    query<{ currency: string; total: string }>(
      "SELECT currency, COALESCE(SUM(amount),0) AS total FROM payments WHERE status='paid' AND to_char(paid_date,'YYYY-MM')=to_char(now(),'YYYY-MM') GROUP BY currency ORDER BY currency"
    ),
    query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM tickets WHERE status IN ('resolved','closed') AND to_char(updated_at,'YYYY-MM')=to_char(now(),'YYYY-MM')"
    ),
    query<{ count: string; total_try: string; total_usd: string; total_eur: string }>(
      `SELECT COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN currency='TRY' THEN total ELSE 0 END),0) AS total_try,
         COALESCE(SUM(CASE WHEN currency='USD' THEN total ELSE 0 END),0) AS total_usd,
         COALESCE(SUM(CASE WHEN currency='EUR' THEN total ELSE 0 END),0) AS total_eur
       FROM quotes WHERE status IN ('draft','sent')`
    ),
    query<{ id: number; subject: string; status: string; priority: string; company_name: string; created_at: string }>(
      `SELECT t.id,t.subject,t.status,t.priority,t.created_at,
              COALESCE(c.company_name,t.from_email,'—') AS company_name
       FROM tickets t LEFT JOIN customers c ON c.id=t.customer_id
       ORDER BY t.created_at DESC LIMIT 7`
    ),
    query<{ id: number; company_name: string; amount: number; currency: string; due_date: string; status: string }>(
      `SELECT p.id, c.company_name, p.amount, p.currency, p.due_date,
              CASE WHEN p.status='pending' AND p.due_date<CURRENT_DATE THEN 'overdue' ELSE p.status END AS status
       FROM payments p JOIN customers c ON c.id=p.customer_id
       WHERE p.status='pending'
       ORDER BY p.due_date ASC LIMIT 7`
    ),
    query<{ id: number; quote_no: string; company_name: string | null; total: number; currency: string; status: string; created_at: string }>(
      `SELECT q.id, q.quote_no, c.company_name, q.total, q.currency, q.status, q.created_at
       FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id
       ORDER BY q.created_at DESC LIMIT 7`
    ),
    query<{ id: number; company_name: string; contract_end: string }>(
      `SELECT id, company_name, contract_end FROM customers
       WHERE status='active' AND contract_end IS NOT NULL
         AND contract_end <= CURRENT_DATE + INTERVAL '60 days'
       ORDER BY contract_end LIMIT 6`
    ),
    query<{ status: string; count: string }>(
      "SELECT status, COUNT(*) AS count FROM tickets GROUP BY status"
    ),
    query<{ ym: string; mo: number; try_total: string; usd_total: string }>(
      `SELECT to_char(paid_date,'YYYY-MM') AS ym,
              EXTRACT(MONTH FROM paid_date)::int AS mo,
              COALESCE(SUM(CASE WHEN currency='TRY' THEN amount ELSE 0 END),0) AS try_total,
              COALESCE(SUM(CASE WHEN currency='USD' THEN amount ELSE 0 END),0) AS usd_total
       FROM payments
       WHERE status='paid'
         AND paid_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
       GROUP BY ym, mo ORDER BY ym`
    ),
  ]);

  // ── KPI computations ──────────────────────────────────────────────────────
  const totalOpenTickets = openTickets.reduce((s, r) => s + Number(r.count), 0);
  const overdueCount = overduePayments.reduce((s, r) => s + Number(r.count), 0);
  const pendingQuoteCount = Number(pendingQuotes[0]?.count ?? 0);

  // Build last 6 months for chart (fill missing months with 0)
  const chartMonths: { label: string; try_total: number; usd_total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const found = monthlyRevenue.find(r => r.ym === ym);
    chartMonths.push({
      label: MONTHS_TR[d.getMonth()],
      try_total: Number(found?.try_total ?? 0),
      usd_total: Number(found?.usd_total ?? 0),
    });
  }
  const chartMax = Math.max(...chartMonths.map(m => m.try_total), 1);

  // Ticket status totals for pipeline
  const ticketTotal = ticketStatusBreakdown.reduce((s, r) => s + Number(r.count), 0) || 1;
  const tsByStatus = Object.fromEntries(ticketStatusBreakdown.map(r => [r.status, Number(r.count)]));

  return (
    <>
      <style>{css}</style>
      <div className="page">

        {/* ── Header ── */}
        <div className="pg-header">
          <div>
            <h1 className="pg-title">Kontrol Paneli</h1>
            <div className="pg-date">{todayStr}</div>
          </div>
          <div className="quick-actions">
            <Link href="/tickets/new" className="qa-btn qa-blue">+ Talep</Link>
            <Link href="/quotes/new" className="qa-btn qa-indigo">+ Teklif</Link>
            <Link href="/customers/new" className="qa-btn qa-green">+ Müşteri</Link>
            <Link href="/payments" className="qa-btn qa-ghost">Ödemeler</Link>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="kpi-grid">
          <div className="kpi-card" style={{ "--accent": "#3b82f6" } as React.CSSProperties}>
            <div className="kpi-icon" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>👥</div>
            <div className="kpi-body">
              <div className="kpi-label">Aktif Müşteri</div>
              <div className="kpi-value" style={{ color: "#3b82f6" }}>{Number(activeCustomers[0]?.count ?? 0)}</div>
              <div className="kpi-sub">sözleşmeli firma</div>
            </div>
          </div>

          <div className="kpi-card" style={{ "--accent": "#f59e0b" } as React.CSSProperties}>
            <div className="kpi-icon" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>🎫</div>
            <div className="kpi-body">
              <div className="kpi-label">Açık Talep</div>
              <div className="kpi-value" style={{ color: "#f59e0b" }}>{totalOpenTickets}</div>
              <div className="kpi-sub kpi-priorities">
                {openTickets.map(r => (
                  <span key={r.priority} className="kpi-prio" style={{ color: PRIORITY_COLOR[r.priority] }}>
                    {r.count} {r.priority}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="kpi-card" style={{ "--accent": "#22c55e" } as React.CSSProperties}>
            <div className="kpi-icon" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>💰</div>
            <div className="kpi-body">
              <div className="kpi-label">Bu Ay Tahsilat</div>
              <div className="kpi-value kpi-value-sm" style={{ color: "#22c55e" }}>{fmtAmounts(paidThisMonth)}</div>
              <div className="kpi-sub">{Number(resolvedThisMonth[0]?.count ?? 0)} talep çözüldü</div>
            </div>
          </div>

          <div className="kpi-card" style={{ "--accent": "#ef4444" } as React.CSSProperties}>
            <div className="kpi-icon" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>⚠</div>
            <div className="kpi-body">
              <div className="kpi-label">Gecikmiş Ödeme</div>
              <div className="kpi-value" style={{ color: overdueCount > 0 ? "#ef4444" : "#22c55e" }}>{overdueCount}</div>
              <div className="kpi-sub">{fmtAmounts(overduePayments)} bekliyor</div>
            </div>
          </div>

          <div className="kpi-card" style={{ "--accent": "#8b5cf6" } as React.CSSProperties}>
            <div className="kpi-icon" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>📋</div>
            <div className="kpi-body">
              <div className="kpi-label">Bekleyen Teklif</div>
              <div className="kpi-value" style={{ color: "#8b5cf6" }}>{pendingQuoteCount}</div>
              <div className="kpi-sub">
                {Number(pendingQuotes[0]?.total_try ?? 0) > 0 && `₺${Number(pendingQuotes[0]?.total_try).toLocaleString("tr-TR")}`}
                {Number(pendingQuotes[0]?.total_usd ?? 0) > 0 && ` $${Number(pendingQuotes[0]?.total_usd).toLocaleString("tr-TR")}`}
                {Number(pendingQuotes[0]?.total_try ?? 0) === 0 && Number(pendingQuotes[0]?.total_usd ?? 0) === 0 && "pipeline değeri"}
              </div>
            </div>
          </div>

          <div className="kpi-card" style={{ "--accent": "#06b6d4" } as React.CSSProperties}>
            <div className="kpi-icon" style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>✅</div>
            <div className="kpi-body">
              <div className="kpi-label">Bu Ay Çözülen</div>
              <div className="kpi-value" style={{ color: "#06b6d4" }}>{Number(resolvedThisMonth[0]?.count ?? 0)}</div>
              <div className="kpi-sub">destek talebi</div>
            </div>
          </div>
        </div>

        {/* ── Contract warnings ── */}
        {contractExpiry.length > 0 && (
          <div className="warn-panel">
            <div className="warn-hdr">
              <span className="warn-dot">!</span>
              <span className="warn-title">Sözleşme Bitiş Uyarısı</span>
              <span className="warn-count">{contractExpiry.length} müşteri</span>
            </div>
            <div className="warn-list">
              {contractExpiry.map(c => {
                const dLeft = Math.ceil((new Date(c.contract_end).getTime() - Date.now()) / 86400000);
                const expired = dLeft < 0;
                const col = expired ? "#ef4444" : dLeft <= 14 ? "#f59e0b" : "#eab308";
                return (
                  <Link key={c.id} href={`/customers/${c.id}`} className="warn-item">
                    <span className="warn-co">{c.company_name}</span>
                    <span className="warn-badge" style={{ color: col, background: `${col}15`, borderColor: `${col}30` }}>
                      {expired ? `${Math.abs(dLeft)}g önce bitti` : dLeft === 0 ? "Bugün bitiyor" : `${dLeft}g kaldı`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Chart + Pipeline row ── */}
        <div className="chart-row">

          {/* Monthly Revenue Bar Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Aylık Tahsilat (₺)</span>
              <Link href="/payments" className="card-link">Tümü →</Link>
            </div>
            <div className="bar-chart">
              {chartMonths.map((m, i) => {
                const pct = chartMax > 0 ? Math.max((m.try_total / chartMax) * 100, 2) : 2;
                const isCurrentMonth = i === chartMonths.length - 1;
                return (
                  <div key={i} className="bar-col">
                    <div className="bar-val">{m.try_total > 0 ? `₺${(m.try_total / 1000).toFixed(0)}K` : ""}</div>
                    <div className="bar-wrap">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${pct}%`,
                          background: isCurrentMonth
                            ? "linear-gradient(180deg,#3b82f6,#1d4ed8)"
                            : "linear-gradient(180deg,#334155,#1e293b)",
                          opacity: isCurrentMonth ? 1 : 0.7,
                        }}
                      />
                    </div>
                    <div className="bar-label" style={{ color: isCurrentMonth ? "#3b82f6" : "var(--text-ghost)" }}>
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket Pipeline */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Talep Pipeline</span>
              <Link href="/tickets" className="card-link">Tümü →</Link>
            </div>
            <div className="pipeline">
              {(["open", "in_progress", "waiting_customer", "resolved", "closed"] as const).map(status => {
                const count = tsByStatus[status] ?? 0;
                const pct = ticketTotal > 0 ? (count / ticketTotal) * 100 : 0;
                const col = STATUS_COLOR[status];
                return (
                  <div key={status} className="pipeline-row">
                    <div className="pipeline-label">
                      <span className="pipeline-dot" style={{ background: col }} />
                      <span>{TICKET_STATUS_LABEL[status]}</span>
                    </div>
                    <div className="pipeline-bar-wrap">
                      <div className="pipeline-bar" style={{ width: `${pct}%`, background: col }} />
                    </div>
                    <span className="pipeline-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Recent data row ── */}
        <div className="data-row">

          {/* Recent Tickets */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Son Talepler</span>
              <Link href="/tickets" className="card-link">Tümü →</Link>
            </div>
            {recentTickets.length === 0
              ? <div className="empty">Henüz talep yok.</div>
              : recentTickets.map(t => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="list-row">
                  <span className="prio-dot" style={{ background: PRIORITY_COLOR[t.priority] ?? "#64748b" }} />
                  <div className="list-main">
                    <span className="list-title">{t.subject}</span>
                    <span className="list-sub">{t.company_name} · {daysAgo(t.created_at)}</span>
                  </div>
                  <span className="mini-badge" style={{ color: STATUS_COLOR[t.status], background: `${STATUS_COLOR[t.status]}15`, borderColor: `${STATUS_COLOR[t.status]}28` }}>
                    {TICKET_STATUS_LABEL[t.status]}
                  </span>
                </Link>
              ))
            }
          </div>

          {/* Recent Quotes */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Son Teklifler</span>
              <Link href="/quotes" className="card-link">Tümü →</Link>
            </div>
            {recentQuotes.length === 0
              ? <div className="empty">Henüz teklif yok.</div>
              : recentQuotes.map(q => {
                const col = QUOTE_STATUS_COLOR[q.status] ?? "#64748b";
                return (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="list-row">
                    <div className="list-main">
                      <span className="list-title mono">{q.quote_no}</span>
                      <span className="list-sub">{q.company_name || "—"} · {daysAgo(q.created_at)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className="list-amount">{fmtMoney(q.total, q.currency)}</span>
                      <span className="mini-badge" style={{ color: col, background: `${col}15`, borderColor: `${col}28` }}>
                        {QUOTE_STATUS_LABEL[q.status]}
                      </span>
                    </div>
                  </Link>
                );
              })
            }
          </div>

          {/* Upcoming Payments */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Yaklaşan Ödemeler</span>
              <Link href="/payments" className="card-link">Tümü →</Link>
            </div>
            {upcomingPayments.length === 0
              ? <div className="empty">Bekleyen ödeme yok.</div>
              : upcomingPayments.map(p => {
                const { label, color } = daysUntil(p.due_date);
                return (
                  <div key={p.id} className="list-row">
                    <div className="list-main">
                      <span className="list-title">{p.company_name}</span>
                      <span className="list-sub">{new Date(p.due_date).toLocaleDateString("tr-TR")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className="list-amount">{fmtMoney(p.amount, p.currency)}</span>
                      <span className="mini-badge" style={{ color, background: `${color}15`, borderColor: `${color}28` }}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </>
  );
}

const css = `
.page { padding:24px 28px; display:flex; flex-direction:column; gap:20px; }
@media(max-width:640px) { .page { padding:14px; gap:14px; } }

/* Header */
.pg-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.pg-title { font-size:22px; font-weight:800; color:var(--text); letter-spacing:-0.5px; }
.pg-date { font-size:12px; color:var(--text-ghost); margin-top:3px; }
.quick-actions { display:flex; gap:8px; flex-wrap:wrap; }
.qa-btn { padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; text-decoration:none; border:1px solid transparent; transition:all 0.12s; }
.qa-blue { background:rgba(59,130,246,0.12); color:#3b82f6; border-color:rgba(59,130,246,0.25); }
.qa-blue:hover { background:rgba(59,130,246,0.2); }
.qa-indigo { background:rgba(99,102,241,0.12); color:#818cf8; border-color:rgba(99,102,241,0.25); }
.qa-indigo:hover { background:rgba(99,102,241,0.2); }
.qa-green { background:rgba(34,197,94,0.1); color:#22c55e; border-color:rgba(34,197,94,0.22); }
.qa-green:hover { background:rgba(34,197,94,0.18); }
.qa-ghost { background:transparent; color:var(--text-dim); border-color:var(--border); }
.qa-ghost:hover { background:var(--input-bg); }

/* KPI Cards */
.kpi-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; }
@media(max-width:1100px) { .kpi-grid { grid-template-columns:repeat(3,1fr); } }
@media(max-width:640px) { .kpi-grid { grid-template-columns:repeat(2,1fr); } }
.kpi-card {
  background:var(--card); border:1px solid var(--border); border-radius:12px;
  padding:16px; display:flex; align-items:flex-start; gap:12px;
  border-left:3px solid var(--accent,#3b82f6);
}
.kpi-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
.kpi-body { min-width:0; flex:1; }
.kpi-label { font-size:10px; font-weight:700; color:var(--text-ghost); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kpi-value { font-size:24px; font-weight:800; letter-spacing:-0.5px; line-height:1; margin-bottom:4px; }
.kpi-value-sm { font-size:15px; font-weight:800; letter-spacing:-0.3px; line-height:1.2; margin-bottom:4px; }
.kpi-sub { font-size:10px; color:var(--text-ghost); line-height:1.4; }
.kpi-priorities { display:flex; flex-wrap:wrap; gap:4px; }
.kpi-prio { font-size:9px; font-weight:700; }

/* Contract warning */
.warn-panel { background:rgba(234,179,8,0.06); border:1px solid rgba(234,179,8,0.22); border-radius:12px; overflow:hidden; }
.warn-hdr { display:flex; align-items:center; gap:8px; padding:11px 16px; border-bottom:1px solid rgba(234,179,8,0.12); }
.warn-dot { width:18px; height:18px; background:#eab308; color:#000; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; flex-shrink:0; }
.warn-title { font-size:13px; font-weight:700; color:#eab308; flex:1; }
.warn-count { font-size:11px; color:#ca8a04; background:rgba(234,179,8,0.12); border:1px solid rgba(234,179,8,0.2); border-radius:10px; padding:2px 8px; font-weight:600; }
.warn-list { display:flex; flex-direction:column; }
.warn-item { display:flex; align-items:center; justify-content:space-between; padding:9px 16px; border-bottom:1px solid rgba(234,179,8,0.08); text-decoration:none; gap:12px; transition:background 0.12s; }
.warn-item:last-child { border-bottom:none; }
.warn-item:hover { background:rgba(234,179,8,0.04); }
.warn-co { font-size:13px; color:var(--text-sub); font-weight:500; }
.warn-badge { font-size:10px; font-weight:700; padding:3px 8px; border-radius:5px; border:1px solid; white-space:nowrap; }

/* Chart row */
.chart-row { display:grid; grid-template-columns:1.4fr 1fr; gap:16px; }
@media(max-width:800px) { .chart-row { grid-template-columns:1fr; } }

/* Data row */
.data-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
@media(max-width:900px) { .data-row { grid-template-columns:1fr 1fr; } }
@media(max-width:600px) { .data-row { grid-template-columns:1fr; } }

/* Generic card */
.card { background:var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.card-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px 12px; border-bottom:1px solid var(--divider); }
.card-title { font-size:13px; font-weight:700; color:var(--text-sub); }
.card-link { font-size:12px; color:#3b82f6; font-weight:600; }

/* Bar chart */
.bar-chart { display:flex; align-items:flex-end; gap:8px; padding:16px 16px 12px; height:140px; }
.bar-col { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; }
.bar-val { font-size:9px; color:var(--text-ghost); margin-bottom:4px; white-space:nowrap; height:16px; display:flex; align-items:flex-end; }
.bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
.bar-fill { width:100%; border-radius:4px 4px 0 0; min-height:3px; transition:height 0.3s; }
.bar-label { font-size:9px; margin-top:6px; font-weight:600; }

/* Pipeline */
.pipeline { padding:14px 16px; display:flex; flex-direction:column; gap:11px; }
.pipeline-row { display:flex; align-items:center; gap:10px; }
.pipeline-label { display:flex; align-items:center; gap:6px; width:120px; flex-shrink:0; font-size:11px; color:var(--text-dim); white-space:nowrap; }
.pipeline-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.pipeline-bar-wrap { flex:1; height:7px; background:var(--border); border-radius:4px; overflow:hidden; }
.pipeline-bar { height:100%; border-radius:4px; min-width:2px; transition:width 0.3s; }
.pipeline-count { font-size:12px; font-weight:700; color:var(--text-sub); width:24px; text-align:right; flex-shrink:0; }

/* List rows */
.list-row { display:flex; align-items:center; padding:10px 14px; border-bottom:1px solid var(--row-border); gap:10px; text-decoration:none; transition:background 0.1s; }
.list-row:last-child { border-bottom:none; }
.list-row:hover { background:var(--row-hover); }
.prio-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.list-main { min-width:0; flex:1; }
.list-title { display:block; font-size:12px; color:var(--text-sub); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.list-sub { display:block; font-size:10px; color:var(--text-ghost); margin-top:2px; }
.list-amount { font-size:12px; font-weight:700; color:var(--text-muted); white-space:nowrap; }
.mini-badge { font-size:9px; font-weight:700; padding:2px 7px; border-radius:5px; border:1px solid; white-space:nowrap; flex-shrink:0; }
.mono { font-family:monospace; font-size:11px!important; }
.empty { padding:20px 16px; color:var(--text-ghost); font-size:13px; text-align:center; }
`;
