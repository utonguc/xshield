"use client";
import { useState } from "react";

type Change = {
  id: number; rfc_no: string; title: string; description: string | null;
  change_type: string; impact: string; urgency: string;
  requestor: string | null; assigned_to: string | null;
  planned_date: string | null; rollback_plan: string | null;
  implementation_notes: string | null; status: string;
  approved_by: string | null; approved_at: string | null;
  completed_at: string | null; created_by: string | null; created_at: string;
};

const TYPES = [
  { value: "standard",  label: "Standart",  icon: "📋", color: "#6366f1", desc: "Önceden onaylanmış, düşük riskli" },
  { value: "normal",    label: "Normal",    icon: "🔄", color: "#3b82f6", desc: "İnceleme ve onay gerektirir" },
  { value: "emergency", label: "Acil",      icon: "🚨", color: "#ef4444", desc: "Kritik kesinti giderme" },
];

const IMPACTS = [
  { value: "low",    label: "Düşük",   color: "#22c55e" },
  { value: "medium", label: "Orta",    color: "#f59e0b" },
  { value: "high",   label: "Yüksek",  color: "#ef4444" },
];

const STATUSES = [
  { value: "draft",       label: "Taslak",       color: "#64748b" },
  { value: "review",      label: "İncelemede",   color: "#6366f1" },
  { value: "approved",    label: "Onaylandı",    color: "#10b981" },
  { value: "rejected",    label: "Reddedildi",   color: "#ef4444" },
  { value: "in_progress", label: "Uygulanıyor",  color: "#3b82f6" },
  { value: "completed",   label: "Tamamlandı",   color: "#22c55e" },
  { value: "cancelled",   label: "İptal",        color: "#64748b" },
];

