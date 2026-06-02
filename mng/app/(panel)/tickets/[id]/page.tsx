import { notFound, redirect } from "next/navigation";
import { CategorySelect } from "@/components/CategorySelect";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendTicketNotification } from "@/lib/mail";
import Link from "next/link";
import type { Metadata } from "next";
import { ReplyBox } from "./_reply";

/* ─── Server Actions ─────────────────────────── */
async function postReply(fd: FormData) {
  "use server";
  const ticketId = Number(fd.get("ticket_id"));
  const body = (fd.get("body") as string)?.trim();
  const authorName = fd.get("author_name") as string;
  const isInternal = fd.get("is_internal") === "1";
  if (!body) return;

  await query(
    "INSERT INTO ticket_messages (ticket_id,author_type,author_name,body,is_internal) VALUES ($1,'agent',$2,$3,$4)",
    [ticketId, authorName, body, isInternal]
  );
  await query(
    "UPDATE tickets SET updated_at=now(),status=CASE WHEN status='open' THEN 'in_progress' ELSE status END WHERE id=$1",
    [ticketId]
  );
  if (!isInternal) {
    const ticket = await queryOne<{ subject: string; from_email: string; customer_id: number }>(
      "SELECT subject,from_email,customer_id FROM tickets WHERE id=$1", [ticketId]
    );
    const customerEmail =
      ticket?.from_email ??
      (ticket?.customer_id
        ? (await queryOne<{ contact_email: string }>("SELECT contact_email FROM customers WHERE id=$1", [ticket.customer_id]))?.contact_email
        : null);
    if (customerEmail) await sendTicketNotification(customerEmail, ticket!.subject, body, ticketId);
  }
  redirect(`/tickets/${ticketId}`);
}

async function changeStatus(fd: FormData) {
  "use server";
  const ticketId = fd.get("ticket_id");
  const newStatus = fd.get("status");
  await query(
    "UPDATE tickets SET status=$1::text,updated_at=now(),resolved_at=CASE WHEN $1::text=ANY(ARRAY['resolved','closed']) THEN now() ELSE resolved_at END WHERE id=$2",
    [newStatus, ticketId]
  );
  redirect(`/tickets/${ticketId}`);
}

async function changePriority(fd: FormData) {
  "use server";
  const ticketId = fd.get("ticket_id");
  const priority = fd.get("priority");
  await query("UPDATE tickets SET priority=$1,updated_at=now() WHERE id=$2", [priority, ticketId]);
  redirect(`/tickets/${ticketId}`);
}

async function assignTicket(fd: FormData) {
  "use server";
  const ticketId = fd.get("ticket_id");
  const userId = fd.get("user_id") || null;
  await query("UPDATE tickets SET assigned_to=$1,updated_at=now() WHERE id=$2", [userId, ticketId]);
  redirect(`/tickets/${ticketId}`);
}

async function linkCustomer(fd: FormData) {
  "use server";
  const ticketId = fd.get("ticket_id");
  const customerId = fd.get("customer_id") || null;
  await query("UPDATE tickets SET customer_id=$1,updated_at=now() WHERE id=$2", [customerId, ticketId]);
  redirect(`/tickets/${ticketId}?_toast=${encodeURIComponent("Müşteri bağlandı")}&_tt=success`);
}

async function setCategory(fd: FormData) {
  "use server";
  const ticketId = fd.get("ticket_id");
  const categoryId = fd.get("category_id") || null;
  const subcategoryId = fd.get("subcategory_id") || null;
  await query("UPDATE tickets SET category_id=$1,subcategory_id=$2,updated_at=now() WHERE id=$3", [categoryId, subcategoryId, ticketId]);
  redirect(`/tickets/${ticketId}?_toast=${encodeURIComponent("Kategori güncellendi")}&_tt=success`);
}

