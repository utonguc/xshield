"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { fmtDate, fmtDateTimeShort as fmtDateTime } from "@/lib/tz";

type Patient = {
  id: string; firstName: string; lastName: string; fullName: string;
  phone?: string; email?: string; birthDate?: string; gender?: string;
  country?: string; city?: string; interestedProcedure?: string;
  leadSource?: string; assignedConsultant?: string; leadStatus: string;
  notes?: string; createdAtUtc: string;
};
type Appt = {
  id: string; doctorFullName: string; procedureName: string;
  startAtUtc: string; status: string;
};
type Invoice = {
  id: string; invoiceNo: string; total: number; currency: string;
  status: string; issuedAtUtc: string;
};
type Doc = {
  id: string; originalName: string; category: string; fileSizeLabel: string; createdAtUtc: string;
};
type WaLog = {
  id: string; messageBody: string; status: string; createdAtUtc: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: "#eff8ff", color: "#175cd3" },
  Completed: { bg: "#ecfdf5", color: "#065f46" },
  Cancelled: { bg: "#fef2f2", color: "#991b1b" },
  NoShow:    { bg: "#fff7ed", color: "#92400e" },
  Paid:      { bg: "#ecfdf5", color: "#065f46" },
  Sent:      { bg: "#eff8ff", color: "#175cd3" },
  Draft:     { bg: "#f8fafc", color: "#475569" },
  Overdue:   { bg: "#fef3f2", color: "#b42318" },
};

