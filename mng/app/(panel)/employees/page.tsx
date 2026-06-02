import { query } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Çalışanlar — xShield MNG" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; q?: string }>;
}) {
  const { customer, q } = await searchParams;

  const customers = await query<{ id: number; company_name: string }>(
    "SELECT id,company_name FROM customers ORDER BY company_name"
  );

  const employees = await query<{
    id: number; first_name: string; last_name: string; email: string;
    phone: string; department: string; title: string; is_active: boolean;
    customer_id: number; company_name: string; device_count: string;
  }>(
    `SELECT e.*, c.company_name,
       (SELECT COUNT(*) FROM inventory_items i WHERE i.employee_id=e.id) AS device_count
     FROM customer_employees e
     JOIN customers c ON c.id=e.customer_id
     WHERE ($1::int IS NULL OR e.customer_id=$1)
       AND ($2::text IS NULL OR
            e.first_name ILIKE $2 OR e.last_name ILIKE $2 OR
            e.email ILIKE $2 OR e.department ILIKE $2 OR e.title ILIKE $2 OR
            c.company_name ILIKE $2)
     ORDER BY c.company_name, e.last_name, e.first_name`,
    [customer ? Number(customer) : null, q ? `%${q}%` : null]
  );

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="title">Çalışanlar</h1>
            <p className="subtitle">{employees.length} kayıt</p>
          </div>
        </div>

        {/* Filters */}
        <form className="filters" method="get">
          <input name="q" defaultValue={q ?? ""} placeholder="İsim, departman, e-posta…" className="search-input" />
          <select name="customer" defaultValue={customer ?? ""} className="cust-sel">
            <option value="">Tüm Müşteriler</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <button type="submit" className="btn-filter">Filtrele</button>
          {(q || customer) && (
            <Link href="/employees" className="btn-clear">Temizle</Link>
          )}
        </form>

        {employees.length === 0 ? (
          <div className="empty">Çalışan bulunamadı.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Firma</th>
                  <th>Görev / Departman</th>
                  <th>E-posta</th>
                  <th>Telefon</th>
                  <th className="center">Cihaz</th>
                  <th className="center">Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className={!e.is_active ? "row-inactive" : ""}>
                    <td className="bold">{e.first_name} {e.last_name}</td>
                    <td>
                      <Link href={`/customers/${e.customer_id}`} className="cust-link">
                        {e.company_name}
                      </Link>
                    </td>
                    <td className="dim">
                      {[e.title, e.department].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="dim">{e.email || "—"}</td>
                    <td className="dim">{e.phone || "—"}</td>
                    <td className="center">
                      <span className="dev-chip">{e.device_count}</span>
                    </td>
                    <td className="center">
                      {e.is_active
                        ? <span className="badge-active">Aktif</span>
                        : <span className="badge-inactive">Pasif</span>}
                    </td>
                    <td className="actions-cell">
                      <Link href={`/customers/${e.customer_id}/employees?edit=${e.id}`} className="act-link">Düzenle</Link>
                      <Link href={`/customers/${e.customer_id}/employees/${e.id}/zimmet`} className="act-link act-zimmet">Zimmet</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.search-input{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:9px 12px;color:var(--text);outline:none;font-size:13px;min-width:220px;flex:1}
.search-input:focus{border-color:#3b82f6}
.cust-sel{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:9px 12px;color:var(--text);outline:none;font-size:13px}
.cust-sel:focus{border-color:#3b82f6}
.btn-filter{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-filter:hover{background:#1d4ed8}
.btn-clear{font-size:12px;color:var(--text-dimmer);padding:9px 12px;border-radius:8px;border:1px solid var(--border2)}
.btn-clear:hover{color:var(--text-muted)}
.empty{padding:60px;text-align:center;color:var(--text-ghost);font-size:13px}
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:auto}
.table{width:100%;border-collapse:collapse;font-size:13px}
.table th{padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid var(--border);white-space:nowrap}
.table td{padding:11px 14px;border-bottom:1px solid var(--row-border);color:var(--text-sub);vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:var(--row-hover)}
.row-inactive td{opacity:0.5}
.bold{font-weight:600;color:var(--text)!important}
.dim{color:var(--text-dim)!important;font-size:12px}
.center{text-align:center}
.cust-link{color:#3b82f6;font-weight:600;font-size:12px}
.cust-link:hover{text-decoration:underline}
.dev-chip{font-size:11px;font-weight:600;background:var(--input-bg);border:1px solid var(--border2);border-radius:10px;padding:2px 8px;color:var(--text-ghost)}
.badge-active{font-size:10px;font-weight:700;color:#22c55e;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);padding:2px 7px;border-radius:5px;white-space:nowrap}
.badge-inactive{font-size:10px;font-weight:700;color:#64748b;background:rgba(100,116,139,0.1);border:1px solid rgba(100,116,139,0.25);padding:2px 7px;border-radius:5px;white-space:nowrap}
.actions-cell{display:flex;gap:6px;align-items:center}
.act-link{font-size:11px;font-weight:600;color:var(--text-dim);padding:4px 9px;border-radius:5px;border:1px solid var(--border2);white-space:nowrap}
.act-link:hover{color:var(--text-muted);border-color:var(--text-dimmer)}
.act-zimmet{color:#3b82f6;border-color:rgba(59,130,246,0.3)}
.act-zimmet:hover{background:rgba(59,130,246,0.06)}
`;
