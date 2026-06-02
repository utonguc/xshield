"use client";
import { useState } from "react";

type Task = {
  id: number; title: string; description: string | null; category: string;
  frequency: string; assigned_to: string | null; next_due_date: string | null;
  is_active: boolean; created_at: string;
  last_completed_at: string | null; last_completed_by: string | null;
  last_status: string | null; completion_count: number;
};

const CATEGORIES = [
  { value: "backup",        label: "Yedek Testi",       icon: "💾", color: "#3b82f6" },
  { value: "access_review", label: "Erişim Gözden Geç.",icon: "👥", color: "#8b5cf6" },
  { value: "vulnerability", label: "Zafiyet Tarama",    icon: "🔍", color: "#f59e0b" },
  { value: "dr_test",       label: "DR Tatbikatı",      icon: "🚨", color: "#ef4444" },
  { value: "patch",         label: "Yama Yönetimi",     icon: "🔧", color: "#06b6d4" },
  { value: "audit",         label: "İç Denetim",        icon: "📋", color: "#10b981" },
  { value: "training",      label: "Farkındalık Eğt.",  icon: "🎓", color: "#f97316" },
  { value: "other",         label: "Diğer",             icon: "📌", color: "#64748b" },
];

const FREQUENCIES = [
  { value: "weekly",    label: "Haftalık" },
  { value: "monthly",   label: "Aylık" },
  { value: "quarterly", label: "Çeyreklik" },
  { value: "biannual",  label: "6 Aylık" },
  { value: "annual",    label: "Yıllık" },
];

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e", partial: "#f59e0b", failed: "#ef4444",
};

function getCat(v: string) { return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[7]; }
function getFreq(v: string) { return FREQUENCIES.find(f => f.value === v)?.label ?? v; }

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

function DueBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const d = daysUntil(date);
  if (d === null) return null;
  const overdue = d < 0;
  const soon = d >= 0 && d <= 7;
  if (!overdue && !soon) return <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{new Date(date).toLocaleDateString("tr-TR")}</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
      background: overdue ? "rgba(239,68,68,.12)" : "rgba(245,158,11,.12)",
      color: overdue ? "#ef4444" : "#f59e0b" }}>
      {overdue ? `${Math.abs(d)} gün gecikti` : d === 0 ? "Bugün!" : `${d} gün kaldı`}
    </span>
  );
}

function emptyForm() {
  const today = new Date();
  today.setMonth(today.getMonth() + 1);
  return {
    title: "", description: "", category: "backup", frequency: "monthly",
    assigned_to: "", next_due_date: today.toISOString().split("T")[0],
  };
}

