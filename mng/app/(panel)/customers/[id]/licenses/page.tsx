import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { CustomerModuleNav } from "@/components/CustomerModuleNav";

export const dynamic = "force-dynamic";

async function addLicense(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid = fd.get("customer_id") as string;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  await query(
    `INSERT INTO customer_licenses
       (customer_id,name,category,vendor,license_key,quantity,start_date,end_date,cost,currency,auto_renew,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [cid, get("name"), fd.get("category") || "other", get("vendor"),
     get("license_key"), parseInt(fd.get("quantity") as string) || 1,
     get("start_date"), get("end_date"),
     get("cost") ? parseFloat(get("cost")!) : null,
     fd.get("currency") || "TRY",
     fd.get("auto_renew") === "1", get("notes")]
  );
  redirect(`/customers/${cid}/licenses?_toast=${encodeURIComponent("Lisans eklendi")}&_tt=success`);
}

async function deleteLicense(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const cid = fd.get("customer_id") as string;
  const id  = fd.get("id") as string;
  await query("DELETE FROM customer_licenses WHERE id=$1 AND customer_id=$2", [id, cid]);
  redirect(`/customers/${cid}/licenses?_toast=${encodeURIComponent("Lisans silindi")}&_tt=success`);
}

const CAT_LABEL: Record<string, string> = {
  os: "İşletim Sistemi", office: "Office / Üretkenlik", antivirus: "Antivirüs / EDR",
  firewall: "Firewall / Güvenlik", cloud: "Bulut Hizmet", erp: "ERP / CRM",
  backup: "Yedekleme", other: "Diğer",
};
const CAT_COLOR: Record<string, string> = {
  os: "#6366f1", office: "#3b82f6", antivirus: "#22c55e", firewall: "#ef4444",
  cloud: "#0891b2", erp: "#f59e0b", backup: "#8b5cf6", other: "#64748b",
};

export default async function LicensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const [customer, licenses] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [id]
    ),
    query<{
      id: number; name: string; category: string; vendor: string | null;
      license_key: string | null; quantity: number; start_date: string | null;
      end_date: string | null; cost: number | null; currency: string;
      auto_renew: boolean; notes: string | null;
    }>(
      "SELECT * FROM customer_licenses WHERE customer_id=$1 ORDER BY end_date ASC NULLS LAST, name",
      [id]
    ),
  ]);
  if (!customer) notFound();

  const isAdmin = session?.role === "admin";
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const CUR: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="bc-row">
          <Link href="/customers" className="bc">Müşteriler</Link>
          <span className="bc-sep">›</span>
          <Link href={`/customers/${id}`} className="bc">{customer.company_name}</Link>
          <span className="bc-sep">›</span>
          <span className="bc bc-cur">Lisanslar</span>
        </div>

        <CustomerModuleNav customerId={id} active="licenses" />

        <div className="hdr">
          <h1 className="title">Lisanslar</h1>
          <span className="count">{licenses.length} lisans · {licenses.reduce((s, l) => s + l.quantity, 0)} kullanıcı</span>
        </div>

        {licenses.length === 0 ? (
          <div className="empty-msg">Henüz lisans eklenmemiş.</div>
        ) : (
          <div className="list">
            {licenses.map((l) => {
              const expired  = l.end_date && new Date(l.end_date) < now;
              const expiring = l.end_date && !expired && new Date(l.end_date) < soon;
              const cc = CAT_COLOR[l.category] ?? "#64748b";
              return (
                <div key={l.id} className={`row${expired ? " row-expired" : expiring ? " row-expiring" : ""}`}>
                  <div className="row-cat" style={{ color: cc, background: `${cc}12`, borderColor: `${cc}25` }}>
                    {CAT_LABEL[l.category] ?? l.category}
                  </div>
                  <div className="row-main">
                    <div className="row-name">{l.name}</div>
                    <div className="row-sub">
                      {l.vendor && <span className="tag-dim">{l.vendor}</span>}
                      {l.license_key && <span className="key-tag">🔑 {l.license_key.slice(0,20)}{l.license_key.length > 20 ? "…" : ""}</span>}
                    </div>
                  </div>
                  <div className="row-meta">
                    <div className="meta-item">
                      <span className="meta-lbl">Adet</span>
                      <span className="meta-val">{l.quantity}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-lbl">Bitiş</span>
                      <span className={`meta-val${expired ? " clr-red" : expiring ? " clr-amber" : ""}`}>
                        {l.end_date ? new Date(l.end_date).toLocaleDateString("tr-TR") : "Süresiz"}
                        {expired  && <span className="badge-exp">Doldu</span>}
                        {expiring && <span className="badge-soon">Yakında</span>}
                      </span>
                    </div>
                    {l.cost != null && (
                      <div className="meta-item">
                        <span className="meta-lbl">Maliyet</span>
                        <span className="meta-val">{CUR[l.currency] ?? l.currency}{Number(l.cost).toLocaleString("tr-TR")}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="meta-lbl">Yenileme</span>
                      <span className={`meta-val${l.auto_renew ? " clr-green" : ""}`}>{l.auto_renew ? "Otomatik" : "Manuel"}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <details className="del-wrap">
                      <summary className="btn-del">Sil</summary>
                      <div className="del-popup">
                        <span>Silinsin mi?</span>
                        <form action={deleteLicense}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="customer_id" value={id} />
                          <button type="submit" className="del-confirm">Evet</button>
                        </form>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <details className="add-panel">
          <summary className="add-summary">+ Yeni Lisans Ekle</summary>
          <form action={addLicense} className="add-form">
            <input type="hidden" name="customer_id" value={id} />
            <div className="fg">
              <div className="f full"><label>Lisans Adı *</label><input name="name" required placeholder="örn. Windows 11 Pro, Microsoft 365..." /></div>
              <div className="f">
                <label>Kategori</label>
                <select name="category">
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="f"><label>Tedarikçi</label><input name="vendor" placeholder="Microsoft, ESET..." /></div>
              <div className="f"><label>Lisans Anahtarı</label><input name="license_key" placeholder="XXXXX-XXXXX-..." /></div>
              <div className="f"><label>Adet</label><input type="number" name="quantity" min="1" defaultValue="1" /></div>
              <div className="f"><label>Başlangıç</label><input type="date" name="start_date" /></div>
              <div className="f"><label>Bitiş</label><input type="date" name="end_date" /></div>
              <div className="f"><label>Maliyet (yıllık/toplam)</label><input type="number" step="0.01" name="cost" placeholder="0.00" /></div>
              <div className="f">
                <label>Para Birimi</label>
                <select name="currency"><option value="TRY">TRY ₺</option><option value="USD">USD $</option><option value="EUR">EUR €</option></select>
              </div>
              <div className="f">
                <label>Otomatik Yenileme</label>
                <select name="auto_renew"><option value="0">Hayır</option><option value="1">Evet</option></select>
              </div>
              <div className="f full"><label>Notlar</label><textarea name="notes" rows={2} /></div>
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
.count{font-size:12px;color:var(--text-ghost);font-weight:600;background:var(--input-bg);border:1px solid var(--border2);border-radius:6px;padding:3px 9px}
.empty-msg{font-size:13px;color:var(--text-ghost);padding:20px 0}
.list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--row-border);flex-wrap:wrap}
.row:last-child{border-bottom:none}
.row-expired{background:rgba(239,68,68,.03)}
.row-expiring{background:rgba(245,158,11,.03)}
.row-cat{font-size:10px;font-weight:800;padding:4px 8px;border-radius:6px;border:1px solid;white-space:nowrap;letter-spacing:.04em;flex-shrink:0}
.row-main{flex:1;min-width:140px;display:flex;flex-direction:column;gap:3px}
.row-name{font-size:13px;font-weight:700;color:var(--text-sub)}
.row-sub{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tag-dim{font-size:11px;color:var(--text-ghost)}
.key-tag{font-size:10px;color:var(--text-dimmer);font-family:monospace;background:var(--input-bg);border:1px solid var(--border2);border-radius:4px;padding:1px 5px}
.row-meta{display:flex;gap:16px;flex-wrap:wrap;align-items:center;flex-shrink:0}
.meta-item{display:flex;flex-direction:column;align-items:center;gap:1px}
.meta-lbl{font-size:9px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:.05em}
.meta-val{font-size:13px;font-weight:700;color:var(--text-muted)}
.clr-red{color:#ef4444!important}
.clr-amber{color:#f59e0b!important}
.clr-green{color:#22c55e!important}
.badge-exp{font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.25);margin-left:4px}
.badge-soon{font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.25);margin-left:4px}
.btn-del{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(239,68,68,.3);color:#ef4444;background:transparent;cursor:pointer;flex-shrink:0;list-style:none;user-select:none}
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
