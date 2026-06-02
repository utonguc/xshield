import { getPortalSession } from "@/lib/portal-auth";
import { query, queryOne } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ana Sayfa" };

export default async function PortalDashboardPage() {
  const session = (await getPortalSession())!;
  const { permissions: p, customer_id, employee_id } = session;

  const [invCount, ticketCount, empCount] = await Promise.all([
    p.inventory
      ? queryOne<{ cnt: string }>(
          p.own_only && employee_id
            ? "SELECT COUNT(*)::text AS cnt FROM inventory_items WHERE employee_id=$1"
            : "SELECT COUNT(*)::text AS cnt FROM inventory_items ii JOIN customer_employees ce ON ce.id=ii.employee_id WHERE ce.customer_id=$1",
          p.own_only && employee_id ? [employee_id] : [customer_id]
        )
      : null,
    p.tickets
      ? queryOne<{ cnt: string }>(
          "SELECT COUNT(*)::text AS cnt FROM tickets WHERE customer_id=$1",
          [customer_id]
        )
      : null,
    p.employees
      ? queryOne<{ cnt: string }>(
          "SELECT COUNT(*)::text AS cnt FROM customer_employees WHERE customer_id=$1",
          [customer_id]
        )
      : null,
  ]);

  const openTickets = p.tickets
    ? await queryOne<{ cnt: string }>(
        "SELECT COUNT(*)::text AS cnt FROM tickets WHERE customer_id=$1 AND status NOT IN ('closed','resolved')",
        [customer_id]
      )
    : null;

  const cards = [
    p.inventory && {
      href: "/portal/inventory",
      label: "Envanter",
      value: invCount?.cnt ?? "0",
      sub: p.own_only ? "Zimmetli cihazlarım" : "Toplam cihaz",
      color: "#3b82f6",
    },
    p.tickets && {
      href: "/portal/tickets",
      label: "Talepler",
      value: ticketCount?.cnt ?? "0",
      sub: `${openTickets?.cnt ?? "0"} açık`,
      color: "#8b5cf6",
    },
    p.employees && {
      href: "/portal/employees",
      label: "Çalışanlar",
      value: empCount?.cnt ?? "0",
      sub: "Toplam kayıt",
      color: "#10b981",
    },
  ].filter(Boolean) as { href: string; label: string; value: string; sub: string; color: string }[];

  const recentTickets = p.tickets
    ? await query<{ id: number; subject: string; status: string; created_at: string }>(
        "SELECT id,subject,status,created_at FROM tickets WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 5",
        [customer_id]
      )
    : [];

  const STATUS_LABEL: Record<string, string> = {
    open: "Açık", in_progress: "İşlemde", waiting: "Bekliyor",
    resolved: "Çözüldü", closed: "Kapatıldı",
  };
  const STATUS_COLOR: Record<string, string> = {
    open: "#3b82f6", in_progress: "#f59e0b", waiting: "#8b5cf6",
    resolved: "#22c55e", closed: "#64748b",
  };

  return (
    <>
      <style>{css}</style>
      <div className="greeting">
        <h1 className="greet-name">Merhaba, {session.full_name.split(" ")[0]} 👋</h1>
        <p className="greet-sub">{session.company_name} portali</p>
      </div>

      {cards.length > 0 && (
        <div className="cards">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="stat-card">
              <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
              <div className="stat-sub">{c.sub}</div>
            </Link>
          ))}
        </div>
      )}

      {recentTickets.length > 0 && (
        <div className="section">
          <div className="sec-head">
            <span className="sec-title">Son Talepler</span>
            <Link href="/portal/tickets" className="sec-link">Tümünü Gör →</Link>
          </div>
          <div className="ticket-list">
            {recentTickets.map((t) => (
              <div key={t.id} className="ticket-row">
                <div className="ticket-info">
                  <span className="ticket-id">#{t.id}</span>
                  <span className="ticket-subject">{t.subject}</span>
                </div>
                <div className="ticket-meta">
                  <span className="status-badge" style={{ color: STATUS_COLOR[t.status] ?? "#64748b", background: (STATUS_COLOR[t.status] ?? "#64748b") + "18" }}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  <span className="ticket-date">{new Date(t.created_at).toLocaleDateString("tr-TR")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="empty-state">
          <p>Portala hoş geldiniz. Kullanılabilir modül bulunamadı.</p>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Yöneticinizle iletişime geçin.</p>
        </div>
      )}
    </>
  );
}

const css = `
.greeting{margin-bottom:24px}
.greet-name{font-size:22px;font-weight:800;color:#0f172a;margin:0 0 4px;letter-spacing:-0.3px}
.greet-sub{font-size:14px;color:#64748b;margin:0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:28px}
.stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-decoration:none;display:flex;flex-direction:column;gap:4px;transition:box-shadow 0.15s,transform 0.1s}
.stat-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.08);transform:translateY(-1px)}
.stat-value{font-size:32px;font-weight:800;line-height:1;letter-spacing:-1px}
.stat-label{font-size:14px;font-weight:700;color:#1e293b;margin-top:6px}
.stat-sub{font-size:12px;color:#64748b}
.section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px}
.sec-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #f1f5f9}
.sec-title{font-size:13px;font-weight:700;color:#1e293b}
.sec-link{font-size:12px;color:#3b82f6;text-decoration:none;font-weight:600}
.sec-link:hover{text-decoration:underline}
.ticket-list{display:flex;flex-direction:column}
.ticket-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #f8fafc;gap:12px}
.ticket-row:last-child{border-bottom:none}
.ticket-info{display:flex;align-items:center;gap:10px;min-width:0}
.ticket-id{font-size:11px;color:#94a3b8;font-weight:700;flex-shrink:0;font-family:monospace}
.ticket-subject{font-size:13px;color:#1e293b;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ticket-meta{display:flex;align-items:center;gap:10px;flex-shrink:0}
.status-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px}
.ticket-date{font-size:11px;color:#94a3b8}
.empty-state{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:40px 24px;text-align:center;color:#64748b;font-size:14px}
`;
