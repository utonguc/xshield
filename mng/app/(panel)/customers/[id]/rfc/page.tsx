import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { CustomerModuleNav } from "@/components/CustomerModuleNav";

export const dynamic = "force-dynamic";

async function addRfc(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid = fd.get("customer_id") as string;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;

  // Auto-generate RFC number
  const row = await queryOne<{ cnt: string }>(
    "SELECT COUNT(*)::text AS cnt FROM change_requests WHERE customer_id=$1", [cid]
  );
  const seq = (parseInt(row?.cnt ?? "0") + 1).toString().padStart(4, "0");
  const year = new Date().getFullYear();
  const rfc_no = `RFC-${year}-${seq}`;

  await query(
    `INSERT INTO change_requests
       (customer_id,rfc_no,title,description,change_type,impact,urgency,requestor,assigned_to,planned_date,rollback_plan,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [cid, rfc_no, get("title"), get("description"),
     fd.get("change_type") || "normal",
     fd.get("impact") || "medium",
     fd.get("urgency") || "medium",
     get("requestor"), get("assigned_to"),
     get("planned_date"), get("rollback_plan"), session.username]
  );
  redirect(`/customers/${cid}/rfc?_toast=${encodeURIComponent(`${rfc_no} oluşturuldu`)}&_tt=success`);
}

async function updateRfcStatus(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid    = fd.get("customer_id") as string;
  const id     = fd.get("id") as string;
  const status = fd.get("status") as string;
  const allowed = ["draft","submitted","approved","rejected","completed","cancelled"];
  if (!allowed.includes(status)) return;
  const extra = status === "completed"
    ? ", completed_at=now()"
    : status === "approved"
    ? `, approved_by='${session.username}', approved_at=now()`
    : "";
  await query(`UPDATE change_requests SET status=$1,updated_at=now()${extra} WHERE id=$2 AND customer_id=$3`, [status, id, cid]);
  redirect(`/customers/${cid}/rfc?_toast=${encodeURIComponent("Durum güncellendi")}&_tt=success`);
}

async function deleteRfc(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const cid = fd.get("customer_id") as string;
  const id  = fd.get("id") as string;
  await query("DELETE FROM change_requests WHERE id=$1 AND customer_id=$2", [id, cid]);
  redirect(`/customers/${cid}/rfc?_toast=${encodeURIComponent("RFC silindi")}&_tt=success`);
}

const STATUS_LABEL: Record<string, string>  = { draft: "Taslak", submitted: "İncelemede", approved: "Onaylı", rejected: "Reddedildi", completed: "Tamamlandı", cancelled: "İptal" };
const STATUS_COLOR: Record<string, string>  = { draft: "#64748b", submitted: "#f59e0b", approved: "#22c55e", rejected: "#ef4444", completed: "#6366f1", cancelled: "#94a3b8" };
const IMPACT_LABEL: Record<string, string>  = { low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik" };
const IMPACT_COLOR: Record<string, string>  = { low: "#64748b", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626" };
const TYPE_LABEL: Record<string, string>    = { standard: "Standart", normal: "Normal", emergency: "Acil", major: "Büyük" };

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  draft:     [{ value: "submitted", label: "İncemeye Al" }, { value: "cancelled", label: "İptal Et" }],
  submitted: [{ value: "approved", label: "Onayla" }, { value: "rejected", label: "Reddet" }],
  approved:  [{ value: "completed", label: "Tamamlandı Olarak İşaretle" }, { value: "rejected", label: "Reddet" }],
  rejected:  [{ value: "draft", label: "Yeniden Taslağa Al" }],
  completed: [],
  cancelled: [],
};

export default async function RfcPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status = "active" } = await searchParams;
  const session = await getSession();

  const activeFilter = status !== "all" && status !== "done";
  const doneFilter   = status === "done";

  const [customer, rfcs] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [id]
    ),
    query<{
      id: number; rfc_no: string; title: string; description: string | null;
      change_type: string; impact: string; urgency: string; status: string;
      requestor: string | null; assigned_to: string | null;
      planned_date: string | null; approved_by: string | null;
      created_by: string | null; created_at: string; completed_at: string | null;
    }>(
      `SELECT * FROM change_requests WHERE customer_id=$1
       ${activeFilter ? "AND status NOT IN ('completed','cancelled')" : doneFilter ? "AND status IN ('completed','cancelled')" : ""}
       ORDER BY created_at DESC`,
      [id]
    ),
  ]);
  if (!customer) notFound();

  const isAdmin = session?.role === "admin";
  const activeCount = rfcs.filter(r => !["completed","cancelled"].includes(r.status)).length;
  const doneCount   = rfcs.filter(r =>  ["completed","cancelled"].includes(r.status)).length;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="bc-row">
          <Link href="/customers" className="bc">Müşteriler</Link>
          <span className="bc-sep">›</span>
          <Link href={`/customers/${id}`} className="bc">{customer.company_name}</Link>
          <span className="bc-sep">›</span>
          <span className="bc bc-cur">Değişiklik Talepleri</span>
        </div>

        <CustomerModuleNav customerId={id} active="rfc" />

        <div className="hdr">
          <h1 className="title">Değişiklik Talepleri (RFC)</h1>
          <div className="filter-tabs">
            <Link href="?status=active" className={`ftab${status === "active" ? " active" : ""}`}>Aktif <span>{activeCount}</span></Link>
            <Link href="?status=done"   className={`ftab${status === "done"   ? " active" : ""}`}>Tamamlanan <span>{doneCount}</span></Link>
            <Link href="?status=all"    className={`ftab${status === "all"    ? " active" : ""}`}>Tümü</Link>
          </div>
        </div>

        {rfcs.length === 0 ? (
          <div className="empty-msg">{status === "active" ? "Aktif RFC yok." : "RFC bulunamadı."}</div>
        ) : (
          <div className="list">
            {rfcs.map((r) => {
              const sc = STATUS_COLOR[r.status] ?? "#64748b";
              const ic = IMPACT_COLOR[r.impact] ?? "#64748b";
              const nextActions = NEXT_STATUS[r.status] ?? [];
              return (
                <div key={r.id} className={`row${["completed","cancelled"].includes(r.status) ? " row-done" : ""}`}>
                  <div className="rfc-left">
                    <span className="rfc-no">{r.rfc_no}</span>
                    <span className="rfc-type">{TYPE_LABEL[r.change_type] ?? r.change_type}</span>
                  </div>
                  <div className="row-main">
                    <div className="row-name">{r.title}</div>
                    <div className="row-sub">
                      <span className="imp-badge" style={{ color: ic, borderColor: `${ic}30`, background: `${ic}10` }}>{IMPACT_LABEL[r.impact] ?? r.impact}</span>
                      {r.assigned_to && <span className="tag-dim">→ {r.assigned_to}</span>}
                      {r.planned_date && <span className="tag-dim">📅 {new Date(r.planned_date).toLocaleDateString("tr-TR")}</span>}
                    </div>
                    {r.description && <div className="row-desc">{r.description}</div>}
                  </div>
                  <div className="row-right">
                    <span className="status-badge" style={{ color: sc, borderColor: `${sc}30`, background: `${sc}10` }}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {nextActions.length > 0 && (
                      <div className="next-actions">
                        {nextActions.map((a) => (
                          <form key={a.value} action={updateRfcStatus}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="customer_id" value={id} />
                            <input type="hidden" name="status" value={a.value} />
                            <button type="submit" className="btn-action">{a.label}</button>
                          </form>
                        ))}
                      </div>
                    )}
                    {isAdmin && (
                      <details className="del-wrap">
                        <summary className="btn-del">Sil</summary>
                        <div className="del-popup">
                          <span>Silinsin mi?</span>
                          <form action={deleteRfc}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="customer_id" value={id} />
                            <button type="submit" className="del-confirm">Evet</button>
                          </form>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <details className="add-panel">
          <summary className="add-summary">+ Yeni RFC Oluştur</summary>
          <form action={addRfc} className="add-form">
            <input type="hidden" name="customer_id" value={id} />
            <div className="fg">
              <div className="f full"><label>Başlık *</label><input name="title" required placeholder="Değişikliği kısaca özetleyin" /></div>
              <div className="f">
                <label>Değişiklik Türü</label>
                <select name="change_type">
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Etki Düzeyi</label>
                <select name="impact">
                  {Object.entries(IMPACT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Aciliyet</label>
                <select name="urgency">
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>
              <div className="f"><label>Talep Eden</label><input name="requestor" /></div>
              <div className="f"><label>Atanan</label><input name="assigned_to" /></div>
              <div className="f"><label>Planlanan Tarih</label><input type="date" name="planned_date" /></div>
              <div className="f full"><label>Açıklama</label><textarea name="description" rows={2} /></div>
              <div className="f full"><label>Geri Alma Planı</label><textarea name="rollback_plan" rows={2} placeholder="Değişiklik başarısız olursa nasıl geri alınacak?" /></div>
            </div>
            <div className="form-actions"><button type="submit" className="btn-save">RFC Oluştur</button></div>
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
.empty-msg{font-size:13px;color:var(--text-ghost);padding:20px 0}
.list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.row{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--row-border);flex-wrap:wrap}
.row:last-child{border-bottom:none}
.row-done{opacity:.6}
.rfc-left{display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-start}
.rfc-no{font-size:12px;font-weight:800;color:var(--text-muted);font-family:monospace;letter-spacing:.02em}
.rfc-type{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--input-bg);border:1px solid var(--border2);color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.05em}
.row-main{flex:1;min-width:200px;display:flex;flex-direction:column;gap:5px}
.row-name{font-size:14px;font-weight:700;color:var(--text-sub)}
.row-sub{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.imp-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;border:1px solid}
.tag-dim{font-size:11px;color:var(--text-ghost)}
.row-desc{font-size:12px;color:var(--text-muted);line-height:1.5}
.row-right{display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0}
.status-badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;border:1px solid;white-space:nowrap}
.next-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
.btn-action{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(99,102,241,.3);color:#6366f1;background:rgba(99,102,241,.06);cursor:pointer;white-space:nowrap}
.btn-action:hover{background:rgba(99,102,241,.12)}
.btn-del{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(239,68,68,.3);color:#ef4444;background:transparent;cursor:pointer;list-style:none;user-select:none}
.btn-del:hover{background:rgba(239,68,68,.08)}
.btn-del::-webkit-details-marker{display:none}
.del-wrap{position:relative;flex-shrink:0}
.del-popup{position:absolute;right:0;top:calc(100% + 4px);background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;z-index:20;display:flex;flex-direction:column;gap:7px;min-width:130px;box-shadow:0 4px 16px rgba(0,0,0,.15)}
.del-popup span{font-size:12px;color:var(--text-muted);white-space:nowrap}
.del-confirm{width:100%;padding:6px;border-radius:6px;font-size:12px;font-weight:700;background:#ef4444;color:#fff;border:none;cursor:pointer}
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
