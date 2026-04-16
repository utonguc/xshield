"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { btn, inp } from "@/lib/ui";
import { useIsMobile } from "@/hooks/useIsMobile";
import { fmtTime, fmtDateTime, toIstDate, toIstMins, utcToLocal, localToUtc, localToDisplay, fmtDateObjLong } from "@/lib/tz";

/* ── Types ─────────────────────────────────────────────────────────── */
type Patient = { id: string; fullName: string };
type Doctor  = { id: string; fullName: string; branch?: string };
type Appt = {
  id: string; patientId: string; patientFullName: string;
  doctorId: string; doctorFullName: string; procedureName: string;
  startAtUtc: string; endAtUtc: string; notes?: string; status: string;
};

/* ── Calendar constants ─────────────────────────────────────────────── */
const TZ         = "Europe/Istanbul";
const HOUR_START = 7;
const HOUR_END   = 21;
const HOUR_H     = 64; // px per hour
const GRID_H     = (HOUR_END - HOUR_START) * HOUR_H;

/* ── Status config ──────────────────────────────────────────────────── */
const STATUS: Record<string, { label: string; bg: string; color: string; bar: string; dot: string }> = {
  Scheduled: { label: "Planlandı",  bg: "#dbeafe", color: "#1e40af", bar: "#3b82f6", dot: "#3b82f6" },
  Completed: { label: "Tamamlandı", bg: "#dcfce7", color: "#166534", bar: "#22c55e", dot: "#22c55e" },
  Cancelled: { label: "İptal",      bg: "#fee2e2", color: "#991b1b", bar: "#ef4444", dot: "#ef4444" },
  NoShow:    { label: "Gelmedi",    bg: "#fef3c7", color: "#92400e", bar: "#f59e0b", dot: "#f59e0b" },
};