function getType(v: string)   { return TYPES.find(t => t.value === v) ?? TYPES[1]; }
function getImpact(v: string) { return IMPACTS.find(i => i.value === v) ?? IMPACTS[1]; }
function getSt(v: string)     { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

function emptyForm() {
  return { title: "", description: "", change_type: "normal", impact: "medium",
           urgency: "medium", requestor: "", assigned_to: "", planned_date: "",
           rollback_plan: "", status: "draft" };
}

export default function ChangesClient({ customerId, customerName, initialChanges }:
  { customerId: number; customerName: string; initialChanges: Change[] }) {
  const [changes, setChanges]     = useState<Change[]>(initialChanges);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Change | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [showDetail, setShowDetail] = useState<Change | null>(null);
  const [implNotes, setImplNotes]   = useState("");
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter]       = useState("all");

  const toast = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  const refresh = async () => {
    const r = await fetch(`/api/customers/${customerId}/changes`);
    if (r.ok) setChanges(await r.json());
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (c: Change) => {
    setEditing(c);
    setForm({ title: c.title, description: c.description||"", change_type: c.change_type,
              impact: c.impact, urgency: c.urgency, requestor: c.requestor||"",
              assigned_to: c.assigned_to||"", planned_date: c.planned_date||"",
              rollback_plan: c.rollback_plan||"", status: c.status });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/customers/${customerId}/changes/${editing.id}`
        : `/api/customers/${customerId}/changes`;
      const res = await fetch(url, { method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast(editing ? "RFC güncellendi." : `${data.rfc_no} oluşturuldu.`, true);
      setShowModal(false);
      await refresh();
    } catch (e: any) { toast(e.message, false); }
    finally { setSaving(false); }
  };

  const quickStatus = async (c: Change, newStatus: string) => {
    const body: Record<string, string> = {
      title: c.title, description: c.description||"", change_type: c.change_type,
      impact: c.impact, urgency: c.urgency, requestor: c.requestor||"",
      assigned_to: c.assigned_to||"", planned_date: c.planned_date||"",
      rollback_plan: c.rollback_plan||"",
      implementation_notes: newStatus === "completed" ? implNotes : (c.implementation_notes||""),
      status: newStatus,
    };
    const res = await fetch(`/api/customers/${customerId}/changes/${c.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast("Durum güncellendi.", true); setShowDetail(null); await refresh(); }
    else toast("Hata oluştu", false);
  };

  const del = async (c: Change) => {
    if (!confirm(`"${c.rfc_no}" silinecek?`)) return;
    await fetch(`/api/customers/${customerId}/changes/${c.id}`, { method: "DELETE" });
    setChanges(cs => cs.filter(x => x.id !== c.id));
  };

  const filtered = changes.filter(c => {
    if (filter === "open")      return ["draft","review","in_progress"].includes(c.status);
    if (filter === "approved")  return c.status === "approved";
    if (filter === "emergency") return c.change_type === "emergency";
    return true;
  });

  const openCount = changes.filter(c => ["draft","review","in_progress"].includes(c.status)).length;
  const emergCount = changes.filter(c => c.change_type === "emergency").length;

  const inp: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13, outline: "none" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 5 };

  const NEXT_STATUSES: Record<string, string[]> = {
    draft:       ["review", "cancelled"],
    review:      ["approved", "rejected"],
    approved:    ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    rejected:    [], completed: [], cancelled: [],
  };

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
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>🔄 Değişiklik Yönetimi</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>
            {customerName} · {changes.length} RFC
            {openCount > 0 && <span style={{ color: "#3b82f6", marginLeft: 8, fontWeight: 700 }}>🔵 {openCount} açık</span>}
            {emergCount > 0 && <span style={{ color: "#ef4444", marginLeft: 8, fontWeight: 700 }}>🚨 {emergCount} acil</span>}
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ RFC Oluştur</button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "all",       label: `Tümü (${changes.length})` },
          { key: "open",      label: `Açık (${openCount})`,      color: "#3b82f6" },
          { key: "approved",  label: "Onaylananlar",             color: "#10b981" },
          { key: "emergency", label: `Acil (${emergCount})`,     color: "#ef4444" },
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

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)", fontSize: 14 }}>
          {filter === "all" ? "Henüz değişiklik talebi oluşturulmamış." : "Bu filtrede RFC yok."}
          {filter === "all" && <div><button onClick={openAdd} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #3b82f6", background: "rgba(59,130,246,.06)", color: "#3b82f6", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>İlk RFC'yi oluştur</button></div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => {
            const type = getType(c.change_type);
            const imp  = getImpact(c.impact);
            const st   = getSt(c.status);
            const nextStatuses = NEXT_STATUSES[c.status] ?? [];
            return (
              <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${type.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{type.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "var(--text-dim)" }}>{c.rfc_no}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{c.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${type.color}18`, color: type.color }}>{type.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${imp.color}18`, color: imp.color }}>Etki: {imp.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${st.color}18`, color: st.color }}>{st.label}</span>
                      {c.planned_date && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(100,116,139,.1)", color: "var(--text-dim)" }}>📅 {new Date(c.planned_date).toLocaleDateString("tr-TR")}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-dim)", flexWrap: "wrap" }}>
                      {c.requestor && <span>👤 {c.requestor}</span>}
                      {c.assigned_to && <span>🔧 {c.assigned_to}</span>}
                      {c.approved_by && <span style={{ color: "#10b981" }}>✅ {c.approved_by}</span>}
                    </div>
                    {c.description && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 5 }}>{c.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {nextStatuses.slice(0,1).map(ns => {
                        const nst = getSt(ns);
                        return (
                          <button key={ns}
                            onClick={() => ns === "completed" ? (setShowDetail(c), setImplNotes(c.implementation_notes||"")) : quickStatus(c, ns)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: `${nst.color}`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            → {nst.label}
                          </button>
                        );
                      })}
                      <button onClick={() => openEdit(c)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 11, cursor: "pointer" }}>Düzenle</button>
                      <button onClick={() => del(c)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Sil</button>
                    </div>
                    {nextStatuses.length > 1 && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {nextStatuses.slice(1).map(ns => {
                          const nst = getSt(ns);
                          return (
                            <button key={ns} onClick={() => quickStatus(c, ns)}
                              style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${nst.color}44`, background: "transparent", color: nst.color, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                              {nst.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Modal (implementation notes) */}
      {showDetail && (
        <>
          <div onClick={() => setShowDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(460px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>✅ Değişikliği Tamamla</div>
              <button onClick={() => setShowDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", background: "var(--card2)", padding: "10px 14px", borderRadius: 8 }}>{showDetail.rfc_no} — {showDetail.title}</div>
              <div>
                <label style={lbl}>Uygulama Notları</label>
                <textarea value={implNotes} onChange={e => setImplNotes(e.target.value)} rows={4} placeholder="Yapılan değişiklikler, test sonuçları, özel notlar…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowDetail(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={() => quickStatus(showDetail, "completed")}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Tamamlandı Olarak Kaydet
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(580px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editing ? "RFC Düzenle" : "Yeni Değişiklik Talebi"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "78vh", overflowY: "auto" }}>
              <div>
                <label style={lbl}>Başlık *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn: Fortigate firmware güncellemesi v7.4.3" style={inp} autoFocus />
              </div>
              {/* Change type cards */}
              <div>
                <label style={lbl}>Değişiklik Türü</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, change_type: t.value }))}
                      style={{ padding: "10px 8px", borderRadius: 8, border: `2px solid ${form.change_type === t.value ? t.color : "var(--border)"}`,
                        background: form.change_type === t.value ? `${t.color}12` : "transparent",
                        cursor: "pointer", textAlign: "left" as const }}>
                      <div style={{ fontSize: 18 }}>{t.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: form.change_type === t.value ? t.color : "var(--text)" }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Etki</label>
                  <select value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} style={inp}>
                    {IMPACTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Aciliyet</label>
                  <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))} style={inp}>
                    {IMPACTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Talep Eden</label>
                  <input value={form.requestor} onChange={e => setForm(f => ({ ...f, requestor: e.target.value }))} placeholder="Müşteri / Teknisyen" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Uygulayacak Kişi</label>
                  <input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Atanacak teknisyen" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Planlanan Tarih</label>
                  <input type="date" value={form.planned_date} onChange={e => setForm(f => ({ ...f, planned_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Durum</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Değişikliğin nedeni, kapsamı, etkilenen sistemler…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={lbl}>Geri Alma Planı</label>
                <textarea value={form.rollback_plan} onChange={e => setForm(f => ({ ...f, rollback_plan: e.target.value }))} rows={2} placeholder="Değişiklik başarısız olursa ne yapılacak…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={save} disabled={saving || !form.title.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Kaydediliyor…" : editing ? "Güncelle" : "RFC Oluştur"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
