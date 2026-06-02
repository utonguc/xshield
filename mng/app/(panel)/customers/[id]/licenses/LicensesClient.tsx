"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type License = {
  id: number; name: string; category: string; vendor: string | null;
  license_key: string | null; quantity: number; start_date: string | null;
  end_date: string | null; cost: string | null; currency: string;
  auto_renew: boolean; notes: string | null; created_at: string;
};

const CATEGORIES: { value: string; label: string; icon: string; color: string }[] = [
  { value: "microsoft",  label: "Microsoft",   icon: "🪟", color: "#0078d4" },
  { value: "antivirus",  label: "Antivirus",   icon: "🛡️", color: "#16a34a" },
  { value: "backup",     label: "Yedekleme",   icon: "💾", color: "#7c3aed" },
  { value: "domain",     label: "Domain",      icon: "🌐", color: "#0891b2" },
  { value: "ssl",        label: "SSL",         icon: "🔒", color: "#b45309" },
  { value: "cloud",      label: "Bulut",       icon: "☁️", color: "#2563eb" },
  { value: "software",   label: "Yazılım",     icon: "💿", color: "#db2777" },
  { value: "other",      label: "Diğer",       icon: "📦", color: "#64748b" },
];

const CURRENCIES = ["TRY", "USD", "EUR"];
const SYMS: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function getCat(v: string) { return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[7]; }
function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function emptyForm() {
  return { name: "", category: "microsoft", vendor: "", license_key: "", quantity: "1",
           start_date: "", end_date: "", cost: "", currency: "TRY", auto_renew: false, notes: "" };
}

