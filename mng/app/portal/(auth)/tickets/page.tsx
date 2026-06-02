import { getPortalSession } from "@/lib/portal-auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Talepler" };

export default async function PortalTicketsPage() {
  const session = (await getPortalSession())!;
  const { permissions, customer_id, email } = session;

  if (!permissions.tickets) redirect("/portal/dashboard");

  const tickets = permissions.own_only && permissions.tickets
    ? await query<{
        id: number; subject: string; status: string; priority: string;
        created_at: string; updated_at: string; from_email: string;
      }>(
        `SELECT id,subject,status,priority,created_at,updated_at,from_email
         FROM tickets WHERE customer_id=$1 AND LOWER(from_email)=LOWER($2)
         ORDER BY created_at DESC`,
        [customer_id, email]
      )
    : await query<{
        id: number; subject: string; status: string; priority: string;
        created_at: string; updated_at: string; from_email: string;
      }>(
        `SELECT id,subject,status,priority,created_at,updated_at,from_email
         FROM tickets WHERE customer_id=$1
         ORDER BY created_at DESC`,
        [customer_id]
      );

  const STATUS_LABEL: Record<string, string> = {
    open: "Açık", in_progress: "İşlemde", waiting: "Bekliyor",
    resolved: "Çözüldü", closed: "Kapatıldı",
  };
  const STATUS_COLOR: Record<string, string> = {
    open: "#3b82f6", in_progress: "#f59e0b", waiting: "#8b5cf6",
    resolved: "#22c55e", closed: "#94a3b8",
  };
  const PRIORITY_LABEL: Record<string, string> = {
    low: "Düşük", normal: "Normal", high: "Yüksek", critical: "Kritik",
  };
  const PRIORITY_COLOR: Record<string, string> = {
    low: "#64748b", normal: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
  };

  const openCount = tickets.filter((t) => !["closed", "resolved"].includes(t.status)).length;

  return (
    <>
      <style>{css}</style>
      <div className="page-head">
        <h1 className="page-title">Talepler</h1>
        <span className="count-badge">{tickets.length} toplam</span>
        {openCount > 0 && <span className="open-badge">{openCount} açık</span>}
      </div>

      {tickets.length === 0 ? (
        <div className="empty">Henüz destek talebi bulunmuyor.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Konu</th>
                {!permissions.own_only && <th>Gönderen</th>}
                <th>Durum</th>
                <th>Öncelik</th>
                <th>Tarih</th>
                <th>Son Güncelleme</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="id-col">#{t.id}</td>
                  <td className="subject-col">{t.subject}</td>
                  {!permissions.own_only && (
                    <td className="dim">{t.from_email}</td>
                  )}
                  <td>
                    <span className="chip" style={{ color: STATUS_COLOR[t.status] ?? "#64748b", background: (STATUS_COLOR[t.status] ?? "#64748b") + "18" }}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </td>
                  <td>
                    <span className="chip" style={{ color: PRIORITY_COLOR[t.priority] ?? "#64748b", background: (PRIORITY_COLOR[t.priority] ?? "#64748b") + "18" }}>
                      {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </span>
                  </td>
                  <td className="dim date-col">{new Date(t.created_at).toLocaleDateString("tr-TR")}</td>
                  <td className="dim date-col">{new Date(t.updated_at).toLocaleDateString("tr-TR")}</td>
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
.page-head{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.page-title{font-size:20px;font-weight:800;color:#0f172a;margin:0;letter-spacing:-0.3px}
.count-badge{font-size:12px;font-weight:700;color:#64748b;background:#e2e8f0;border-radius:6px;padding:3px 8px}
.open-badge{font-size:12px;font-weight:700;color:#3b82f6;background:rgba(59,130,246,0.1);border-radius:6px;padding:3px 8px}
.empty{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;text-align:center;color:#64748b;font-size:14px}
.table-wrap{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;overflow-x:auto}
.table{width:100%;border-collapse:collapse;min-width:540px}
.table th{padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f1f5f9;white-space:nowrap}
.table td{padding:13px 14px;border-bottom:1px solid #f8fafc;font-size:13px;color:#1e293b;vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:#fafafa}
.id-col{font-family:monospace;font-size:12px;color:#94a3b8;font-weight:700}
.subject-col{font-weight:600;max-width:260px}
.dim{color:#64748b;font-size:12px}
.date-col{white-space:nowrap}
.chip{font-size:10px;font-weight:700;padding:3px 8px;border-radius:5px;white-space:nowrap}
`;
