import { getPortalSession } from "@/lib/portal-auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Envanter" };

export default async function PortalInventoryPage() {
  const session = (await getPortalSession())!;
  const { permissions, customer_id, employee_id } = session;

  if (!permissions.inventory) redirect("/portal/dashboard");

  const categories = await query<{ key: string; label: string }>(
    "SELECT key,label FROM inventory_categories ORDER BY sort_order,label"
  );
  const catMap = Object.fromEntries(categories.map((c) => [c.key, c.label]));

  const items = permissions.own_only && employee_id
    ? await query<{
        id: number; name: string; category: string; brand: string | null; model: string | null;
        serial_no: string | null; asset_tag: string | null; status: string;
        assigned_date: string | null; employee_name: string | null;
      }>(
        `SELECT ii.id, ii.name, ii.category, ii.brand, ii.model, ii.serial_no, ii.asset_tag,
                ii.status, ii.assigned_date, NULL AS employee_name
         FROM inventory_items ii
         WHERE ii.employee_id=$1
         ORDER BY ii.category, ii.name`,
        [employee_id]
      )
    : await query<{
        id: number; name: string; category: string; brand: string | null; model: string | null;
        serial_no: string | null; asset_tag: string | null; status: string;
        assigned_date: string | null; employee_name: string | null;
      }>(
        `SELECT ii.id, ii.name, ii.category, ii.brand, ii.model, ii.serial_no, ii.asset_tag,
                ii.status, ii.assigned_date,
                CONCAT(ce.first_name,' ',ce.last_name) AS employee_name
         FROM inventory_items ii
         JOIN customer_employees ce ON ce.id=ii.employee_id
         WHERE ce.customer_id=$1
         ORDER BY ii.category, ii.name`,
        [customer_id]
      );

  const STATUS_LABEL: Record<string, string> = { active: "Aktif", maintenance: "Bakımda", retired: "Hizmetten Çıktı" };
  const STATUS_COLOR: Record<string, string> = { active: "#22c55e", maintenance: "#f59e0b", retired: "#94a3b8" };

  return (
    <>
      <style>{css}</style>
      <div className="page-head">
        <h1 className="page-title">Envanter</h1>
        <span className="count-badge">{items.length} cihaz</span>
      </div>

      {items.length === 0 ? (
        <div className="empty">Zimmetli cihaz bulunamadı.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cihaz Adı</th>
                <th>Kategori</th>
                <th>Marka / Model</th>
                <th>Seri No</th>
                <th>Envanter No</th>
                {!permissions.own_only && <th>Kullanıcı</th>}
                <th>Durum</th>
                <th>Zimmet Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="bold">{item.name}</td>
                  <td className="dim">{catMap[item.category] ?? item.category}</td>
                  <td className="dim">{[item.brand, item.model].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="mono">{item.serial_no || "—"}</td>
                  <td className="mono">{item.asset_tag || "—"}</td>
                  {!permissions.own_only && (
                    <td className="dim">{item.employee_name || <span className="unassigned">Zimmetlenmemiş</span>}</td>
                  )}
                  <td>
                    <span className="status-chip" style={{ color: STATUS_COLOR[item.status] ?? "#64748b", background: (STATUS_COLOR[item.status] ?? "#64748b") + "18" }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="dim">{item.assigned_date ? new Date(item.assigned_date).toLocaleDateString("tr-TR") : "—"}</td>
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
.table{width:100%;border-collapse:collapse;min-width:600px}
.table th{padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f1f5f9;white-space:nowrap}
.table td{padding:13px 14px;border-bottom:1px solid #f8fafc;font-size:13px;color:#1e293b;vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:#fafafa}
.bold{font-weight:600}
.dim{color:#64748b}
.mono{font-family:monospace;font-size:11px;color:#475569}
.unassigned{color:#94a3b8;font-style:italic}
.status-chip{font-size:10px;font-weight:700;padding:3px 8px;border-radius:5px;white-space:nowrap}
`;
