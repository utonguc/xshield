import { getPortalSession } from "@/lib/portal-auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Çalışanlar" };

export default async function PortalEmployeesPage() {
  const session = (await getPortalSession())!;
  const { permissions, customer_id } = session;

  if (!permissions.employees) redirect("/portal/dashboard");

  const employees = await query<{
    id: number; first_name: string; last_name: string; email: string;
    phone: string | null; department: string | null; title: string | null;
    device_count: string;
  }>(
    `SELECT ce.id, ce.first_name, ce.last_name, ce.email, ce.phone, ce.department, ce.title,
            COUNT(ii.id)::text AS device_count
     FROM customer_employees ce
     LEFT JOIN inventory_items ii ON ii.employee_id=ce.id
     WHERE ce.customer_id=$1
     GROUP BY ce.id
     ORDER BY ce.first_name, ce.last_name`,
    [customer_id]
  );

  return (
    <>
      <style>{css}</style>
      <div className="page-head">
        <h1 className="page-title">Çalışanlar</h1>
        <span className="count-badge">{employees.length} kişi</span>
      </div>

      {employees.length === 0 ? (
        <div className="empty">Kayıtlı çalışan bulunamadı.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>E-posta</th>
                <th>Departman</th>
                <th>Görev</th>
                <th>Telefon</th>
                <th>Zimmetli Cihaz</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="bold">{e.first_name} {e.last_name}</td>
                  <td className="dim">{e.email || "—"}</td>
                  <td className="dim">{e.department || "—"}</td>
                  <td className="dim">{e.title || "—"}</td>
                  <td className="dim mono">{e.phone || "—"}</td>
                  <td>
                    {Number(e.device_count) > 0 ? (
                      <span className="device-badge">{e.device_count} cihaz</span>
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const css = `
.page-head{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.page-title{font-size:20px;font-weight:800;color:#0f172a;margin:0;letter-spacing:-0.3px}
.count-badge{font-size:12px;font-weight:700;color:#64748b;background:#e2e8f0;border-radius:6px;padding:3px 8px}
.empty{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;text-align:center;color:#64748b;font-size:14px}
.table-wrap{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;overflow-x:auto}
.table{width:100%;border-collapse:collapse;min-width:500px}
.table th{padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f1f5f9;white-space:nowrap}
.table td{padding:13px 14px;border-bottom:1px solid #f8fafc;font-size:13px;color:#1e293b;vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:#fafafa}
.bold{font-weight:600}
.dim{color:#64748b;font-size:12px}
.mono{font-family:monospace}
.device-badge{font-size:11px;font-weight:700;color:#3b82f6;background:rgba(59,130,246,0.1);border-radius:5px;padding:2px 8px}
`;