export default function LicensesClient({ customerId, customerName, initialLicenses }:
  { customerId: number; customerName: string; initialLicenses: License[] }) {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>(initialLicenses);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState("all");

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (l: License) => {
    setEditing(l);
    setForm({ name: l.name, category: l.category, vendor: l.vendor ?? "", license_key: l.license_key ?? "",
              quantity: String(l.quantity), start_date: l.start_date?.split("T")[0] ?? "",
              end_date: l.end_date?.split("T")[0] ?? "", cost: l.cost ?? "",
              currency: l.currency, auto_renew: l.auto_renew, notes: l.notes ?? "" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/customers/${customerId}/licenses/${editing.id}`
        : `/api/customers/${customerId}/licenses`;
      const res = await fetch(url, { method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ text: editing ? "Güncellendi." : "Lisans eklendi.", ok: true });
      setShowModal(false);
      const updated = await fetch(`/api/customers/${customerId}/licenses`);
      if (updated.ok) setLicenses(await updated.json());
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Bu lisans kaydı silinecek. Emin misiniz?")) return;
    setDeleting(id);
    await fetch(`/api/customers/${customerId}/licenses/${id}`, { method: "DELETE" });
    setLicenses(l => l.filter(x => x.id !== id));
    setDeleting(null);
  };

  const filtered = filter === "all" ? licenses
    : filter === "expiring" ? licenses.filter(l => { const d = daysUntil(l.end_date); return d !== null && d <= 60; })
    : filter === "expired"  ? licenses.filter(l => { const d = daysUntil(l.end_date); return d !== null && d < 0; })
    : licenses.filter(l => l.category === filter);

  const expiring = licenses.filter(l => { const d = daysUntil(l.end_date); return d !== null && d >= 0 && d <= 30; }).length;
  const expired  = licenses.filter(l => { const d = daysUntil(l.end_date); return d !== null && d < 0; }).length;

  const inp: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13, outline: "none" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 5 };

  return (
    <>
      {msg && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? "#16a34a" : "#dc2626", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
          {msg.text}<button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 10, fontSize: 16 }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>Lisanslar & Abonelikler</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>{customerName} — {licenses.length} kayıt{expiring > 0 ? ` · ⚠ ${expiring} yakında bitiyor` : ""}{expired > 0 ? ` · ❌ ${expired} süresi dolmuş` : ""}</p>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Lisans Ekle</button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[{ v: "all", l: "Tümü" }, { v: "expiring", l: "⚠ Yakında Bitiyor" }, { v: "expired", l: "❌ Süresi Dolmuş" },
          ...CATEGORIES.map(c => ({ v: c.value, l: `${c.icon} ${c.label}` }))
        ].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: filter === f.v ? "#2563eb" : "var(--card)", color: filter === f.v ? "#fff" : "var(--text-dim)",
            border: filter === f.v ? "none" : "1px solid var(--border)",
          }}>{f.l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)", fontSize: 14 }}>
          {filter === "all" ? "Henüz lisans eklenmemiş." : "Bu filtreden kayıt yok."}
          {filter === "all" && <><br /><button onClick={openAdd} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #3b82f6", background: "rgba(59,130,246,.06)", color: "#3b82f6", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>İlk lisansı ekle</button></>}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(l => {
            const cat = getCat(l.category);
            const days = daysUntil(l.end_date);
            const expired = days !== null && days < 0;
            const urgent  = days !== null && days >= 0 && days <= 14;
            const warning = days !== null && days > 14 && days <= 60;
            const statusColor = expired ? "#ef4444" : urgent ? "#f97316" : warning ? "#eab308" : "#22c55e";
            const statusText  = days === null ? "Süresiz" : expired ? `${Math.abs(days)}g önce doldu` : days === 0 ? "Bugün bitiyor!" : `${days} gün kaldı`;
            return (
              <div key={l.id} style={{ background: "var(--card)", border: `1px solid ${expired ? "rgba(239,68,68,.25)" : urgent ? "rgba(249,115,22,.25)" : "var(--border)"}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: cat.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{l.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: cat.color + "18", color: cat.color }}>{cat.label}</span>
                    {l.auto_renew && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(34,197,94,.12)", color: "#16a34a" }}>↻ Oto. Yenileme</span>}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-dim)" }}>
                    {l.vendor && <span>🏢 {l.vendor}</span>}
                    {l.quantity > 1 && <span>👥 {l.quantity} adet</span>}
                    <span>📅 {fmtDate(l.start_date)} — {fmtDate(l.end_date)}</span>
                    {l.cost && <span>💰 {SYMS[l.currency]}{Number(l.cost).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}/yıl</span>}
                    <span style={{ color: statusColor, fontWeight: 600 }}>⏱ {statusText}</span>
                  </div>
                  {l.license_key && <div style={{ marginTop: 6, fontSize: 11, fontFamily: "monospace", color: "var(--text-dim)", background: "var(--card2)", padding: "3px 8px", borderRadius: 5, display: "inline-block" }}>🔑 {l.license_key}</div>}
                  {l.notes && <div style={{ marginTop: 5, fontSize: 12, color: "var(--text-dim)" }}>{l.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => openEdit(l)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Düzenle</button>
                  <button onClick={() => del(l.id)} disabled={deleting === l.id} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{deleting === l.id ? "…" : "Sil"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(580px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editing ? "Lisansı Düzenle" : "Yeni Lisans / Abonelik"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "72vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Lisans / Ürün Adı *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Microsoft 365 Business Premium" style={inp} autoFocus />
                </div>
                <div>
                  <label style={lbl}>Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tedarikçi / Satıcı</label>
                  <input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Microsoft, Kaspersky…" style={inp} />
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
                  <label style={lbl}>Adet / Kullanıcı Sayısı</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Yıllık Maliyet</label>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Para Birimi</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={inp}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Lisans Anahtarı (opsiyonel)</label>
                  <input value={form.license_key} onChange={e => setForm(f => ({ ...f, license_key: e.target.value }))} placeholder="XXXXX-XXXXX-XXXXX" style={{ ...inp, fontFamily: "monospace" }} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Notlar</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                </div>
                <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" id="auto_renew" checked={form.auto_renew} onChange={e => setForm(f => ({ ...f, auto_renew: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <label htmlFor="auto_renew" style={{ fontSize: 13, color: "var(--text-dim)", cursor: "pointer" }}>Otomatik yenileme aktif</label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={save} disabled={saving || !form.name.trim()} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: saving ? "#1d4ed8" : "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
