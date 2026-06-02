"use client";
import { useState } from "react";

type Risk = {
  id: number; title: string; description: string | null; category: string;
  impact: number; likelihood: number; owner: string | null;
  mitigation_plan: string | null; status: string; target_date: string | null;
  closed_at: string | null; created_by: string | null; created_at: string;
};

const CATEGORIES = [
  { value: "access",   label: "Erişim Kontrolü", icon: "🔑" },
  { value: "network",  label: "Ağ Güvenliği",    icon: "🌐" },
  { value: "software", label: "Yazılım",         icon: "💻" },
  { value: "physical", label: "Fiziksel",        icon: "🏢" },
  { value: "human",    label: "İnsan Hatası",    icon: "👤" },
  { value: "data",     label: "Veri Güvenliği",  icon: "🗄️" },
  { value: "business", label: "İş Sürekliliği",  icon: "📊" },
  { value: "other",    label: "Diğer",           icon: "📌" },
];

const STATUSES = [
  { value: "open",       label: "Açık",         color: "#ef4444" },
  { value: "mitigating", label: "Azaltılıyor",  color: "#f59e0b" },
  { value: "accepted",   label: "Kabul Edildi", color: "#6366f1" },
  { value: "closed",     label: "Kapalı",       color: "#22c55e" },
];

function getCat(v: string) { return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[7]; }
function getSt(v: string)  { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

function riskScore(impact: number, likelihood: number) { return impact * likelihood; }
function riskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 20) return { label: "Kritik",   color: "#ef4444", bg: "rgba(239,68,68,.12)" };
  if (score >= 12) return { label: "Yüksek",   color: "#f97316", bg: "rgba(249,115,22,.12)" };
  if (score >= 6)  return { label: "Orta",     color: "#f59e0b", bg: "rgba(245,158,11,.12)" };
  return              { label: "Düşük",    color: "#22c55e", bg: "rgba(34,197,94,.12)" };
}

function ScoreCell({ v, label }: { v: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</span>
      <div style={{ display: "flex", gap: 2 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2,
            background: i <= v ? (v <= 2 ? "#22c55e" : v <= 3 ? "#f59e0b" : "#ef4444") : "var(--border)" }} />
        ))}
      </div>
    </div>
  );
}

function emptyForm() {
  return { title: "", description: "", category: "network", impact: 3, likelihood: 3,
           owner: "", mitigation_plan: "", status: "open", target_date: "" };
}

