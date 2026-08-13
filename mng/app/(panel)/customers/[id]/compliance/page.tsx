import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { CustomerModuleNav } from "@/components/CustomerModuleNav";

export const dynamic = "force-dynamic";

async function addTask(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid = fd.get("customer_id") as string;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  await query(
    `INSERT INTO compliance_tasks
       (customer_id,title,description,category,frequency,assigned_to,next_due_date,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [cid, get("title"), get("description"),
     fd.get("category") || "other",
     fd.get("frequency") || "monthly",
     get("assigned_to"), get("next_due_date"), session.username]
  );
  redirect(`/customers/${cid}/compliance?_toast=${encodeURIComponent("Görev eklendi")}&_tt=success`);
}

async function completeTask(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid    = fd.get("customer_id") as string;
  const taskId = fd.get("task_id") as string;
  const freq   = fd.get("frequency") as string;

  // Record completion
  await query(
    "INSERT INTO compliance_completions (task_id,completed_by) VALUES ($1,$2)",
    [taskId, session.username]
  );

  // Advance next_due_date based on frequency
  const advanceMap: Record<string, string> = {
    daily: "1 day", weekly: "1 week", monthly: "1 month",
    quarterly: "3 months", biannual: "6 months", annual: "1 year",
  };
  const interval = advanceMap[freq] ?? "1 month";
  await query(
    `UPDATE compliance_tasks SET next_due_date=COALESCE(next_due_date,CURRENT_DATE) + $1::interval WHERE id=$2`,
    [interval, taskId]
  );
  redirect(`/customers/${cid}/compliance?_toast=${encodeURIComponent("Görev tamamlandı olarak işaretlendi")}&_tt=success`);
}

async function toggleTask(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const cid = fd.get("customer_id") as string;
  const id  = fd.get("id") as string;
  await query("UPDATE compliance_tasks SET is_active=NOT is_active WHERE id=$1 AND customer_id=$2", [id, cid]);
  redirect(`/customers/${cid}/compliance?_toast=${encodeURIComponent("Görev durumu güncellendi")}&_tt=info`);
}

const CAT_LABEL: Record<string, string> = {
  backup: "Yedekleme", patch: "Yama Yönetimi", audit: "Denetim",
  training: "Eğitim", review: "Gözden Geçirme", policy: "Politika",
  monitoring: "İzleme", other: "Diğer",
};
const FREQ_LABEL: Record<string, string> = {
  daily: "Günlük", weekly: "Haftalık", monthly: "Aylık",
  quarterly: "3 Aylık", biannual: "6 Aylık", annual: "Yıllık",
};

export default async function CompliancePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { id } = await params;
  const { show = "active" } = await searchParams;
  const session = await getSession();

  const [customer, tasks] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [id]
    ),
    query<{
      id: number; title: string; description: string | null; category: string;
      frequency: string; assigned_to: string | null; next_due_date: string | null;
      is_active: boolean; last_completion: string | null; completion_count: string;
    }>(
      `SELECT t.*,
              (SELECT MAX(completed_at) FROM compliance_completions WHERE task_id=t.id) AS last_completion,
              (SELECT COUNT(*)::text FROM compliance_completions WHERE task_id=t.id) AS completion_count
       FROM compliance_tasks t
       WHERE t.customer_id=$1 ${show === "all" ? "" : show === "inactive" ? "AND t.is_active=false" : "AND t.is_active=true"}
       ORDER BY t.next_due_date ASC NULLS LAST, t.title`,
      [id]
    ),
  ]);
  if (!customer) notFound();

  const isAdmin = session?.role === "admin";
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24*60*60*1000);

  const overdueCount  = tasks.filter(t => t.is_active && t.next_due_date && new Date(t.next_due_date) < now).length;
  const dueSoonCount  = tasks.filter(t => t.is_active && t.next_due_date && new Date(t.next_due_date) >= now && new Date(t.next_due_date) <= new Date(now.getTime() + 7*24*60*60*1000)).length;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="bc-row">
          <Link href="/customers" className="bc">Müşteriler</Link>
          <span className="bc-sep">›</span>
          <Link href={`/customers/${id}`} className="bc">{customer.company_name}</Link>
          <span className="bc-sep">›</span>
          <span className="bc bc-cur">Kontrol Görevleri</span>
        </div>

        <CustomerModuleNav customerId={id} active="compliance" />

        <div className="hdr">
          <h1 className="title">Kontrol Görevleri</h1>
          <div className="filter-tabs">
            <Link href="?show=active"   className={`ftab${show === "active"   ? " active" : ""}`}>Aktif <span>{tasks.filter(t=>t.is_active).length}</span></Link>
            <Link href="?show=inactive" className={`ftab${show === "inactive" ? " active" : ""}`}>Pasif</Link>
            <Link href="?show=all"      className={`ftab${show === "all"      ? " active" : ""}`}>Tümü</Link>
          </div>
        </div>

        {(overdueCount > 0 || dueSoonCount > 0) && show === "active" && (
          <div className="alert-row">
            {overdueCount > 0 && <span className="alert-badge overdue">⚠ {overdueCount} görev gecikmiş</span>}
            {dueSoonCount > 0 && <span className="alert-badge soon">{dueSoonCount} görev bu hafta bitiyor</span>}
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="empty-msg">Görev bulunamadı.</div>
        ) : (
          <div className="list">
            {tasks.map((t) => {
              const isOverdue  = t.is_active && t.next_due_date && new Date(t.next_due_date) < now;
              const isDueSoon  = t.is_active && t.next_due_date && !isOverdue && new Date(t.next_due_date) <= new Date(now.getTime() + 7*24*60*60*1000);
              return (
                <div key={t.id} className={`row${!t.is_active ? " row-inactive" : isOverdue ? " row-overdue" : ""}`}>
                  <div className="row-main">
                    <div className="row-name">{t.title}</div>
                    <div className="row-sub">
                      <span className="cat-badge">{CAT_LABEL[t.category] ?? t.category}</span>
                      <span className="freq-badge">{FREQ_LABEL[t.frequency] ?? t.frequency}</span>
                      {t.assigned_to && <span className="tag-dim">👤 {t.assigned_to}</span>}
                    </div>
                    {t.description && <div className="row-desc">{t.description}</div>}
                  </div>
                  <div className="row-meta">
                    <div className="meta-item">
                      <span className="meta-lbl">Sonraki Tarih</span>
                      <span className={`meta-val${isOverdue ? " clr-red" : isDueSoon ? " clr-amber" : ""}`}>
                        {t.next_due_date ? new Date(t.next_due_date).toLocaleDateString("tr-TR") : "—"}
                        {isOverdue  && <span className="tiny-badge red">Gecikmiş</span>}
                        {isDueSoon  && <span className="tiny-badge amber">Bu Hafta</span>}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-lbl">Tamamlanma</span>
                      <span className="meta-val">{t.completion_count}×</span>
                    </div>
                    {t.last_completion && (
                      <div className="meta-item">
                        <span className="meta-lbl">Son Yapılan</span>
                        <span className="meta-val">{new Date(t.last_completion).toLocaleDateString("tr-TR")}</span>
                      </div>
                    )}
                  </div>
                  <div className="row-actions">
                    {t.is_active && (
                      <form action={completeTask}>
                        <input type="hidden" name="task_id" value={t.id} />
                        <input type="hidden" name="customer_id" value={id} />
                        <input type="hidden" name="frequency" value={t.frequency} />
                        <button type="submit" className="btn-complete">✓ Tamamlandı</button>
                      </form>
                    )}
                    {isAdmin && (
                      <form action={toggleTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="customer_id" value={id} />
                        <button type="submit" className={`btn-toggle${t.is_active ? "" : " inactive"}`}>
                          {t.is_active ? "Pasife Al" : "Aktifleştir"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <details className="add-panel">
          <summary className="add-summary">+ Yeni Görev Ekle</summary>
          <form action={addTask} className="add-form">
            <input type="hidden" name="customer_id" value={id} />
            <div className="fg">
              <div className="f full"><label>Görev Başlığı *</label><input name="title" required placeholder="örn. Aylık yedekleme testi, Güvenlik duvarı kural gözden geçirme" /></div>
              <div className="f">
                <label>Kategori</label>
                <select name="category">
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Sıklık</label>
                <select name="frequency">
                  {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="f"><label>Sorumlu</label><input name="assigned_to" /></div>
              <div className="f"><label>İlk Bitiş Tarihi</label><input type="date" name="next_due_date" /></div>
              <div className="f full"><label>Açıklama</label><textarea name="description" rows={2} /></div>
            </div>
            <div className="form-actions"><button type="submit" className="btn-save">Ekle</button></div>
          </form>
        </details>
      </div>
    </>
  );
}

const css = `
.page{padding:28px;max-width:1000px;display:flex;flex-direction:column;gap:16px}
@media(max-width:640px){.page{padding:16px;gap:12px}}
.bc-row{display:flex;align-items:center;gap:6px;font-size:12px;flex-wrap:wrap}
.bc{color:var(--text-dim);text-decoration:none}.bc:hover{color:var(--text-muted)}
.bc-sep{color:var(--text-ghost)}.bc-cur{color:var(--text-sub);font-weight:600}
.hdr{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.4px;margin:0}
.filter-tabs{display:flex;gap:4px;margin-left:auto}
.ftab{font-size:12px;font-weight:600;padding:5px 12px;border-radius:7px;border:1px solid var(--border2);color:var(--text-dim);text-decoration:none;background:var(--card)}
.ftab:hover{border-color:var(--border)}
.ftab.active{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.35);color:#3b82f6}
.ftab span{font-size:10px;font-weight:700;margin-left:3px;opacity:.7}
.alert-row{display:flex;gap:8px;flex-wrap:wrap}
.alert-badge{font-size:12px;font-weight:700;padding:6px 12px;border-radius:7px}
.alert-badge.overdue{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#ef4444}
.alert-badge.soon{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);color:#f59e0b}
.empty-msg{font-size:13px;color:var(--text-ghost);padding:20px 0}
.list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.row{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--row-border);flex-wrap:wrap}
.row:last-child{border-bottom:none}
.row-inactive{opacity:.5}
.row-overdue{background:rgba(239,68,68,.03)}
.row-main{flex:1;min-width:180px;display:flex;flex-direction:column;gap:5px}
.row-name{font-size:14px;font-weight:700;color:var(--text-sub)}
.row-sub{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.cat-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(99,102,241,.08);color:#6366f1;border:1px solid rgba(99,102,241,.2)}
.freq-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:var(--input-bg);border:1px solid var(--border2);color:var(--text-dimmer)}
.tag-dim{font-size:11px;color:var(--text-ghost)}
.row-desc{font-size:12px;color:var(--text-muted);line-height:1.5}
.row-meta{display:flex;gap:14px;align-items:flex-start;flex-shrink:0;flex-wrap:wrap}
.meta-item{display:flex;flex-direction:column;gap:2px;align-items:center}
.meta-lbl{font-size:9px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:.05em}
.meta-val{font-size:13px;font-weight:700;color:var(--text-muted)}
.clr-red{color:#ef4444!important}
.clr-amber{color:#f59e0b!important}
.tiny-badge{display:inline-block;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;margin-left:4px;border:1px solid}
.tiny-badge.red{color:#ef4444;background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3)}
.tiny-badge.amber{color:#f59e0b;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3)}
.row-actions{display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-items:flex-end}
.btn-complete{font-size:11px;padding:5px 11px;border-radius:6px;border:1px solid rgba(34,197,94,.3);color:#22c55e;background:rgba(34,197,94,.06);cursor:pointer;white-space:nowrap;font-weight:700}
.btn-complete:hover{background:rgba(34,197,94,.12)}
.btn-toggle{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(239,68,68,.3);color:#ef4444;background:transparent;cursor:pointer;white-space:nowrap}
.btn-toggle.inactive{border-color:rgba(34,197,94,.3);color:#22c55e}
.add-panel{border:1px solid var(--border2);border-radius:10px;overflow:hidden}
.add-summary{list-style:none;cursor:pointer;font-size:13px;font-weight:700;color:#3b82f6;padding:14px 16px;background:var(--card);user-select:none}
.add-summary::-webkit-details-marker{display:none}
.add-form{padding:16px;background:var(--input-bg);border-top:1px solid var(--border2)}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:600px){.fg{grid-template-columns:1fr}}
.f{display:flex;flex-direction:column;gap:5px}
.f.full{grid-column:1/-1}
.f label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:.06em}
.f input,.f select,.f textarea{background:var(--card);border:1px solid var(--input-border);border-radius:7px;padding:8px 11px;color:var(--text);font-size:13px;outline:none;font-family:inherit}
.f input:focus,.f select:focus,.f textarea:focus{border-color:#3b82f6}
.form-actions{margin-top:14px;display:flex;justify-content:flex-end}
.btn-save{padding:9px 22px;border-radius:7px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
`;