/* ── Local helpers ──────────────────────────────────────────────────── */
function apptTop(s: string): number { return Math.max(0, (toIstMins(s) - HOUR_START * 60) * (HOUR_H / 60)); }
function apptH(s: string, e: string): number { return Math.max(18, (new Date(e).getTime() - new Date(s).getTime()) / 60000 * (HOUR_H / 60)); }
function isoDate(d: Date): string { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getWeekStart(d: Date): Date { const r = new Date(d); r.setDate(r.getDate() - (r.getDay() === 0 ? 6 : r.getDay() - 1)); r.setHours(0,0,0,0); return r; }

const DAY_SHORT  = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
const MONTH_LONG = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

const emptyForm = () => ({ patientId: "", doctorId: "", procedureName: "", notes: "", startAt: "", endAt: "" });

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function AppointmentsPage() {
  const isMobile = useIsMobile();
  const [patients,  setPatients]  = useState<Patient[]>([]);
  const [doctors,   setDoctors]   = useState<Doctor[]>([]);
  const [items,     setItems]     = useState<Appt[]>([]);
  const [message,   setMessage]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState(emptyForm());
  const [showForm,  setShowForm]  = useState(false);
  const [view,      setView]      = useState<"week"|"day"|"list">("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterDoctorId, setFilterDoctorId] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const selectedDoctor = useMemo(() => doctors.find(d => d.id === form.doctorId), [doctors, form.doctorId]);

  const loadAll = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (filterStatus)   qs.set("status",   filterStatus);
      if (filterDoctorId) qs.set("doctorId", filterDoctorId);
      const [pR, dR, aR] = await Promise.all([
        apiFetch("/Patients"),
        apiFetch("/Doctors?activeOnly=true"),
        apiFetch(`/Appointments?${qs}`),
      ]);
      const [p, d, a] = await Promise.all([pR.json(), dR.json(), aR.json()]);
      setPatients(Array.isArray(p) ? p : []);
      setDoctors(Array.isArray(d)  ? d : []);
      setItems(Array.isArray(a)    ? a : []);
    } catch { setMessage("Veriler yüklenemedi."); }
  }, [filterStatus, filterDoctorId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* Scroll to 08:00 on mount */
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = (8 - HOUR_START) * HOUR_H - 16;
    }
  }, [view]);

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        patientId: form.patientId, doctorId: form.doctorId,
        procedureName: form.procedureName, notes: form.notes,
        startAtUtc: localToUtc(form.startAt),
        endAtUtc:   localToUtc(form.endAt),
      };
      const res = await apiFetch(editingId ? `/Appointments/${editingId}` : "/Appointments", {
        method: editingId ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? "Hata"); }
      resetForm(); await loadAll();
      setMessage(editingId ? "Randevu güncellendi." : "Randevu oluşturuldu.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Hata"); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setEditingId(null); setForm(emptyForm()); setShowForm(false); };

  const startEdit = (item: Appt) => {
    setEditingId(item.id);
    setForm({
      patientId: item.patientId, doctorId: item.doctorId,
      procedureName: item.procedureName, notes: item.notes ?? "",
      startAt: utcToLocal(item.startAtUtc), endAt: utcToLocal(item.endAtUtc),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = async (id: string, status: string) => {
    await apiFetch(`/Appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadAll();
  };

  const del = async (id: string) => {
    if (!confirm("Randevu silinsin mi?")) return;
    const res = await apiFetch(`/Appointments/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) { if (editingId === id) resetForm(); await loadAll(); setMessage("Silindi."); }
  };

  /* Click on empty calendar slot */
  const handleSlotClick = (dayDate: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMins = HOUR_START * 60 + Math.round(y / (HOUR_H / 60));
    const snapMins = Math.floor(rawMins / 30) * 30;
    const h = Math.floor(snapMins / 60), m = snapMins % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    const ds = isoDate(dayDate);
    setEditingId(null);
    setForm(prev => ({ ...prev, startAt: `${ds}T${pad(h)}:${pad(m)}`, endAt: `${ds}T${pad(Math.min(h+1, 23))}:${pad(m)}` }));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Week/day filtered appointments */
  const weekAppts = useMemo(() => items.filter(a => {
    const d = toIstDate(a.startAtUtc);
    return weekDays.some(wd => isoDate(wd) === d);
  }), [items, weekDays]);

  const dayAppts = useMemo(() => items.filter(a => toIstDate(a.startAtUtc) === isoDate(selectedDay)), [items, selectedDay]);

  const todayStr = isoDate(new Date());

  return (
    <AppShell title="Randevular" description="Haftalık takvim ve liste görünümü">

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} style={btn("white", "#1d4ed8")}>
          {showForm && !editingId ? "✕ Kapat" : "+ Yeni Randevu"}
        </button>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, width: 160, minHeight: 44 }}>
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterDoctorId} onChange={e => setFilterDoctorId(e.target.value)} style={{ ...inp, width: 180, minHeight: 44 }}>
          <option value="">Tüm Doktorlar</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </select>

        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {(["week","day","list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={btn(
              view === v ? "white" : "#667085",
              view === v ? "#1d4ed8" : "white",
              "1px solid #d0d5dd",
            )}>
              {v === "week" ? "◫ Hafta" : v === "day" ? "◷ Gün" : "☰ Liste"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Form ── */}
      {showForm && (
        <div style={{ border: "1px solid #e4e7ec", borderRadius: 20, padding: 20, marginBottom: 20, background: "var(--surface-2, #f8fafc)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800 }}>{editingId ? "Randevu Güncelle" : "Yeni Randevu"}</h3>
          <form onSubmit={submit} className="form-grid-3" style={{ gap: 12 }}>
            <select value={form.patientId} onChange={e => f("patientId", e.target.value)} style={inp}>
              <option value="">Hasta seç *</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
            <select value={form.doctorId} onChange={e => f("doctorId", e.target.value)} style={inp}>
              <option value="">Doktor seç *</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}{d.branch ? ` — ${d.branch}` : ""}</option>)}
            </select>
            <input placeholder="İşlem adı *" value={form.procedureName} onChange={e => f("procedureName", e.target.value)} style={inp} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#667085", fontWeight: 600 }}>Başlangıç * <span style={{ color: "#94a3b8", fontWeight: 400 }}>(İstanbul saati)</span></label>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={form.startAt.split("T")[0] ?? ""}
                  onChange={e => f("startAt", `${e.target.value}T${form.startAt.split("T")[1] ?? "00:00"}`)}
                  style={{ ...inp, flex: 2 }} />
                <input type="time" value={form.startAt.split("T")[1] ?? ""}
                  onChange={e => f("startAt", `${form.startAt.split("T")[0] ?? ""}T${e.target.value}`)}
                  style={{ ...inp, flex: 1 }} />
              </div>
              {form.startAt && <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>🕐 {localToDisplay(form.startAt)}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#667085", fontWeight: 600 }}>Bitiş * <span style={{ color: "#94a3b8", fontWeight: 400 }}>(İstanbul saati)</span></label>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={form.endAt.split("T")[0] ?? ""}
                  onChange={e => f("endAt", `${e.target.value}T${form.endAt.split("T")[1] ?? "00:00"}`)}
                  style={{ ...inp, flex: 2 }} />
                <input type="time" value={form.endAt.split("T")[1] ?? ""}
                  onChange={e => f("endAt", `${form.endAt.split("T")[0] ?? ""}T${e.target.value}`)}
                  style={{ ...inp, flex: 1 }} />
              </div>
              {form.endAt && <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>🕐 {localToDisplay(form.endAt)}</span>}
            </div>
            <input placeholder="Not" value={form.notes} onChange={e => f("notes", e.target.value)} style={inp} />
            <div className="form-full" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="submit" disabled={loading} style={btn("white", "#1d4ed8")}>
                {loading ? "Kaydediliyor..." : editingId ? "Güncelle" : "Randevu Ekle"}
              </button>
              {editingId && <button type="button" onClick={resetForm} style={btn("#344054", "white", "1px solid #d0d5dd")}>İptal</button>}
              {selectedDoctor && (
                <span style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontWeight: 700 }}>
                  ✚ {selectedDoctor.fullName}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {message && <div style={{ padding: 12, background: "#f2f4f7", borderRadius: 10, marginBottom: 14, fontSize: 13, color: "var(--text-2, #344054)" }}>{message}</div>}

      {/* ── WEEK VIEW ── */}
      {view === "week" && (
        <div style={{ background: "var(--surface,#fff)", borderRadius: 16, border: "1px solid var(--border,#eaecf0)", overflow: "hidden" }}>

          {/* Week navigation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid var(--border,#eaecf0)",
            flexWrap: "wrap", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setWeekStart(d => addDays(d, -7))} style={calNavBtn}>‹</button>
              <span style={{ fontWeight: 700, fontSize: 14, minWidth: 180, textAlign: "center" }}>
                {weekDays[0].getDate()} {MONTH_LONG[weekDays[0].getMonth()]} – {weekDays[6].getDate()} {MONTH_LONG[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
              </span>
              <button onClick={() => setWeekStart(d => addDays(d, 7))} style={calNavBtn}>›</button>
              <button onClick={() => setWeekStart(getWeekStart(new Date()))} style={{
                ...calNavBtn, fontSize: 12, padding: "6px 12px", width: "auto", fontWeight: 700,
                color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff",
              }}>Bugün</button>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {weekAppts.length} randevu
            </div>
          </div>

          {/* Calendar grid */}
          <div style={{ display: "flex", overflow: "hidden" }}>
            {/* Time labels */}
            <div style={{ width: 52, flexShrink: 0, borderRight: "1px solid var(--border,#f2f4f7)" }}>
              <div style={{ height: 48 }} />{/* header spacer */}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={i} style={{ height: HOUR_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8, paddingTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{String(HOUR_START + i).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>

            {/* Scrollable grid */}
            <div ref={gridRef} style={{ flex: 1, overflowY: "auto", overflowX: "auto", maxHeight: isMobile ? 420 : 620 }}>

              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(7, minmax(${isMobile ? 80 : 120}px, 1fr))`, position: "sticky", top: 0, zIndex: 10, background: "var(--surface,#fff)", borderBottom: "1px solid var(--border,#eaecf0)" }}>
                {weekDays.map((d, i) => {
                  const ds = isoDate(d);
                  const isToday = ds === todayStr;
                  const count = weekAppts.filter(a => toIstDate(a.startAtUtc) === ds).length;
                  return (
                    <div key={i} onClick={() => { setSelectedDay(d); setView("day"); }}
                      style={{
                        padding: "10px 6px", textAlign: "center", cursor: "pointer",
                        borderLeft: i > 0 ? "1px solid var(--border,#f2f4f7)" : "none",
                        background: isToday ? "#eff6ff" : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? "#1d4ed8" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {DAY_SHORT[i === 6 ? 0 : i + 1]}
                      </div>
                      <div style={{
                        fontSize: 18, fontWeight: 800, lineHeight: 1.3,
                        width: 32, height: 32, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto",
                        background: isToday ? "#1d4ed8" : "transparent",
                        color: isToday ? "#fff" : "var(--text,#101828)",
                      } as React.CSSProperties}>{d.getDate()}</div>
                      {count > 0 && <div style={{ fontSize: 9, fontWeight: 800, color: "#1d4ed8", marginTop: 2 }}>{count}</div>}
                    </div>
                  );
                })}
              </div>

              {/* Grid body */}
              <div style={{ position: "relative" }}>
                {/* Background grid */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(7, minmax(${isMobile ? 80 : 120}px, 1fr))`, height: GRID_H }}>
                  {weekDays.map((_, di) => (
                    <div key={di} style={{ position: "relative", borderLeft: di > 0 ? "1px solid #f2f4f7" : "none" }}>
                      {Array.from({ length: HOUR_END - HOUR_START }, (_, hi) => (
                        <div key={hi} style={{ height: HOUR_H, borderTop: "1px solid #f2f4f7", position: "relative" }}>
                          <div style={{ position: "absolute", top: HOUR_H / 2, left: 0, right: 0, height: 1, background: "#fafafa" }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Click layer */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(7, minmax(${isMobile ? 80 : 120}px, 1fr))`, position: "absolute", inset: 0, zIndex: 1 }}>
                  {weekDays.map((d, di) => (
                    <div key={di} style={{ position: "relative", cursor: "crosshair", height: GRID_H }} onClick={e => handleSlotClick(d, e)} />
                  ))}
                </div>

                {/* Appointments layer */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(7, minmax(${isMobile ? 80 : 120}px, 1fr))`, position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
                  {weekDays.map((d, di) => {
                    const ds = isoDate(d);
                    const dayApptsList = weekAppts.filter(a => toIstDate(a.startAtUtc) === ds);
                    return (
                      <div key={di} style={{ position: "relative", pointerEvents: "auto" }}>
                        {dayApptsList.map(appt => {
                          const st = STATUS[appt.status] ?? STATUS.Scheduled;
                          const top = apptTop(appt.startAtUtc);
                          const height = apptH(appt.startAtUtc, appt.endAtUtc);
                          const dur = Math.round((new Date(appt.endAtUtc).getTime() - new Date(appt.startAtUtc).getTime()) / 60000);
                          return (
                            <div key={appt.id}
                              onClick={() => startEdit(appt)}
                              title={`${appt.patientFullName} — ${appt.procedureName}\n${fmtTime(appt.startAtUtc)} → ${fmtTime(appt.endAtUtc)}`}
                              style={{
                                position: "absolute", left: 2, right: 2, top, height,
                                background: st.bg, borderLeft: `3px solid ${st.bar}`,
                                borderRadius: "0 6px 6px 0",
                                padding: "3px 6px", overflow: "hidden", cursor: "pointer",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                transition: "filter 0.1s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.95)")}
                              onMouseLeave={e => (e.currentTarget.style.filter = "")}
                            >
                              <div style={{ fontSize: 11, fontWeight: 800, color: st.color, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {fmtTime(appt.startAtUtc)} {appt.patientFullName}
                              </div>
                              {height >= 36 && (
                                <div style={{ fontSize: 10, color: st.color, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {appt.procedureName}
                                </div>
                              )}
                              {height >= 52 && (
                                <div style={{ fontSize: 10, color: st.color, opacity: 0.55 }}>{dur} dk</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Now line */}
                {weekDays.some(d => isoDate(d) === todayStr) && (() => {
                  const nowMins = toIstMins(new Date().toISOString());
                  const top = (nowMins - HOUR_START * 60) * (HOUR_H / 60);
                  if (top < 0 || top > GRID_H) return null;
                  const col = weekDays.findIndex(d => isoDate(d) === todayStr);
                  return (
                    <div style={{
                      position: "absolute", zIndex: 3, pointerEvents: "none",
                      top, left: `calc(${col} * (100% / 7))`, width: `calc(100% / 7)`,
                      display: "flex", alignItems: "center",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginLeft: -4 }} />
                      <div style={{ flex: 1, height: 2, background: "#ef4444" }} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {view === "day" && (
        <div style={{ background: "var(--surface,#fff)", borderRadius: 16, border: "1px solid var(--border,#eaecf0)", overflow: "hidden" }}>
          {/* Day nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border,#eaecf0)", flexWrap: "wrap" }}>
            <button onClick={() => setSelectedDay(d => addDays(d, -1))} style={calNavBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 15, minWidth: 200, textAlign: "center" }}>
              {fmtDateObjLong(selectedDay)}
            </span>
            <button onClick={() => setSelectedDay(d => addDays(d, 1))} style={calNavBtn}>›</button>
            <button onClick={() => setSelectedDay(new Date())} style={{ ...calNavBtn, fontSize: 12, padding: "6px 12px", width: "auto", fontWeight: 700, color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff" }}>Bugün</button>
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>{dayAppts.length} randevu</span>
          </div>

          <div style={{ display: "flex", overflow: "hidden" }}>
            <div style={{ width: 52, flexShrink: 0, borderRight: "1px solid #f2f4f7" }}>
              <div style={{ height: 0 }} />
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={i} style={{ height: HOUR_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8, paddingTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{String(HOUR_START + i).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>

            <div ref={gridRef} style={{ flex: 1, overflowY: "auto", maxHeight: isMobile ? 420 : 620 }}>
              <div style={{ position: "relative", height: GRID_H, cursor: "crosshair" }} onClick={e => handleSlotClick(selectedDay, e)}>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={i} style={{ position: "absolute", left: 0, right: 0, top: i * HOUR_H, height: HOUR_H, borderTop: "1px solid #f2f4f7" }}>
                    <div style={{ position: "absolute", top: HOUR_H/2, left: 0, right: 0, height: 1, background: "#fafafa" }} />
                  </div>
                ))}

                {dayAppts.map(appt => {
                  const st = STATUS[appt.status] ?? STATUS.Scheduled;
                  const top = apptTop(appt.startAtUtc);
                  const height = apptH(appt.startAtUtc, appt.endAtUtc);
                  const dur = Math.round((new Date(appt.endAtUtc).getTime() - new Date(appt.startAtUtc).getTime()) / 60000);
                  return (
                    <div key={appt.id}
                      onClick={e => { e.stopPropagation(); startEdit(appt); }}
                      style={{
                        position: "absolute", left: 4, right: 4, top, height,
                        background: st.bg, borderLeft: `4px solid ${st.bar}`,
                        borderRadius: "0 10px 10px 0",
                        padding: "6px 10px", overflow: "hidden", cursor: "pointer", zIndex: 2,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: st.color }}>{appt.patientFullName}</div>
                          {height >= 36 && <div style={{ fontSize: 12, color: st.color, opacity: 0.8 }}>{appt.procedureName}</div>}
                        </div>
                        <div style={{ fontSize: 11, color: st.color, opacity: 0.7, whiteSpace: "nowrap" }}>
                          {fmtTime(appt.startAtUtc)}<br/>{dur} dk
                        </div>
                      </div>
                      {height >= 56 && (
                        <div style={{ fontSize: 11, color: st.color, opacity: 0.6, marginTop: 4 }}>✚ {appt.doctorFullName}</div>
                      )}
                    </div>
                  );
                })}

                {/* Now line for today */}
                {isoDate(selectedDay) === todayStr && (() => {
                  const top = (toIstMins(new Date().toISOString()) - HOUR_START * 60) * (HOUR_H / 60);
                  if (top < 0 || top > GRID_H) return null;
                  return (
                    <div style={{ position: "absolute", left: 0, right: 0, top, height: 2, background: "#ef4444", zIndex: 3, display: "flex", alignItems: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", marginLeft: -4 }} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map(item => {
            const st = STATUS[item.status] ?? STATUS.Scheduled;
            return (
              <div key={item.id} style={{
                border: "1px solid var(--border,#eaecf0)", borderRadius: 16,
                background: "var(--surface,#fff)", overflow: "hidden",
                display: "flex", alignItems: "stretch",
              }}>
                <div style={{ width: 4, background: st.bar, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{item.procedureName}</span>
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ color: "#667085", fontSize: 13 }}>♥ {item.patientFullName} &nbsp;·&nbsp; ✚ {item.doctorFullName}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                      {fmtDateTime(item.startAtUtc)} → {fmtTime(item.endAtUtc)}
                    </div>
                    {item.notes && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>📝 {item.notes}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      {Object.entries(STATUS).filter(([k]) => k !== item.status).map(([k, v]) => (
                        <button key={k} onClick={() => changeStatus(item.id, k)} style={{
                          padding: "4px 10px", borderRadius: 8, border: `1px solid ${v.bar}40`,
                          background: v.bg, color: v.color, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          minHeight: 32,
                        }}>→ {v.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => startEdit(item)} style={btn("#175cd3", "#eff8ff", "1px solid #b2ddff")}>Düzenle</button>
                    <button onClick={() => del(item.id)} style={btn("#b42318", "#fef3f2", "1px solid #fecdca")}>Sil</button>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <div style={{ color: "#94a3b8", padding: 32, textAlign: "center", fontSize: 14 }}>Randevu bulunamadı.</div>}
        </div>
      )}
    </AppShell>
  );
}

const calNavBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: "1px solid #e4e7ec",
  background: "var(--surface,#fff)", cursor: "pointer", fontSize: 18, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
