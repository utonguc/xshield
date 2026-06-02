import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import type { Metadata } from "next";
import { PrintButton } from "./_print";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Zimmet Formu" };


export default async function ZimmetPage({
  params,
}: {
  params: Promise<{ id: string; empId: string }>;
}) {
  const { id, empId } = await params;

  const [customer, employee, devices, categories] = await Promise.all([
    queryOne<{
      id: number; company_name: string; contact_name: string;
      contact_phone: string; logo_name: string | null;
      personnel_responsibilities: string | null;
    }>("SELECT id,company_name,contact_name,contact_phone,logo_name,personnel_responsibilities FROM customers WHERE id=$1", [id]),
    queryOne<{
      id: number; first_name: string; last_name: string; email: string;
      phone: string; department: string; title: string;
    }>("SELECT * FROM customer_employees WHERE id=$1 AND customer_id=$2", [empId, id]),
    query<{
      id: number; name: string; category: string; brand: string;
      model: string; serial_no: string; asset_tag: string; assigned_date: string;
    }>(
      `SELECT id,name,category,brand,model,serial_no,asset_tag,assigned_date
       FROM inventory_items WHERE employee_id=$1 ORDER BY category,name`,
      [empId]
    ),
    query<{ key: string; label: string }>(
      "SELECT key,label FROM inventory_categories ORDER BY sort_order,label"
    ),
  ]);

  if (!customer || !employee) notFound();
  const catMap = Object.fromEntries(categories.map((c) => [c.key, c.label]));
  const responsibilities = (customer.personnel_responsibilities ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const today = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{css}</style>

      <div className="print-toolbar no-print">
        <span className="toolbar-title">Zimmet Formu — {employee.first_name} {employee.last_name}</span>
        <PrintButton label="Yazdır / PDF" />
      </div>

      <div className="zimmet">
        {/* Header */}
        <div className="zim-header">
          <div className="logo-area">
            {customer.logo_name ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/customers/${id}/logo`} alt={customer.company_name} className="logo-img" />
            ) : (
              <div className="logo-placeholder">{customer.company_name[0]}</div>
            )}
            <div className="company-info">
              <div className="company-name">{customer.company_name}</div>
              {customer.contact_phone && <div className="company-sub">{customer.contact_phone}</div>}
            </div>
          </div>
          <div className="doc-title-block">
            <div className="doc-title">ZİMMET FORMU</div>
            <div className="doc-subtitle">Cihaz Teslim Tutanağı</div>
            <div className="doc-date">Tarih: {today}</div>
          </div>
        </div>

        <div className="divider" />

        {/* Employee info */}
        <div className="section-title">Teslim Alan</div>
        <div className="info-grid">
          <div className="info-row">
            <span className="il">Ad Soyad</span>
            <span className="iv">{employee.first_name} {employee.last_name}</span>
          </div>
          {employee.department && (
            <div className="info-row">
              <span className="il">Departman</span>
              <span className="iv">{employee.department}</span>
            </div>
          )}
          {employee.title && (
            <div className="info-row">
              <span className="il">Görev</span>
              <span className="iv">{employee.title}</span>
            </div>
          )}
          {employee.email && (
            <div className="info-row">
              <span className="il">E-posta</span>
              <span className="iv">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="info-row">
              <span className="il">Telefon</span>
              <span className="iv">{employee.phone}</span>
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Devices table */}
        <div className="section-title">Zimmetlenen Cihazlar</div>
        {devices.length === 0 ? (
          <p className="no-device">Bu çalışana zimmetlenmiş cihaz bulunmamaktadır.</p>
        ) : (
          <table className="device-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cihaz Adı</th>
                <th>Kategori</th>
                <th>Marka / Model</th>
                <th>Seri No</th>
                <th>Envanter No</th>
                <th>Zimmet Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d, i) => (
                <tr key={d.id}>
                  <td className="center">{i + 1}</td>
                  <td className="bold">{d.name}</td>
                  <td>{catMap[d.category] ?? d.category}</td>
                  <td>{[d.brand, d.model].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="mono">{d.serial_no || "—"}</td>
                  <td className="mono">{d.asset_tag || "—"}</td>
                  <td>{d.assigned_date ? new Date(d.assigned_date).toLocaleDateString("tr-TR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Responsibilities */}
        {responsibilities.length > 0 && (
          <>
            <div className="divider" style={{ marginTop: 32 }} />
            <div className="section-title">Yükümlülükler ve Sorumluluklar</div>
            <p className="resp-intro">
              Aşağıda belirtilen cihaz(lar)ı teslim alan kişi, bu tutanağı imzalamakla birlikte aşağıdaki yükümlülükleri kabul etmiş sayılır:
            </p>
            <ol className="resp-list">
              {responsibilities.map((line, i) => (
                <li key={i} className="resp-item">{line}</li>
              ))}
            </ol>
          </>
        )}

        <div className="divider" style={{ marginTop: 32 }} />

        {/* Signatures */}
        <div className="sig-row">
          <div className="sig-block">
            <div className="sig-label">Teslim Alan</div>
            <div className="sig-name">{employee.first_name} {employee.last_name}</div>
            <div className="sig-line" />
            <div className="sig-caption">Ad Soyad / İmza / Tarih</div>
          </div>
          <div className="sig-block">
            <div className="sig-label">Teslim Eden</div>
            <div className="sig-name">{customer.contact_name || customer.company_name}</div>
            <div className="sig-line" />
            <div className="sig-caption">Ad Soyad / İmza / Tarih</div>
          </div>
        </div>

        <div className="footer-note">
          Bu tutanak {today} tarihinde düzenlenmiştir.
          İmzalanmış nüsha her iki tarafça saklanacaktır.
        </div>
      </div>
    </>
  );
}

const css = `
/* Screen toolbar */
.no-print{display:flex}
.print-toolbar{align-items:center;justify-content:space-between;padding:12px 24px;background:#1e293b;border-bottom:1px solid #334155;gap:12px;flex-wrap:wrap;position:sticky;top:0;z-index:10}
.toolbar-title{font-size:13px;color:#94a3b8;font-weight:600}
.print-btn{padding:8px 20px;border-radius:7px;background:#2563eb;color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:700}
.print-btn:hover{background:#1d4ed8}

/* Document */
.zimmet{max-width:800px;margin:32px auto;padding:40px 48px;background:#fff;color:#111;font-family:Arial,sans-serif;line-height:1.5}
@media(max-width:860px){.zimmet{margin:16px;padding:24px}}

/* Header */
.zim-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap}
.logo-area{display:flex;align-items:center;gap:12px}
.logo-img{max-height:60px;max-width:160px;object-fit:contain}
.logo-placeholder{width:60px;height:60px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#64748b}
.company-info{display:flex;flex-direction:column;gap:2px}
.company-name{font-size:16px;font-weight:800;color:#111}
.company-sub{font-size:12px;color:#64748b}
.doc-title-block{text-align:right}
.doc-title{font-size:20px;font-weight:800;color:#111;letter-spacing:-0.5px}
.doc-subtitle{font-size:12px;color:#64748b;margin-top:2px}
.doc-date{font-size:12px;color:#475569;margin-top:6px}

/* Divider */
.divider{height:1px;background:#e2e8f0;margin:20px 0}

/* Section */
.section-title{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px}

/* Info grid */
.info-grid{display:flex;flex-direction:column;gap:6px;margin-bottom:4px}
.info-row{display:flex;gap:16px}
.il{font-size:12px;color:#64748b;width:90px;flex-shrink:0;font-weight:600}
.iv{font-size:13px;color:#111;font-weight:500}

/* Device table */
.no-device{font-size:13px;color:#94a3b8;font-style:italic}
.device-table{width:100%;border-collapse:collapse;font-size:12px}
.device-table th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #e2e8f0;white-space:nowrap}
.device-table td{padding:9px 10px;border-bottom:1px solid #f1f5f9;color:#1e293b;vertical-align:middle}
.device-table tr:last-child td{border-bottom:none}
.center{text-align:center;color:#94a3b8}
.bold{font-weight:600}
.mono{font-family:monospace;font-size:11px;color:#475569}

/* Responsibilities */
.resp-intro{font-size:11px;color:#475569;margin:0 0 10px;line-height:1.6}
.resp-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px}
.resp-item{font-size:12px;color:#1e293b;line-height:1.6}

/* Signatures */
.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px}
@media(max-width:540px){.sig-row{grid-template-columns:1fr}}
.sig-block{display:flex;flex-direction:column;gap:4px}
.sig-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}
.sig-name{font-size:13px;color:#111;font-weight:500;min-height:20px}
.sig-line{height:1px;background:#111;margin:40px 0 6px}
.sig-caption{font-size:10px;color:#94a3b8}

/* Footer */
.footer-note{font-size:11px;color:#94a3b8;text-align:center;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:12px}

/* Print styles */
@media print{
  .no-print{display:none!important}
  .zimmet{margin:0;padding:20px;max-width:100%;box-shadow:none}
  body{background:#fff}
}
`;
