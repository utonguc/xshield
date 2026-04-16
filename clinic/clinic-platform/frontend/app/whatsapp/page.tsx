"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { fmtDateTimeShort as fmtDate, fmtDate as fmtDateOnly } from "@/lib/tz";

type WaSettings = {
  isActive: boolean;
  phoneNumberId?: string;
  fromNumber?: string;
  hasToken: boolean;
  updatedAtUtc?: string;
};

type WaStats = {
  total: number; sent: number; failed: number; pending: number; today: number;
};

type WaLog = {
  id: string;
  toNumber: string;
  messageBody: string;
  status: string;
  errorDetail?: string;
  patientName?: string;
  sentByName?: string;
  createdAtUtc: string;
};

type Patient = { id: string; firstName: string; lastName: string; phone?: string };
type Appointment = { id: string; patient: string; doctor: string; procedureName: string; startAtUtc: string };

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  sent:    { bg: "#dcfce7", color: "#166534", label: "Gönderildi" },
  failed:  { bg: "#fef3f2", color: "#b42318", label: "Başarısız"  },
  pending: { bg: "#fffbeb", color: "#92400e", label: "Bekliyor"   },
};

export default function WhatsAppPage() {
  const [tab, setTab] = useState<"logs" | "send" | "campaign" | "settings">("logs");
  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [stats, setStats]       = useState<WaStats | null>(null);
  const [logs, setLogs]         = useState<WaLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage]   = useState(1);
  const [loading, setLoading]   = useState(true);

  // Settings form
  const [sIsActive, setSIsActive]   = useState(false);
  const [sPhoneId, setSPhoneId]     = useState("");
  const [sFromNum, setSFromNum]     = useState("");
  const [sToken, setSToken]         = useState("");
  const [settingMsg, setSettingMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Send form
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sendMode, setSendMode]         = useState<"custom" | "reminder">("custom");
  const [sendTo, setSendTo]             = useState("");
  const [sendBody, setSendBody]         = useState("");
  const [sendPatientId, setSendPatientId] = useState("");
  const [sendApptId, setSendApptId]     = useState("");
  const [sendMsg, setSendMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [sending, setSending]           = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [sRes, stRes, lRes] = await Promise.all([
      apiFetch("/WhatsApp/settings"),
      apiFetch("/WhatsApp/stats"),
      apiFetch(`/WhatsApp/logs?page=${logPage}&limit=30`),
    ]);
    if (sRes.ok)  { const d = await sRes.json();  setSettings(d); setSIsActive(d.isActive); setSPhoneId(d.phoneNumberId ?? ""); setSFromNum(d.fromNumber ?? ""); }
    if (stRes.ok) setStats(await stRes.json());
    if (lRes.ok)  { const d = await lRes.json(); setLogs(d.items); setLogTotal(d.total); }
    setLoading(false);
  }, [logPage]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab === "send") {
      apiFetch("/Patients?pageSize=200").then(r => r.ok ? r.json() : []).then(d => setPatients(Array.isArray(d) ? d : []));
      apiFetch("/Appointments?status=Scheduled&limit=50").then(r => r.ok ? r.json() : []).then(d => setAppointments(Array.isArray(d) ? d : []));
    }
  }, [tab]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingMsg(null);
    const r = await apiFetch("/WhatsApp/settings", {
      method: "PUT",
      body: JSON.stringify({ isActive: sIsActive, phoneNumberId: sPhoneId, fromNumber: sFromNum, apiToken: sToken }),
    });
    const d = await r.json().catch(() => ({}));
    setSavingSettings(false);
    setSettingMsg({ text: d.message ?? (r.ok ? "Kaydedildi." : "Hata."), ok: r.ok });
    if (r.ok) { setSToken(""); loadAll(); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendMsg(null);
    let r: Response;
    if (sendMode === "reminder") {
      r = await apiFetch("/WhatsApp/send-appointment-reminder", { method: "POST", body: JSON.stringify({ appointmentId: sendApptId }) });
    } else {
      r = await apiFetch("/WhatsApp/send", { method: "POST", body: JSON.stringify({ toNumber: sendTo, body: sendBody, patientId: sendPatientId || undefined }) });
    }
    const d = await r.json().catch(() => ({}));
    setSending(false);
    setSendMsg({ text: d.message ?? (r.ok ? "Gönderildi." : "Hata."), ok: r.ok });
    if (r.ok) { setSendTo(""); setSendBody(""); setSendApptId(""); loadAll(); }
  };

  const LIMIT = 30;
  const totalPages = Math.ceil(logTotal / LIMIT);

  return (
    <AppShell title="WhatsApp" description="Meta Cloud API ile mesajlaşma ve randevu hatırlatmaları">

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Toplam",    value: stats.total,   color: "#1d4ed8", bg: "#eff8ff" },
            { label: "Gönderildi", value: stats.sent,   color: "#059669", bg: "#f0fdf4" },
            { label: "Başarısız", value: stats.failed,  color: "#b42318", bg: "#fef3f2" },
            { label: "Bekliyor",  value: stats.pending, color: "#d97706", bg: "#fffbeb" },
            { label: "Bugün",     value: stats.today,   color: "#6d28d9", bg: "#faf5ff" },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.color }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.color, marginTop: 2 }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f1f5f9", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {([["logs", "📋 Mesaj Geçmişi"], ["send", "✉ Mesaj Gönder"], ["campaign", "📣 Kampanya"], ["settings", "⚙ Ayarlar"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13,
            background: tab === t ? "#fff" : "transparent",
            color: tab === t ? "#0f172a" : "#64748b",
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.08)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Logs tab ────────────────────────────────────────────────────────── */}
      {tab === "logs" && (
        <div style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Yükleniyor...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              Henüz mesaj gönderilmemiş
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2, #f8fafc)", borderBottom: "1px solid #eaecf0" }}>
                    {["Telefon", "Mesaj", "Durum", "Hasta", "Gönderen", "Tarih"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const st = STATUS_STYLE[log.status] ?? STATUS_STYLE.pending;
                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafcff" }}>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--text, #0f172a)" }}>{log.toNumber}</td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-2, #344054)", maxWidth: 260 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.messageBody}</div>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          {log.errorDetail && (
                            <div style={{ fontSize: 10, color: "#b42318", marginTop: 2, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{log.errorDetail}</div>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{log.patientName ?? "—"}</td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{log.sentByName ?? "—"}</td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#94a3b8" }}>{fmtDate(log.createdAtUtc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 16 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setLogPage(p)} style={{
                      width: 32, height: 32, borderRadius: 8, border: "1px solid",
                      borderColor: logPage === p ? "#1d4ed8" : "#e4e7ec",
                      background: logPage === p ? "#1d4ed8" : "#fff",
                      color: logPage === p ? "#fff" : "#344054",
                      fontWeight: 600, fontSize: 13, cursor: "pointer",
                    }}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Send tab ─────────────────────────────────────────────────────────── */}
      {tab === "send" && (
        <div style={{ maxWidth: 560 }}>
          {/* Mode selector */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {([["custom", "✏ Özel Mesaj"], ["reminder", "🔔 Randevu Hatırlatma"]] as const).map(([m, l]) => (
              <button key={m} onClick={() => setSendMode(m)} style={{
                flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid",
                borderColor: sendMode === m ? "#1d4ed8" : "#e4e7ec",
                background: sendMode === m ? "#eff8ff" : "#fff",
                color: sendMode === m ? "#1d4ed8" : "#64748b",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>

          <form onSubmit={sendMessage} style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

            {sendMode === "custom" ? (
              <>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Telefon Numarası *</label>
                  <input value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="+905551234567" required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Hasta (isteğe bağlı)</label>
                  <select value={sendPatientId} onChange={e => {
                    setSendPatientId(e.target.value);
                    const p = patients.find(x => x.id === e.target.value);
                    if (p?.phone) setSendTo(p.phone);
                  }} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13 }}>
                    <option value="">Seçiniz</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.phone ? ` — ${p.phone}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Mesaj *</label>
                  <textarea value={sendBody} onChange={e => setSendBody(e.target.value)} required rows={5}
                    placeholder="Mesajınızı buraya yazın..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, textAlign: "right" }}>{sendBody.length} / 4096</div>
                </div>
              </>
            ) : (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>Randevu *</label>
                <select value={sendApptId} onChange={e => setSendApptId(e.target.value)} required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13 }}>
                  <option value="">Randevu seçiniz</option>
                  {appointments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.patient} — {a.procedureName} — {fmtDateOnly(a.startAtUtc)}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                  Hastanın kayıtlı telefon numarasına otomatik hatırlatma mesajı gönderilir.
                </div>
              </div>
            )}

            {sendMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: sendMsg.ok ? "#f0fdf4" : "#fef3f2",
                color: sendMsg.ok ? "#166534" : "#b42318",
                border: `1px solid ${sendMsg.ok ? "#bbf7d0" : "#fecaca"}`,
              }}>{sendMsg.text}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={sending} style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: sending ? "#93c5fd" : "#1d4ed8",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: sending ? "not-allowed" : "pointer",
              }}>
                {sending ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Settings tab ─────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div style={{ maxWidth: 520 }}>
          <form onSubmit={saveSettings} style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
              Meta WhatsApp Cloud API kullanmak için bir <strong>Business hesabı</strong> ve <strong>doğrulanmış numara</strong> gereklidir. Token ve Phone Number ID, Meta Developer Console'dan alınır.
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div onClick={() => setSIsActive(v => !v)} style={{
                width: 44, height: 24, borderRadius: 999, position: "relative", cursor: "pointer",
                background: sIsActive ? "#22c55e" : "#d1d5db", transition: "background 0.2s",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", background: "var(--surface, #fff)",
                  position: "absolute", top: 2, transition: "left 0.2s",
                  left: sIsActive ? 22 : 2, boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text, #0f172a)" }}>
                WhatsApp entegrasyonu {sIsActive ? "aktif" : "pasif"}
              </span>
            </label>

            {[
              { label: "Phone Number ID", value: sPhoneId, setter: setSPhoneId, placeholder: "1234567890" },
              { label: "Gönderen Numara", value: sFromNum, setter: setSFromNum, placeholder: "+905551234567" },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>{label}</label>
                <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>
                API Token {settings?.hasToken ? <span style={{ color: "#059669" }}>✓ kayıtlı</span> : <span style={{ color: "#94a3b8" }}>henüz yok</span>}
              </label>
              <input type="password" value={sToken} onChange={e => setSToken(e.target.value)}
                placeholder={settings?.hasToken ? "Değiştirmek için yeni token girin" : "Bearer token"}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e7ec", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            {settingMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: settingMsg.ok ? "#f0fdf4" : "#fef3f2",
                color: settingMsg.ok ? "#166534" : "#b42318",
                border: `1px solid ${settingMsg.ok ? "#bbf7d0" : "#fecaca"}`,
              }}>{settingMsg.text}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={savingSettings} style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: savingSettings ? "#93c5fd" : "#1d4ed8",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: savingSettings ? "not-allowed" : "pointer",
              }}>
                {savingSettings ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ── Campaign tab ─────────────────────────────────────────────────────── */}
      {tab === "campaign" && (
        <CampaignPanel />
      )}
    </AppShell>
  );
}

const LEAD_STATUSES = ["Yeni","Görüşüldü","Teklif Verildi","Randevu Oluştu","İşlem Yapıldı","İptal"];

function CampaignPanel() {
  const [leadStatus,  setLeadStatus]  = useState("");
  const [procedure,   setProcedure]   = useState("");
  const [message,     setMessage]     = useState("");
  const [preview,     setPreview]     = useState<{ id: string; firstName: string; lastName: string; phone?: string }[]>([]);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState<{ sent: number; failed: number; total: number; message: string } | null>(null);

  const TEMPLATES = [
    { label: "Hatırlatma", text: "Merhaba {ad}, kliniğimizden sizi aramak istedik. Yeni randevu almak ister misiniz? 😊" },
    { label: "Kampanya", text: "Merhaba {ad_soyad}, özel indirimlerimizden haberdar olmak ister misiniz? Detaylar için bize ulaşın." },
    { label: "Teşekkür", text: "Sayın {ad}, kliniğimizi tercih ettiğiniz için teşekkür ederiz. Herhangi bir sorunuz varsa bize ulaşabilirsiniz." },
  ];

  const loadPreview = async () => {
    setLoadingPrev(true);
    const qs = new URLSearchParams({ pageSize: "200" });
    if (leadStatus) qs.set("leadStatus", leadStatus);
    const res = await apiFetch(`/Patients?${qs}`);
    const d   = await res.json();
    let patients = Array.isArray(d) ? d : [];
    if (procedure) patients = patients.filter((p: { interestedProcedure?: string }) => p.interestedProcedure?.toLowerCase().includes(procedure.toLowerCase()));
    patients = patients.filter((p: { phone?: string }) => p.phone);
    setPreview(patients.slice(0, 50));
    setLoadingPrev(false);
  };

  const sendCampaign = async () => {
    if (!message.trim()) return;
    setSending(true); setResult(null);
    const res = await apiFetch("/WhatsApp/bulk", {
      method: "POST",
      body: JSON.stringify({ message, leadStatus: leadStatus || undefined, interestedProcedure: procedure || undefined }),
    });
    const d = await res.json();
    setResult(d);
    setSending(false);
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: "1px solid #d0d5dd", fontSize: 13, boxSizing: "border-box",
    background: "var(--surface,#fff)", color: "var(--text,#0f172a)",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      {/* Left: compose */}
      <div style={{ background: "var(--surface,#fff)", borderRadius: 16, border: "1px solid var(--border,#eaecf0)", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Kampanya Oluştur</div>

        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
          Mesajınızda <code>{"{ad}"}</code>, <code>{"{soyad}"}</code>, <code>{"{ad_soyad}"}</code> değişkenlerini kullanabilirsiniz.
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Lead Durumu Filtresi</label>
          <select value={leadStatus} onChange={e => setLeadStatus(e.target.value)} style={inp}>
            <option value="">Tüm hastalar</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>İlgi Prosedürü (İsteğe Bağlı)</label>
          <input value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="Örn: Botoks" style={inp} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Hazır Şablonlar</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => setMessage(t.text)} style={{
                padding: "5px 12px", borderRadius: 999, border: "1px solid #b2ddff",
                background: "#eff8ff", color: "#175cd3", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Mesaj Metni</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
            placeholder="Merhaba {ad}, ..." style={{ ...inp, resize: "vertical" }} />
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{message.length} karakter</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadPreview} disabled={loadingPrev} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #d0d5dd",
            background: "var(--surface, #fff)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13,
          }}>
            {loadingPrev ? "Yükleniyor..." : "◉ Alıcıları Önizle"}
          </button>
          <button onClick={sendCampaign} disabled={sending || !message.trim()} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "none",
            background: (!message.trim() || sending) ? "#93c5fd" : "#1d4ed8",
            color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}>
            {sending ? "Gönderiliyor..." : "▶ Kampanyayı Gönder"}
          </button>
        </div>

        {result && (
          <div style={{
            padding: "12px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: result.failed === 0 ? "#f0fdf4" : "#fffbeb",
            color: result.failed === 0 ? "#166534" : "#92400e",
            border: `1px solid ${result.failed === 0 ? "#bbf7d0" : "#fde68a"}`,
          }}>
            ✓ {result.sent} gönderildi · {result.failed} başarısız · Toplam: {result.total}
          </div>
        )}
      </div>

      {/* Right: preview list */}
      <div style={{ background: "var(--surface,#fff)", borderRadius: 16, border: "1px solid var(--border,#eaecf0)", padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
          Alıcı Listesi
          {preview.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
              {preview.length} kişi
            </span>
          )}
        </div>
        {preview.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>◉</div>
            Filtre ayarlayıp &quot;Alıcıları Önizle&quot;ye tıklayın.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
            {preview.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--surface-2, #f8fafc)", border: "1px solid #f2f4f7" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1d4ed8", flexShrink: 0 }}>
                  {p.firstName.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text, #101828)" }}>{p.firstName} {p.lastName}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.phone}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
