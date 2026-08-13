import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { CustomerModuleNav } from "@/components/CustomerModuleNav";

export const dynamic = "force-dynamic";

async function addRisk(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid = fd.get("customer_id") as string;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  await query(
    `INSERT INTO customer_risks
       (customer_id,title,description,category,impact,likelihood,owner,mitigation_plan,target_date,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [cid, get("title"), get("description"), fd.get("category") || "other",
     parseInt(fd.get("impact") as string) || 3,
     parseInt(fd.get("likelihood") as string) || 3,
     get("owner"), get("mitigation_plan"), get("target_date"), session.username]
  );
  redirect(`/customers/${cid}/risks?_toast=${encodeURIComponent("Risk eklendi")}&_tt=success`);
}

async function closeRisk(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid = fd.get("customer_id") as string;
  const id  = fd.get("id") as string;
  const cur = fd.get("current_status") as string;
  const newStatus = cur === "open" ? "closed" : "open";
  await query("UPDATE customer_risks SET status=$1,updated_at=now() WHERE id=$2 AND customer_id=$3", [newStatus, id, cid]);
  redirect(`/customers/${cid}/risks?_toast=${encodeURIComponent(newStatus === "closed" ? "Risk kapatıldı" : "Risk yeniden açıldı")}&_tt=info`);
}

async function deleteRisk(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const cid = fd.get("customer_id") as string;
  const id  = fd.get("id") as string;
  await query("DELETE FROM customer_risks WHERE id=$1 AND customer_id=$2", [id, cid]);
  redirect(`/customers/${cid}/risks?_toast=${encodeURIComponent("Risk silindi")}&_tt=success`);
}

function scoreColor(s: number) {
  if (s >= 15) return "#ef4444";
  if (s >= 8)  return "#f59e0b";
  return "#22c55e";
}
function scoreLabel(s: number) {
  if (s >= 15) return "Kritik";
  if (s >= 8)  return "Yüksek";
  if (s >= 4)  return "Orta";
  return "Düşük";
}

const CAT_LABEL: Record<string, string> = {
  security: "Güvenlik", compliance: "Uyumluluk", operational: "Operasyonel",
  financial: "Finansal", technical: "Teknik", other: "Diğer",
};

export default async function RisksPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status = "open" } = await searchParams;
  const session = await getSession();

  const [customer, risks] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [id]
    ),
    query<{
      id: number; title: string; description: string | null; category: string;
      impact: number; likelihood: number; status: string;
      owner: string | null; mitigation_plan: string | null;
      target_date: string | null; created_at: string;
    }>(
      `SELECT * FROM customer_risks WHERE customer_id=$1
       ${status === "all" ? "" : "AND status=$2"}
       ORDER BY (impact*likelihood) DESC, created_at DESC`,
      status === "all" ? [id] : [id, status]
    ),
  ]);
  if (!customer) notFound();

  const isAdmin = session?.role === "admin";
  const openCount   = risks.filter(r => r.status === "open").length;
  const closedCount = risks.filter(r => r.status === "closed").length;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="bc-row">
          <Link href="/customers" className="bc">Müşteriler</Link>
          <span className="bc-sep">›</span>
          <Link href={`/customers/${id}`} className="bc">{customer.company_name}</Link>
          <span className="bc-sep">›</span>
          <span className="bc bc-cur">Risk Listesi</span>
        </div>

        <CustomerModuleNav customerId={id} active="risks" />

        <div className="hdr">
          <h1 className="title">Risk Listesi</h1>
          <div className="filter-tabs">
            <Link href={`?status=open`}   className={`ftab${status === "open"   ? " active" : ""}`}>Açık <span>{openCount}</span></Link>
            <Link href={`?status=closed`} className={`ftab${status === "closed" ? " active" : ""}`}>Kapalı <span>{closedCount}</span></Link>
            <Link href={`?status=all`}    className={`ftab${status === "all"    ? " active" : ""}`}>Tümü</Link>
          </div>
        </div>

        {risks.length === 0 ? (
          <div className="empty-msg">{status === "open" ? "Açık risk yok." : "Risk bulunamadı."}</div>
        ) : (
          <div className="list">
            {risks.map((r) => {
              const score = r.impact * r.likelihood;
              const sc = scoreColor(score);
              return (
                <div key={r.id} className={`row${r.status === "closed" ? " row-closed" : ""}`}>
                  <div className="score-box" style={{ color: sc, borderColor: `${sc}30`, background: `${sc}10` }}>
                    <span className="score-num">{score}</span>
                    <span className="score-lbl">{scoreLabel(score)}</span>
                  </div>
                  <div className="row-main">
                    <div className="row-name">{r.title}</div>
                    <div className="row-sub">
                      <span className="cat-tag">{CAT_LABEL[r.category] ?? r.category}</span>
                      {r.owner && <span className="tag-dim">👤 {r.owner}</span>}
                      {r.target_date && <span className="tag-dim">📅 {new Date(r.target_date).toLocaleDateString("tr-TR")}</span>}
                    </div>
                    {r.description && <div className="row-desc">{r.description}</div>}
                    {r.mitigation_plan && <div className="row-mit"><span className="mit-lbl">Aksiyon:</span> {r.mitigation_plan}</div>}
                  </div>
                  <div className="row-ixl">
                    <div className="ixl-item"><span className="ixl-lbl">Etki</span><span className="ixl-val">{r.impact}</span></div>
                    <span className="ixl-x">×</span>
                    <div className="ixl-item"><span className="ixl-lbl">Olasılık</span><span className="ixl-val">{r.likelihood}</span></div>
                  </div>
                  <div className="row-actions">
                    <form action={closeRisk}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="customer_id" value={id} />
                      <input type="hidden" name="current_status" value={r.status} />
                      <button type="submit" className={`btn-toggle${r.status === "closed" ? " reopen" : ""}`}>
                        {r.status === "open" ? "Kapat" : "Yeniden Aç"}
                      </button>
                    </form>
                    {isAdmin && (
                      <details className="del-wrap">
                        <summary className="btn-del">Sil</summary>
                        <div className="del-popup">
                          <span>Silinsin mi?</span>
                          <form action={deleteRisk}>
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
          <summary className="add-summary">+ Yeni Risk Ekle</summary>
          <form action={addRisk} className="add-form">
            <input type="hidden" name="customer_id" value={id} />
            <div className="fg">
              <div className="f full"><label>Risk Başlığı *</label><input name="title" required placeholder="örn. Kritik sunucularda MFA eksikliği" /></div>
              <div className="f">
                <label>Kategori</label>
                <select name="category">
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="f"><label>Sorumlu</label><input name="owner" placeholder="Kişi veya departman" /></div>
              <div className="f">
                <label>Etki (1-5)</label>
                <select name="impact">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["Çok Düşük","Düşük","Orta","Yüksek","Kritik"][n-1]}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Olasılık (1-5)</label>
                <select name="likelihood">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["Çok Düşük","Düşük","Orta","Yüksek","Çok Yüksek"][n-1]}</option>)}
                </select>
              </div>
              <div className="f"><label>Hedef Tarih</label><input type="date" name="target_date" /></div>
              <div className="f full"><label>Açıklama</label><textarea name="description" rows={2} /></div>
              <div className="f full"><label>Aksiyon Planı</label><textarea name="mitigation_plan" rows={2} placeholder="Riskin azaltılması için alınacak önlemler" /></div>
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
.ftab:hover{border-color:var(--border);color:var(--text-muted)}
.ftab.active{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.35);color:#3b82f6}
.ftab span{font-size:10px;font-weight:700;margin-left:3px;opacity:.7}
.empty-msg{font-size:13px;color:var(--text-ghost);padding:20px 0}
.list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.row{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--row-border);flex-wrap:wrap}
.row:last-child{border-bottom:none}
.row-closed{opacity:.6}
.score-box{display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 12px;border-radius:8px;border:1px solid;flex-shrink:0;min-width:54px}
.score-num{font-size:18px;font-weight:900;line-height:1}
.score-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;opacity:.8}
.row-main{flex:1;min-width:200px;display:flex;flex-direction:column;gap:5px}
.row-name{font-size:14px;font-weight:700;color:var(--text-sub)}
.row-sub{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.cat-tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--input-bg);border:1px solid var(--border2);color:var(--text-dimmer)}
.tag-dim{font-size:11px;color:var(--text-ghost)}
.row-desc{font-size:12px;color:var(--text-muted);line-height:1.5}
.row-mit{font-size:11px;color:var(--text-dim);line-height:1.5}
.mit-lbl{font-weight:700;color:var(--text-dimmer)}
.row-ixl{display:flex;align-items:center;gap:4px;flex-shrink:0}
.ixl-item{display:flex;flex-direction:column;align-items:center;gap:1px}
.ixl-lbl{font-size:9px;font-weight:600;color:var(--text-ghost);text-transform:uppercase}
.ixl-val{font-size:16px;font-weight:800;color:var(--text-muted)}
.ixl-x{font-size:12px;color:var(--text-ghost);margin-top:8px}
.row-actions{display:flex;gap:6px;flex-shrink:0;align-items:flex-start}
.btn-toggle{font-size:11px;padding:5px 11px;border-radius:6px;border:1px solid rgba(34,197,94,.3);color:#22c55e;background:rgba(34,197,94,.06);cursor:pointer;white-space:nowrap}
.btn-toggle:hover{background:rgba(34,197,94,.12)}
.btn-toggle.reopen{border-color:rgba(99,102,241,.3);color:#6366f1;background:rgba(99,102,241,.06)}
.btn-del{font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid rgba(239,68,68,.3);color:#ef4444;background:transparent;cursor:pointer;list-style:none;user-select:none}
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
