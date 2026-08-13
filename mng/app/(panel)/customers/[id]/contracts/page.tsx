import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { CustomerModuleNav } from "@/components/CustomerModuleNav";

export const dynamic = "force-dynamic";

async function addContract(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const cid = fd.get("customer_id") as string;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  await query(
    `INSERT INTO customer_vendor_contracts
       (customer_id,vendor_name,service_type,contract_no,start_date,end_date,monthly_fee,currency,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [cid, get("vendor_name"), get("service_type"), get("contract_no"),
     get("start_date"), get("end_date"),
     get("monthly_fee") ? parseFloat(get("monthly_fee")!) : null,
     fd.get("currency") || "TRY", get("notes")]
  );
  redirect(`/customers/${cid}/contracts?_toast=${encodeURIComponent("Sözleşme eklendi")}&_tt=success`);
}

async function deleteContract(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const cid = fd.get("customer_id") as string;
  const id  = fd.get("id") as string;
  await query("DELETE FROM customer_vendor_contracts WHERE id=$1 AND customer_id=$2", [id, cid]);
  redirect(`/customers/${cid}/contracts?_toast=${encodeURIComponent("Sözleşme silindi")}&_tt=success`);
}

export default async function ContractsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const [customer, contracts] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [id]
    ),
    query<{
      id: number; vendor_name: string; service_type: string | null;
      contract_no: string | null; start_date: string | null; end_date: string | null;
      monthly_fee: number | null; currency: string; notes: string | null;
    }>(
      "SELECT * FROM customer_vendor_contracts WHERE customer_id=$1 ORDER BY end_date ASC NULLS LAST, vendor_name",
      [id]
    ),
  ]);
  if (!customer) notFound();

  const isAdmin = session?.role === "admin";
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
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
          <span className="bc bc-cur">Dış Sözleşmeler</span>
        </div>

        <CustomerModuleNav customerId={id} active="contracts" />

        <div className="hdr">
          <h1 className="title">Dış Sözleşmeler</h1>
          <span className="count">{contracts.length} kayıt</span>
        </div>

        {/* List */}
        {contracts.length === 0 ? (
          <div className="empty-msg">Henüz dış sözleşme eklenmemiş.</div>
        ) : (
          <div className="list">
            {contracts.map((c) => {
              const expired = c.end_date && new Date(c.end_date) < now;
              const expiring = c.end_date && !expired && new Date(c.end_date) < soon;
              const rowCls = expired ? " row-expired" : expiring ? " row-expiring" : "";
              return (
                <div key={c.id} className={`row${rowCls}`}>
                  <div className="row-main">
                    <div className="row-name">{c.vendor_name}</div>
                    <div className="row-sub">
                      {c.service_type && <span className="tag">{c.service_type}</span>}
                      {c.contract_no  && <span className="tag-dim">#{c.contract_no}</span>}
                    </div>
                    {c.notes && <div className="row-notes">{c.notes}</div>}
                  </div>
                  <div className="row-dates">
                    <span className="date-lbl">Başlangıç</span>
                    <span className="date-val">{c.start_date ? new Date(c.start_date).toLocaleDateString("tr-TR") : "—"}</span>
                    <span className="date-sep">→</span>
                    <span className="date-lbl">Bitiş</span>
                    <span className={`date-val${expired ? " date-red" : expiring ? " date-amber" : ""}`}>
                      {c.end_date ? new Date(c.end_date).toLocaleDateString("tr-TR") : "Açık Uçlu"}
                      {expired  && <span className="badge-exp">Süresi Doldu</span>}
                      {expiring && <span className="badge-soon">Yakında Bitiyor</span>}
                    </span>
                  </div>
                  <div className="row-right">
                    {c.monthly_fee != null && (
                      <span className="fee">{CUR[c.currency] ?? c.currency}{Number(c.monthly_fee).toLocaleString("tr-TR")}<span className="fee-sub">/ay</span></span>
                    )}
                    {isAdmin && (
                      <details className="del-wrap">
                        <summary className="btn-del">Sil</summary>
                        <div className="del-popup">
                          <span>Silinsin mi?</span>
                          <form action={deleteContract}>
                            <input type="hidden" name="id" value={c.id} />
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

        {/* Add form */}
        <details className="add-panel">
          <summary className="add-summary">+ Yeni Sözleşme Ekle</summary>
          <form action={addContract} className="add-form">
            <input type="hidden" name="customer_id" value={id} />
            <div className="fg">
              <div className="f full"><label>Tedarikçi / Firma *</label><input name="vendor_name" required placeholder="örn. Microsoft, Fortinet..." /></div>
              <div className="f"><label>Hizmet Türü</label><input name="service_type" placeholder="örn. Lisans, Destek, Bakım" /></div>
              <div className="f"><label>Sözleşme No</label><input name="contract_no" placeholder="SZ-2024-001" /></div>
              <div className="f"><label>Başlangıç Tarihi</label><input type="date" name="start_date" /></div>
              <div className="f"><label>Bitiş Tarihi</label><input type="date" name="end_date" /></div>
              <div className="f"><label>Aylık Ücret</label><input type="number" step="0.01" name="monthly_fee" placeholder="0.00" /></div>
              <div className="f">
                <label>Para Birimi</label>
                <select name="currency">
                  <option value="TRY">TRY ₺</option>
                  <option value="USD">USD $</option>
                  <option value="EUR">EUR €</option>
                </select>
              </div>
              <div className="f full"><label>Notlar</label><textarea name="notes" rows={2} /></div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-save">Ekle</button>
            </div>
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
.row{display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid var(--row-border);flex-wrap:wrap}
.row:last-child{border-bottom:none}
.row-expired{background:rgba(239,68,68,.03)}
.row-expiring{background:rgba(245,158,11,.03)}
.row-main{flex:1;min-width:160px;display:flex;flex-direction:column;gap:4px}
.row-name{font-size:14px;font-weight:700;color:var(--text-sub)}
.row-sub{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tag{font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px;background:rgba(59,130,246,.08);color:#3b82f6;border:1px solid rgba(59,130,246,.2)}
.row-notes{font-size:12px;color:var(--text-dim);line-height:1.5;margin-top:3px}
.tag-dim{font-size:11px;color:var(--text-ghost);font-family:monospace}
.row-dates{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;flex-shrink:0}
.date-lbl{color:var(--text-ghost);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
.date-val{color:var(--text-muted);font-weight:600}
.date-sep{color:var(--text-ghost);font-size:10px}
.date-red{color:#ef4444!important}
.date-amber{color:#f59e0b!important}
.badge-exp{font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.25);margin-left:5px}
.badge-soon{font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.25);margin-left:5px}
.row-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.fee{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.3px}
.fee-sub{font-size:10px;font-weight:500;color:var(--text-ghost);margin-left:1px}
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
.f textarea{resize:vertical}
.form-actions{margin-top:14px;display:flex;justify-content:flex-end}
.btn-save{padding:9px 22px;border-radius:7px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
`;
