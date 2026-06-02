import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { AddInventoryForm } from "./_add_form";
import { InventoryTable } from "./InventoryTable";

export const metadata: Metadata = { title: "Envanter — xShield MNG" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { active: "Aktif", maintenance: "Bakımda", retired: "Hizmetten Çıktı" };

async function createItem(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  const empId = get("employee_id");
  const assignedDate = empId ? (get("assigned_date") || new Date().toISOString().split("T")[0]) : null;
  await query(
    `INSERT INTO inventory_items
       (customer_id,employee_id,name,category,brand,model,serial_no,asset_tag,status,purchase_date,assigned_date,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [get("customer_id"), empId || null, get("name"), get("category") || "other",
     get("brand"), get("model"), get("serial_no"), get("asset_tag"),
     get("status") || "active", get("purchase_date"), assignedDate, get("notes")]
  );
  redirect(`/inventory?_toast=${encodeURIComponent("Envanter eklendi")}&_tt=success`);
}

async function updateItem(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  const id = fd.get("id");
  const empId = get("employee_id");
  const assignedDate = empId ? (get("assigned_date") || new Date().toISOString().split("T")[0]) : null;
  await query(
    `UPDATE inventory_items SET name=$1,category=$2,brand=$3,model=$4,serial_no=$5,
     asset_tag=$6,status=$7,purchase_date=$8,notes=$9,employee_id=$10,assigned_date=$11,
     customer_id=$12,updated_at=now()
     WHERE id=$13`,
    [get("name"), get("category") || "other", get("brand"), get("model"),
     get("serial_no"), get("asset_tag"), get("status") || "active",
     get("purchase_date"), get("notes"), empId || null, assignedDate,
     get("customer_id"), id]
  );
  redirect(`/inventory?_toast=${encodeURIComponent("Güncellendi")}&_tt=success`);
}

async function createDefinition(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  const name = get("def_name");
  if (!name) return;
  await query(
    "INSERT INTO inventory_definitions (name,category,brand,model) VALUES ($1,$2,$3,$4)",
    [name, get("def_category") || "other", get("def_brand"), get("def_model")]
  );
  redirect(`/inventory?_toast=${encodeURIComponent("Tanım eklendi")}&_tt=success#tanimlamalar`);
}

async function deleteDefinition(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  await query("DELETE FROM inventory_definitions WHERE id=$1", [fd.get("def_id")]);
  redirect(`/inventory?_toast=${encodeURIComponent("Tanım silindi")}&_tt=success#tanimlamalar`);
}

async function createCategory(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const label = (fd.get("cat_label") as string)?.trim();
  if (!label) return;
  const key = label.toLowerCase()
    .replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s")
    .replace(/ı/g,"i").replace(/ö/g,"o").replace(/ç/g,"c")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
  const order = Number((fd.get("cat_order") as string)?.trim() || "0");
  await query(
    "INSERT INTO inventory_categories (key,label,sort_order) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET label=$2,sort_order=$3",
    [key || `cat_${Date.now()}`, label, order]
  );
  redirect(`/inventory?_toast=${encodeURIComponent("Kategori eklendi")}&_tt=success#tanimlamalar`);
}

async function deleteCategory(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  await query("DELETE FROM inventory_categories WHERE id=$1", [fd.get("cat_id")]);
  redirect(`/inventory?_toast=${encodeURIComponent("Kategori silindi")}&_tt=success#tanimlamalar`);
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; category?: string; status?: string; edit?: string }>;
}) {
  const { customer, category, status, edit } = await searchParams;
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const [items, customers, allEmployees, definitions, categories] = await Promise.all([
    query<{
      id: number; name: string; category: string; brand: string; model: string;
      serial_no: string; asset_tag: string; status: string; assigned_date: string;
      purchase_date: string; notes: string; customer_id: number;
      company_name: string; employee_id: number | null;
      emp_first: string | null; emp_last: string | null;
    }>(
      `SELECT i.*,c.company_name,
              e.first_name AS emp_first, e.last_name AS emp_last
       FROM inventory_items i
       JOIN customers c ON c.id=i.customer_id
       LEFT JOIN customer_employees e ON e.id=i.employee_id
       WHERE ($1::int IS NULL OR i.customer_id=$1)
         AND ($2::text IS NULL OR i.category=$2)
         AND ($3::text IS NULL OR i.status=$3)
       ORDER BY c.company_name, i.category, i.name`,
      [customer ? Number(customer) : null, category || null, status || null]
    ),
    query<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE status='active' ORDER BY company_name"
    ),
    query<{ id: number; first_name: string; last_name: string; customer_id: number }>(
      "SELECT id,first_name,last_name,customer_id FROM customer_employees WHERE is_active=true ORDER BY last_name,first_name"
    ),
    query<{ id: number; name: string; category: string; brand: string | null; model: string | null }>(
      "SELECT id,name,category,brand,model FROM inventory_definitions ORDER BY name"
    ),
    query<{ id: number; key: string; label: string; sort_order: number }>(
      "SELECT id,key,label,sort_order FROM inventory_categories ORDER BY sort_order,label"
    ),
  ]);

  const catMap = Object.fromEntries(categories.map((c) => [c.key, c.label]));
  const editId = edit ? Number(edit) : null;
  const filters = { ...(customer && { customer }), ...(category && { category }), ...(status && { status }) };

  function makeLink(patch: Record<string, string>) {
    const p = new URLSearchParams({ ...filters, ...patch });
    return `/inventory?${p}`;
  }

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="title">Envanter</h1>
            <p className="subtitle">{items.length} kayıt{customer ? ` · ${customers.find(c => c.id === Number(customer))?.company_name ?? ""}` : ""}</p>
          </div>
          <div className="hdr-actions">
            <a href={`/api/inventory/export?${new URLSearchParams({ ...(customer && { customer }), ...(category && { category }), ...(status && { status }) })}`}
              className="btn-export">CSV İndir</a>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <span className="fl">Müşteri</span>
            <div className="chips">
              <Link href={makeLink({ customer: "" })} className={`chip${!customer ? " chip-active" : ""}`}>Tümü</Link>
              {customers.map((c) => (
                <Link key={c.id} href={makeLink({ customer: String(c.id) })}
                  className={`chip${customer === String(c.id) ? " chip-active" : ""}`}>{c.company_name}</Link>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="fl">Kategori</span>
            <div className="chips">
              <Link href={makeLink({ category: "" })} className={`chip${!category ? " chip-active" : ""}`}>Tümü</Link>
              {categories.map((c) => (
                <Link key={c.key} href={makeLink({ category: c.key })}
                  className={`chip${category === c.key ? " chip-active" : ""}`}>{c.label}</Link>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="fl">Durum</span>
            <div className="chips">
              <Link href={makeLink({ status: "" })} className={`chip${!status ? " chip-active" : ""}`}>Tümü</Link>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <Link key={k} href={makeLink({ status: k })} className={`chip${status === k ? " chip-active" : ""}`}>{v}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Add form (client component) */}
        <details className="panel">
          <summary className="panel-summary">+ Yeni Envanter Ekle</summary>
          <AddInventoryForm
            customers={customers}
            allEmployees={allEmployees}
            definitions={definitions}
            categories={categories}
            createItem={createItem}
            defaultCustomer={customer}
          />
        </details>

        {/* Table */}
        <InventoryTable
          items={items}
          editId={editId}
          isAdmin={isAdmin}
          catMap={catMap}
          customers={customers}
          allEmployees={allEmployees}
          definitions={definitions}
          categories={categories}
          updateItem={updateItem}
          filters={filters}
        />

        {/* ── Tanımlamalar ── */}
        <details className="panel" id="tanimlamalar">
          <summary className="panel-summary panel-summary-alt">⚙ Tanımlamalar</summary>
          <div className="def-panel">

            {/* ── Kategoriler ── */}
            <div className="def-section">
              <div className="def-section-title">Kategoriler</div>
              <p className="def-intro">Envanter kategorilerini buradan tanımlayın. Sıra numarası küçük olan üstte görünür.</p>
              {categories.length > 0 && (
                <div className="def-table-wrap">
                  <table className="def-table">
                    <thead>
                      <tr><th>Etiket</th><th>Anahtar (key)</th><th>Sıra</th><th></th></tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id}>
                          <td className="def-name">{c.label}</td>
                          <td className="mono-sm">{c.key}</td>
                          <td className="dim">{c.sort_order}</td>
                          <td>
                            {isAdmin && (
                              <form action={deleteCategory} style={{ display: "inline" }}>
                                <input type="hidden" name="cat_id" value={c.id} />
                                <button type="submit" className="def-del-btn">Sil</button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {isAdmin && (
                <form action={createCategory} className="inline-add-form">
                  <div className="form-row">
                    <div className="field">
                      <label>Kategori Adı *</label>
                      <input name="cat_label" type="text" required placeholder="ör. Kamera, UPS, Güvenlik…" />
                    </div>
                    <div className="field" style={{ maxWidth: 100 }}>
                      <label>Sıra</label>
                      <input name="cat_order" type="number" placeholder="10" defaultValue="10" />
                    </div>
                    <div className="form-actions" style={{ alignSelf: "flex-end", paddingTop: 0 }}>
                      <button type="submit" className="btn-save">Ekle</button>
                    </div>
                  </div>
                  <p className="def-hint">Anahtar (key) otomatik üretilir. Var olan bir anahtar ile eşleşirse etiket güncellenir.</p>
                </form>
              )}
            </div>

            <div className="def-divider" />

            {/* ── Marka / Model Tanımları ── */}
            <div className="def-section">
              <div className="def-section-title">Marka / Model Şablonları</div>
              <p className="def-intro">Buraya eklediğiniz tanımlar, envanter eklerken &quot;Tanımdan Seç&quot; alanında görünür ve marka/model/kategori alanlarını otomatik doldurur.</p>
              {definitions.length > 0 && (
                <div className="def-table-wrap">
                  <table className="def-table">
                    <thead>
                      <tr><th>Tanım Adı</th><th>Kategori</th><th>Marka</th><th>Model</th><th></th></tr>
                    </thead>
                    <tbody>
                      {definitions.map((d) => (
                        <tr key={d.id}>
                          <td className="def-name">{d.name}</td>
                          <td>{catMap[d.category] ?? d.category}</td>
                          <td className="dim">{d.brand || "—"}</td>
                          <td className="dim">{d.model || "—"}</td>
                          <td>
                            {isAdmin && (
                              <form action={deleteDefinition} style={{ display: "inline" }}>
                                <input type="hidden" name="def_id" value={d.id} />
                                <button type="submit" className="def-del-btn">Sil</button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {isAdmin && (
                <form action={createDefinition} className="inline-add-form">
                  <div className="form-row">
                    <div className="field">
                      <label>Tanım Adı *</label>
                      <input name="def_name" type="text" required placeholder="ör. Ofis Dizüstü" />
                    </div>
                    <div className="field">
                      <label>Kategori</label>
                      <select name="def_category">
                        {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Marka</label>
                      <input name="def_brand" type="text" placeholder="Dell, HP…" />
                    </div>
                    <div className="field">
                      <label>Model</label>
                      <input name="def_model" type="text" placeholder="Latitude 5540…" />
                    </div>
                    <div className="form-actions" style={{ alignSelf: "flex-end", paddingTop: 0 }}>
                      <button type="submit" className="btn-save">Ekle</button>
                    </div>
                  </div>
                </form>
              )}
            </div>

          </div>
        </details>

      </div>
    </>
  );
}

const css = `
.page{padding:28px;display:flex;flex-direction:column;gap:16px;max-width:1200px}
@media(max-width:640px){.page{padding:16px;gap:12px}}
.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.subtitle{font-size:13px;color:var(--text-dim);margin-top:4px}
.hdr-actions{display:flex;gap:8px;align-items:center}
.btn-export{font-size:12px;font-weight:600;padding:8px 16px;border-radius:7px;border:1px solid var(--border2);color:var(--text-muted);background:var(--input-bg);white-space:nowrap}
.btn-export:hover{background:var(--row-hover)}
.filters{display:flex;flex-direction:column;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.filter-group{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap}
.fl{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em;width:60px;flex-shrink:0;padding-top:6px}
.chips{display:flex;flex-wrap:wrap;gap:5px}
.chip{font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;border:1px solid var(--border2);color:var(--text-dim);transition:all 0.12s;white-space:nowrap}
.chip:hover{color:var(--text-muted)}
.chip-active{background:rgba(59,130,246,0.1);color:#3b82f6;border-color:rgba(59,130,246,0.3)}
.panel{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.panel-summary{padding:13px 18px;font-size:13px;font-weight:600;color:#3b82f6;cursor:pointer;list-style:none;user-select:none}
.panel-summary::-webkit-details-marker{display:none}
.panel[open] .panel-summary{border-bottom:1px solid var(--divider)}
.panel-summary-alt{color:var(--text-muted)}
.item-form{display:flex;flex-direction:column;gap:10px;padding:16px 18px}
.form-row{display:flex;gap:10px;flex-wrap:wrap}
.field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:120px}
.field-wide{flex:2}
.field label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select,.field textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:8px 10px;color:var(--text);outline:none;font-size:13px;font-family:inherit}
.field input:focus,.field select:focus{border-color:#3b82f6}
.field select:disabled{opacity:0.5;cursor:not-allowed}
.form-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:4px}
.btn-save{padding:8px 20px;border-radius:7px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
.btn-cancel{padding:8px 16px;border-radius:7px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent}
/* Definition preview */
.def-preview{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:7px;flex-wrap:wrap}
.def-preview-chip{font-size:10px;font-weight:700;color:#3b82f6;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);padding:2px 8px;border-radius:5px;text-transform:uppercase;letter-spacing:0.05em}
.def-preview-text{font-size:13px;font-weight:600;color:var(--text-muted)}
.def-preview-model{font-size:12px;color:var(--text-dim)}
/* Empty note */
.def-empty-note{font-size:12px;color:#f59e0b;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:7px;padding:10px 12px;line-height:1.5}
.empty{padding:48px;text-align:center;color:var(--text-ghost);font-size:13px}
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:auto}
.table{width:100%;border-collapse:collapse;min-width:750px}
.table th{padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--divider)}
.table td{padding:12px 14px;border-bottom:1px solid var(--row-border);font-size:13px;color:var(--text-sub);vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:var(--row-hover)}
.editing-row td{background:rgba(59,130,246,0.03)!important;padding:0}
.edit-form{background:transparent}
.cust-link{font-size:12px;font-weight:600;color:#3b82f6}
.item-name{font-weight:600;color:var(--text)}
.asset-tag{font-size:10px;color:var(--text-ghost);margin-left:6px;background:var(--input-bg);padding:2px 5px;border-radius:3px}
.cat-badge{font-size:11px;color:var(--text-muted);background:var(--input-bg);padding:3px 7px;border-radius:5px;white-space:nowrap}
.brand-col{font-size:12px;color:var(--text-dim)}
.mono{font-family:monospace;font-size:12px;color:var(--text-dim)}
.mono-sm{font-family:monospace;font-size:11px;color:var(--text-ghost)}
.status-badge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:5px;border:1px solid;white-space:nowrap}
.emp-link{font-size:12px;color:#3b82f6;font-weight:500}
.dim{color:var(--text-ghost);font-size:12px}
.row-actions{display:flex;align-items:center;gap:6px}
.act-btn{font-size:11px;font-weight:600;color:var(--text-dim);padding:4px 10px;border-radius:5px;border:1px solid var(--border2)}
.act-btn:hover{color:var(--text)}
.def-panel{padding:16px 18px;display:flex;flex-direction:column;gap:0}
.def-section{padding:16px 0}
.def-section-title{font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px}
.def-divider{height:1px;background:var(--divider);margin:4px 0}
.def-intro{font-size:12px;color:var(--text-ghost);line-height:1.6;margin:0 0 12px}
.def-hint{font-size:11px;color:var(--text-ghost);margin:4px 0 0}
.def-table-wrap{border:1px solid var(--border);border-radius:8px;overflow:auto;margin-bottom:12px}
.def-table{width:100%;border-collapse:collapse;font-size:12px}
.def-table th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--border)}
.def-table td{padding:9px 12px;border-bottom:1px solid var(--row-border);color:var(--text-sub);vertical-align:middle}
.def-table tr:last-child td{border-bottom:none}
.def-table tr:hover td{background:var(--row-hover)}
.def-name{font-weight:600;color:var(--text)!important}
.def-del-btn{font-size:11px;color:#ef4444;background:transparent;border:1px solid rgba(239,68,68,0.25);padding:3px 8px;border-radius:5px;cursor:pointer}
.def-del-btn:hover{background:rgba(239,68,68,0.08)}
.inline-add-form{display:flex;flex-direction:column;gap:8px}
/* Bulk delete */
.inv-table-root{display:flex;flex-direction:column;gap:8px}
.bulk-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:9px;padding:10px 14px}
.bulk-count{font-size:13px;font-weight:600;color:#fca5a5;flex:1}
.bulk-confirm-text{font-size:12px;color:#fca5a5;flex:1}
.bulk-del-btn{padding:7px 16px;border-radius:7px;font-size:12px;font-weight:700;background:rgba(239,68,68,0.2);color:#fca5a5;border:1px solid rgba(239,68,68,0.4);cursor:pointer;white-space:nowrap}
.bulk-del-btn:hover{background:rgba(239,68,68,0.3)}
.bulk-del-btn:disabled{opacity:0.5;cursor:not-allowed}
.bulk-cancel-btn{padding:7px 14px;border-radius:7px;font-size:12px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent;cursor:pointer}
.row-sel td{background:rgba(239,68,68,0.04)!important}
.act-btn-del{color:#ef4444!important;border-color:rgba(239,68,68,0.3)!important}
.act-btn-del:hover{background:rgba(239,68,68,0.08)!important}
.inv-msg{padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600}
.inv-msg-ok{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
.inv-msg-err{background:rgba(239,68,68,0.1);color:#fca5a5;border:1px solid rgba(239,68,68,0.25)}
`;
