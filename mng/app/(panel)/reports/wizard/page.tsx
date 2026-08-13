import { query, queryOne } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rapor Oluştur — xShield MNG" };
export const dynamic = "force-dynamic";

export default async function ReportWizardPage({
  searchParams,
}: {
  searchParams: Promise<{
    customer?: string; from?: string; to?: string;
    include_tickets?: string; include_categories?: string; include_payments?: string;
    include_risks?: string; include_contracts?: string; include_licenses?: string;
    include_rfc?: string; include_compliance?: string; include_cyber?: string;
    include_employees?: string;
  }>;
}) {
  const params = await searchParams;
  const { customer: customerId, from: fromDate, to: toDate } = params;
  const includeTickets    = params.include_tickets    !== "0";
  const includeCategories = params.include_categories !== "0";
  const includePayments   = params.include_payments   !== "0";
  const includeRisks      = params.include_risks      !== "0";
  const includeContracts  = params.include_contracts  !== "0";
  const includeLicenses   = params.include_licenses   !== "0";
  const includeRfc        = params.include_rfc        !== "0";
  const includeCompliance = params.include_compliance !== "0";
  const includeCyber      = params.include_cyber      !== "0";
  const includeEmployees  = params.include_employees  !== "0";

  const customers = await query<{ id: number; company_name: string }>(
    "SELECT id,company_name FROM customers ORDER BY company_name"
  );

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const step = !customerId ? 1 : (!fromDate || !toDate) ? 2 : 3;

  type RiskRow = { id: number; title: string; category: string; impact: number; likelihood: number; status: string; owner: string | null; target_date: string | null };
  type ContractRow = { id: number; vendor_name: string; service_type: string | null; contract_no: string | null; start_date: string | null; end_date: string | null; monthly_fee: number | null; currency: string };
  type LicenseRow = { id: number; name: string; category: string; vendor: string | null; quantity: number; end_date: string | null; cost: number | null; currency: string; auto_renew: boolean };
  type RfcRow = { id: number; rfc_no: string; title: string; change_type: string; impact: string; status: string; planned_date: string | null; assigned_to: string | null };
  type ComplianceRow = { id: number; title: string; category: string; frequency: string; next_due_date: string | null; assigned_to: string | null };
  type PentestRow = { id: number; name: string; type: string; status: string; start_date: string | null; end_date: string | null; finding_count: number; critical_count: number; high_count: number };
  type EmployeeRow = { id: number; first_name: string; last_name: string; department: string | null; title: string | null; is_active: boolean };

  let reportData: {
    customer: { company_name: string; contact_name: string; contact_email: string; monthly_fee: number; currency: string; sla_response_hours: number | null; sla_resolution_hours: number | null } | null;
    ticketStats: { total: string; open: string; resolved: string; avg_hours: string } | null;
    byCategory: { category_name: string; count: string }[];
    bySubcategory: { category_name: string; subcategory_name: string; count: string }[];
    byPriority: { priority: string; count: string }[];
    slaViolations: { id: number; subject: string; created_at: string; hours_open: string } | null;
    payments: { status: string; count: string; total: string }[];
    openTickets: {
      id: number; subject: string; priority: string; status: string;
      created_at: string; resolved_at: string | null; first_response_at: string | null;
      from_name: string; from_email: string;
      category_name: string; subcategory_name: string;
    }[];
    risks: RiskRow[];
    contracts: ContractRow[];
    licenses: LicenseRow[];
    rfcItems: RfcRow[];
    complianceTasks: ComplianceRow[];
    pentestProjects: PentestRow[];
    employees: EmployeeRow[];
  } | null = null;

  if (step === 3 && customerId && fromDate && toDate) {
    const [
      customer, ticketStats, byCategory, bySubcategory, byPriority, payments, openTickets,
      risks, contracts, licenses, rfcItems, complianceTasks, pentestProjects, employees,
    ] = await Promise.all([
      queryOne<{ company_name: string; contact_name: string; contact_email: string; monthly_fee: number; currency: string; sla_response_hours: number | null; sla_resolution_hours: number | null }>(
        "SELECT company_name,contact_name,contact_email,monthly_fee,currency,sla_response_hours,sla_resolution_hours FROM customers WHERE id=$1",
        [customerId]
      ),
      queryOne<{ total: string; open: string; resolved: string; avg_hours: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS open,
                COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved,
                ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at,now())-created_at))/3600)::numeric,1) AS avg_hours
         FROM tickets WHERE customer_id=$1 AND created_at>=$2 AND created_at<=$3::date+1`,
        [customerId, fromDate, toDate]
      ),
      query<{ category_name: string; count: string }>(
        `SELECT COALESCE(tc.name,'Kategorisiz') AS category_name, COUNT(*) AS count
         FROM tickets t
         LEFT JOIN ticket_categories tc ON tc.id=t.category_id
         WHERE t.customer_id=$1 AND t.created_at>=$2 AND t.created_at<=$3::date+1
         GROUP BY tc.name ORDER BY count DESC`,
        [customerId, fromDate, toDate]
      ),
      query<{ category_name: string; subcategory_name: string; count: string }>(
        `SELECT COALESCE(tc.name,'Kategorisiz') AS category_name,
                COALESCE(ts.name,'—') AS subcategory_name, COUNT(*) AS count
         FROM tickets t
         LEFT JOIN ticket_categories tc ON tc.id=t.category_id
         LEFT JOIN ticket_subcategories ts ON ts.id=t.subcategory_id
         WHERE t.customer_id=$1 AND t.created_at>=$2 AND t.created_at<=$3::date+1
         GROUP BY tc.name,ts.name ORDER BY count DESC`,
        [customerId, fromDate, toDate]
      ),
      query<{ priority: string; count: string }>(
        `SELECT priority, COUNT(*) AS count FROM tickets
         WHERE customer_id=$1 AND created_at>=$2 AND created_at<=$3::date+1
         GROUP BY priority ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
        [customerId, fromDate, toDate]
      ),
      query<{ status: string; count: string; total: string }>(
        `SELECT CASE WHEN status='pending' AND due_date<CURRENT_DATE THEN 'overdue' ELSE status END AS status,
                COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
         FROM payments WHERE customer_id=$1 AND due_date>=$2 AND due_date<=$3
         GROUP BY 1`,
        [customerId, fromDate, toDate]
      ),
      query<{
        id: number; subject: string; priority: string; status: string;
        created_at: string; resolved_at: string | null; first_response_at: string | null;
        from_name: string; from_email: string;
        category_name: string; subcategory_name: string;
      }>(
        `SELECT t.id, t.subject, t.priority, t.status, t.created_at, t.resolved_at,
                COALESCE(t.from_name, t.from_email, c.contact_name, '') AS from_name,
                COALESCE(t.from_email, c.contact_email, '') AS from_email,
                COALESCE(tc.name,'—') AS category_name,
                COALESCE(ts.name,'—') AS subcategory_name,
                (SELECT MIN(tm.created_at) FROM ticket_messages tm
                 WHERE tm.ticket_id=t.id AND tm.author_type='agent') AS first_response_at
         FROM tickets t
         LEFT JOIN customers c ON c.id=t.customer_id
         LEFT JOIN ticket_categories tc ON tc.id=t.category_id
         LEFT JOIN ticket_subcategories ts ON ts.id=t.subcategory_id
         WHERE t.customer_id=$1 AND t.created_at>=$2 AND t.created_at<=$3::date+1
         ORDER BY t.created_at DESC`,
        [customerId, fromDate, toDate]
      ),
      // Yeni modüller
      query<RiskRow>(
        "SELECT id,title,category,impact,likelihood,status,owner,target_date FROM customer_risks WHERE customer_id=$1 ORDER BY (impact*likelihood) DESC, created_at DESC",
        [customerId]
      ),
      query<ContractRow>(
        "SELECT id,vendor_name,service_type,contract_no,start_date,end_date,monthly_fee,currency FROM customer_vendor_contracts WHERE customer_id=$1 ORDER BY end_date ASC NULLS LAST",
        [customerId]
      ),
      query<LicenseRow>(
        "SELECT id,name,category,vendor,quantity,end_date,cost,currency,auto_renew FROM customer_licenses WHERE customer_id=$1 ORDER BY end_date ASC NULLS LAST",
        [customerId]
      ),
      query<RfcRow>(
        "SELECT id,rfc_no,title,change_type,impact,status,planned_date,assigned_to FROM change_requests WHERE customer_id=$1 ORDER BY created_at DESC",
        [customerId]
      ),
      query<ComplianceRow>(
        "SELECT id,title,category,frequency,next_due_date,assigned_to FROM compliance_tasks WHERE customer_id=$1 AND is_active=true ORDER BY next_due_date ASC NULLS LAST",
        [customerId]
      ),
      query<PentestRow>(
        `SELECT p.id,p.name,p.type,p.status,p.start_date,p.end_date,
                (SELECT COUNT(*)::int FROM pentest_findings WHERE project_id=p.id) AS finding_count,
                (SELECT COUNT(*)::int FROM pentest_findings WHERE project_id=p.id AND severity='critical') AS critical_count,
                (SELECT COUNT(*)::int FROM pentest_findings WHERE project_id=p.id AND severity='high') AS high_count
         FROM pentest_projects p WHERE p.customer_id=$1 ORDER BY p.created_at DESC`,
        [customerId]
      ),
      query<EmployeeRow>(
        "SELECT id,first_name,last_name,department,title,is_active FROM customer_employees WHERE customer_id=$1 ORDER BY last_name,first_name",
        [customerId]
      ),
    ]);
    reportData = {
      customer, ticketStats, byCategory, bySubcategory, byPriority,
      slaViolations: null, payments, openTickets,
      risks, contracts, licenses, rfcItems, complianceTasks, pentestProjects, employees,
    };
  }

  const PRIORITY_LABEL: Record<string, string> = { critical: "Kritik", high: "Yüksek", normal: "Normal", low: "Düşük" };
  const STATUS_LABEL: Record<string, string> = { open: "Açık", in_progress: "İşlemde", waiting_customer: "Müşteri Bekleniyor", resolved: "Çözüldü", closed: "Kapalı" };
  const PRIORITY_COLOR: Record<string, string> = { critical: "#ef4444", high: "#f59e0b", normal: "#3b82f6", low: "#64748b" };
  const STATUS_COLOR: Record<string, string> = { open: "#3b82f6", in_progress: "#f59e0b", waiting_customer: "#a78bfa", resolved: "#22c55e", closed: "#475569" };

  const selectedCustomer = customers.find((c) => String(c.id) === customerId);

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="nav-row">
          <Link href="/reports" className="back">← Raporlar</Link>
        </div>

        <div className="wizard-header">
          <h1 className="title">Rapor Oluştur</h1>
          <div className="steps">
            {["Müşteri", "Dönem", "Rapor"].map((s, i) => (
              <div key={s} className={`step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
                <span className="step-num">{step > i + 1 ? "✓" : i + 1}</span>
                <span className="step-label">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="wizard-card">
            <div className="wiz-title">Müşteri Seçin</div>
            <form method="GET" className="customer-grid">
              {customers.map((c) => (
                <button key={c.id} type="submit" name="customer" value={c.id} className="customer-btn">
                  <span className="cust-initial">{c.company_name[0].toUpperCase()}</span>
                  <span className="cust-name">{c.company_name}</span>
                </button>
              ))}
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-card">
            <div className="wiz-title">Dönem Seçin — {selectedCustomer?.company_name}</div>
            <form method="GET" className="date-form">
              <input type="hidden" name="customer" value={customerId} />
              <div className="preset-row">
                {[
                  { label: "Bu Ay",     from: firstOfMonth, to: today },
                  { label: "Geçen Ay",  from: (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().split("T")[0]; })(), to: (() => { const d = new Date(); d.setDate(0); return d.toISOString().split("T")[0]; })() },
                  { label: "Son 3 Ay", from: (() => { const d = new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().split("T")[0]; })(), to: today },
                  { label: "Bu Yıl",   from: `${today.slice(0,4)}-01-01`, to: today },
                ].map((p) => (
                  <button key={p.label} type="submit" name="from" value={p.from}
                    className="preset-btn"
                    formAction={`/reports/wizard?customer=${customerId}&from=${p.from}&to=${p.to}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="divider-or">veya özel aralık</div>
              <div className="date-row">
                <div className="field">
                  <label>Başlangıç</label>
                  <input type="date" name="from" defaultValue={firstOfMonth} required />
                </div>
                <div className="field">
                  <label>Bitiş</label>
                  <input type="date" name="to" defaultValue={today} required />
                </div>
              </div>

              <div className="include-section">
                <div className="include-title">Rapor İçeriği</div>
                <div className="include-grid">
                  {[
                    { name: "include_tickets",    label: "Destek Talepleri",       defaultChecked: true  },
                    { name: "include_payments",   label: "Ödeme Geçmişi",          defaultChecked: true  },
                    { name: "include_employees",  label: "Çalışanlar",             defaultChecked: true  },
                    { name: "include_risks",      label: "Risk Listesi",           defaultChecked: true  },
                    { name: "include_contracts",  label: "Dış Sözleşmeler",        defaultChecked: true  },
                    { name: "include_licenses",   label: "Lisanslar",              defaultChecked: true  },
                    { name: "include_rfc",        label: "Değişiklik Talepleri",   defaultChecked: true  },
                    { name: "include_compliance", label: "Kontrol Görevleri",      defaultChecked: true  },
                    { name: "include_cyber",      label: "Siber Güvenlik",         defaultChecked: true  },
                  ].map((item) => (
                    <label key={item.name} className="include-item">
                      <input type="checkbox" name={item.name} value="1" defaultChecked={item.defaultChecked} />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-submit-row">
                <button type="submit" className="btn-next">Raporu Oluştur →</button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && reportData && (
          <div className="report" id="report-content">
            <div className="report-header">
              <div>
                <div className="report-company">{reportData.customer?.company_name}</div>
                <div className="report-period">{new Date(fromDate!).toLocaleDateString("tr-TR")} — {new Date(toDate!).toLocaleDateString("tr-TR")}</div>
              </div>
              <div className="report-logo">x<span>Shield</span> MNG</div>
            </div>

            {reportData.customer && (
              <div className="report-section">
                <div className="section-title">Müşteri Bilgileri</div>
                <div className="info-grid">
                  {reportData.customer.contact_name && <InfoRow label="Yetkili" value={reportData.customer.contact_name} />}
                  {reportData.customer.contact_email && <InfoRow label="E-posta" value={reportData.customer.contact_email} />}
                  {reportData.customer.monthly_fee && <InfoRow label="Aylık Ücret" value={`${reportData.customer.currency} ${Number(reportData.customer.monthly_fee).toLocaleString()}`} />}
                  {reportData.customer.sla_response_hours && <InfoRow label="SLA Yanıt" value={`${reportData.customer.sla_response_hours} saat`} />}
                  {reportData.customer.sla_resolution_hours && <InfoRow label="SLA Çözüm" value={`${reportData.customer.sla_resolution_hours} saat`} />}
                </div>
              </div>
            )}

            {includeTickets && reportData.ticketStats && (
              <div className="report-section">
                <div className="section-title">Destek Özeti</div>
                <div className="stat-row-4">
                  <StatBox label="Toplam Talep" value={reportData.ticketStats.total} />
                  <StatBox label="Açık" value={reportData.ticketStats.open} color="#f59e0b" />
                  <StatBox label="Çözüldü" value={reportData.ticketStats.resolved} color="#22c55e" />
                  <StatBox label="Ort. Çözüm (saat)" value={reportData.ticketStats.avg_hours} />
                </div>
              </div>
            )}

            {includeCategories && reportData.byCategory.length > 0 && (
              <div className="report-section">
                <div className="section-title">Kategori Kırılımı</div>
                <table className="r-table">
                  <thead><tr><th>Kategori</th><th>Alt Kategori</th><th>Talep Sayısı</th></tr></thead>
                  <tbody>
                    {reportData.bySubcategory.map((r, i) => (
                      <tr key={i}>
                        <td>{r.category_name}</td>
                        <td className="sub-td">{r.subcategory_name}</td>
                        <td className="count-td">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {includeTickets && reportData.byPriority.length > 0 && (
              <div className="report-section">
                <div className="section-title">Öncelik Dağılımı</div>
                <div className="priority-row">
                  {reportData.byPriority.map((r) => {
                    const c = PRIORITY_COLOR[r.priority] ?? "#64748b";
                    return (
                      <div key={r.priority} className="prio-box" style={{ borderColor: `${c}30`, background: `${c}08` }}>
                        <div className="prio-val" style={{ color: c }}>{r.count}</div>
                        <div className="prio-label">{PRIORITY_LABEL[r.priority] ?? r.priority}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {includePayments && reportData.payments.length > 0 && (
              <div className="report-section">
                <div className="section-title">Ödeme Özeti</div>
                <div className="payment-row">
                  {reportData.payments.map((p) => {
                    const c = p.status === "paid" ? "#22c55e" : p.status === "overdue" ? "#ef4444" : "#f59e0b";
                    const label = p.status === "paid" ? "Ödendi" : p.status === "overdue" ? "Gecikmiş" : "Bekliyor";
                    return (
                      <div key={p.status} className="pay-box" style={{ borderColor: `${c}30` }}>
                        <div className="pay-label" style={{ color: c }}>{label}</div>
                        <div className="pay-count">{p.count} fatura</div>
                        <div className="pay-amount">${Number(p.total).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {includeEmployees && reportData.employees.length > 0 && (
              <div className="report-section">
                <div className="section-title">Çalışanlar ({reportData.employees.filter(e=>e.is_active).length} aktif)</div>
                <table className="r-table">
                  <thead><tr><th>Ad Soyad</th><th>Departman</th><th>Görev</th><th>Durum</th></tr></thead>
                  <tbody>
                    {reportData.employees.map((e) => (
                      <tr key={e.id}>
                        <td>{e.first_name} {e.last_name}</td>
                        <td className="sub-td">{e.department ?? "—"}</td>
                        <td className="sub-td">{e.title ?? "—"}</td>
                        <td><span className="r-badge" style={{ color: e.is_active ? "#22c55e" : "#64748b" }}>{e.is_active ? "Aktif" : "Pasif"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {includeRisks && reportData.risks.length > 0 && (
              <div className="report-section">
                <div className="section-title">Risk Listesi ({reportData.risks.filter(r=>r.status==="open").length} açık)</div>
                <table className="r-table">
                  <thead><tr><th>Risk</th><th>Kategori</th><th>Etki</th><th>Olasılık</th><th>Skor</th><th>Sahip</th><th>Hedef Tarih</th><th>Durum</th></tr></thead>
                  <tbody>
                    {reportData.risks.map((r) => {
                      const score = r.impact * r.likelihood;
                      const sc = score >= 15 ? "#ef4444" : score >= 8 ? "#f59e0b" : "#22c55e";
                      return (
                        <tr key={r.id}>
                          <td className="subject-td">{r.title}</td>
                          <td className="sub-td">{r.category}</td>
                          <td style={{ textAlign: "center" }}>{r.impact}</td>
                          <td style={{ textAlign: "center" }}>{r.likelihood}</td>
                          <td><span className="r-badge" style={{ color: sc }}>{score}</span></td>
                          <td className="sub-td">{r.owner ?? "—"}</td>
                          <td className="dt-td">{r.target_date ? new Date(r.target_date).toLocaleDateString("tr-TR") : "—"}</td>
                          <td><span className="r-badge" style={{ color: r.status === "open" ? "#f59e0b" : "#22c55e" }}>{r.status === "open" ? "Açık" : "Kapalı"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {includeContracts && reportData.contracts.length > 0 && (
              <div className="report-section">
                <div className="section-title">Dış Sözleşmeler</div>
                <table className="r-table">
                  <thead><tr><th>Tedarikçi</th><th>Hizmet</th><th>Sözleşme No</th><th>Başlangıç</th><th>Bitiş</th><th>Aylık Ücret</th></tr></thead>
                  <tbody>
                    {reportData.contracts.map((c) => {
                      const isExpiring = c.end_date && new Date(c.end_date) < new Date(Date.now() + 30*24*60*60*1000);
                      return (
                        <tr key={c.id}>
                          <td className="subject-td">{c.vendor_name}</td>
                          <td className="sub-td">{c.service_type ?? "—"}</td>
                          <td className="sub-td">{c.contract_no ?? "—"}</td>
                          <td className="dt-td">{c.start_date ? new Date(c.start_date).toLocaleDateString("tr-TR") : "—"}</td>
                          <td className="dt-td" style={isExpiring ? { color: "#ef4444", fontWeight: 700 } : {}}>{c.end_date ? new Date(c.end_date).toLocaleDateString("tr-TR") : "—"}{isExpiring ? " ⚠" : ""}</td>
                          <td className="sub-td">{c.monthly_fee ? `${c.currency} ${Number(c.monthly_fee).toLocaleString("tr-TR")}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {includeLicenses && reportData.licenses.length > 0 && (
              <div className="report-section">
                <div className="section-title">Lisanslar</div>
                <table className="r-table">
                  <thead><tr><th>Lisans</th><th>Kategori</th><th>Tedarikçi</th><th>Adet</th><th>Bitiş</th><th>Yenileme</th></tr></thead>
                  <tbody>
                    {reportData.licenses.map((l) => {
                      const isExpiring = l.end_date && new Date(l.end_date) < new Date(Date.now() + 30*24*60*60*1000);
                      return (
                        <tr key={l.id}>
                          <td className="subject-td">{l.name}</td>
                          <td className="sub-td">{l.category}</td>
                          <td className="sub-td">{l.vendor ?? "—"}</td>
                          <td style={{ textAlign: "center" }}>{l.quantity}</td>
                          <td className="dt-td" style={isExpiring ? { color: "#ef4444", fontWeight: 700 } : {}}>{l.end_date ? new Date(l.end_date).toLocaleDateString("tr-TR") : "—"}{isExpiring ? " ⚠" : ""}</td>
                          <td className="sub-td">{l.auto_renew ? "Otomatik" : "Manuel"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {includeCompliance && reportData.complianceTasks.length > 0 && (
              <div className="report-section">
                <div className="section-title">Kontrol Görevleri</div>
                <table className="r-table">
                  <thead><tr><th>Görev</th><th>Kategori</th><th>Sıklık</th><th>Sorumlu</th><th>Sonraki Tarih</th></tr></thead>
                  <tbody>
                    {reportData.complianceTasks.map((t) => {
                      const isOverdue = t.next_due_date && new Date(t.next_due_date) < new Date();
                      return (
                        <tr key={t.id}>
                          <td className="subject-td">{t.title}</td>
                          <td className="sub-td">{t.category}</td>
                          <td className="sub-td">{t.frequency}</td>
                          <td className="sub-td">{t.assigned_to ?? "—"}</td>
                          <td className="dt-td" style={isOverdue ? { color: "#ef4444", fontWeight: 700 } : {}}>{t.next_due_date ? new Date(t.next_due_date).toLocaleDateString("tr-TR") : "—"}{isOverdue ? " ⚠" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {includeRfc && reportData.rfcItems.length > 0 && (
              <div className="report-section">
                <div className="section-title">Değişiklik Talepleri (RFC)</div>
                <table className="r-table">
                  <thead><tr><th>RFC No</th><th>Başlık</th><th>Tür</th><th>Etki</th><th>Sorumlu</th><th>Planlanan</th><th>Durum</th></tr></thead>
                  <tbody>
                    {reportData.rfcItems.map((r) => {
                      const sc = r.status === "approved" ? "#22c55e" : r.status === "rejected" ? "#ef4444" : r.status === "completed" ? "#6366f1" : "#f59e0b";
                      const slabel: Record<string,string> = { draft: "Taslak", submitted: "İncelemede", approved: "Onaylı", rejected: "Reddedildi", completed: "Tamamlandı", cancelled: "İptal" };
                      const ilabel: Record<string,string> = { low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik" };
                      return (
                        <tr key={r.id}>
                          <td className="id-td">{r.rfc_no}</td>
                          <td className="subject-td">{r.title}</td>
                          <td className="sub-td">{r.change_type}</td>
                          <td><span className="r-badge">{ilabel[r.impact] ?? r.impact}</span></td>
                          <td className="sub-td">{r.assigned_to ?? "—"}</td>
                          <td className="dt-td">{r.planned_date ? new Date(r.planned_date).toLocaleDateString("tr-TR") : "—"}</td>
                          <td><span className="r-badge" style={{ color: sc }}>{slabel[r.status] ?? r.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {includeCyber && reportData.pentestProjects.length > 0 && (
              <div className="report-section">
                <div className="section-title">Siber Güvenlik — Pentest Projeleri</div>
                <table className="r-table">
                  <thead><tr><th>Proje</th><th>Tür</th><th>Başlangıç</th><th>Bitiş</th><th>Bulgular</th><th>Kritik</th><th>Yüksek</th><th>Durum</th></tr></thead>
                  <tbody>
                    {reportData.pentestProjects.map((p) => {
                      const sc = p.status === "completed" ? "#22c55e" : p.status === "in_progress" ? "#f59e0b" : "#6366f1";
                      const slabel: Record<string,string> = { planning: "Planlama", in_progress: "Devam Ediyor", completed: "Tamamlandı", paused: "Duraklatıldı" };
                      return (
                        <tr key={p.id}>
                          <td className="subject-td">{p.name}</td>
                          <td className="sub-td">{p.type}</td>
                          <td className="dt-td">{p.start_date ? new Date(p.start_date).toLocaleDateString("tr-TR") : "—"}</td>
                          <td className="dt-td">{p.end_date ? new Date(p.end_date).toLocaleDateString("tr-TR") : "—"}</td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{p.finding_count}</td>
                          <td style={{ textAlign: "center" }}><span className="r-badge" style={{ color: p.critical_count > 0 ? "#ef4444" : undefined }}>{p.critical_count}</span></td>
                          <td style={{ textAlign: "center" }}><span className="r-badge" style={{ color: p.high_count > 0 ? "#f59e0b" : undefined }}>{p.high_count}</span></td>
                          <td><span className="r-badge" style={{ color: sc }}>{slabel[p.status] ?? p.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {includeTickets && reportData.openTickets.length > 0 && (
              <div className="report-section">
                <div className="section-title">Talep Detayı</div>
                <table className="r-table r-table-wide">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Konu</th>
                      <th>Gönderen</th>
                      <th>Kategori</th>
                      <th>Öncelik</th>
                      <th>Durum</th>
                      <th>Oluşturulma</th>
                      <th>İlk Yanıt</th>
                      <th>Çözüm Tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.openTickets.map((t) => {
                      const sc = STATUS_COLOR[t.status] ?? "#64748b";
                      const pc = PRIORITY_COLOR[t.priority] ?? "#64748b";
                      const fmtDT = (d: string | null) => {
                        if (!d) return "—";
                        return new Date(d).toLocaleString("tr-TR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        });
                      };
                      const respDur = t.first_response_at && t.created_at
                        ? (() => {
                            const mins = Math.round((new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 60000);
                            if (mins < 60) return `(${mins} dk)`;
                            return `(${Math.round(mins / 60)} sa)`;
                          })()
                        : "";
                      const resDur = t.resolved_at && t.created_at
                        ? (() => {
                            const hrs = Math.round((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000);
                            if (hrs < 24) return `(${hrs} sa)`;
                            return `(${Math.round(hrs / 24)} gün)`;
                          })()
                        : "";
                      const sender = t.from_name || t.from_email || "—";
                      return (
                        <tr key={t.id}>
                          <td className="id-td">#{t.id}</td>
                          <td className="subject-td">{t.subject}</td>
                          <td className="sender-td">
                            <div>{sender}</div>
                            {t.from_email && t.from_name && t.from_name !== t.from_email && (
                              <div className="email-dim">{t.from_email}</div>
                            )}
                          </td>
                          <td className="sub-td">{t.category_name}{t.subcategory_name !== "—" ? ` / ${t.subcategory_name}` : ""}</td>
                          <td><span className="r-badge" style={{ color: pc }}>{PRIORITY_LABEL[t.priority] ?? t.priority}</span></td>
                          <td><span className="r-badge" style={{ color: sc }}>{STATUS_LABEL[t.status] ?? t.status}</span></td>
                          <td className="dt-td">{fmtDT(t.created_at)}</td>
                          <td className="dt-td">
                            {fmtDT(t.first_response_at)}
                            {respDur && <span className="dur-dim"> {respDur}</span>}
                          </td>
                          <td className="dt-td">
                            {fmtDT(t.resolved_at)}
                            {resDur && <span className="dur-dim"> {resDur}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="report-footer">
              Bu rapor xShield MNG sistemi tarafından {new Date().toLocaleString("tr-TR")} tarihinde oluşturulmuştur.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="action-bar no-print">
            <Link href={`/reports/wizard?customer=${customerId}`} className="btn-back-step">← Dönem Değiştir</Link>
            <button className="btn-print-link" id="print-trigger" type="button">Yazdır / PDF</button>
          </div>
        )}
      </div>
      {step === 3 && (
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('print-trigger')?.addEventListener('click', function(e) {
            e.preventDefault(); window.print();
          });
        ` }} />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="stat-box">
      <div className="stat-val" style={color ? { color } : {}}>{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

const css = `
.page{padding:28px;max-width:960px}
.nav-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.back{font-size:13px;color:var(--text-dim)}
.back:hover{color:var(--text-muted)}
.wizard-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:16px}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.steps{display:flex;align-items:center;gap:8px}
.step{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-ghost)}
.step.active{color:var(--text)}
.step.done{color:#22c55e}
.step:not(:last-child)::after{content:"→";margin-left:8px;color:var(--text-ghost)}
.step-num{width:22px;height:22px;border-radius:50%;background:var(--input-bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.step.active .step-num{background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.4);color:#3b82f6}
.step.done .step-num{background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.3);color:#22c55e}
.step-label{font-weight:600}
.wizard-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:28px}
.wiz-title{font-size:14px;font-weight:700;color:var(--text-sub);margin-bottom:20px}
.customer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.customer-btn{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--input-bg);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s;text-align:left}
.customer-btn:hover{border-color:rgba(59,130,246,0.3);background:rgba(59,130,246,0.06)}
.cust-initial{width:34px;height:34px;background:#1e3a8a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#93c5fd;flex-shrink:0}
.cust-name{font-size:13px;font-weight:600;color:var(--text)}
.preset-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.preset-btn{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;background:rgba(59,130,246,0.1);color:#3b82f6;border:1px solid rgba(59,130,246,0.2);transition:all 0.15s}
.preset-btn:hover{background:rgba(59,130,246,0.18)}
.divider-or{font-size:12px;color:var(--text-ghost);margin:16px 0;text-align:center;position:relative}
.divider-or::before,.divider-or::after{content:"";position:absolute;top:50%;width:43%;height:1px;background:var(--divider)}
.divider-or::before{left:0} .divider-or::after{right:0}
.date-form{}
.date-row{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:9px 12px;color:var(--text);outline:none}
.field input:focus{border-color:#3b82f6}
.btn-next{padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer;white-space:nowrap}
.include-section{margin-top:20px;padding-top:16px;border-top:1px solid var(--divider)}
.include-title{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
.include-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.include-item{display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border2);border-radius:8px;cursor:pointer;font-size:13px;color:var(--text-sub);background:var(--input-bg)}
.include-item:hover{border-color:rgba(59,130,246,.3);background:rgba(59,130,246,.04)}
.include-item input[type=checkbox]{width:15px;height:15px;accent-color:#3b82f6;flex-shrink:0}
.form-submit-row{margin-top:16px;display:flex;justify-content:flex-end}
.action-bar{display:flex;gap:12px;margin-top:20px;justify-content:space-between}
.btn-back-step{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border);background:transparent}
.btn-print-link{padding:9px 22px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;text-decoration:none}
/* ── REPORT ── */
.report{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:36px;display:flex;flex-direction:column;gap:28px}
.report-header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:20px;border-bottom:2px solid #3b82f6}
.report-company{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.report-period{font-size:13px;color:var(--text-dim);margin-top:4px}
.report-logo{font-size:18px;font-weight:800;color:var(--text-muted);letter-spacing:-0.5px}
.report-logo span{color:#3b82f6}
.report-section{display:flex;flex-direction:column;gap:14px}
.section-title{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.08em;padding-bottom:8px;border-bottom:1px solid var(--divider)}
.info-grid{display:flex;flex-direction:column;gap:8px}
.info-row{display:flex;gap:16px}
.info-label{font-size:12px;color:var(--text-dimmer);font-weight:600;width:120px;flex-shrink:0}
.info-value{font-size:13px;color:var(--text-sub)}
.stat-row-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.stat-box{background:var(--input-bg);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center}
.stat-val{font-size:28px;font-weight:800;color:var(--text);letter-spacing:-1px}
.stat-lbl{font-size:11px;color:var(--text-dim);margin-top:4px}
.priority-row{display:flex;gap:10px;flex-wrap:wrap}
.prio-box{flex:1;min-width:80px;border:1px solid;border-radius:8px;padding:14px;text-align:center}
.prio-val{font-size:24px;font-weight:800;letter-spacing:-0.5px}
.prio-label{font-size:11px;color:var(--text-dim);margin-top:4px}
.payment-row{display:flex;gap:12px;flex-wrap:wrap}
.pay-box{flex:1;min-width:120px;border:1px solid var(--border);border-radius:8px;padding:16px}
.pay-label{font-size:13px;font-weight:700;margin-bottom:4px}
.pay-count{font-size:11px;color:var(--text-dim)}
.pay-amount{font-size:18px;font-weight:800;color:var(--text);margin-top:6px}
.r-table{width:100%;border-collapse:collapse}
.r-table th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--divider)}
.r-table td{padding:10px 12px;border-bottom:1px solid var(--row-border);font-size:12px;color:var(--text-sub)}
.r-table tr:last-child td{border-bottom:none}
.r-table-wide{table-layout:fixed}
.id-td{color:var(--text-dimmer);font-size:11px;width:42px}
.subject-td{min-width:140px}
.sender-td{min-width:110px;font-size:11px}
.email-dim{font-size:10px;color:var(--text-ghost);margin-top:2px}
.sub-td{color:var(--text-muted);font-size:11px}
.count-td{font-weight:700;color:var(--text)}
.date-td{color:var(--text-dim);font-size:10px;white-space:nowrap}
.dt-td{color:var(--text-dim);font-size:10px;white-space:nowrap;min-width:100px}
.dur-dim{color:var(--text-ghost);font-size:9px}
.r-badge{font-size:11px;font-weight:700}
.report-footer{font-size:11px;color:var(--text-ghost);border-top:1px solid var(--divider);padding-top:16px;text-align:center}
@media print{
  .no-print,.nav-row,.wizard-header,.action-bar{display:none!important}
  .page{padding:0;max-width:100%;margin:0}
  .report{border:none;padding:16px 20px;box-shadow:none;background:#fff;color:#000;gap:18px}
  .report-company,.report-logo,.section-title,.info-value,.stat-val,.pay-amount,.count-td{color:#000!important}
  .info-label,.stat-lbl,.prio-label,.pay-count,.pay-label,.r-table th,.report-period,.report-footer,.sub-td,.date-td,.dt-td,.id-td,.sender-td,.email-dim{color:#555!important}
  .stat-box,.prio-box,.pay-box,.r-table,.info-grid{background:transparent!important;border-color:#ddd!important}
  .r-table td,.r-table th{border-color:#eee!important;color:#000!important;font-size:9px!important;padding:6px 8px!important}
  .r-table-wide{font-size:9px}
  .dur-dim{color:#888!important}
  .r-badge{font-weight:700}
  .report-header{border-color:#2563eb}
  .section-title{border-color:#ccc!important}
  @page{size:A4 landscape;margin:10mm 8mm}
}
`;
