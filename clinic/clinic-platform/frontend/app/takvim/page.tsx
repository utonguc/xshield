"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { fmtTime, toIstMins, localToUtc } from "@/lib/tz";

/* ── Types ─────────────────────────────────────────────────────────── */
type Doctor = { id: string; fullName: string; branch: string };
type Slot   = { startUtc: string; endUtc: string; available: boolean };
type Appt   = {
  id: string; patientFullName: string; procedureName: string;
  startAtUtc: string; endAtUtc: string; status: string;
  doctorFullName: string;
};
type Col    = { doctor: Doctor; slots: Slot[]; appts: Appt[] };

/* ── Constants ─────────────────────────────────────────────────────── */
const TZ          = "Europe/Istanbul";
const HOUR_START  = 7;
const HOUR_END    = 21;
const HOUR_H      = 72; // px per hour
const GRID_H      = (HOUR_END - HOUR_START) * HOUR_H;
const DAY_LABELS  = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const MONTH_SHORT = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

const STATUS: Record<string, { bg: string; color: string; bar: string }> = {
  Scheduled: { bg: "#dbeafe", color: "#1e40af", bar: "#3b82f6" },
  Completed: { bg: "#dcfce7", color: "#166534", bar: "#22c55e" },
  Cancelled: { bg: "#fee2e2", color: "#991b1b", bar: "#ef4444" },
  NoShow:    { bg: "#fef3c7", color: "#92400e", bar: "#f59e0b" },
};

const DOC_COLORS = [
  "#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16",
];

