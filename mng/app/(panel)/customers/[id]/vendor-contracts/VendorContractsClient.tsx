"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Contract = {
  id: number; vendor_name: string; service_type: string | null;
  contract_no: string | null; start_date: string | null; end_date: string | null;
  monthly_fee: string | null; currency: string; notes: string | null;
  file_stored: string | null; file_original: string | null; file_size: number | null;
  created_at: string;
};

const CURRENCIES = ["TRY", "USD", "EUR"];
const SYMS: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const emptyForm = () => ({
  vendor_name: "", service_type: "", contract_no: "",
  start_date: "", end_date: "", monthly_fee: "", currency: "TRY", notes: "",
});

export default function VendorContractsClient({
  customerId, customerName, initialContracts,
}: {
  customerId: number; customerName: string; initialContracts: Contract[];
}) {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setFile(null); setShowModal(true); };
  const openEdit = (c: Contract) => {
    setEditing(c);
    setForm({
      vendor_name: c.vendor_name, service_type: c.service_type ?? "",
      contract_no: c.contract_no ?? "", start_date: c.start_date?.split("T")[0] ?? "",
      end_date: c.end_date?.split("T")[0] ?? "", monthly_fee: c.monthly_fee ?? "",
      currency: c.currency, notes: c.notes ?? "",
    });
    setFile(null);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.vendor_name.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (file) fd.append("file", file);
      if (editing && !file && editing.file_original) fd.append("file_original", editing.file_original);

      const url = editing
        ? `/api/customers/${customerId}/vendor-contracts/${editing.id}`
        : `/api/customers/${customerId}/vendor-contracts`;
      const res = await fetch(url, { method: editing ? "PUT" : "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ text: editing ? "Sözleşme güncellendi." : "Sözleşme eklendi.", ok: true });
      setShowModal(false);
      router.refresh();
      const updated = await fetch(`/api/customers/${customerId}/vendor-contracts`);
      if (updated.ok) setContracts(await updated.json());
    } catch (e: any) {
      setMsg({ text: e.message ?? "Hata oluştu", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = async (id: number) => {
    if (!confirm("Bu sözleşme silinecek. Emin misiniz?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/customers/${customerId}/vendor-contracts/${id}`, { method: "DELETE" });
      setContracts(c => c.filter(x => x.id !== id));
      setMsg({ text: "Sözleşme silindi.", ok: true });
    } finally {
      setDeleting(null);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)",
    borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13, outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase",
    letterSpacing: "0.06em", display: "block", marginBottom: 5,
  };

  return (
    <>
      {msg && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 999,
          padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.ok ? "#16a34a" : "#dc2626", color: "#fff",
          boxShadow: "0 4px 20px rgba(0,0,0,.3)",
        }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 10, fontSize: 16 }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Dış Sözleşmeler</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>{customerName} — {contracts.length} sözleşme</p>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Sözleşme Ekle
        </button>
      </div>

      {contracts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)", fontSize: 14 }}>
          Henüz dış sözleşme eklenmemiş.<br />
          <button onClick={openAdd} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #3b82f6", background: "rgba(59,130,246,.06)", color: "#3b82f6", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            İlk sözleşmeyi ekle
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {contracts.map(c => {
            const days = daysUntil(c.end_date);
            const expired = days !== null && days < 0;
            const urgent = days !== null && days >= 0 && days <= 30;
            const warning = days !== null && days > 30 && days <= 60;
            const statusColor = expired ? "#ef4444" : urgent ? "#f97316" : warning ? "#eab308" : "#22c55e";
            const statusLabel = expired ? `${Math.abs(days!)} gün önce doldu`
              : days === null ? "Süresiz"
              : days === 0 ? "Bugün bitiyor!"
              : `${days} gün kaldı`;

            return (
              <div key={c.id} style={{ background: "var(--card)", border: `1px solid ${expired ? "rgba(239,68,68,.3)" : urgent ? "rgba(249,115,22,.3)" : "var(--border)"}`, borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{c.vendor_name}</span>
                      {c.service_type && <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(59,130,246,.12)", color: "#3b82f6", padding: "2px 8px", borderRadius: 20 }}>{c.service_type}</span>}
                      {c.contract_no && <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace" }}>#{c.contract_no}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, color: "var(--text-dim)" }}>
                      <span>📅 {fmtDate(c.start_date)} — {fmtDate(c.end_date)}</span>
                      {c.monthly_fee && <span>💰 {SYMS[c.currency]}{Number(c.monthly_fee).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}/ay</span>}
                      <span style={{ color: statusColor, fontWeight: 600 }}>⏱ {statusLabel}</span>
                    </div>
                    {c.notes && <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-dim)", whiteSpace: "pre-wrap" }}>{c.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {c.file_stored && (
                      <a href={`/api/vendor-contracts/${c.id}/download`} target="_blank" rel="noreferrer"
                        style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}
                        title={`${c.file_original} (${fmtSize(c.file_size)})`}>
                        📎 İndir
                      </a>
                    )}
                    <button onClick={() => openEdit(c)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Düzenle</button>
                    <button onClick={() => deleteContract(c.id)} disabled={deleting === c.id}
                      style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {deleting === c.id ? "…" : "Sil"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "min(560px,94vw)", zIndex: 401, background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editing ? "Sözleşmeyi Düzenle" : "Yeni Dış Sözleşme"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Firma Adı *</label>
                  <input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} placeholder="Konica Minolta, HP Turkey…" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Hizmet Türü</label>
                  <input value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} placeholder="Yazıcı Bakım & Kiralama" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Sözleşme No</label>
                  <input value={form.contract_no} onChange={e => setForm(f => ({ ...f, contract_no: e.target.value }))} placeholder="SZL-2024-001" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Başlangıç Tarihi</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Bitiş Tarihi</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Aylık Ücret</label>
                  <input type="number" min="0" step="0.01" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))} placeholder="0.00" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Para Birimi</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={inp}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Notlar</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Sözleşme kapsamı, özel koşullar…" style={{ ...inp, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Sözleşme Dosyası {editing?.file_original && <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-dim)" }}>— mevcut: {editing.file_original}</span>}</label>
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)}
                    style={{ ...inp, padding: "6px 12px", cursor: "pointer" }} />
                  {file && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Seçildi: {file.name} ({fmtSize(file.size)})</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={save} disabled={saving || !form.vendor_name.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: saving ? "#1d4ed8" : "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Kaydediliyor…" : editing ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