export default function RisksClient({ customerId, customerName, initialRisks }:
  { customerId: number; customerName: string; initialRisks: Risk[] }) {
  const [risks, setRisks]         = useState<Risk[]>(initialRisks);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Risk | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter]       = useState("all");

  const toast = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  const refresh = async () => {
    const r = await fetch(`/api/customers/${customerId}/risks`);
    if (r.ok) setRisks(await r.json());
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (r: Risk) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description||"", category: r.category,
              impact: r.impact, likelihood: r.likelihood, owner: r.owner||"",
              mitigation_plan: r.mitigation_plan||"", status: r.status,
              target_date: r.target_date||"" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/customers/${customerId}/risks/${editing.id}`
        : `/api/customers/${customerId}/risks`;
      const res = await fetch(url, { method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      toast(editing ? "Risk güncellendi." : "Risk eklendi.", true);
      setShowModal(false);
      await refresh();
    } catch (e: any) { toast(e.message, false); }
    finally { setSaving(false); }
  };

  const del = async (r: Risk) => {
    if (!confirm(`"${r.title}" riski silinecek?`)) return;
    await fetch(`/api/customers/${customerId}/risks/${r.id}`, { method: "DELETE" });
    setRisks(rs => rs.filter(x => x.id !== r.id));
  };

  const filtered = risks.filter(r => {
    if (filter === "open")    return r.status === "open";
    if (filter === "critical") return riskScore(r.impact, r.likelihood) >= 20;
    if (filter === "high")    return riskScore(r.impact, r.likelihood) >= 12;
    return true;
  });

  const criticalCount = risks.filter(r => riskScore(r.impact, r.likelihood) >= 20).length;
  const highCount     = risks.filter(r => { const s = riskScore(r.impact,r.likelihood); return s >= 12 && s < 20; }).length;
  const openCount     = risks.filter(r => r.status === "open" || r.status === "mitigating").length;

  const inp: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13, outline: "none" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 5 };

  return (
    <>
      {msg && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? "#16a34a" : "#dc2626", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
          {msg.text}<button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 10, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>⚠️ Risk Kaydı</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>
            {customerName} · {risks.length} risk
            {criticalCount > 0 && <span style={{ color: "#ef4444", marginLeft: 8, fontWeight: 700 }}>🔴 {criticalCount} kritik</span>}
            {highCount > 0 && <span style={{ color: "#f97316", marginLeft: 8, fontWeight: 700 }}>🟠 {highCount} yüksek</span>}
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Risk Ekle</button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "all",      label: `Tümü (${risks.length})` },
          { key: "critical", label: `Kritik (${criticalCount})`, color: "#ef4444" },
          { key: "high",     label: `Yüksek (${highCount})`,     color: "#f97316" },
          { key: "open",     label: `Açık (${openCount})`,       color: "#6366f1" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${filter === f.key ? (f.color||"var(--accent)") : "var(--border)"}`,
              background: filter === f.key ? `${f.color||"var(--accent)"}18` : "transparent",
              color: filter === f.key ? (f.color||"var(--accent)") : "var(--text-dim)",
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Heat map summary */}
      {risks.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 10 }}>Risk Dağılımı</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["Kritik","Yüksek","Orta","Düşük"].map(l => {
              const count = risks.filter(r => riskLevel(riskScore(r.impact,r.likelihood)).label === l).length;
              const rl = [
                { label: "Kritik", color: "#ef4444", bg: "rgba(239,68,68,.12)" },
                { label: "Yüksek", color: "#f97316", bg: "rgba(249,115,22,.12)" },
                { label: "Orta",   color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
                { label: "Düşük",  color: "#22c55e", bg: "rgba(34,197,94,.12)" },
              ].find(x => x.label === l)!;
              return (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, background: rl.bg }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: rl.color }}>{count}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: rl.color }}>{l}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)", fontSize: 14 }}>
          {filter === "all" ? "Henüz risk kaydedilmemiş." : "Bu filtrede risk yok."}
          {filter === "all" && <div><button onClick={openAdd} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #f97316", background: "rgba(249,115,22,.06)", color: "#f97316", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>İlk riski ekle</button></div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(r => {
            const cat = getCat(r.category);
            const st  = getSt(r.status);
            const score = riskScore(r.impact, r.likelihood);
            const level = riskLevel(score);
            return (
              <div key={r.id} style={{ background: "var(--card)", border: `1px solid ${r.status === "closed" ? "var(--border)" : level.color}22`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: level.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: level.color, flexShrink: 0 }}>{score}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{r.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: level.bg, color: level.color }}>{level.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${st.color}18`, color: st.color }}>{st.label}</span>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(100,116,139,.1)", color: "var(--text-dim)" }}>{cat.icon} {cat.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", marginBottom: r.description||r.mitigation_plan ? 6 : 0 }}>
                      <ScoreCell v={r.impact}     label="Etki" />
                      <ScoreCell v={r.likelihood} label="Olasılık" />
                      {r.owner && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>👤 {r.owner}</span>}
                      {r.target_date && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>🎯 {new Date(r.target_date).toLocaleDateString("tr-TR")}</span>}
                    </div>
                    {r.description && <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>{r.description}</div>}
                    {r.mitigation_plan && (
                      <div style={{ fontSize: 12, color: "var(--text-sub)", background: "var(--card2)", padding: "6px 10px", borderRadius: 6, marginTop: 4 }}>
                        <strong>Azaltma:</strong> {r.mitigation_plan}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => openEdit(r)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Düzenle</button>
                    <button onClick={() => del(r)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sil</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(560px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editing ? "Riski Düzenle" : "Yeni Risk"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "78vh", overflowY: "auto" }}>
              <div>
                <label style={lbl}>Risk Başlığı *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn: Zayıf şifre politikası — VPN erişimi" style={inp} autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Durum</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Etki (1–5)</label>
                  <select value={form.impact} onChange={e => setForm(f => ({ ...f, impact: Number(e.target.value) }))} style={inp}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["","Çok Düşük","Düşük","Orta","Yüksek","Çok Yüksek"][n]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Olasılık (1–5)</label>
                  <select value={form.likelihood} onChange={e => setForm(f => ({ ...f, likelihood: Number(e.target.value) }))} style={inp}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["","Nadir","Olası Değil","Mümkün","Muhtemel","Neredeyse Kesin"][n]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Sorumlu</label>
                  <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Risk sahibi kişi/birim" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Hedef Tarih</label>
                  <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} style={inp} />
                </div>
              </div>
              {/* Live score preview */}
              <div style={{ background: "var(--card2)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: riskLevel(form.impact*form.likelihood).color }}>
                  {form.impact * form.likelihood}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: riskLevel(form.impact*form.likelihood).color }}>
                    {riskLevel(form.impact*form.likelihood).label} Risk
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Etki {form.impact} × Olasılık {form.likelihood}</div>
                </div>
              </div>
              <div>
                <label style={lbl}>Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Risk detayı…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={lbl}>Azaltma Planı</label>
                <textarea value={form.mitigation_plan} onChange={e => setForm(f => ({ ...f, mitigation_plan: e.target.value }))} rows={2} placeholder="Riski azaltmak için alınan/alınacak önlemler…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={save} disabled={saving || !form.title.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