export default function ComplianceClient({ customerId, customerName, initialTasks }:
  { customerId: number; customerName: string; initialTasks: Task[] }) {
  const [tasks, setTasks]         = useState<Task[]>(initialTasks);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Task | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [showComplete, setShowComplete] = useState<Task | null>(null);
  const [completeForm, setCompleteForm] = useState({ status: "completed", notes: "", due_date: "" });
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter]       = useState<"all"|"overdue"|"soon"|"active">("all");

  const toast = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  const refresh = async () => {
    const r = await fetch(`/api/customers/${customerId}/compliance`);
    if (r.ok) setTasks(await r.json());
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description||"", category: t.category,
              frequency: t.frequency, assigned_to: t.assigned_to||"",
              next_due_date: t.next_due_date||"" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/customers/${customerId}/compliance/${editing.id}`
        : `/api/customers/${customerId}/compliance`;
      const res = await fetch(url, { method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      toast(editing ? "Güncellendi." : "Görev eklendi.", true);
      setShowModal(false);
      await refresh();
    } catch (e: any) { toast(e.message, false); }
    finally { setSaving(false); }
  };

  const del = async (t: Task) => {
    if (!confirm(`"${t.title}" görevi silinecek. Emin misiniz?`)) return;
    await fetch(`/api/customers/${customerId}/compliance/${t.id}`, { method: "DELETE" });
    setTasks(ts => ts.filter(x => x.id !== t.id));
  };

  const complete = async () => {
    if (!showComplete) return;
    setCompleting(showComplete.id);
    const fd = new FormData();
    fd.append("status", completeForm.status);
    if (completeForm.notes) fd.append("notes", completeForm.notes);
    if (completeForm.due_date) fd.append("due_date", completeForm.due_date);
    const res = await fetch(`/api/customers/${customerId}/compliance/${showComplete.id}/completions`, { method: "POST", body: fd });
    const data = await res.json();
    toast("Kontrol tamamlandı!" + (data.next_due_date ? ` Sonraki: ${new Date(data.next_due_date).toLocaleDateString("tr-TR")}` : ""), true);
    setShowComplete(null);
    setCompleting(null);
    await refresh();
  };

  const filtered = tasks.filter(t => {
    if (filter === "overdue") return t.next_due_date && daysUntil(t.next_due_date)! < 0;
    if (filter === "soon") { const d = daysUntil(t.next_due_date); return d !== null && d >= 0 && d <= 7; }
    if (filter === "active") return t.is_active;
    return true;
  });

  const overdueCount = tasks.filter(t => t.next_due_date && daysUntil(t.next_due_date)! < 0).length;
  const soonCount    = tasks.filter(t => { const d = daysUntil(t.next_due_date); return d !== null && d >= 0 && d <= 7; }).length;

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
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>✅ Periyodik Kontrol Listesi</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>
            {customerName} · {tasks.length} görev
            {overdueCount > 0 && <span style={{ color: "#ef4444", marginLeft: 8, fontWeight: 700 }}>⚠ {overdueCount} gecikmiş</span>}
            {soonCount > 0 && <span style={{ color: "#f59e0b", marginLeft: 8, fontWeight: 700 }}>⏰ {soonCount} yaklaşan</span>}
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Görev Ekle</button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "all",     label: `Tümü (${tasks.length})` },
          { key: "overdue", label: `Gecikmiş (${overdueCount})`, color: "#ef4444" },
          { key: "soon",    label: `Bu Hafta (${soonCount})`,    color: "#f59e0b" },
          { key: "active",  label: "Aktif" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
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
          {filter === "all" ? "Henüz görev eklenmemiş." : "Bu filtrede görev yok."}
          {filter === "all" && <div><button onClick={openAdd} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #10b981", background: "rgba(16,185,129,.06)", color: "#10b981", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>İlk görevi ekle</button></div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(t => {
            const cat = getCat(t.category);
            return (
              <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", opacity: t.is_active ? 1 : 0.55 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${cat.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{t.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${cat.color}18`, color: cat.color }}>{cat.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: "rgba(100,116,139,.12)", color: "var(--text-dim)" }}>{getFreq(t.frequency)}</span>
                      {!t.is_active && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(100,116,139,.1)", color: "#64748b" }}>Pasif</span>}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                      {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                      <span>Sonraki: <DueBadge date={t.next_due_date} /></span>
                      {t.last_completed_at && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          Son tamamlama:
                          <span style={{ color: STATUS_COLORS[t.last_status!]||"var(--text)", fontWeight: 600 }}>
                            {new Date(t.last_completed_at).toLocaleDateString("tr-TR")} ({t.last_completed_by})
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>· {t.completion_count}× yapıldı</span>
                        </span>
                      )}
                    </div>
                    {t.description && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                    <button onClick={() => { setShowComplete(t); setCompleteForm({ status: "completed", notes: "", due_date: t.next_due_date||"" }); }}
                      disabled={completing === t.id}
                      style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "#10b981", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      ✓ Tamamla
                    </button>
                    <button onClick={() => openEdit(t)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Düzenle</button>
                    <button onClick={() => del(t)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sil</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && (
        <>
          <div onClick={() => setShowComplete(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(440px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>✅ Kontrol Tamamla</div>
              <button onClick={() => setShowComplete(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", background: "var(--card2)", padding: "10px 14px", borderRadius: 8 }}>{showComplete.title}</div>
              <div>
                <label style={lbl}>Sonuç</label>
                <select value={completeForm.status} onChange={e => setCompleteForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                  <option value="completed">✅ Tamamlandı</option>
                  <option value="partial">⚠️ Kısmi Tamamlandı</option>
                  <option value="failed">❌ Başarısız</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Notlar</label>
                <textarea value={completeForm.notes} onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Yapılan işlemler, bulgular, özel durumlar…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={lbl}>Kontrol Tarihi</label>
                <input type="date" value={completeForm.due_date} onChange={e => setCompleteForm(f => ({ ...f, due_date: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowComplete(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={complete} disabled={!!completing}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {completing ? "Kaydediliyor…" : "Kaydet"}
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
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(520px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editing ? "Görevi Düzenle" : "Yeni Periyodik Görev"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "75vh", overflowY: "auto" }}>
              <div>
                <label style={lbl}>Görev Adı *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn: Aylık Yedek Testi" style={inp} autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Sıklık</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={inp}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Sorumlu Kişi</label>
                  <input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Teknisyen adı" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Sonraki Kontrol Tarihi</label>
                  <input type="date" value={form.next_due_date} onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Kontrol prosedürü, kontrol edilecek noktalar…" style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={save} disabled={saving || !form.title.trim()}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