/* ── Helpers (use shared tz lib — pure math, no Intl) ──────────────── */
function apptTop(startUtc: string): number {
  return Math.max(0, (toIstMins(startUtc) - HOUR_START * 60) * (HOUR_H / 60));
}
function apptHeight(startUtc: string, endUtc: string): number {
  const diff = (new Date(endUtc).getTime() - new Date(startUtc).getTime()) / 60000;
  return Math.max(HOUR_H / 3, diff * (HOUR_H / 60));
}
function fmtDate(d: Date): string {
  return `${DAY_LABELS[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

/* ── Main Page ─────────────────────────────────────────────────────── */
export default function TakvimPage() {
  const [date,        setDate]        = useState(() => new Date());
  const [doctors,     setDoctors]     = useState<Doctor[]>([]);
  const [cols,        setCols]        = useState<Col[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [selDocs,     setSelDocs]     = useState<Set<string>>(new Set());
  const [view,        setView]        = useState<"day"|"agenda">("day");
  const [modal,       setModal]       = useState<{ doctorId: string; startUtc: string; endUtc: string } | null>(null);
  const [activeMobDoc, setActiveMobDoc] = useState(0);

  useEffect(() => {
    apiFetch("/Doctors?activeOnly=true")
      .then(r => r.ok ? r.json() : [])
      .then((d: Doctor[]) => {
        setDoctors(d);
        setSelDocs(new Set(d.slice(0, 6).map(x => x.id)));
      });
  }, []);

  const loadDay = useCallback(async () => {
    const visible = doctors.filter(d => selDocs.has(d.id));
    if (!visible.length) { setCols([]); return; }
    setLoading(true);
    const ds = isoDate(date);
    const dayStart = `${ds}T00:00:00Z`;
    const dayEnd   = `${ds}T23:59:59Z`;
    try {
      const results = await Promise.all(
        visible.map(async doc => {
          const [sR, aR] = await Promise.all([
            apiFetch(`/DoctorSchedule/${doc.id}/slots?date=${ds}&tzOffsetMinutes=180`),
            apiFetch(`/Appointments?doctorId=${doc.id}&start=${encodeURIComponent(dayStart)}&end=${encodeURIComponent(dayEnd)}`),
          ]);
          return {
            doctor: doc,
            slots:  sR.ok ? await sR.json() as Slot[] : [],
            appts:  aR.ok ? await aR.json() as Appt[] : [],
          };
        })
      );
      setCols(results);
    } finally { setLoading(false); }
  }, [date, doctors, selDocs]);

  useEffect(() => { loadDay(); }, [loadDay]);

  const toggleDoc = (id: string) => {
    setSelDocs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isMobile = useIsMobile();
  const isToday = isoDate(date) === isoDate(new Date());
  const visibleCols = cols.filter(c => selDocs.has(c.doctor.id));

  /* ── Timeline click → open modal at calculated time ── */
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>, doctorId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minsFromStart = Math.floor(y / HOUR_H * 60);
    const snapped = Math.floor(minsFromStart / 15) * 15;
    const localMins = HOUR_START * 60 + snapped;
    const endLocalMins = Math.min(localMins + 30, HOUR_END * 60);
    const ds  = isoDate(date);
    const pad = (n: number) => String(n).padStart(2, "0");
    const startUtc = localToUtc(`${ds}T${pad(Math.floor(localMins / 60))}:${pad(localMins % 60)}`);
    const endUtc   = localToUtc(`${ds}T${pad(Math.floor(endLocalMins / 60))}:${pad(endLocalMins % 60)}`);
    setModal({ doctorId, startUtc, endUtc });
  };

  /* ── Agenda: flatten + sort all appointments ── */
  const allAppts: (Appt & { doctor: Doctor; color: string })[] = cols
    .flatMap((c, ci) => c.appts.map(a => ({ ...a, doctor: c.doctor, color: DOC_COLORS[ci % DOC_COLORS.length] })))
    .sort((a, b) => new Date(a.startAtUtc).getTime() - new Date(b.startAtUtc).getTime());

  return (
    <AppShell title="Çalışma Takvimi" description="Günlük program ve randevu görünümü">

      {/* ── Toolbar ── */}
      <div style={{
        background: "var(--surface,#fff)", borderRadius: 16,
        border: "1px solid var(--border,#eaecf0)",
        padding: "14px 16px", marginBottom: 16,
        display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
      }}>
        {/* Date nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setDate(d => addDays(d, -1))} style={navBtn}>‹</button>
          <div style={{ minWidth: 190, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text,#101828)" }}>{fmtDate(date)}</div>
            {isToday && <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>Bugün</div>}
          </div>
          <button onClick={() => setDate(d => addDays(d, 1))} style={navBtn}>›</button>
          {!isToday && (
            <button onClick={() => setDate(new Date())} style={{
              ...navBtn, fontSize: 12, padding: "6px 14px", width: "auto", fontWeight: 700, color: "#1d4ed8",
              borderColor: "#bfdbfe", background: "#eff6ff",
            }}>Bugün</button>
          )}
          <input
            type="date"
            value={isoDate(date)}
            onChange={e => { if (e.target.value) setDate(new Date(e.target.value + "T12:00:00")); }}
            style={{
              minHeight: 40, padding: "6px 10px", borderRadius: 10,
              border: "1px solid #d0d5dd", fontSize: 13,
              background: "var(--surface,#fff)", color: "var(--text,#101828)",
              cursor: "pointer",
            }}
          />
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {(["day", "agenda"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              ...navBtn, fontSize: 13, padding: "8px 16px", width: "auto", fontWeight: 700,
              background: view === v ? "#1d4ed8" : "var(--surface,#fff)",
              color:      view === v ? "#fff"    : "#64748b",
              borderColor: view === v ? "#1d4ed8" : "#e2e8f0",
            }}>
              {v === "day" ? "◫ Gün" : "☰ Ajanda"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Doctor filter pills ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {doctors.map((doc, ci) => {
          const active = selDocs.has(doc.id);
          const color  = DOC_COLORS[ci % DOC_COLORS.length];
          return (
            <button key={doc.id} onClick={() => toggleDoc(doc.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 999, border: `2px solid ${active ? color : "#e2e8f0"}`,
              background: active ? color + "18" : "var(--surface,#fff)",
              color: active ? color : "#64748b",
              fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
              minHeight: 40,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? color : "#d1d5db", flexShrink: 0 }} />
              {doc.fullName.replace("Dr. ", "Dr. ")}
            </button>
          );
        })}
        {doctors.length === 0 && (
          <div style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>Doktor yükleniyor...</div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Yükleniyor...
        </div>
      ) : visibleCols.length === 0 ? (
        <div style={{
          padding: 60, textAlign: "center", background: "var(--surface,#fff)",
          borderRadius: 16, border: "1px solid var(--border,#eaecf0)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Doktor seçilmedi</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Yukarıdan doktor seçerek programı görüntüleyin.</div>
        </div>
      ) : view === "agenda" ? (
        /* ── AGENDA VIEW ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allAppts.length === 0 ? (
            <div style={{
              padding: 48, textAlign: "center", background: "var(--surface,#fff)",
              borderRadius: 16, border: "1px solid var(--border,#eaecf0)",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 700 }}>Bu gün randevu yok</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Seçili doktorların programı boş.</div>
            </div>
          ) : allAppts.map(a => {
            const st = STATUS[a.status] ?? STATUS.Scheduled;
            return (
              <div key={a.id} style={{
                background: "var(--surface,#fff)", borderRadius: 14,
                border: "1px solid var(--border,#eaecf0)",
                display: "flex", alignItems: "stretch", overflow: "hidden",
              }}>
                <div style={{ width: 4, background: a.color, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "14px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {/* Time */}
                  <div style={{ minWidth: 90, textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text,#101828)" }}>
                      {fmtTime(a.startAtUtc)}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      → {fmtTime(a.endAtUtc)}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                      {Math.round((new Date(a.endAtUtc).getTime() - new Date(a.startAtUtc).getTime()) / 60000)} dk
                    </div>
                  </div>
                  {/* Divider */}
                  <div style={{ width: 1, height: 40, background: "#e4e7ec", flexShrink: 0 }} className="desktop-only" />
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text,#101828)" }}>
                      {a.patientFullName}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                      💊 {a.procedureName} &nbsp;·&nbsp; ✚ {a.doctorFullName}
                    </div>
                  </div>
                  {/* Status */}
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                    background: st.bg, color: st.color,
                  }}>
                    {a.status === "Scheduled" ? "Planlandı"
                      : a.status === "Completed" ? "Tamamlandı"
                      : a.status === "Cancelled" ? "İptal"
                      : "Gelmedi"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── DAY VIEW ── */
        <div>
          {/* Mobile: doctor tab switcher */}
          {visibleCols.length > 1 && (
            <div className="mobile-only" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
              {visibleCols.map((c, i) => (
                <button key={c.doctor.id} onClick={() => setActiveMobDoc(i)} style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 999,
                  border: `2px solid ${activeMobDoc === i ? DOC_COLORS[i % DOC_COLORS.length] : "#e2e8f0"}`,
                  background: activeMobDoc === i ? DOC_COLORS[i % DOC_COLORS.length] + "18" : "var(--surface,#fff)",
                  color: activeMobDoc === i ? DOC_COLORS[i % DOC_COLORS.length] : "#64748b",
                  fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", minHeight: 40,
                }}>
                  {c.doctor.fullName.replace("Dr. ", "")}
                </button>
              ))}
            </div>
          )}

          <div style={{
            background: "var(--surface,#fff)", borderRadius: 16,
            border: "1px solid var(--border,#eaecf0)",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", overflowX: "auto" }}>

              {/* Time axis */}
              <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid var(--border,#f2f4f7)", paddingTop: 52 }}>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={i} style={{
                    height: HOUR_H, display: "flex", alignItems: "flex-start",
                    justifyContent: "flex-end", paddingRight: 8, paddingTop: 4,
                  }}>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {String(HOUR_START + i).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Doctor columns — desktop shows all, mobile shows active only */}
              {visibleCols.map((col, ci) => {
                const color = DOC_COLORS[ci % DOC_COLORS.length];
                const isActiveMob = ci === activeMobDoc;
                return (
                  <div key={col.doctor.id}
                    style={{
                      flex: 1, minWidth: 160,
                      borderRight: "1px solid var(--border,#f2f4f7)",
                      display: (!isMobile || ci === activeMobDoc) ? "block" : "none",
                    }}>

                    {/* Column header */}
                    <div style={{
                      height: 52, padding: "8px 12px",
                      borderBottom: `3px solid ${color}`,
                      background: color + "10",
                      display: "flex", flexDirection: "column", justifyContent: "center",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text,#101828)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {col.doctor.fullName}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                        {col.slots.filter(s => s.available).length > 0
                          ? <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ {col.slots.filter(s => s.available).length} müsait</span>
                          : <span style={{ color: "#94a3b8" }}>Program yok</span>
                        }
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ position: "relative", height: GRID_H, cursor: "crosshair" }}
                      onClick={e => handleTimelineClick(e, col.doctor.id)}>

                      {/* Hour gridlines */}
                      {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                        <div key={i} style={{
                          position: "absolute", left: 0, right: 0,
                          top: i * HOUR_H, height: HOUR_H,
                          borderTop: "1px solid #f2f4f7",
                          background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)",
                        }} />
                      ))}

                      {/* Half-hour marks */}
                      {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                        <div key={`h${i}`} style={{
                          position: "absolute", left: 0, right: 0,
                          top: i * HOUR_H + HOUR_H / 2,
                          height: 1, background: "var(--surface-2, #f8fafc)",
                        }} />
                      ))}

                      {/* Available slots */}
                      {col.slots.filter(s => s.available).map((slot, si) => {
                        const top = apptTop(slot.startUtc);
                        const h   = apptHeight(slot.startUtc, slot.endUtc);
                        return (
                          <div key={si}
                            onClick={e => { e.stopPropagation(); setModal({ doctorId: col.doctor.id, startUtc: slot.startUtc, endUtc: slot.endUtc }); }}
                            title={`Müsait: ${fmtTime(slot.startUtc)} – ${fmtTime(slot.endUtc)}`}
                            style={{
                              position: "absolute", left: 3, right: 3, top, height: h,
                              background: color + "0d",
                              border: `1px dashed ${color}55`,
                              borderRadius: 6, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "background 0.12s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = color + "22")}
                            onMouseLeave={e => (e.currentTarget.style.background = color + "0d")}
                          >
                            <span style={{ fontSize: 9, color, fontWeight: 800, letterSpacing: "0.5px" }}>+ EKLE</span>
                          </div>
                        );
                      })}

                      {/* Appointments */}
                      {col.appts.map(appt => {
                        const st  = STATUS[appt.status] ?? STATUS.Scheduled;
                        const top = apptTop(appt.startAtUtc);
                        const h   = apptHeight(appt.startAtUtc, appt.endAtUtc);
                        const dur = Math.round((new Date(appt.endAtUtc).getTime() - new Date(appt.startAtUtc).getTime()) / 60000);
                        return (
                          <div key={appt.id} onClick={e => e.stopPropagation()} style={{
                            position: "absolute", left: 4, right: 4, top, height: h,
                            background: st.bg, borderLeft: `3px solid ${st.bar}`,
                            borderRadius: "0 6px 6px 0",
                            padding: "4px 8px", overflow: "hidden",
                            cursor: "pointer", zIndex: 2,
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: st.color, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {fmtTime(appt.startAtUtc)} · {appt.patientFullName}
                            </div>
                            {h >= 36 && (
                              <div style={{ fontSize: 11, color: st.color, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {appt.procedureName}
                              </div>
                            )}
                            {h >= 52 && (
                              <div style={{ fontSize: 10, color: st.color, opacity: 0.55, marginTop: 2 }}>
                                {dur} dk
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* No schedule */}
                      {col.slots.length === 0 && col.appts.length === 0 && (
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 6,
                          pointerEvents: "none",
                        }}>
                          <div style={{ fontSize: 24, opacity: 0.15 }}>◷</div>
                          <div style={{ fontSize: 11, color: "#d1d5db", textAlign: "center" }}>Bu gün<br/>program yok</div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      )}

      {/* Quick appointment modal */}
      {modal && (
        <QuickModal
          doctorId={modal.doctorId}
          doctorName={doctors.find(d => d.id === modal.doctorId)?.fullName ?? ""}
          startUtc={modal.startUtc}
          endUtc={modal.endUtc}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadDay(); }}
        />
      )}
    </AppShell>
  );
}

/* ── Navigation button style ───────────────────────────────────────── */
const navBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10,
  border: "1px solid #e4e7ec",
  background: "var(--surface,#fff)", color: "var(--text,#344054)",
  cursor: "pointer", fontSize: 18, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};

/* ── Quick Appointment Modal ────────────────────────────────────────── */
function QuickModal({
  doctorId, doctorName, startUtc, endUtc, onClose, onSaved,
}: {
  doctorId: string; doctorName: string;
  startUtc: string; endUtc: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [patients,  setPatients]  = useState<{ id: string; fullName: string }[]>([]);
  const [patientId, setPatientId] = useState("");
  const [proc,      setProc]      = useState("");
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    apiFetch("/Patients?pageSize=200")
      .then(r => r.ok ? r.json() : [])
      .then((d: { id: string; firstName: string; lastName: string }[]) =>
        setPatients(d.map(p => ({ id: p.id, fullName: `${p.firstName} ${p.lastName}` })))
      );
  }, []);

  const save = async () => {
    if (!patientId) { setError("Hasta seçiniz."); return; }
    if (!proc)      { setError("İşlem adı giriniz."); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/Appointments", {
        method: "POST",
        body: JSON.stringify({ patientId, doctorId, procedureName: proc, notes, startAtUtc: startUtc, endAtUtc: endUtc }),
      });
      if (res.ok) onSaved();
      else { const d = await res.json().catch(() => ({})); setError(d.message ?? "Kayıt hatası."); }
    } finally { setSaving(false); }
  };

  const s: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, minHeight: 48,
    border: "1px solid #d0d5dd", fontSize: 15, boxSizing: "border-box",
    background: "var(--surface,#fff)", color: "var(--text,#101828)",
    WebkitAppearance: "none",
  };

  const dur = Math.round((new Date(endUtc).getTime() - new Date(startUtc).getTime()) / 60000);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 100, backdropFilter: "blur(3px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(460px, 94vw)", zIndex: 101, maxHeight: "90vh", overflowY: "auto",
        background: "var(--surface,#fff)", borderRadius: 20,
        boxShadow: "0 24px 64px rgba(15,23,42,0.25)",
        border: "1px solid var(--border,#eaecf0)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid var(--border,#eaecf0)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Hızlı Randevu</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
              ✚ {doctorName}
              <span style={{
                marginLeft: 8, padding: "2px 8px", borderRadius: 6,
                background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 700,
              }}>
                {fmtTime(startUtc)} – {fmtTime(endUtc)} ({dur} dk)
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Hasta *
            </label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)} style={s}>
              <option value="">Hasta seçiniz...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              İşlem *
            </label>
            <input value={proc} onChange={e => setProc(e.target.value)} placeholder="Botoks, Rinoplasti..." style={s} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Notlar
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="İsteğe bağlı..." style={{ ...s, resize: "vertical" }} />
          </div>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b42318", fontSize: 13, fontWeight: 600 }}>
              ⚠ {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, minHeight: 48, borderRadius: 12, border: "1px solid #e4e7ec",
              background: "transparent", color: "var(--text-2, #344054)", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>İptal</button>
            <button onClick={save} disabled={saving} style={{
              flex: 2, minHeight: 48, borderRadius: 12, border: "none",
              background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Kaydediliyor..." : "Randevu Oluştur"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
