import { query, queryOne } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Raporlar — xShield MNG" };
export const dynamic = "force-dynamic";

const CURR: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
function fmt(currency: string, amount: number) {
  return `${CURR[currency] ?? currency}${Number(amount).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function ReportsPage() {
  const [
    kpis,
    openTickets,
    quotePipeline,
    monthlyRevenue,
    ticketsByStatus,
    ticketsByPriority,
    monthlyTickets,
    topCustomers,
    overdueList,
    expiringContracts,
    ticketCategories,
  ] = await Promise.all([
    // KPI summary
    queryOne<{
      active_customers: string;
      mrr_try: string;
      mrr_usd: string;
      overdue_try: string;
      expiring_30: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status='active') AS active_customers,
         COALESCE(SUM(monthly_fee) FILTER (WHERE status='active' AND currency='TRY'), 0) AS mrr_try,
         COALESCE(SUM(monthly_fee) FILTER (WHERE status='active' AND currency='USD'), 0) AS mrr_usd,
         COUNT(*) FILTER (WHERE contract_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS expiring_30
       FROM customers`
    ),
    // Open tickets
    queryOne<{ open_count: string; critical_count: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS open_count,
         COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed') AND priority='critical') AS critical_count
       FROM tickets`
    ),
    // Quote pipeline
    query<{ status: string; count: string; total_amount: string }>(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS total_amount
       FROM quotes GROUP BY status ORDER BY count DESC`
    ),
    // Monthly revenue (6 months)
    query<{ month: string; paid: string; pending: string; overdue: string }>(
      `SELECT to_char(date_trunc('month', due_date), 'YYYY-MM') AS month,
              COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS paid,
              COALESCE(SUM(CASE WHEN status='pending' AND due_date>=CURRENT_DATE THEN amount ELSE 0 END),0) AS pending,
              COALESCE(SUM(CASE WHEN status='pending' AND due_date<CURRENT_DATE THEN amount ELSE 0 END),0) AS overdue
       FROM payments
       WHERE due_date >= date_trunc('month', now()) - interval '5 months'
       GROUP BY month ORDER BY month`
    ),
    // Ticket status breakdown
    query<{ status: string; count: string }>(
      "SELECT status, COUNT(*) AS count FROM tickets GROUP BY status ORDER BY count DESC"
    ),
    // Ticket priority
    query<{ priority: string; count: string }>(
      "SELECT priority, COUNT(*) AS count FROM tickets GROUP BY priority ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END"
    ),
    // Monthly ticket trend (6 months)
    query<{ month: string; total: string; open: string; resolved: string; critical: string }>(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS open,
              COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved,
              COUNT(*) FILTER (WHERE priority='critical') AS critical
       FROM tickets
       WHERE created_at >= date_trunc('month', now()) - interval '5 months'
       GROUP BY month ORDER BY month`
    ),
    // Top customers by MRR
    query<{ id: number; company_name: string; monthly_fee: number; currency: string; status: string; open_tickets: string }>(
      `SELECT c.id, c.company_name, c.monthly_fee, c.currency, c.status,
              (SELECT COUNT(*) FROM tickets t WHERE t.customer_id=c.id AND t.status NOT IN ('resolved','closed')) AS open_tickets
       FROM customers c WHERE c.monthly_fee IS NOT NULL ORDER BY c.monthly_fee DESC LIMIT 8`
    ),
    // Overdue payments
    query<{ id: number; company_name: string; amount: number; currency: string; due_date: string; days_overdue: string }>(
      `SELECT p.id, c.company_name, p.amount, p.currency, p.due_date,
              (CURRENT_DATE - p.due_date::date) AS days_overdue
       FROM payments p JOIN customers c ON c.id=p.customer_id
       WHERE p.status='pending' AND p.due_date < CURRENT_DATE
       ORDER BY p.due_date ASC LIMIT 10`
    ),
    // Expiring contracts
    query<{ id: number; company_name: string; contract_end: string; monthly_fee: number; currency: string; days_left: string }>(
      `SELECT id, company_name, contract_end,
              COALESCE(monthly_fee,0) AS monthly_fee,
              COALESCE(currency,'TRY') AS currency,
              (contract_end::date - CURRENT_DATE) AS days_left
       FROM customers
       WHERE contract_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
         AND status='active'
       ORDER BY contract_end ASC LIMIT 8`
    ),
    // Top ticket categories
    query<{ category_name: string; count: string; resolved: string }>(
      `SELECT COALESCE(tc.name, 'Kategorisiz') AS category_name,
              COUNT(*) AS count,
              COUNT(*) FILTER (WHERE t.status IN ('resolved','closed')) AS resolved
       FROM tickets t
       LEFT JOIN ticket_categories tc ON tc.id=t.category_id
       GROUP BY tc.name ORDER BY count DESC LIMIT 8`
    ),
  ]);

  const STATUS_LABEL: Record<string, string> = {
    open: "Açık", in_progress: "İşlemde", waiting_customer: "Müşteri Bkl.",
    resolved: "Çözüldü", closed: "Kapalı",
  };
  const STATUS_COLOR: Record<string, string> = {
    open: "#3b82f6", in_progress: "#f59e0b", waiting_customer: "#a78bfa",
    resolved: "#22c55e", closed: "#475569",
  };
  const PRIORITY_COLOR: Record<string, string> = {
    critical: "#ef4444", high: "#f59e0b", normal: "#3b82f6", low: "#64748b",
  };
  const PRIORITY_LABEL: Record<string, string> = {
    critical: "Kritik", high: "Yüksek", normal: "Normal", low: "Düşük",
  };
  const QUOTE_STATUS_LABEL: Record<string, string> = {
    draft: "Taslak", sent: "Gönderildi", accepted: "Kabul", rejected: "Red", expired: "Süresi Doldu",
  };
  const QUOTE_STATUS_COLOR: Record<string, string> = {
    draft: "#94a3b8", sent: "#3b82f6", accepted: "#22c55e", rejected: "#ef4444", expired: "#f59e0b",
  };

  const totalOpenTickets = Number(openTickets?.open_count ?? 0);
  const totalCritical    = Number(openTickets?.critical_count ?? 0);
  const activeCx         = Number(kpis?.active_customers ?? 0);
  const mrrTRY           = Number(kpis?.mrr_try ?? 0);
  const mrrUSD           = Number(kpis?.mrr_usd ?? 0);
  const expiring30       = Number(kpis?.expiring_30 ?? 0);

  const overdueByCurr: Record<string, number> = {};
  overdueList.forEach((p) => { overdueByCurr[p.currency] = (overdueByCurr[p.currency] ?? 0) + Number(p.amount); });
  const overdueStr = Object.entries(overdueByCurr).filter(([, v]) => v > 0).map(([c, v]) => fmt(c, v)).join(" / ") || "—";

  const totalQuoteVal = quotePipeline.find((q) => q.status === "accepted" || q.status === "sent");

  const maxPaid = Math.max(...monthlyRevenue.map((m) => Number(m.paid) + Number(m.overdue)), 1);
  const maxTickets = Math.max(...monthlyTickets.map((m) => Number(m.total)), 1);

  const totalTickets = ticketsByStatus.reduce((a, x) => a + Number(x.count), 0);
  const totalPriorities = ticketsByPriority.reduce((a, x) => a + Number(x.count), 0);
  const totalQuotes = quotePipeline.reduce((a, x) => a + Number(x.count), 0);

  const MODULE_CARDS = [
    {
      icon: "💰", title: "Gelir & Ödemeler",
      desc: "Aylık gelir trendi, tahsilat oranı, gecikme analizi",
      href: "/reports/wizard?_src=payments",
      stat: overdueList.length > 0 ? `${overdueList.length} gecikmiş` : "Güncel",
      statColor: overdueList.length > 0 ? "#ef4444" : "#22c55e",
    },
    {
      icon: "🎫", title: "Destek Talepleri",
      desc: "SLA performansı, kategori dağılımı, çözüm süreleri",
      href: "/reports/wizard?_src=tickets",
      stat: `${totalOpenTickets} açık`,
      statColor: totalOpenTickets > 0 ? "#f59e0b" : "#22c55e",
    },
    {
      icon: "🏢", title: "Müşteri Analizi",
      desc: "MRR analizi, sözleşme durumu, müşteri profilleri",
      href: "/reports/wizard?_src=customers",
      stat: `${activeCx} aktif`,
      statColor: "#3b82f6",
    },
    {
      icon: "📋", title: "Teklif Pipeline",
      desc: "Teklif dönüşüm oranı, ortalama değer, bekleme süreleri",
      href: "/reports/wizard?_src=quotes",
      stat: `${totalQuotes} teklif`,
      statColor: "#8b5cf6",
    },
    {
      icon: "💻", title: "Envanter",
      desc: "Zimmet listesi, garanti bitiş tarihleri, donanım analizi",
      href: "/reports/wizard?_src=inventory",
      stat: "Görüntüle",
      statColor: "#0891b2",
    },
    {
      icon: "📦", title: "Tedarikçi Ürünleri",
      desc: "Stok durumu, fiyat karşılaştırma, tedarikçi analizi",
      href: "/reports/wizard?_src=suppliers",
      stat: "Görüntüle",
      statColor: "#059669",
    },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="rp-page">

        {/* Header */}
        <div className="rp-header">
          <div>
            <h1 className="rp-title">Raporlar</h1>
            <p className="rp-sub">Sistem genelinde analiz, trend ve özel raporlar</p>
          </div>
          <Link href="/reports/wizard" className="btn-wizard">
            ✨ Rapor Sihirbazı
          </Link>
        </div>

        {/* KPI Strip */}
        <div className="kpi-strip">
          <div className="kpi-card" style={{ "--accent": "#3b82f6" } as React.CSSProperties}>
            <div className="kpi-icon">🏢</div>
            <div className="kpi-val">{activeCx}</div>
            <div className="kpi-label">Aktif Müşteri</div>
          </div>
          <div className="kpi-card" style={{ "--accent": "#22c55e" } as React.CSSProperties}>
            <div className="kpi-icon">💰</div>
            <div className="kpi-val">{mrrTRY > 0 ? fmt("TRY", mrrTRY) : mrrUSD > 0 ? fmt("USD", mrrUSD) : "—"}</div>
            <div className="kpi-label">Aylık Gelir (MRR){mrrUSD > 0 && mrrTRY > 0 ? ` + ${fmt("USD", mrrUSD)}` : ""}</div>
          </div>
          <div className="kpi-card" style={{ "--accent": totalOpenTickets > 5 ? "#f59e0b" : "#3b82f6" } as React.CSSProperties}>
            <div className="kpi-icon">🎫</div>
            <div className="kpi-val">{totalOpenTickets}</div>
            <div className="kpi-label">Açık Talep{totalCritical > 0 ? ` (${totalCritical} kritik)` : ""}</div>
          </div>
          <div className="kpi-card" style={{ "--accent": overdueList.length > 0 ? "#ef4444" : "#22c55e" } as React.CSSProperties}>
            <div className="kpi-icon">⚠️</div>
            <div className="kpi-val" style={{ color: overdueList.length > 0 ? "#ef4444" : "inherit" }}>
              {overdueList.length > 0 ? overdueStr : "Yok"}
            </div>
            <div className="kpi-label">Gecikmiş Ödeme</div>
          </div>
          <div className="kpi-card" style={{ "--accent": "#8b5cf6" } as React.CSSProperties}>
            <div className="kpi-icon">📋</div>
            <div className="kpi-val">{totalQuotes}</div>
            <div className="kpi-label">Toplam Teklif</div>
          </div>
          <div className="kpi-card" style={{ "--accent": expiring30 > 0 ? "#f59e0b" : "#64748b" } as React.CSSProperties}>
            <div className="kpi-icon">📅</div>
            <div className="kpi-val" style={{ color: expiring30 > 0 ? "#f59e0b" : "inherit" }}>{expiring30}</div>
            <div className="kpi-label">30 Günde Sözleşme Bitiyor</div>
          </div>
        </div>

        {/* Module Cards */}
        <div className="module-grid">
          {MODULE_CARDS.map((m) => (
            <Link key={m.title} href={m.href} className="module-card">
              <div className="module-top">
                <span className="module-icon">{m.icon}</span>
                <span className="module-stat" style={{ color: m.statColor }}>{m.stat}</span>
              </div>
              <div className="module-title">{m.title}</div>
              <div className="module-desc">{m.desc}</div>
              <div className="module-link">Rapor Oluştur →</div>
            </Link>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid-2">
          {/* Monthly Revenue Bar Chart */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Aylık Tahsilat</span>
              <span className="card-sub">Son 6 ay · TRY</span>
            </div>
            <div className="bar-chart">
              {monthlyRevenue.map((m, idx) => {
                const paid    = Number(m.paid);
                const overdue = Number(m.overdue);
                const total   = paid + overdue;
                const paidH   = total > 0 ? Math.round((paid / maxPaid) * 100) : 0;
                const overH   = total > 0 ? Math.round((overdue / maxPaid) * 100) : 0;
                const isCurrent = idx === monthlyRevenue.length - 1;
                return (
                  <div key={m.month} className={`bar-col ${isCurrent ? "current" : ""}`}>
                    <div className="bar-amt">{paid > 0 ? Number(paid).toLocaleString("tr-TR", { maximumFractionDigits: 0 }) : ""}</div>
                    <div className="bar-stack">
                      {overH > 0 && (
                        <div className="bar-seg overdue-seg" style={{ height: `${overH}%` }}
                          title={`Gecikmiş: ₺${overdue.toLocaleString("tr-TR")}`} />
                      )}
                      <div className="bar-seg paid-seg" style={{ height: `${Math.max(paidH, paid > 0 ? 4 : 0)}%` }}
                        title={`Ödendi: ₺${paid.toLocaleString("tr-TR")}`} />
                    </div>
                    <div className="bar-lbl">{m.month.slice(5)}/{m.month.slice(2, 4)}</div>
                  </div>
                );
              })}
            </div>
            <div className="legend">
              <span className="leg"><span className="leg-dot paid" />Ödendi</span>
              <span className="leg"><span className="leg-dot overdue" />Gecikmiş</span>
            </div>
          </div>

          {/* Monthly Ticket Trend */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Aylık Talep Trendi</span>
              <span className="card-sub">Son 6 ay</span>
            </div>
            <div className="bar-chart">
              {monthlyTickets.map((m, idx) => {
                const total     = Number(m.total);
                const resolved  = Number(m.resolved);
                const open      = Number(m.open);
                const pct       = Math.round((total / maxTickets) * 100);
                const resPct    = total > 0 ? Math.round((resolved / total) * 100) : 0;
                const isCurrent = idx === monthlyTickets.length - 1;
                return (
                  <div key={m.month} className={`bar-col ${isCurrent ? "current" : ""}`}>
                    <div className="bar-amt" style={{ color: open > 0 ? "#f59e0b" : "#22c55e" }}>
                      {total > 0 ? total : ""}
                    </div>
                    <div className="bar-stack">
                      <div className="bar-seg ticket-open-seg" style={{ height: `${Math.max(pct - resPct * pct / 100, 0)}%` }}
                        title={`Açık: ${open}`} />
                      <div className="bar-seg ticket-res-seg" style={{ height: `${Math.round(resPct * pct / 100)}%` }}
                        title={`Çözüldü: ${resolved}`} />
                    </div>
                    <div className="bar-lbl">{m.month.slice(5)}/{m.month.slice(2, 4)}</div>
                  </div>
                );
              })}
            </div>
            <div className="legend">
              <span className="leg"><span className="leg-dot ticket-open" />Açık</span>
              <span className="leg"><span className="leg-dot ticket-res" />Çözüldü</span>
            </div>
          </div>
        </div>

        {/* Tickets + Quote Pipeline */}
        <div className="grid-2">
          {/* Ticket Status & Priority */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Talep Analizi</span>
              <Link href="/reports/wizard?_src=tickets" className="card-link">Detay →</Link>
            </div>
            <div className="stat-section-lbl">Durum Dağılımı</div>
            <div className="stat-list">
              {ticketsByStatus.map((r) => {
                const c   = STATUS_COLOR[r.status] ?? "#64748b";
                const pct = totalTickets > 0 ? Math.round((Number(r.count) / totalTickets) * 100) : 0;
                return (
                  <div key={r.status} className="stat-row">
                    <span className="stat-badge" style={{ color: c, background: `${c}18`, borderColor: `${c}30` }}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <div className="stat-bar-wrap">
                      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: c }} />
                    </div>
                    <span className="stat-num">{r.count}</span>
                  </div>
                );
              })}
            </div>
            <div className="stat-section-lbl" style={{ marginTop: 18 }}>Öncelik Dağılımı</div>
            <div className="stat-list">
              {ticketsByPriority.map((r) => {
                const c   = PRIORITY_COLOR[r.priority] ?? "#64748b";
                const pct = totalPriorities > 0 ? Math.round((Number(r.count) / totalPriorities) * 100) : 0;
                return (
                  <div key={r.priority} className="stat-row">
                    <span className="stat-badge" style={{ color: c, background: `${c}18`, borderColor: `${c}30` }}>
                      {PRIORITY_LABEL[r.priority] ?? r.priority}
                    </span>
                    <div className="stat-bar-wrap">
                      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: c }} />
                    </div>
                    <span className="stat-num">{r.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quote Pipeline */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Teklif Pipeline</span>
              <Link href="/quotes" className="card-link">Tüm Teklifler →</Link>
            </div>
            {quotePipeline.length === 0 ? (
              <div className="empty-state">Henüz teklif yok</div>
            ) : (
              <div className="stat-list" style={{ gap: 14 }}>
                {quotePipeline.map((q) => {
                  const c   = QUOTE_STATUS_COLOR[q.status] ?? "#64748b";
                  const pct = totalQuotes > 0 ? Math.round((Number(q.count) / totalQuotes) * 100) : 0;
                  const amt = Number(q.total_amount);
                  return (
                    <div key={q.status} className="pipeline-row">
                      <div className="pipeline-top">
                        <span className="stat-badge" style={{ color: c, background: `${c}18`, borderColor: `${c}30` }}>
                          {QUOTE_STATUS_LABEL[q.status] ?? q.status}
                        </span>
                        <div className="pipeline-meta">
                          <span className="pipeline-count">{q.count} teklif</span>
                          {amt > 0 && <span className="pipeline-amt">₺{amt.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</span>}
                        </div>
                      </div>
                      <div className="stat-bar-wrap" style={{ height: 8 }}>
                        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: c, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="stat-section-lbl" style={{ marginTop: 20 }}>Kategori Bazlı Talepler</div>
            <div className="stat-list">
              {ticketCategories.slice(0, 5).map((cat) => {
                const total = Number(cat.count);
                const res   = Number(cat.resolved);
                const pct   = total > 0 ? Math.round((res / total) * 100) : 0;
                return (
                  <div key={cat.category_name} className="stat-row">
                    <span className="cat-name">{cat.category_name}</span>
                    <div className="stat-bar-wrap">
                      <div className="stat-bar-fill" style={{ width: `${Math.min(100, total * 8)}%`, background: "#6366f1" }} />
                    </div>
                    <span className="stat-num">{total}</span>
                    <span className="pct-badge">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Customers by MRR */}
        <div className="card">
          <div className="card-hdr">
            <span className="card-title">En Yüksek MRR — Müşteriler</span>
            <Link href="/reports/wizard?_src=customers" className="card-link">Detaylı Rapor →</Link>
          </div>
          <table className="full-table">
            <thead>
              <tr>
                <th>#</th><th>Müşteri</th><th>Aylık Ücret</th><th>Durum</th>
                <th>Açık Talep</th><th></th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => {
                const sc = c.status === "active" ? "#22c55e" : c.status === "suspended" ? "#ef4444" : "#94a3b8";
                return (
                  <tr key={c.id}>
                    <td className="rank-col">{i + 1}</td>
                    <td className="company-col">{c.company_name}</td>
                    <td className="fee-col">{fmt(c.currency, Number(c.monthly_fee))}</td>
                    <td>
                      <span className="mini-badge" style={{ color: sc, background: `${sc}18`, borderColor: `${sc}30` }}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {Number(c.open_tickets) > 0
                        ? <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 12 }}>{c.open_tickets} açık</span>
                        : <span className="dim">—</span>}
                    </td>
                    <td><Link href={`/customers/${c.id}`} className="row-link">Detay →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom row: Overdue + Expiring */}
        <div className="grid-2">
          {/* Overdue Payments */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Gecikmiş Ödemeler</span>
              {overdueList.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{overdueStr}</span>
              )}
            </div>
            {overdueList.length === 0 ? (
              <div className="empty-state ok">✓ Gecikmiş ödeme yok</div>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr><th>Müşteri</th><th>Tutar</th><th>Vade</th><th>Gecikme</th></tr>
                </thead>
                <tbody>
                  {overdueList.map((p) => (
                    <tr key={p.id}>
                      <td className="company-col">{p.company_name}</td>
                      <td style={{ color: "#ef4444", fontWeight: 700 }}>{fmt(p.currency, Number(p.amount))}</td>
                      <td className="date-col">{fmtDate(p.due_date)}</td>
                      <td>
                        <span className={`delay-badge ${Number(p.days_overdue) > 30 ? "delay-red" : "delay-yellow"}`}>
                          {p.days_overdue}g
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Expiring Contracts */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Yaklaşan Sözleşme Bitişleri</span>
              <span className="card-sub">60 gün içinde</span>
            </div>
            {expiringContracts.length === 0 ? (
              <div className="empty-state ok">✓ Yaklaşan bitiş yok</div>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr><th>Müşteri</th><th>MRR</th><th>Bitiş</th><th>Kalan</th></tr>
                </thead>
                <tbody>
                  {expiringContracts.map((c) => {
                    const days = Number(c.days_left);
                    return (
                      <tr key={c.id}>
                        <td className="company-col">{c.company_name}</td>
                        <td style={{ fontWeight: 700 }}>{c.monthly_fee > 0 ? fmt(c.currency, c.monthly_fee) : "—"}</td>
                        <td className="date-col">{fmtDate(c.contract_end)}</td>
                        <td>
                          <span className={`delay-badge ${days <= 14 ? "delay-red" : days <= 30 ? "delay-yellow" : "delay-blue"}`}>
                            {days}g
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

const css = `
.rp-page{padding:28px;display:flex;flex-direction:column;gap:22px;max-width:1400px}

/* Header */
.rp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.rp-title{font-size:24px;font-weight:900;color:var(--text);letter-spacing:-0.5px}
.rp-sub{font-size:13px;color:var(--text-muted);margin-top:2px}
.btn-wizard{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(79,70,229,0.35)}
.btn-wizard:hover{opacity:0.9}

/* KPI Strip */
.kpi-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.kpi-card{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent,#3b82f6);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:4px}
.kpi-icon{font-size:18px}
.kpi-val{font-size:20px;font-weight:900;color:var(--text);line-height:1;margin-top:2px}
.kpi-label{font-size:10px;color:var(--text-muted);font-weight:600;line-height:1.3}

/* Module Cards */
.module-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.module-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;text-decoration:none;display:flex;flex-direction:column;gap:6px;transition:border-color 0.15s,box-shadow 0.15s,transform 0.1s}
.module-card:hover{border-color:#3b82f6;box-shadow:0 4px 16px rgba(59,130,246,0.12);transform:translateY(-2px)}
.module-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
.module-icon{font-size:22px}
.module-stat{font-size:11px;font-weight:700}
.module-title{font-size:13px;font-weight:800;color:var(--text)}
.module-desc{font-size:11px;color:var(--text-muted);line-height:1.4;flex:1}
.module-link{font-size:11px;font-weight:700;color:#3b82f6;margin-top:4px}

/* Cards */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px}
.card-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--section-title)}
.card-sub{font-size:11px;color:var(--text-dimmer)}
.card-link{font-size:12px;font-weight:700;color:#3b82f6;text-decoration:none}
.card-link:hover{text-decoration:underline}
.stat-section-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-dimmer);margin-bottom:10px}