const Badge = ({ label, status }: { label: string; status: string }) => {
  const c = STATUS_COLORS[status] ?? { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: c.bg, color: c.color }}>
      {label}
    </span>
  );
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [patient, setPatient]     = useState<Patient | null>(null);
  const [appointments, setAppts]  = useState<Appt[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [docs, setDocs]           = useState<Doc[]>([]);
  const [waLogs, setWaLogs]       = useState<WaLog[]>([]);
  const [tab, setTab]             = useState<"overview" | "appts" | "invoices" | "docs" | "wa">("overview");
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, aRes, iRes, dRes] = await Promise.all([
      apiFetch(`/Patients/${id}`),
      apiFetch(`/Appointments?patientId=${id}&limit=100`),
      apiFetch(`/Invoices?patientId=${id}&limit=100`),
      apiFetch(`/Documents?patientId=${id}&limit=100`),
    ]);
    if (!pRes.ok) { router.push("/patients"); return; }
    setPatient(await pRes.json());
    if (aRes.ok) setAppts(await aRes.json());
    if (iRes.ok) setInvoices(await iRes.json());
    if (dRes.ok) setDocs(await dRes.json());
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "wa") {
      apiFetch(`/WhatsApp/logs?limit=100`).then(r => r.ok ? r.json() : { items: [] })
        .then(d => setWaLogs((d.items ?? []).filter((l: WaLog & { patientName?: string }) => true)));
    }
  }, [tab, id]);

  if (loading || !patient) return (
    <AppShell title="Hasta Detayı">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div style={{ width: 32, height: 32, border: "4px solid #e2e8f0", borderTopColor: "#1d4ed8",
          borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppShell>
  );

  const totalSpent = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.total, 0);

  return (
    <AppShell title={patient.fullName} description={`${patient.interestedProcedure ?? ""} · ${patient.leadStatus}`}>

      {/* Back */}
      <button onClick={() => router.push("/patients")} style={{
        background: "none", border: "none", cursor: "pointer", color: "#64748b",
        fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 6,
      }}>← Hastalar</button>

      {/* Header card */}
      <div style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: 24, marginBottom: 20,
        display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#1d4ed8", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
          {patient.firstName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--text, #0f172a)" }}>{patient.fullName}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {patient.phone && <span style={{ fontSize: 13, color: "#64748b" }}>📞 {patient.phone}</span>}
            {patient.email && <span style={{ fontSize: 13, color: "#64748b" }}>✉ {patient.email}</span>}
            {patient.gender && <span style={{ fontSize: 13, color: "#64748b" }}>👤 {patient.gender}</span>}
            {patient.birthDate && <span style={{ fontSize: 13, color: "#64748b" }}>🎂 {fmtDate(patient.birthDate)}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {patient.country && <span style={{ fontSize: 12, color: "#94a3b8" }}>📍 {patient.city ? `${patient.city}, ` : ""}{patient.country}</span>}
            {patient.leadSource && <span style={{ fontSize: 12, color: "#94a3b8" }}>📣 {patient.leadSource}</span>}
            {patient.assignedConsultant && <span style={{ fontSize: 12, color: "#94a3b8" }}>👩‍💼 {patient.assignedConsultant}</span>}
          </div>
        </div>

        {/* KPI boxes */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Randevu", value: appointments.length, color: "#1d4ed8", bg: "#eff8ff" },
            { label: "Fatura", value: invoices.length, color: "#6d28d9", bg: "#faf5ff" },
            { label: "Belge", value: docs.length, color: "#0e7490", bg: "#ecfeff" },
            { label: "Harcama", value: `₺${totalSpent.toLocaleString("tr-TR")}`, color: "#059669", bg: "#f0fdf4" },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: "10px 16px", minWidth: 80, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: k.color, fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f1f5f9", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {([
          ["overview",  "📋 Genel"],
          ["appts",     `📅 Randevular (${appointments.length})`],
          ["invoices",  `₺ Faturalar (${invoices.length})`],
          ["docs",      `📄 Belgeler (${docs.length})`],
          ["wa",        "💬 WhatsApp"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 12,
            background: tab === t ? "#fff" : "transparent",
            color: tab === t ? "#0f172a" : "#64748b",
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.08)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Hasta Bilgileri</div>
            {[
              ["İlgilenilen İşlem", patient.interestedProcedure],
              ["Lead Kaynağı",     patient.leadSource],
              ["Danışman",         patient.assignedConsultant],
              ["Lead Durumu",      patient.leadStatus],
              ["Kayıt Tarihi",     fmtDate(patient.createdAtUtc)],
            ].map(([l, v]) => v ? (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                borderBottom: "1px solid #f8fafc", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ) : null)}
          </div>
          <div style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Notlar</div>
            {patient.notes
              ? <p style={{ fontSize: 13, color: "var(--text-2, #344054)", lineHeight: 1.6, margin: 0 }}>{patient.notes}</p>
              : <div style={{ fontSize: 13, color: "#94a3b8" }}>Henüz not eklenmemiş.</div>}
            {/* Last appointment */}
            {appointments.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Son Randevu</div>
                <div style={{ background: "var(--surface-2, #f8fafc)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{appointments[0].procedureName}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{appointments[0].doctorFullName}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>{fmtDateTime(appointments[0].startAtUtc)}</span>
                    <Badge label={appointments[0].status} status={appointments[0].status} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Appointments tab ─────────────────────────────────────────────── */}
      {tab === "appts" && (
        <div style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", overflow: "hidden" }}>
          {appointments.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Randevu bulunamadı.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)", borderBottom: "1px solid #eaecf0" }}>
                  {["Tarih", "İşlem", "Doktor", "Durum"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafcff" }}>
                    <td style={{ padding: "10px 16px", fontSize: 13 }}>{fmtDateTime(a.startAtUtc)}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{a.procedureName}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#64748b" }}>{a.doctorFullName}</td>
                    <td style={{ padding: "10px 16px" }}><Badge label={a.status} status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Invoices tab ─────────────────────────────────────────────────── */}
      {tab === "invoices" && (
        <div style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", overflow: "hidden" }}>
          {invoices.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Fatura bulunamadı.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)", borderBottom: "1px solid #eaecf0" }}>
                  {["Fatura No", "Tarih", "Tutar", "Durum"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafcff" }}>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700 }}>{inv.invoiceNo}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#64748b" }}>{fmtDate(inv.issuedAtUtc)}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700 }}>{inv.total.toLocaleString("tr-TR")} {inv.currency}</td>
                    <td style={{ padding: "10px 16px" }}><Badge label={inv.status} status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Documents tab ────────────────────────────────────────────────── */}
      {tab === "docs" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {docs.length === 0 ? (
            <div style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", padding: 40, textAlign: "center", color: "#94a3b8", gridColumn: "1 / -1" }}>
              Belge bulunamadı.
            </div>
          ) : docs.map(d => (
            <div key={d.id} style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", padding: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text, #0f172a)", marginBottom: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.originalName}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.category} · {d.fileSizeLabel}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{fmtDate(d.createdAtUtc)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── WhatsApp tab ─────────────────────────────────────────────────── */}
      {tab === "wa" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 600 }}>
          {waLogs.length === 0 ? (
            <div style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", padding: 40, textAlign: "center", color: "#94a3b8" }}>
              Bu hasta için WhatsApp mesajı bulunamadı.
            </div>
          ) : waLogs.map(l => (
            <div key={l.id} style={{ background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0", padding: 14 }}>
              <div style={{ fontSize: 13, color: "var(--text-2, #344054)", lineHeight: 1.5 }}>{l.messageBody}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
                <span>{fmtDateTime(l.createdAtUtc)}</span>
                <span style={{ fontWeight: 700, color: l.status === "sent" ? "#059669" : l.status === "failed" ? "#b42318" : "#d97706" }}>
                  {l.status === "sent" ? "✓ Gönderildi" : l.status === "failed" ? "✕ Başarısız" : "⋯ Bekliyor"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