/* ─── Labels ─────────────────────────────────── */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await queryOne<{ subject: string }>("SELECT subject FROM tickets WHERE id=$1", [id]);
  return { title: t ? `#${id} ${t.subject} — xShield MNG` : "Talep" };
}

const STATUS_LABEL: Record<string, string> = {
  open: "Açık", in_progress: "İşlemde", waiting_customer: "Müşteri Bekleniyor",
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
const STATUS_ORDER = ["open", "in_progress", "waiting_customer", "resolved", "closed"];

function fmt(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initial(name: string): string {
  return (name || "?").trim()[0].toUpperCase();
}

/* ─── Page ───────────────────────────────────── */
export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const [ticket, messages, users, allCustomers, rawCats, cannedResponses] = await Promise.all([
    queryOne<{
      id: number; subject: string; body: string; status: string; priority: string;
      source: string; from_email: string; from_name: string;
      created_at: string; updated_at: string; resolved_at: string | null;
      assigned_to: number; company_name: string; customer_id: number;
      assigned_username: string; category_id: number; subcategory_id: number;
      category_name: string; category_color: string; subcategory_name: string;
      sla_response_hours: number | null; sla_resolution_hours: number | null;
      contact_phone: string | null; contact_email: string | null;
      first_response_at: string | null;
    }>(
      `SELECT t.*,
              COALESCE(c.company_name,t.from_name,t.from_email,'Anonim') AS company_name,
              u.username AS assigned_username,
              tc.name AS category_name, tc.color AS category_color,
              ts.name AS subcategory_name,
              c.sla_response_hours, c.sla_resolution_hours,
              c.contact_phone, c.contact_email,
              (SELECT MIN(tm.created_at) FROM ticket_messages tm
               WHERE tm.ticket_id=t.id AND tm.author_type='agent') AS first_response_at
       FROM tickets t
       LEFT JOIN customers c ON c.id=t.customer_id
       LEFT JOIN users u ON u.id=t.assigned_to
       LEFT JOIN ticket_categories tc ON tc.id=t.category_id
       LEFT JOIN ticket_subcategories ts ON ts.id=t.subcategory_id
       WHERE t.id=$1`, [id]
    ),
    query<{ id: number; author_type: string; author_name: string; body: string; is_internal: boolean; created_at: string }>(
      "SELECT * FROM ticket_messages WHERE ticket_id=$1 ORDER BY created_at", [id]
    ),
    query<{ id: number; username: string }>("SELECT id,username FROM users WHERE is_active=true ORDER BY username"),
    query<{ id: number; company_name: string }>("SELECT id,company_name FROM customers ORDER BY company_name"),
    query<{ id: number; name: string; color: string; sub_id: number | null; sub_name: string | null }>(
      `SELECT tc.id,tc.name,tc.color,ts.id AS sub_id,ts.name AS sub_name
       FROM ticket_categories tc
       LEFT JOIN ticket_subcategories ts ON ts.category_id=tc.id
       ORDER BY tc.sort_order,tc.name,ts.sort_order,ts.name`
    ),
    query<{ id: number; title: string; body: string }>(
      "SELECT id,title,body FROM canned_responses ORDER BY sort_order,title"
    ),
  ]);

  const allCategories = Object.values(
    rawCats.reduce<Record<number, { id: number; name: string; color: string; subcategories: { id: number; name: string }[] }>>((acc, r) => {
      if (!acc[r.id]) acc[r.id] = { id: r.id, name: r.name, color: r.color, subcategories: [] };
      if (r.sub_id) acc[r.id].subcategories.push({ id: r.sub_id, name: r.sub_name! });
      return acc;
    }, {})
  );

  if (!ticket) notFound();

  // Find employee matching ticket's from_email (for device panel)
  const matchedEmployee = ticket.customer_id && ticket.from_email
    ? await queryOne<{ id: number; first_name: string; last_name: string; department: string; title: string }>(
        "SELECT id,first_name,last_name,department,title FROM customer_employees WHERE customer_id=$1 AND LOWER(email)=LOWER($2)",
        [ticket.customer_id, ticket.from_email]
      )
    : null;

  const employeeDevices = matchedEmployee
    ? await query<{ id: number; name: string; category: string; brand: string; model: string; serial_no: string }>(
        "SELECT id,name,category,brand,model,serial_no FROM inventory_items WHERE employee_id=$1 ORDER BY category,name",
        [matchedEmployee.id]
      )
    : [];

  const sc = STATUS_COLOR[ticket.status] ?? "#64748b";
  const pc = PRIORITY_COLOR[ticket.priority] ?? "#64748b";
  const isOpen = !["resolved", "closed"].includes(ticket.status);
  const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;

  function slaCalc(limitHours: number | null, label: string) {
    if (!limitHours || !isOpen) return null;
    const remaining = limitHours - ageHours;
    const pct = Math.min(100, Math.round((ageHours / limitHours) * 100));
    const color = remaining < 0 ? "#ef4444" : remaining < limitHours * 0.25 ? "#f59e0b" : "#22c55e";
    const text = remaining < 0
      ? `${label}: ${Math.round(-remaining)}s aşıldı`
      : `${label}: ${Math.round(remaining)}s kaldı`;
    return { color, text, pct };
  }
  const slaRespStatus = slaCalc(ticket.sla_response_hours, "Yanıt SLA");
  const slaResStatus = slaCalc(ticket.sla_resolution_hours, "Çözüm SLA");

  return (
    <>
      <style>{css}</style>
      <div className="page">

        {/* ── Top nav ── */}
        <div className="page-nav">
          <Link href="/tickets" className="back">← Destek Talepleri</Link>
          <span className="ticket-num">#{ticket.id}</span>
        </div>

        {/* ── Title block ── */}
        <div className="title-block">
          <h1 className="ticket-subject">{ticket.subject}</h1>
          <div className="meta-row">
            <span className="status-badge" style={{ color: sc, background: `${sc}18`, borderColor: `${sc}30` }}>
              <span className="sdot" style={{ background: sc }} />
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </span>
            <span className="prio-badge" style={{ color: pc, background: `${pc}12`, borderColor: `${pc}28` }}>
              {PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
            </span>
            {ticket.source === "email" && <span className="src-chip">e-posta</span>}
            {ticket.source === "manual" && <span className="src-chip src-manual">manuel</span>}
            <span className="meta-divider" />
            {ticket.customer_id
              ? <Link href={`/customers/${ticket.customer_id}`} className="meta-company">{ticket.company_name}</Link>
              : <span className="meta-dim">{ticket.company_name}</span>}
            {ticket.from_email && <span className="meta-dim">{ticket.from_email}</span>}
            <span className="meta-dim">{fmt(ticket.created_at)}</span>
          </div>
        </div>

        {/* ── Two-column ── */}
        <div className="thread-layout">

          {/* ── Left: conversation ── */}
          <div className="thread-col">

            {/* Initial body */}
            {ticket.body && (
              <div className="msg customer-msg">
                <div className="msg-head">
                  <span className="av av-customer">{initial(ticket.from_name || ticket.from_email || "?")}</span>
                  <div className="msg-meta">
                    <span className="msg-author">{ticket.from_name || ticket.from_email || ticket.company_name}</span>
                    <span className="msg-sublabel">İlk Mesaj</span>
                  </div>
                  <span className="msg-time">{fmt(ticket.created_at)}</span>
                </div>
                <div className="msg-body">{ticket.body}</div>
              </div>
            )}

            {/* Thread messages */}
            {messages.map((m) => {
              const isAgent = m.author_type === "agent";
              const avCls = m.is_internal ? "av-internal" : isAgent ? "av-agent" : "av-customer";
              return (
                <div key={m.id} className={`msg${isAgent && !m.is_internal ? " agent-msg" : ""}${m.is_internal ? " internal-msg" : ""}`}>
                  <div className="msg-head">
                    <span className={`av ${avCls}`}>{initial(m.author_name || m.author_type)}</span>
                    <div className="msg-meta">
                      <span className="msg-author">{m.author_name || m.author_type}</span>
                      {m.is_internal
                        ? <span className="int-tag">İÇ NOT</span>
                        : <span className="msg-sublabel">{isAgent ? "Destek Ekibi" : "Müşteri"}</span>}
                    </div>
                    <span className="msg-time">{fmt(m.created_at)}</span>
                  </div>
                  <div className="msg-body">{m.body}</div>
                </div>
              );
            })}

            {/* Reply box */}
            <ReplyBox ticketId={ticket.id} authorName={session?.username ?? "Agent"} postReply={postReply} cannedResponses={cannedResponses} />
          </div>

          {/* ── Sidebar ── */}
          <aside className="sidebar">

            {/* Status */}
            <div className="scard">
              <div className="scard-label">Durum</div>
              <div className="status-current">
                <span className="sdot" style={{ background: sc }} />
                <span style={{ color: sc, fontWeight: 700, fontSize: 13 }}>{STATUS_LABEL[ticket.status]}</span>
              </div>
              <form action={changeStatus} className="status-grid">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                {STATUS_ORDER.filter((s) => s !== ticket.status).map((s) => {
                  const c = STATUS_COLOR[s];
                  return (
                    <button key={s} type="submit" name="status" value={s}
                      className="s-btn" style={{ color: c, borderColor: `${c}30`, background: `${c}10` }}>
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </form>
            </div>

            {/* Priority */}
            <div className="scard">
              <div className="scard-label">Öncelik</div>
              <form action={changePriority} className="prio-grid">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                {(["critical", "high", "normal", "low"] as const).map((p) => {
                  const c = PRIORITY_COLOR[p];
                  const active = ticket.priority === p;
                  return (
                    <button key={p} type="submit" name="priority" value={p}
                      className={`prio-btn${active ? " prio-active" : ""}`}
                      style={active ? { color: c, background: `${c}18`, borderColor: `${c}35` } : {}}>
                      {PRIORITY_LABEL[p]}
                    </button>
                  );
                })}
              </form>
            </div>

            {/* Assigned to */}
            <div className="scard">
              <div className="scard-label">Atanan</div>
              {ticket.assigned_username
                ? <div className="assignee-name">{ticket.assigned_username}</div>
                : <div className="unassigned">Atanmamış</div>}
              <form action={assignTicket} className="select-row">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <select name="user_id" className="small-sel" defaultValue={ticket.assigned_to ?? ""}>
                  <option value="">— Atanmamış —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <button type="submit" className="small-btn">Ata</button>
              </form>
            </div>

            {/* Customer */}
            <div className="scard">
              <div className="scard-label">Müşteri</div>
              {ticket.customer_id
                ? <Link href={`/customers/${ticket.customer_id}`} className="cust-link">{ticket.company_name}</Link>
                : <div className="unassigned">{ticket.company_name || "—"}</div>}
              {ticket.contact_email && <div className="detail-row">{ticket.contact_email}</div>}
              {ticket.contact_phone && <div className="detail-row">{ticket.contact_phone}</div>}
              {ticket.from_email && ticket.from_email !== ticket.contact_email && (
                <div className="detail-row detail-dim">Talep: {ticket.from_email}</div>
              )}
              <form action={linkCustomer} className="select-row" style={{ marginTop: 10 }}>
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <select name="customer_id" className="small-sel" defaultValue={ticket.customer_id ?? ""}>
                  <option value="">— Bağlantısız —</option>
                  {allCustomers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                <button type="submit" className="small-btn">Bağla</button>
              </form>
            </div>

            {/* Category */}
            <div className="scard">
              <div className="scard-label">Kategori</div>
              {ticket.category_name && (
                <div className="cat-current">
                  <span className="cat-pill"
                    style={{ color: ticket.category_color, background: `${ticket.category_color}15`, borderColor: `${ticket.category_color}30` }}>
                    {ticket.category_name}{ticket.subcategory_name ? ` / ${ticket.subcategory_name}` : ""}
                  </span>
                </div>
              )}
              {allCategories.length > 0 && (
                <form action={setCategory} className="cat-form-inner">
                  <input type="hidden" name="ticket_id" value={ticket.id} />
                  <CategorySelect
                    categories={allCategories}
                    defaultCategoryId={ticket.category_id}
                    defaultSubcategoryId={ticket.subcategory_id}
                  />
                  <button type="submit" className="small-btn" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                    Kaydet
                  </button>
                </form>
              )}
            </div>

            {/* Dates */}
            <div className="scard">
              <div className="scard-label">Tarihler</div>
              <div className="dates">
                <div className="date-row">
                  <span className="dl">Açıldı</span>
                  <span className="dv">{fmt(ticket.created_at)}</span>
                </div>
                {ticket.first_response_at && (
                  <div className="date-row">
                    <span className="dl">İlk Yanıt</span>
                    <span className="dv">{fmt(ticket.first_response_at)}</span>
                  </div>
                )}
                {ticket.resolved_at && (
                  <div className="date-row">
                    <span className="dl">Çözüldü</span>
                    <span className="dv">{fmt(ticket.resolved_at)}</span>
                  </div>
                )}
                <div className="date-row">
                  <span className="dl">Güncellendi</span>
                  <span className="dv">{fmt(ticket.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* SLA */}
            {(slaRespStatus || slaResStatus) && (
              <div className="scard">
                <div className="scard-label">SLA</div>
                {[slaRespStatus, slaResStatus].filter(Boolean).map((s) => s && (
                  <div key={s.text} className="sla-row">
                    <div className="sla-text" style={{ color: s.color }}>{s.text}</div>
                    <div className="sla-track">
                      <div className="sla-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Employee devices */}
            {matchedEmployee && (
              <div className="scard">
                <div className="scard-label">Çalışan Cihazları</div>
                <div className="emp-info-line">
                  <span className="emp-name-sm">{matchedEmployee.first_name} {matchedEmployee.last_name}</span>
                  {(matchedEmployee.title || matchedEmployee.department) && (
                    <span className="emp-sub-sm">
                      {[matchedEmployee.title, matchedEmployee.department].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                {employeeDevices.length === 0 ? (
                  <div className="emp-nodev">Zimmetli cihaz yok.</div>
                ) : (
                  <div className="emp-dev-list">
                    {employeeDevices.map((d) => (
                      <div key={d.id} className="emp-dev-row">
                        <span className="emp-dev-name">{d.name}</span>
                        {(d.brand || d.model) && (
                          <span className="emp-dev-sub">{[d.brand, d.model].filter(Boolean).join(" ")}</span>
                        )}
                        {d.serial_no && <span className="emp-dev-serial">{d.serial_no}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/customers/${ticket.customer_id}/employees/${matchedEmployee.id}/zimmet`}
                  className="zimmet-link">Zimmet Formu →</Link>
              </div>
            )}

          </aside>
        </div>
      </div>
    </>
  );
}

const css = `
/* ── Page ── */
.page{padding:24px;max-width:1100px;display:flex;flex-direction:column;gap:16px}
@media(max-width:640px){.page{padding:16px;gap:12px}}

/* ── Nav ── */
.page-nav{display:flex;align-items:center;gap:14px}
.back{font-size:13px;color:var(--text-dimmer)}
.back:hover{color:var(--text-muted)}
.ticket-num{font-size:12px;font-weight:700;color:var(--text-ghost)}

/* ── Title block ── */
.title-block{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px 24px}
@media(max-width:640px){.title-block{padding:16px}}
.ticket-subject{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.4px;margin-bottom:12px;line-height:1.3}
.meta-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.status-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;border:1px solid;white-space:nowrap}
.sdot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.prio-badge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:5px;border:1px solid;white-space:nowrap}
.src-chip{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(59,130,246,0.1);color:#60a5fa;border:1px solid rgba(59,130,246,0.2);text-transform:uppercase;letter-spacing:0.05em}
.src-manual{background:rgba(100,116,139,0.1);color:#94a3b8;border-color:rgba(100,116,139,0.2)}
.meta-divider{width:1px;height:12px;background:var(--divider);flex-shrink:0}
.meta-company{font-size:12px;font-weight:600;color:#3b82f6}
.meta-dim{font-size:12px;color:var(--text-dim)}

/* ── Two-column ── */
.thread-layout{display:grid;grid-template-columns:1fr 292px;gap:16px;align-items:start}
@media(max-width:900px){.thread-layout{grid-template-columns:1fr}}

/* ── Thread ── */
.thread-col{display:flex;flex-direction:column;gap:10px}

/* ── Messages ── */
.msg{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.agent-msg{border-left:3px solid #3b82f6}
.internal-msg{border-left:3px solid #f59e0b;background:rgba(245,158,11,0.025)}
.msg-head{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--input-bg);border-bottom:1px solid var(--row-border)}
.av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.av-customer{background:rgba(148,163,184,0.12);color:#94a3b8}
.av-agent{background:rgba(59,130,246,0.12);color:#3b82f6}
.av-internal{background:rgba(245,158,11,0.12);color:#f59e0b}
.msg-meta{flex:1;min-width:0}
.msg-author{font-size:13px;font-weight:700;color:var(--text-sub);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.msg-sublabel{font-size:10px;color:var(--text-ghost);font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
.int-tag{font-size:9px;background:rgba(245,158,11,0.15);color:#f59e0b;padding:1px 6px;border-radius:4px;font-weight:700;border:1px solid rgba(245,158,11,0.25)}
.msg-time{font-size:11px;color:var(--text-dimmer);white-space:nowrap;flex-shrink:0}
.msg-body{padding:14px 16px;font-size:13px;color:var(--text-muted);line-height:1.75;white-space:pre-wrap;word-break:break-word}

/* ── Reply box (shared CSS — client component renders inside) ── */
.reply-box{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.reply-internal{border-color:rgba(245,158,11,0.35)}
.reply-top{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--divider);flex-wrap:wrap;gap:4px}
.reply-tabs{display:flex}
.canned-sel{margin:6px 8px;font-size:12px;color:var(--text-muted);background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;padding:5px 8px;outline:none;cursor:pointer;max-width:220px}
.rtab{padding:11px 18px;font-size:13px;font-weight:600;color:var(--text-dim);border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s}
.rtab:hover{color:var(--text-muted)}
.rtab-active{color:#3b82f6;border-bottom-color:#3b82f6}
.rtab-int-active{color:#f59e0b;border-bottom-color:#f59e0b}
.reply-ta{width:100%;background:var(--input-bg);border:none;padding:14px 16px;color:var(--text);resize:vertical;outline:none;font-size:13px;line-height:1.65;min-height:100px;font-family:inherit}
.reply-ta-int{background:rgba(245,158,11,0.03)}
.int-warn{padding:6px 16px;font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.08);border-top:1px solid rgba(245,158,11,0.15)}
.reply-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid var(--divider);background:var(--input-bg);gap:12px}
.reply-as{font-size:11px;color:var(--text-ghost)}
.btn-send{padding:9px 22px;border-radius:7px;font-size:13px;font-weight:700;border:none;cursor:pointer;color:#fff;background:#2563eb;min-height:38px}
.btn-send:hover{background:#1d4ed8}
.btn-send-int{background:#d97706}
.btn-send-int:hover{background:#b45309}

/* ── Sidebar ── */
.sidebar{display:flex;flex-direction:column;gap:10px}
.scard{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.scard-label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px}

/* Status */
.status-current{display:flex;align-items:center;gap:6px;margin-bottom:10px}
.status-grid{display:flex;flex-wrap:wrap;gap:5px}
.s-btn{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid;background:transparent;transition:opacity 0.12s;min-height:30px}
.s-btn:hover{opacity:0.75}

/* Priority */
.prio-grid{display:flex;flex-wrap:wrap;gap:5px}
.prio-btn{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--input-border);color:var(--text-dim);background:transparent;transition:all 0.12s;min-height:30px}
.prio-btn:hover{color:var(--text-muted);border-color:var(--border2)}
.prio-active{border-width:1.5px}

/* Assignee & Customer */
.assignee-name{font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:8px}
.unassigned{font-size:12px;color:var(--text-ghost);margin-bottom:8px}
.cust-link{font-size:14px;font-weight:700;color:#3b82f6;display:block;margin-bottom:4px}
.detail-row{font-size:12px;color:var(--text-dim);margin-bottom:2px}
.detail-dim{color:var(--text-ghost)}

/* Category */
.cat-current{margin-bottom:8px}
.cat-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;border:1px solid;white-space:nowrap}
.cat-form-inner{display:flex;flex-direction:column;gap:6px}
.cat-form-inner .cat-wrap{display:flex;flex-direction:column;gap:6px}
.cat-form-inner .field{display:flex;flex-direction:column;gap:3px}
.cat-form-inner .field label{font-size:9px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.cat-form-inner .field select{background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:7px 10px;color:var(--text-muted);font-size:12px;outline:none;width:100%}

/* Inline forms */
.select-row{display:flex;gap:6px;align-items:center}
.small-sel{flex:1;min-width:0;background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:7px 10px;color:var(--text-muted);font-size:12px;outline:none}
.small-btn{padding:7px 12px;border-radius:7px;font-size:12px;font-weight:600;background:var(--input-bg);color:var(--text-muted);border:1px solid var(--input-border);cursor:pointer;white-space:nowrap;flex-shrink:0;min-height:36px}
.small-btn:hover{border-color:var(--border2);color:var(--text)}

/* Dates */
.dates{display:flex;flex-direction:column;gap:0}
.date-row{display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;gap:8px}
.date-row+.date-row{border-top:1px solid var(--row-border)}
.dl{font-size:11px;color:var(--text-ghost);white-space:nowrap;flex-shrink:0}
.dv{font-size:11px;color:var(--text-dim);text-align:right}

/* SLA */
.sla-row{margin-bottom:10px}
.sla-row:last-child{margin-bottom:0}
.sla-text{font-size:11px;font-weight:600;margin-bottom:5px}
.sla-track{height:4px;background:var(--input-bg);border-radius:2px;overflow:hidden}
.sla-fill{height:100%;border-radius:2px}

/* Employee devices sidebar */
.emp-info-line{display:flex;flex-direction:column;gap:1px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--row-border)}
.emp-name-sm{font-size:13px;font-weight:700;color:var(--text-sub)}
.emp-sub-sm{font-size:11px;color:var(--text-ghost)}
.emp-nodev{font-size:12px;color:var(--text-ghost);padding:4px 0}
.emp-dev-list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.emp-dev-row{display:flex;flex-direction:column;gap:1px;padding:7px 10px;background:var(--input-bg);border:1px solid var(--border2);border-radius:7px}
.emp-dev-name{font-size:12px;font-weight:600;color:var(--text-muted)}
.emp-dev-sub{font-size:11px;color:var(--text-dim)}
.emp-dev-serial{font-size:10px;font-family:monospace;color:var(--text-ghost)}
.zimmet-link{font-size:11px;font-weight:600;color:#3b82f6;display:inline-block;margin-top:4px}

/* Mobile adjustments */
@media(max-width:600px){
  .meta-row{gap:6px}
  .msg-time{display:none}
  .ticket-subject{font-size:17px}
  .reply-footer{flex-direction:column;align-items:flex-end;gap:8px}
  .reply-as{display:none}
}
`;
