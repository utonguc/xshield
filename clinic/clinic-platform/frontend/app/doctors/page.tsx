"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch, staticUrl } from "@/lib/api";
import { btn, inp } from "@/lib/ui";
import { fmtDateTime } from "@/lib/tz";

// ─── Schedule Modal ────────────────────────────────────────────────────────────

const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

type ScheduleItem = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
};

type LeaveItem = {
  id: string;
  startAtUtc: string;
  endAtUtc: string;
  reason?: string;
  doctorName?: string;
};

const defaultSchedules = (): ScheduleItem[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    startTime: "09:00",
    endTime: "18:00",
    slotMinutes: 30,
    isActive: i >= 1 && i <= 5,
  }));

function ScheduleModal({ doctorId, doctorName, onClose }: { doctorId: string; doctorName: string; onClose: () => void }) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(defaultSchedules());
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"schedule" | "leaves">("schedule");

  useEffect(() => {
    Promise.all([
      apiFetch(`/DoctorSchedule/${doctorId}`),
      apiFetch(`/DoctorSchedule/${doctorId}/leaves`),
    ]).then(async ([sr, lr]) => {
      if (sr.ok) {
        const data: ScheduleItem[] = await sr.json();
        if (data.length > 0) {
          const merged = defaultSchedules().map(def => {
            const found = data.find(d => d.dayOfWeek === def.dayOfWeek);
            return found ? { ...def, ...found } : def;
          });
          setSchedules(merged);
        }
      }
      if (lr.ok) setLeaves(await lr.json());
    });
  }, [doctorId]);

  const saveSchedule = async () => {
    setSaving(true);
    setMsg("");
    const res = await apiFetch(`/DoctorSchedule/${doctorId}`, {
      method: "PUT",
      body: JSON.stringify({ schedules }),
    });
    setSaving(false);
    setMsg(res.ok ? "Program kaydedildi." : "Kayıt hatası.");
  };

  const addLeave = async () => {
    if (!leaveStart || !leaveEnd) return;
    const res = await apiFetch(`/DoctorSchedule/${doctorId}/leaves`, {
      method: "POST",
      body: JSON.stringify({
        startAtUtc: new Date(leaveStart).toISOString(),
        endAtUtc: new Date(leaveEnd).toISOString(),
        reason: leaveReason || undefined,
      }),
    });
    if (res.ok) {
      setLeaveStart(""); setLeaveEnd(""); setLeaveReason("");
      const lr = await apiFetch(`/DoctorSchedule/${doctorId}/leaves`);
      if (lr.ok) setLeaves(await lr.json());
      setMsg("İzin eklendi.");
    }
  };

  const deleteLeave = async (id: string) => {
    const res = await apiFetch(`/DoctorSchedule/leaves/${id}`, { method: "DELETE" });
    if (res.ok) setLeaves(prev => prev.filter(l => l.id !== id));
  };

  const updSchedule = (idx: number, k: keyof ScheduleItem, v: unknown) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, [k]: v } : s));
  };

  const fmtDt = (utc: string) => fmtDateTime(utc);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface, #fff)", borderRadius: 20, padding: 28,
        width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 48px rgba(16,24,40,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Çalışma Programı</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{doctorName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #eaecf0", marginBottom: 20 }}>
          {([{ k: "schedule", l: "Haftalık Program" }, { k: "leaves", l: "İzin / Tatil" }] as const).map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "8px 16px", border: "none", background: "transparent",
              fontWeight: tab === k ? 700 : 500, fontSize: 13,
              color: tab === k ? "#1d4ed8" : "#64748b",
              borderBottom: tab === k ? "2px solid #1d4ed8" : "2px solid transparent",
              cursor: "pointer", marginBottom: -2,
            }}>{l}</button>
          ))}
        </div>

        {tab === "schedule" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {schedules.map((s, i) => (
                <div key={s.dayOfWeek} style={{
                  display: "grid", gridTemplateColumns: "48px 1fr 1fr 70px 36px",
                  gap: 8, alignItems: "center", padding: "8px 12px",
                  borderRadius: 10, background: s.isActive ? "#f0fdf4" : "#f8fafc",
                  border: `1px solid ${s.isActive ? "#bbf7d0" : "#e4e7ec"}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.isActive ? "#16a34a" : "#94a3b8" }}>
                    {DAYS[s.dayOfWeek]}
                  </div>
                  <input type="time" value={s.startTime} disabled={!s.isActive}
                    onChange={e => updSchedule(i, "startTime", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 12 }} />
                  <input type="time" value={s.endTime} disabled={!s.isActive}
                    onChange={e => updSchedule(i, "endTime", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 12 }} />
                  <select value={s.slotMinutes} disabled={!s.isActive}
                    onChange={e => updSchedule(i, "slotMinutes", Number(e.target.value))}
                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 12 }}>
                    {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m}dk</option>)}
                  </select>
                  <input type="checkbox" checked={s.isActive} onChange={e => updSchedule(i, "isActive", e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>
              Sütunlar: Gün | Başlangıç | Bitiş | Slot Süresi | Aktif
            </div>
            <button onClick={saveSchedule} disabled={saving} style={{
              width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
              background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
              {saving ? "Kaydediliyor..." : "💾 Programı Kaydet"}
            </button>
          </>
        )}

        {tab === "leaves" && (
          <>
            {/* Add leave form */}
            <div style={{ background: "var(--surface-2, #f8fafc)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>İzin / Tatil Ekle</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 3 }}>Başlangıç</label>
                  <input type="datetime-local" value={leaveStart} onChange={e => setLeaveStart(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 12, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 3 }}>Bitiş</label>
                  <input type="datetime-local" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 12, boxSizing: "border-box" }} />
                </div>
              </div>
              <input placeholder="Sebep (isteğe bağlı)" value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 12, marginBottom: 10, boxSizing: "border-box" }} />
              <button onClick={addLeave} style={{
                padding: "8px 20px", borderRadius: 10, border: "none",
                background: "#f59e0b", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>+ Ekle</button>
            </div>

            {/* Leaves list */}
            {leaves.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>Kayıtlı izin yok</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {leaves.map(l => (
                  <div key={l.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fcd34d",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {fmtDt(l.startAtUtc)} → {fmtDt(l.endAtUtc)}
                      </div>
                      {l.reason && <div style={{ fontSize: 11, color: "#92400e" }}>{l.reason}</div>}
                    </div>
                    <button onClick={() => deleteLeave(l.id)} style={{
                      background: "none", border: "none", color: "#dc2626", fontSize: 16, cursor: "pointer",
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {msg && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: msg.includes("hata") || msg.includes("Hata") ? "#fef2f2" : "#f0fdf4",
            color: msg.includes("hata") || msg.includes("Hata") ? "#dc2626" : "#16a34a",
          }}>{msg}</div>
        )}
      </div>
    </div>
  );
}

type Doctor = {
  id: string; fullName: string; branch?: string; phone?: string; email?: string;
  photoUrl?: string; biography?: string; specializations?: string;
  experienceYears?: number; certificates?: string; isActive: boolean; createdAtUtc: string;
};


const emptyForm = () => ({
  fullName: "", branch: "", phone: "", email: "", photoUrl: "",
  biography: "", specializations: "", experienceYears: "", certificates: "", isActive: true,
});

export default function DoctorsPage() {
  const [items, setItems]       = useState<Doctor[]>([]);
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]         = useState(emptyForm());
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [scheduleDoctor, setScheduleDoctor] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/Doctors");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setMessage("Doktorlar yüklenemedi."); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const f = (k: string, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
      };
      const res = await apiFetch(editingId ? `/Doctors/${editingId}` : "/Doctors", {
        method: editingId ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? "Hata"); }
      const doctorId = editingId ?? await res.json();

      // Fotoğraf yükle
      if (photoFile && doctorId) {
        const fd = new FormData();
        fd.append("file", photoFile);
        await apiFetch(`/Doctors/${doctorId}/photo`, { method: "POST", body: fd });
      }

      resetForm(); await load();
      setMessage(editingId ? "Doktor güncellendi." : "Doktor eklendi.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Hata"); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setEditingId(null); setForm(emptyForm()); setShowForm(false); setPhotoFile(null); setPhotoPreview(""); };

  const startEdit = (d: Doctor) => {
    setEditingId(d.id);
    setForm({
      fullName: d.fullName, branch: d.branch ?? "", phone: d.phone ?? "",
      email: d.email ?? "", photoUrl: d.photoUrl ?? "", biography: d.biography ?? "",
      specializations: d.specializations ?? "", experienceYears: String(d.experienceYears ?? ""),
      certificates: d.certificates ?? "", isActive: d.isActive,
    });
    setPhotoPreview(staticUrl(d.photoUrl) ?? "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id: string) => {
    if (!confirm("Doktor silinsin mi?")) return;
    const res = await apiFetch(`/Doctors/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) { await load(); setMessage("Doktor silindi."); }
    else { const d = await res.json().catch(() => ({})); setMessage(d.message ?? "Silinemedi."); }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <AppShell title="Doktorlar" description="Doktor profilleri ve yönetimi">
      {scheduleDoctor && (
        <ScheduleModal
          doctorId={scheduleDoctor.id}
          doctorName={scheduleDoctor.name}
          onClose={() => setScheduleDoctor(null)}
        />
      )}

      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          style={btn("white","#1d4ed8")}>
          {showForm && !editingId ? "✕ Kapat" : "+ Yeni Doktor"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ border:"1px solid #e4e7ec", borderRadius:20, padding:20, marginBottom:20, background:"#f8fafc" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:15 }}>{editingId ? "Doktor Güncelle" : "Yeni Doktor"}</h3>
          <form onSubmit={submit} className="form-grid-3" style={{ gap:12 }}>

            {/* Fotoğraf */}
            <div className="form-full" style={{ display:"flex", alignItems:"center", gap:16, marginBottom:8 }}>
              <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden",
                background:"#f2f4f7", border:"2px solid #e4e7ec", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                {photoPreview
                  ? <img src={photoPreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : <span style={{ fontSize:28 }}>👨‍⚕️</span>}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Profil Fotoğrafı</div>
                <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handlePhotoChange}
                  style={{ fontSize:12 }} />
              </div>
            </div>

            <input placeholder="Ad Soyad *" value={form.fullName} onChange={e => f("fullName",e.target.value)} style={inp}/>
            <input placeholder="Branş (Plastik Cerrahi...)" value={form.branch} onChange={e => f("branch",e.target.value)} style={inp}/>
            <input placeholder="Telefon" value={form.phone} onChange={e => f("phone",e.target.value)} style={inp}/>
            <input placeholder="E-posta" value={form.email} onChange={e => f("email",e.target.value)} style={inp}/>
            <input placeholder="Deneyim (yıl)" type="number" value={form.experienceYears}
              onChange={e => f("experienceYears",e.target.value)} style={inp}/>
            <input placeholder="Uzmanlıklar (virgülle)" value={form.specializations}
              onChange={e => f("specializations",e.target.value)} style={inp}/>
            <textarea placeholder="Biyografi" value={form.biography}
              onChange={e => f("biography",e.target.value)}
              className="form-full" style={{ ...inp, minHeight:80, resize:"vertical" }}/>
            <input placeholder="Sertifikalar (virgülle)" value={form.certificates}
              onChange={e => f("certificates",e.target.value)}
              className="form-full" style={inp}/>

            <div className="form-full" style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
              <button type="submit" disabled={loading} style={btn("white","#1d4ed8")}>
                {loading ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
              </button>
              <button type="button" onClick={resetForm} style={btn("#344054","white","1px solid #d0d5dd")}>İptal</button>
              {editingId && (
                <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={form.isActive}
                    onChange={e => f("isActive", e.target.checked)} />
                  Aktif
                </label>
              )}
            </div>
          </form>
        </div>
      )}

      {message && <div style={{ padding:10, background:"#f2f4f7", borderRadius:10, marginBottom:14, fontSize:13 }}>{message}</div>}

      {/* Doctor Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
        {items.map(d => {
          const photoSrc = staticUrl(d.photoUrl);
          const specs = d.specializations?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
          return (
            <div key={d.id} style={{ background:"white", border:"1px solid #eaecf0",
              borderRadius:20, padding:20, boxShadow:"0 2px 12px rgba(16,24,40,0.04)" }}>

              <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:14 }}>
                <div style={{ width:60, height:60, borderRadius:"50%", overflow:"hidden",
                  background:"#f8fafc", border:"2px solid #eaecf0", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {photoSrc
                    ? <img src={photoSrc} alt={d.fullName} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span style={{ fontSize:24 }}>👨‍⚕️</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>{d.fullName}</div>
                  {d.branch && <div style={{ color:"#667085", fontSize:13, marginTop:2 }}>{d.branch}</div>}
                  <span style={{ display:"inline-block", marginTop:6, padding:"2px 10px",
                    borderRadius:999, fontSize:11, fontWeight:700,
                    background: d.isActive ? "#ecfdf5" : "#fef2f2",
                    color: d.isActive ? "#065f46" : "#991b1b",
                    border: `1px solid ${d.isActive ? "#a7f3d0" : "#fecaca"}` }}>
                    {d.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>

              {specs.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                  {specs.map(s => (
                    <span key={s} style={{ padding:"2px 8px", borderRadius:6, fontSize:11,
                      background:"#f0f4ff", color:"#3730a3", border:"1px solid #c7d2fe" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ fontSize:12, color:"#667085", display:"grid", gap:3 }}>
                {d.phone && <div>📞 {d.phone}</div>}
                {d.email && <div>✉️ {d.email}</div>}
                {d.experienceYears && <div>⭐ {d.experienceYears} yıl deneyim</div>}
              </div>

              {d.biography && (
                <div style={{ fontSize:12, color:"#98a2b3", marginTop:10, lineHeight:1.5,
                  display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {d.biography}
                </div>
              )}

              <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
                <button onClick={() => startEdit(d)} style={btn("#175cd3","#eff8ff","1px solid #b2ddff")}>Düzenle</button>
                <button onClick={() => setScheduleDoctor({ id: d.id, name: d.fullName })} style={btn("#065f46","#f0fdf4","1px solid #a7f3d0")}>📅 Program</button>
                <button onClick={() => del(d.id)} style={btn("#b42318","#fef3f2","1px solid #fecdca")}>Sil</button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div style={{ color:"#98a2b3", padding:16 }}>Doktor bulunamadı.</div>}
      </div>
    </AppShell>
  );
}
