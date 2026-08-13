import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";
import type { Metadata } from "next";
import { CustomerModuleNav } from "@/components/CustomerModuleNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Çalışanlar — xShield MNG" };


async function createEmployee(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const customerId = fd.get("customer_id") as string;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  await query(
    `INSERT INTO customer_employees (customer_id,first_name,last_name,email,phone,department,title)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [customerId, get("first_name"), get("last_name"),
     get("email"), get("phone"), get("department"), get("title")]
  );
  redirect(`/customers/${customerId}/employees?_toast=${encodeURIComponent("Çalışan eklendi")}&_tt=success`);
}

async function updateEmployee(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const id = fd.get("id") as string;
  const customerId = fd.get("customer_id") as string;
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  await query(
    `UPDATE customer_employees SET first_name=$1,last_name=$2,email=$3,phone=$4,
     department=$5,title=$6,is_active=$7 WHERE id=$8`,
    [get("first_name"), get("last_name"), get("email"), get("phone"),
     get("department"), get("title"), fd.get("is_active") === "1", id]
  );
  redirect(`/customers/${customerId}/employees?_toast=${encodeURIComponent("Güncellendi")}&_tt=success`);
}

export default async function EmployeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const session = await getSession();

  const [customer, employees, categories] = await Promise.all([
    queryOne<{ id: number; company_name: string; logo_name: string | null }>(
      "SELECT id,company_name,logo_name FROM customers WHERE id=$1", [id]
    ),
    query<{
      id: number; first_name: string; last_name: string; email: string;
      phone: string; department: string; title: string; is_active: boolean;
      device_count: string;
    }>(
      `SELECT e.*,
         (SELECT COUNT(*) FROM inventory_items i WHERE i.employee_id=e.id) AS device_count
       FROM customer_employees e WHERE e.customer_id=$1 ORDER BY e.last_name,e.first_name`,
      [id]
    ),
    query<{ key: string; label: string }>(
      "SELECT key,label FROM inventory_categories ORDER BY sort_order,label"
    ),
  ]);

  if (!customer) notFound();
  const isAdmin = session?.role === "admin";
  const catMap = Object.fromEntries(categories.map((c) => [c.key, c.label]));

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="breadcrumb">
          <Link href="/customers" className="bc">Müşteriler</Link>
          <span className="bc-sep">›</span>
          <Link href={`/customers/${id}`} className="bc">{customer.company_name}</Link>
          <span className="bc-sep">›</span>
          <span className="bc bc-active">Çalışanlar</span>
        </div>

        <CustomerModuleNav customerId={id} active="employees" />

        <div className="page-header">
          <div>
            <h1 className="title">Çalışanlar</h1>
            <p className="subtitle">{customer.company_name} · {employees.length} çalışan</p>
          </div>
        </div>

        {/* Add form */}
        <details className="panel">
          <summary className="panel-summary">+ Yeni Çalışan Ekle</summary>
          <form action={createEmployee} className="emp-form">
            <input type="hidden" name="customer_id" value={id} />
            <div className="form-row">
              <div className="field"><label>Ad *</label><input name="first_name" required /></div>
              <div className="field"><label>Soyad *</label><input name="last_name" required /></div>
              <div className="field"><label>E-posta</label><input name="email" type="email" /></div>
              <div className="field"><label>Telefon</label><input name="phone" type="tel" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Departman</label><input name="department" /></div>
              <div className="field"><label>Görev / Unvan</label><input name="title" /></div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-save">Ekle</button>
            </div>
          </form>
        </details>

        {/* Employee list */}
        {employees.length === 0 ? (
          <div className="empty">Henüz çalışan eklenmemiş.</div>
        ) : (
          <div className="emp-list">
            {employees.map((emp) => {
              const isEditing = edit === String(emp.id);
              const fullName = `${emp.first_name} ${emp.last_name}`;
              return (
                <div key={emp.id} className={`emp-card${!emp.is_active ? " inactive" : ""}`}>
                  {isEditing ? (
                    <form action={updateEmployee} className="emp-form edit-form">
                      <input type="hidden" name="id" value={emp.id} />
                      <input type="hidden" name="customer_id" value={id} />
                      <div className="form-row">
                        <div className="field"><label>Ad *</label><input name="first_name" required defaultValue={emp.first_name} /></div>
                        <div className="field"><label>Soyad *</label><input name="last_name" required defaultValue={emp.last_name} /></div>
                        <div className="field"><label>E-posta</label><input name="email" type="email" defaultValue={emp.email ?? ""} /></div>
                        <div className="field"><label>Telefon</label><input name="phone" type="tel" defaultValue={emp.phone ?? ""} /></div>
                      </div>
                      <div className="form-row">
                        <div className="field"><label>Departman</label><input name="department" defaultValue={emp.department ?? ""} /></div>
                        <div className="field"><label>Görev / Unvan</label><input name="title" defaultValue={emp.title ?? ""} /></div>
                        <div className="field">
                          <label>Durum</label>
                          <select name="is_active" defaultValue={emp.is_active ? "1" : "0"}>
                            <option value="1">Aktif</option>
                            <option value="0">Pasif</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-actions">
                        <Link href={`/customers/${id}/employees`} className="btn-cancel">İptal</Link>
                        <button type="submit" className="btn-save">Kaydet</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="emp-head">
                        <div className="emp-avatar">{emp.first_name[0]}{emp.last_name[0]}</div>
                        <div className="emp-info">
                          <div className="emp-name">
                            {fullName}
                            {!emp.is_active && <span className="inactive-tag">Pasif</span>}
                          </div>
                          <div className="emp-sub">
                            {[emp.title, emp.department].filter(Boolean).join(" · ") || "—"}
                          </div>
                          {(emp.email || emp.phone) && (
                            <div className="emp-contacts">
                              {emp.email && <span>{emp.email}</span>}
                              {emp.phone && <span>{emp.phone}</span>}
                            </div>
                          )}
                        </div>
                        <div className="emp-actions">
                          <span className="dev-count">{emp.device_count} cihaz</span>
                          <Link href={`/customers/${id}/employees/${emp.id}/zimmet`}
                            className="btn-zimmet">Zimmet Formu</Link>
                          {isAdmin && (
                            <>
                              <Link href={`/customers/${id}/employees?edit=${emp.id}`}
                                className="act-btn">Düzenle</Link>
                              <DeleteButton entityId={emp.id} label="Sil"
                                confirmMsg={`"${fullName}" silinsin mi?`}
                                action="/api/employees/delete"
                                redirectTo={`/customers/${id}/employees`} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Assigned devices */}
                      <EmpDevices empId={emp.id} customerId={Number(id)} catMap={catMap} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

async function EmpDevices({ empId, customerId, catMap }: { empId: number; customerId: number; catMap: Record<string,string> }) {
  const devices = await query<{
    id: number; name: string; category: string; brand: string; model: string; assigned_date: string;
  }>(
    "SELECT id,name,category,brand,model,assigned_date FROM inventory_items WHERE employee_id=$1 ORDER BY category,name",
    [empId]
  );

  if (devices.length === 0) return (
    <div className="no-devices">
      Zimmetli cihaz yok.
      <Link href={`/inventory?customer=${customerId}`} className="assign-link">Envanter&apos;den ata →</Link>
    </div>
  );

  return (
    <div className="devices-grid">
      {devices.map((d) => (
        <div key={d.id} className="device-chip">
          <span className="d-cat">{catMap[d.category] ?? d.category}</span>
          <span className="d-name">{d.name}</span>
          {(d.brand || d.model) && <span className="d-model">{[d.brand, d.model].filter(Boolean).join(" ")}</span>}
        </div>
      ))}
    </div>
  );
}

const css = `
.page{padding:28px;display:flex;flex-direction:column;gap:16px;max-width:900px}
@media(max-width:640px){.page{padding:16px;gap:12px}}
.breadcrumb{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.bc{font-size:12px;color:var(--text-dim)}
.bc:hover{color:#3b82f6}
.bc-sep{font-size:12px;color:var(--text-ghost)}
.bc-active{color:var(--text-muted)!important}
.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.subtitle{font-size:13px;color:var(--text-dim);margin-top:4px}
.hdr-btns{display:flex;gap:8px}
.btn-sec{font-size:12px;font-weight:600;padding:8px 14px;border-radius:7px;border:1px solid var(--border2);color:var(--text-muted);background:var(--input-bg)}
.btn-sec:hover{background:var(--row-hover)}
/* Panel */
.panel{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.panel-summary{padding:13px 18px;font-size:13px;font-weight:600;color:#3b82f6;cursor:pointer;list-style:none;user-select:none}
.panel-summary::-webkit-details-marker{display:none}
.panel[open] .panel-summary{border-bottom:1px solid var(--divider)}
.emp-form{display:flex;flex-direction:column;gap:10px;padding:16px 18px}
.edit-form{background:rgba(59,130,246,0.02);padding:16px}
.form-row{display:flex;gap:10px;flex-wrap:wrap}
.field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:140px}
.field label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select{background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:8px 10px;color:var(--text);outline:none;font-size:13px}
.field input:focus,.field select:focus{border-color:#3b82f6}
.form-actions{display:flex;gap:8px;justify-content:flex-end}
.btn-save{padding:8px 20px;border-radius:7px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-cancel{padding:8px 16px;border-radius:7px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent}
/* Employee cards */
.empty{padding:40px;text-align:center;color:var(--text-ghost);font-size:13px}
.emp-list{display:flex;flex-direction:column;gap:10px}
.emp-card{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.emp-card.inactive{opacity:0.6}
.emp-head{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;flex-wrap:wrap}
.emp-avatar{width:40px;height:40px;border-radius:50%;background:rgba(59,130,246,0.12);color:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0}
.emp-info{flex:1;min-width:0}
.emp-name{font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.inactive-tag{font-size:10px;background:rgba(100,116,139,0.15);color:#64748b;border:1px solid rgba(100,116,139,0.3);border-radius:4px;padding:1px 6px}
.emp-sub{font-size:12px;color:var(--text-dim);margin-top:2px}
.emp-contacts{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}
.emp-contacts span{font-size:11px;color:var(--text-ghost)}
.emp-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0}
.dev-count{font-size:11px;color:var(--text-ghost);background:var(--input-bg);border:1px solid var(--border2);border-radius:10px;padding:2px 8px;font-weight:600}
.btn-zimmet{font-size:11px;font-weight:700;padding:6px 12px;border-radius:6px;border:1px solid rgba(59,130,246,0.3);color:#3b82f6;background:rgba(59,130,246,0.08);white-space:nowrap}
.act-btn{font-size:11px;font-weight:600;color:var(--text-dim);padding:5px 10px;border-radius:5px;border:1px solid var(--border2)}
/* Devices */
.no-devices{font-size:12px;color:var(--text-ghost);padding:10px 16px;border-top:1px solid var(--row-border);display:flex;align-items:center;gap:10px}
.assign-link{color:#3b82f6;font-weight:600}
.devices-grid{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px;border-top:1px solid var(--row-border)}
.device-chip{display:flex;align-items:center;gap:6px;background:var(--input-bg);border:1px solid var(--border2);border-radius:7px;padding:6px 10px}
.d-cat{font-size:9px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0}
.d-name{font-size:12px;font-weight:600;color:var(--text-sub)}
.d-model{font-size:11px;color:var(--text-dim)}
@media(max-width:600px){.emp-head{flex-direction:column}.emp-actions{width:100%}}
`;
