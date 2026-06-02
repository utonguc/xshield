import { query } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

async function getCategories() {
  return query<{ id: number; name: string; color: string }>(
    "SELECT id,name,color FROM ticket_categories ORDER BY sort_order,name"
  );
}

export const metadata: Metadata = { title: "Destek Talepleri — xShield MNG" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Açık", in_progress: "İşlemde", waiting_customer: "Müşteri Bek.",
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

function relTime(date: string | Date) {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} gün`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; customer?: string; category?: string }>;
}) {
  const { status, priority, customer, category } = await searchParams;

  const [tickets, categories] = await Promise.all([
    query<{
      id: number; subject: string; status: string; priority: string; source: string;
      from_email: string; from_name: string; company_name: string;
      created_at: string; updated_at: string;
      assigned_username: string; category_name: string; category_color: string;
      subcategory_name: string; msg_count: string;
    }>(
      `SELECT t.id,t.subject,t.status,t.priority,t.source,t.from_email,
              COALESCE(t.from_name,'') AS from_name,
              t.created_at,t.updated_at,
              COALESCE(c.company_name,t.from_name,t.from_email,'Anonim') AS company_name,
              u.username AS assigned_username,
              tc.name AS category_name, tc.color AS category_color,
              ts.name AS subcategory_name,
              (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id=t.id)::text AS msg_count
       FROM tickets t
       LEFT JOIN customers c ON c.id=t.customer_id
       LEFT JOIN users u ON u.id=t.assigned_to
       LEFT JOIN ticket_categories tc ON tc.id=t.category_id
       LEFT JOIN ticket_subcategories ts ON ts.id=t.subcategory_id
       WHERE ($1::text IS NULL OR t.status=$1)
         AND ($2::text IS NULL OR t.priority=$2)
         AND ($3::text IS NULL OR t.customer_id=$3::int)
         AND ($4::text IS NULL OR t.category_id=$4::int)
       ORDER BY
         CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
         t.updated_at DESC`,
      [status || null, priority || null, customer || null, category || null]
    ),
    getCategories(),
  ]);

  const makeLink = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (priority) p.set("priority", priority);
    if (customer) p.set("customer", customer);
    if (category) p.set("category", category);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    const s = p.toString();
    return `/tickets${s ? `?${s}` : ""}`;
  };

  // Quick stat counts
  const totalOpen = tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length;
  const criticalOpen = tickets.filter((t) => t.priority === "critical" && !["resolved", "closed"].includes(t.status)).length;
  const resolved = tickets.filter((t) => ["resolved", "closed"].includes(t.status)).length;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="page-header">
          <div className="page-title-row">
            <h1 className="title">Destek Talepleri</h1>
            <div className="header-stats">
              <span className="hstat"><span className="hstat-dot" style={{ background: "#f59e0b" }} />{totalOpen} aktif</span>
              {criticalOpen > 0 && <span className="hstat hstat-critical"><span className="hstat-dot" style={{ background: "#ef4444" }} />{criticalOpen} kritik</span>}
              <span className="hstat"><span className="hstat-dot" style={{ background: "#22c55e" }} />{resolved} çözüldü</span>
            </div>
          </div>
          <Link href="/tickets/new" className="btn-primary">+ Yeni Talep</Link>
        </div>

        <div className="tabs">
          <span className="tab active">Talepler</span>
          <Link href="/tickets/categories" className="tab">Kategoriler</Link>
          <Link href="/tickets/canned" className="tab">Hazır Yanıtlar</Link>
          <Link href="/tickets/export" className="tab">CSV Export/Import</Link>
        </div>

        <div className="toolbar">
          <div className="filter-row">
            <span className="filter-label">Durum</span>
            <div className="filter-chips">
              {["", "open", "in_progress", "waiting_customer", "resolved", "closed"].map((s) => {
                const active = (status || "") === s;
                const c = s ? STATUS_COLOR[s] : undefined;
                return (
                  <Link key={s} href={makeLink({ status: s })}
                    className={`chip ${active ? "chip-active" : ""}`}
                    style={active && c ? { color: c, background: `${c}18`, borderColor: `${c}35` } : {}}>
                    {s ? STATUS_LABEL[s] : "Tümü"}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">Öncelik</span>
            <div className="filter-chips">
              {["", "critical", "high", "normal", "low"].map((p) => {
                const active = (priority || "") === p;
                const c = p ? PRIORITY_COLOR[p] : undefined;
                return (
                  <Link key={p} href={makeLink({ priority: p })}
                    className={`chip ${active ? "chip-active" : ""}`}
                    style={active && c ? { color: c, background: `${c}18`, borderColor: `${c}35` } : {}}>
                    {p ? PRIORITY_LABEL[p] : "Tümü"}
                  </Link>
                );
              })}
            </div>
          </div>
          {categories.length > 0 && (
            <div className="filter-row">
              <span className="filter-label">Kategori</span>
              <div className="filter-chips">
                <Link href={makeLink({ category: "" })} className={`chip ${!category ? "chip-active" : ""}`}>Tümü</Link>
                {categories.map((c) => (
                  <Link key={c.id} href={makeLink({ category: String(c.id) })}
                    className={`chip ${category === String(c.id) ? "chip-active" : ""}`}
                    style={category === String(c.id) ? { color: c.color, background: `${c.color}18`, borderColor: `${c.color}35` } : {}}>
                    <span className="cat-dot" style={{ background: c.color }} />
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {tickets.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">◎</div>
            <div>Talep bulunamadı.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Talep</th>
                  <th>Müşteri / Gönderen</th>
                  <th>Kategori</th>
                  <th>Durum</th>
                  <th>Atanan</th>
                  <th style={{ textAlign: "right" }}>Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const sc = STATUS_COLOR[t.status] ?? "#64748b";
                  const pc = PRIORITY_COLOR[t.priority] ?? "#64748b";
                  const msgCount = Number(t.msg_count);
                  const sender = t.from_name || t.from_email || "";
                  return (
                    <tr key={t.id} className="ticket-row">
                      <td className="id-cell">
                        <span className="prio-bar" style={{ background: pc }} />
                        <span className="id-num">#{t.id}</span>
                      </td>
                      <td className="subject-cell">
                        <Link href={`/tickets/${t.id}`} className="subject-link">
                          {t.subject}
                        </Link>
                        <div className="subject-meta">
                          {t.source === "email" && <span className="src-tag src-email">e-posta</span>}
                          {t.source === "manual" && <span className="src-tag src-manual">manuel</span>}
                          <span className="badge-sm" style={{ color: pc, background: `${pc}15`, borderColor: `${pc}28` }}>
                            {PRIORITY_LABEL[t.priority] ?? t.priority}
                          </span>
                          <span className="created-dim" title={new Date(t.created_at).toLocaleString("tr-TR")}>
                            açıldı: {new Date(t.created_at).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                      </td>
                      <td className="customer-cell">
                        <div className="customer-name">{t.company_name}</div>
                        {sender && sender !== t.company_name && (
                          <div className="sender-email">{sender}</div>
                        )}
                      </td>
                      <td className="cat-cell">
                        {t.category_name ? (
                          <>
                            <span className="cat-tag" style={{ color: t.category_color, background: `${t.category_color}15`, borderColor: `${t.category_color}28` }}>
                              {t.category_name}
                            </span>
                            {t.subcategory_name && <div className="subcat">{t.subcategory_name}</div>}
                          </>
                        ) : <span className="dim">—</span>}
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: sc, background: `${sc}15`, borderColor: `${sc}28` }}>
                          <span className="status-dot" style={{ background: sc }} />
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="assign-cell">
                        {t.assigned_username
                          ? <span className="assignee">{t.assigned_username}</span>
                          : <span className="dim">Atanmamış</span>}
                      </td>
                      <td className="time-cell">
                        <span className="rel-time" title={new Date(t.updated_at).toLocaleString("tr-TR")}>
                          {relTime(t.updated_at)}
                        </span>
                        {msgCount > 0 && (
                          <span className="msg-count">{msgCount} mesaj</span>
                        )}
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
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:16px}
.page-title-row{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.header-stats{display:flex;align-items:center;gap:12px}
.hstat{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--text-muted)}
.hstat-critical{color:#ef4444}
.hstat-dot{width:7px;height:7px;border-radius:50%}
.btn-primary{background:#2563eb;color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;white-space:nowrap;flex-shrink:0}
.btn-primary:hover{background:#1d4ed8}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--divider);margin-bottom:20px}
.tab{padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;text-decoration:none}
.tab:hover{color:var(--text-muted)}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6}
.toolbar{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.filter-row{display:flex;align-items:center;gap:10px}
.filter-label{font-size:10px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.07em;width:60px;flex-shrink:0}
.filter-chips{display:flex;gap:5px;flex-wrap:wrap}
.chip{padding:5px 11px;border-radius:6px;font-size:12px;font-weight:600;color:var(--text-dim);border:1px solid transparent;transition:all 0.12s;cursor:pointer;text-decoration:none}
.chip:hover{color:var(--text-muted);background:var(--input-bg)}
.chip-active{background:var(--nav-active-bg);color:var(--nav-active-text);border-color:rgba(59,130,246,0.2)}
.cat-dot{display:inline-block;width:6px;height:6px;border-radius:2px;margin-right:4px;vertical-align:middle}
.empty{padding:60px;text-align:center;color:var(--text-ghost);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:10px}
.empty-icon{font-size:28px;opacity:0.3}
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.table{width:100%;border-collapse:collapse}
.table th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--divider);background:var(--input-bg)}
.table td{padding:13px 14px;border-bottom:1px solid var(--row-border);vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.ticket-row:hover td{background:var(--row-hover)}
/* id cell */
.id-cell{white-space:nowrap;position:relative;padding-left:18px!important}
.prio-bar{position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0}
.id-num{font-size:11px;font-weight:700;color:var(--text-dimmer)}
/* subject cell */
.subject-cell{max-width:340px}
.subject-link{font-size:13px;font-weight:600;color:var(--text-sub);display:block;margin-bottom:5px}
.subject-link:hover{color:#3b82f6}
.subject-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.src-tag{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;text-transform:uppercase;letter-spacing:0.05em}
.src-email{background:rgba(59,130,246,0.1);color:#60a5fa;border:1px solid rgba(59,130,246,0.2)}
.src-manual{background:rgba(100,116,139,0.1);color:#94a3b8;border:1px solid rgba(100,116,139,0.2)}
.badge-sm{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;border:1px solid;white-space:nowrap}
.created-dim{font-size:10px;color:var(--text-ghost)}
/* customer cell */
.customer-cell{min-width:140px;max-width:200px}
.customer-name{font-size:13px;font-weight:600;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sender-email{font-size:11px;color:var(--text-ghost);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
/* cat cell */
.cat-cell{min-width:120px}
.cat-tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;border:1px solid;white-space:nowrap}
.subcat{font-size:10px;color:var(--text-ghost);margin-top:3px}
/* status */
.status-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 9px;border-radius:6px;border:1px solid;white-space:nowrap}
.status-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
/* assignee */
.assign-cell{}
.assignee{font-size:12px;font-weight:600;color:var(--text-muted)}
.dim{font-size:12px;color:var(--text-ghost)}
/* time cell */
.time-cell{text-align:right;white-space:nowrap}
.rel-time{font-size:12px;font-weight:600;color:var(--text-dim);display:block}
.msg-count{font-size:10px;color:var(--text-ghost);margin-top:3px;display:block}
`;
