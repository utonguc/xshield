"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { exportExcel, exportPDF } from "@/lib/export";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { fmtDate } from "@/lib/tz";

// ── Types ─────────────────────────────────────────────────────────────────────
type InvoiceItem = { id: string; description: string; quantity: number; unitPrice: number; lineTotal: number };
type Invoice = {
  id: string; invoiceNo: string;
  patientId: string; patientName: string;
  doctorId?: string; doctorName?: string;
  issuedAtUtc: string; dueAtUtc?: string;
  status: string; currency: string;
  subtotal: number; taxRate: number; taxAmount: number; total: number;
  notes?: string; createdAtUtc: string;
  items: InvoiceItem[];
};
type Patient = { id: string; firstName: string; lastName: string };
type Doctor  = { id: string; fullName: string };
type Summary = { totalRevenue: number; outstanding: number; thisMonthTotal: number; overdueCount: number };

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  Draft:     { label: "Taslak",     color: "#667085", bg: "#f2f4f7" },
  Sent:      { label: "Gönderildi", color: "#1d4ed8", bg: "#eff8ff" },
  Paid:      { label: "Ödendi",     color: "#059669", bg: "#f0fdf4" },
  Overdue:   { label: "Gecikmiş",   color: "#b42318", bg: "#fef3f2" },
  Cancelled: { label: "İptal",      color: "#92400e", bg: "#fffbeb" },
};
const STATUSES = ["Draft","Sent","Paid","Overdue","Cancelled"];
const CURRENCIES = ["TRY","USD","EUR"];
const TAX_RATES = [0, 10, 20];

const card: React.CSSProperties = {
  background: "var(--surface, #fff)", border: "1px solid #eaecf0",
  borderRadius: 20, padding: 24,
  boxShadow: "0 1px 4px rgba(16,24,40,0.06)",
};