/* Grid */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}

/* Bar chart */
.bar-chart{display:flex;align-items:flex-end;gap:8px;height:100px;padding-bottom:4px;margin-bottom:8px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%}
.bar-col.current .bar-seg.paid-seg{background:#2563eb}
.bar-col.current .bar-seg.ticket-res-seg{background:#2563eb}
.bar-amt{font-size:9px;color:var(--text-dimmer);height:14px;display:flex;align-items:center;white-space:nowrap}
.bar-stack{flex:1;width:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:1px}
.bar-seg{width:80%;border-radius:3px 3px 0 0;min-height:2px;transition:height 0.3s}
.paid-seg{background:#22c55e}
.overdue-seg{background:#ef4444}
.ticket-res-seg{background:#22c55e}
.ticket-open-seg{background:#f59e0b}
.bar-lbl{font-size:9px;color:var(--text-dimmer);font-weight:600;white-space:nowrap}
.legend{display:flex;gap:14px;margin-top:6px}
.leg{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-dim)}
.leg-dot{width:8px;height:8px;border-radius:2px}
.leg-dot.paid{background:#22c55e}
.leg-dot.overdue{background:#ef4444}
.leg-dot.ticket-open{background:#f59e0b}
.leg-dot.ticket-res{background:#22c55e}

/* Stat list */
.stat-list{display:flex;flex-direction:column;gap:8px}
.stat-row{display:flex;align-items:center;gap:8px}
.stat-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;border:1px solid;white-space:nowrap;min-width:110px;text-align:center;flex-shrink:0}
.stat-bar-wrap{flex:1;height:5px;background:var(--input-bg);border-radius:3px;overflow:hidden}
.stat-bar-fill{height:100%;border-radius:3px;transition:width 0.4s ease}
.stat-num{font-size:13px;font-weight:700;color:var(--text-muted);min-width:24px;text-align:right;flex-shrink:0}
.cat-name{font-size:11px;font-weight:600;color:var(--text-sub);min-width:110px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0}
.pct-badge{font-size:10px;font-weight:700;color:var(--text-dimmer);min-width:28px;text-align:right;flex-shrink:0}

/* Pipeline */
.pipeline-row{display:flex;flex-direction:column;gap:6px}
.pipeline-top{display:flex;align-items:center;gap:10px}
.pipeline-meta{display:flex;align-items:center;gap:8px;margin-left:auto}
.pipeline-count{font-size:12px;font-weight:700;color:var(--text-muted)}
.pipeline-amt{font-size:12px;font-weight:700;color:var(--text)}

/* Tables */
.full-table{width:100%;border-collapse:collapse}
.full-table th{padding:9px 12px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-dimmer);border-bottom:1px solid var(--divider)}
.full-table td{padding:10px 12px;border-bottom:1px solid var(--row-border);font-size:13px;color:var(--text-sub);vertical-align:middle}
.full-table tr:last-child td{border-bottom:none}
.full-table tr:hover td{background:var(--row-hover)}
.mini-table{width:100%;border-collapse:collapse}
.mini-table th{padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dimmer);border-bottom:1px solid var(--divider)}
.mini-table td{padding:9px 10px;border-bottom:1px solid var(--row-border);font-size:12px;color:var(--text-sub)}
.mini-table tr:last-child td{border-bottom:none}
.rank-col{font-size:11px;font-weight:700;color:var(--text-dimmer);width:24px}
.company-col{font-weight:700;color:var(--text)}
.fee-col{font-weight:700}
.date-col{font-size:11px;color:var(--text-dim)}
.mini-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;border:1px solid}
.dim{color:var(--text-ghost)}
.row-link{font-size:12px;color:#3b82f6;font-weight:600;text-decoration:none}
.row-link:hover{text-decoration:underline}
.empty-state{padding:24px;text-align:center;font-size:13px;color:var(--text-muted);background:var(--bg);border-radius:8px}
.empty-state.ok{color:#22c55e;font-weight:700}
.delay-badge{font-size:10px;font-weight:800;padding:2px 7px;border-radius:12px}
.delay-red{background:#fee2e2;color:#dc2626}
.delay-yellow{background:#fef3c7;color:#d97706}
.delay-blue{background:#eff6ff;color:#2563eb}

@media(max-width:1200px){
  .kpi-strip{grid-template-columns:repeat(3,1fr)}
  .module-grid{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:768px){
  .rp-page{padding:16px;gap:16px}
  .kpi-strip{grid-template-columns:repeat(2,1fr)}
  .module-grid{grid-template-columns:repeat(2,1fr)}
  .grid-2{grid-template-columns:1fr}
}
`;