function fmt(n: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(n);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [doctors, setDoctors]     = useState<Doctor[]>([]);
  const [clinicInfo, setClinicInfo] = useState<{ companyName: string; primaryColor?: string }>({ companyName: "Klinik" });
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs  = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filterStatus) qs.set("status", filterStatus);
      const [invRes, sumRes] = await Promise.all([
        apiFetch(`/Invoices?${qs}`),
        apiFetch("/Invoices/summary"),
      ]);
      if (invRes.ok) { const d = await invRes.json(); setInvoices(d.items ?? []); setTotal(d.total ?? 0); }
      if (sumRes.ok) setSummary(await sumRes.json());
    } finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => {
    apiFetch("/Patients?pageSize=200").then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setPatients(d);
    });
    apiFetch("/Doctors").then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setDoctors(d);
    });
    apiFetch("/Settings/organization").then(r => r.ok ? r.json() : null).then(d => {
      if (d) setClinicInfo({ companyName: d.companyName ?? "Klinik", primaryColor: d.primaryColor });
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteInvoice = async (id: string) => {
    if (!confirm("Bu faturayı silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/Invoices/${id}`, { method: "DELETE" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/Invoices/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppShell title="Finans & Faturalama" description="Fatura yönetimi ve gelir takibi">

      {/* Özet kartlar */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          <SummaryCard label="Toplam Gelir"    value={fmt(summary.totalRevenue)}   color="#059669" bg="#f0fdf4" icon="✓" />
          <SummaryCard label="Bekleyen"        value={fmt(summary.outstanding)}    color="#1d4ed8" bg="#eff8ff" icon="◷" />
          <SummaryCard label="Bu Ay"           value={fmt(summary.thisMonthTotal)} color="#7c3aed" bg="#f5f3ff" icon="📅" />
          <SummaryCard label="Gecikmiş Fatura" value={String(summary.overdueCount)} color="#b42318" bg="#fef3f2" icon="⚠" />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => { setEditInvoice(null); setShowForm(true); }} style={{
          padding: "9px 18px", borderRadius: 10, border: "none",
          background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>+ Yeni Fatura</button>
        <button onClick={() => exportExcel(invoices.map(i => ({
          invoiceNo: i.invoiceNo, patient: i.patientName, doctor: i.doctorName ?? "—",
          status: STATUS_META[i.status]?.label ?? i.status,
          total: i.total, currency: i.currency,
          issuedAt: fmtDate(i.issuedAtUtc),
        })), [
          { key: "invoiceNo", label: "Fatura No" }, { key: "patient", label: "Hasta" },
          { key: "doctor", label: "Doktor" }, { key: "status", label: "Durum" },
          { key: "total", label: "Tutar" }, { key: "currency", label: "Para Birimi" },
          { key: "issuedAt", label: "Tarih" },
        ], "faturalar")} style={{
          padding: "9px 14px", borderRadius: 10, border: "1px solid #e4e7ec",
          background: "var(--surface-2, #f8fafc)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13,
        }}>⬇ Excel</button>
        <button onClick={() => exportPDF(invoices.map(i => ({
          invoiceNo: i.invoiceNo, patient: i.patientName, doctor: i.doctorName ?? "—",
          status: STATUS_META[i.status]?.label ?? i.status,
          total: `${i.total} ${i.currency}`,
          issuedAt: fmtDate(i.issuedAtUtc),
        })), [
          { key: "invoiceNo", label: "Fatura No" }, { key: "patient", label: "Hasta" },
          { key: "doctor", label: "Doktor" }, { key: "status", label: "Durum" },
          { key: "total", label: "Tutar" }, { key: "issuedAt", label: "Tarih" },
        ], "faturalar", "Fatura Listesi")} style={{
          padding: "9px 14px", borderRadius: 10, border: "1px solid #e4e7ec",
          background: "var(--surface-2, #f8fafc)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13,
        }}>⬇ PDF</button>

        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13, cursor: "pointer" }}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
        </select>

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#667085" }}>
          {total} fatura
        </span>
      </div>

      {/* Tablo */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-2, #f8fafc)", borderBottom: "1px solid #eaecf0" }}>
              {["Fatura No","Hasta","Doktor","Tarih","Vade","Tutar","Durum","İşlem"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#667085", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#98a2b3" }}>Yükleniyor...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 48, color: "#98a2b3" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
                <div>Fatura bulunamadı.</div>
              </td></tr>
            ) : invoices.map(inv => {
              const sm = STATUS_META[inv.status] ?? { label: inv.status, color: "#667085", bg: "#f2f4f7" };
              return (
                <tr key={inv.id} style={{ borderBottom: "1px solid #f2f4f7" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1d4ed8" }}>{inv.invoiceNo}</td>
                  <td style={{ padding: "12px 16px" }}>{inv.patientName}</td>
                  <td style={{ padding: "12px 16px", color: "#667085" }}>{inv.doctorName ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#667085" }}>{fmtDate(inv.issuedAtUtc)}</td>
                  <td style={{ padding: "12px 16px", color: inv.status === "Overdue" ? "#b42318" : "#667085" }}>
                    {inv.dueAtUtc ? fmtDate(inv.dueAtUtc) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{fmt(inv.total, inv.currency)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: sm.bg, color: sm.color }}>
                      {sm.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <ActionButton label="PDF" onClick={() => downloadInvoicePdf(inv, clinicInfo)} color="#475569" />
                      <ActionButton label="Düzenle" onClick={() => { setEditInvoice(inv); setShowForm(true); }} color="#1d4ed8" />
                      {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                        <ActionButton label="Ödendi" onClick={() => updateStatus(inv.id, "Paid")} color="#059669" />
                      )}
                      {inv.status === "Draft" && (
                        <ActionButton label="Gönder" onClick={() => updateStatus(inv.id, "Sent")} color="#7c3aed" />
                      )}
                      {inv.status !== "Paid" && (
                        <ActionButton label="Sil" onClick={() => deleteInvoice(inv.id)} color="#b42318" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <PageBtn label="‹" disabled={page === 1}        onClick={() => setPage(p => p - 1)} />
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <PageBtn key={p} label={String(p)} disabled={false} onClick={() => setPage(p)}
              active={p === page} />
          ))}
          <PageBtn label="›" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <InvoiceForm
          invoice={editInvoice}
          patients={patients}
          doctors={doctors}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </AppShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color, bg, icon }: { label: string; value: string; color: string; bg: string; icon: string }) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text, #101828)" }}>{value}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 6, border: `1px solid ${color}30`,
      background: `${color}10`, color, fontWeight: 600, cursor: "pointer", fontSize: 12,
    }}>{label}</button>
  );
}

function PageBtn({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 36, height: 36, borderRadius: 8, border: "1px solid #e4e7ec",
      background: active ? "#1d4ed8" : disabled ? "#f8fafc" : "#fff",
      color: active ? "#fff" : disabled ? "#d0d5dd" : "#344054",
      fontWeight: 600, cursor: disabled ? "default" : "pointer", fontSize: 13,
    }}>{label}</button>
  );
}

// ── Invoice Form ──────────────────────────────────────────────────────────────
type FormItem = { description: string; quantity: number; unitPrice: number };

function InvoiceForm({ invoice, patients, doctors, onClose, onSaved }: {
  invoice: Invoice | null;
  patients: Patient[];
  doctors:  Doctor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = invoice !== null;

  const [patientId, setPatientId] = useState(invoice?.patientId ?? "");
  const [doctorId,  setDoctorId]  = useState(invoice?.doctorId  ?? "");
  const [issuedAt,  setIssuedAt]  = useState(invoice ? invoice.issuedAtUtc.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [dueAt,     setDueAt]     = useState(invoice?.dueAtUtc?.slice(0, 10) ?? "");
  const [currency,  setCurrency]  = useState(invoice?.currency  ?? "TRY");
  const [taxRate,   setTaxRate]   = useState(invoice?.taxRate   ?? 20);
  const [notes,     setNotes]     = useState(invoice?.notes     ?? "");
  const [items,     setItems]     = useState<FormItem[]>(
    invoice?.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))
    ?? [{ description: "", quantity: 1, unitPrice: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const subtotal  = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
  const total     = subtotal + taxAmount;

  const addItem    = () => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, j) => j !== i));
  const updateItem = (i: number, field: keyof FormItem, value: string | number) =>
    setItems(prev => prev.map((item, j) => j === i ? { ...item, [field]: value } : item));

  const save = async () => {
    if (!patientId) { setError("Hasta seçiniz."); return; }
    if (items.some(i => !i.description.trim())) { setError("Tüm kalemlerin açıklaması olmalı."); return; }
    setSaving(true); setError("");

    const body = {
      patientId, doctorId: doctorId || null,
      issuedAtUtc: new Date(issuedAt).toISOString(),
      dueAtUtc: dueAt ? new Date(dueAt).toISOString() : null,
      currency, taxRate: Number(taxRate), notes,
      items: items.map(i => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    };

    try {
      const res = await apiFetch(
        isEdit ? `/Invoices/${invoice!.id}` : "/Invoices",
        { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) }
      );
      if (!res.ok) { const d = await res.json(); setError(d.message ?? "Hata oluştu."); return; }
      onSaved();
    } catch { setError("Sunucuya ulaşılamadı."); }
    finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1.5px solid #e4e7ec", fontSize: 13, boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface, #fff)", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{isEdit ? "Fatura Düzenle" : "Yeni Fatura"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#667085" }}>×</button>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 16 }}>
          {/* Hasta & Doktor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Hasta *</label>
              <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inputStyle}>
                <option value="">Hasta seçin...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Doktor</label>
              <select value={doctorId} onChange={e => setDoctorId(e.target.value)} style={inputStyle}>
                <option value="">Seçim yok</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
              </select>
            </div>
          </div>

          {/* Tarihler & Para birimi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Fatura Tarihi *</label>
              <input type="date" value={issuedAt} onChange={e => setIssuedAt(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Vade Tarihi</label>
              <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Para Birimi</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Kalemler */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)" }}>Fatura Kalemleri *</label>
              <button onClick={addItem} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #b2ddff", background: "#eff8ff", color: "#175cd3", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                + Kalem Ekle
              </button>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 80px", gap: 8, padding: "0 4px" }}>
                {["Açıklama","Adet","Birim Fiyat",""].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>{h}</div>
                ))}
              </div>
              {items.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 80px", gap: 8, alignItems: "center" }}>
                  <input value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                    placeholder="İşlem / hizmet adı" style={inputStyle} />
                  <input type="number" value={item.quantity} min={1} onChange={e => updateItem(i, "quantity", Number(e.target.value))}
                    style={inputStyle} />
                  <input type="number" value={item.unitPrice} min={0} step={0.01} onChange={e => updateItem(i, "unitPrice", Number(e.target.value))}
                    style={inputStyle} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#667085", whiteSpace: "nowrap" }}>
                      {fmt(item.quantity * item.unitPrice, currency)}
                    </span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b42318", fontSize: 16, lineHeight: 1 }}>×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KDV & Özet */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>KDV Oranı (%)</label>
              <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={inputStyle}>
                {TAX_RATES.map(r => <option key={r} value={r}>%{r}</option>)}
              </select>
            </div>
            <div style={{ background: "var(--surface-2, #f8fafc)", borderRadius: 10, padding: "12px 16px", display: "grid", gap: 4 }}>
              <Row label="Ara Toplam"  value={fmt(subtotal, currency)} />
              <Row label={`KDV (%${taxRate})`} value={fmt(taxAmount, currency)} />
              <div style={{ borderTop: "1px solid #e4e7ec", marginTop: 4, paddingTop: 4 }}>
                <Row label="Toplam" value={fmt(total, currency)} bold />
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Notlar</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="İsteğe bağlı not..." style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef3f2", color: "#b42318", fontSize: 13, border: "1px solid #fecdca" }}>
              ⚠ {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #d0d5dd", background: "var(--surface, #fff)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              İptal
            </button>
            <button onClick={save} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: saving ? "#93c5fd" : "#1d4ed8", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 13 }}>
              {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#667085" }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 500, color: bold ? "#101828" : "#344054" }}>{value}</span>
    </div>
  );
}
