"use client";
import { useState, useEffect, useRef } from "react";

type Credential = {
  id: number; label: string; category: string; username: string | null;
  url: string | null; port: number | null; notes: string | null;
  created_by: string | null; created_at: string; has_password: boolean;
};

const CATEGORIES = [
  { value: "server",   label: "Sunucu",    icon: "🖥️" },
  { value: "firewall", label: "Firewall",  icon: "🔥" },
  { value: "switch",   label: "Switch",    icon: "🔀" },
  { value: "router",   label: "Router",    icon: "📡" },
  { value: "rdp",      label: "RDP",       icon: "🖱️" },
  { value: "vpn",      label: "VPN",       icon: "🔒" },
  { value: "email",    label: "E-posta",   icon: "📧" },
  { value: "domain",   label: "Domain",    icon: "🌐" },
  { value: "database", label: "Veritabanı",icon: "🗄️" },
  { value: "other",    label: "Diğer",     icon: "📦" },
];

function getCat(v: string) { return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[9]; }
function emptyForm() {
  return { label: "", category: "server", username: "", password: "", url: "", port: "", notes: "" };
}

// OTP modal state
type OtpState =
  | { phase: "idle" }
  | { phase: "sending"; credId: number }
  | { phase: "input";   credId: number; label: string; sentTo: string; otp: string; error: string }
  | { phase: "revealed"; credId: number; password: string; expiresAt: number };

export default function VaultClient({ customerId, customerName, initialCredentials }:
  { customerId: number; customerName: string; initialCredentials: Credential[] }) {
  const [creds, setCreds]         = useState<Credential[]>(initialCredentials);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Credential | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [otp, setOtp]             = useState<OtpState>({ phase: "idle" });
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown for revealed password (60s)
  useEffect(() => {
    if (otp.phase === "revealed") {
      const remaining = Math.max(0, Math.ceil((otp.expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      timerRef.current = setInterval(() => {
        const r = Math.max(0, Math.ceil((otp.expiresAt - Date.now()) / 1000));
        setCountdown(r);
        if (r <= 0) { setOtp({ phase: "idle" }); clearInterval(timerRef.current!); }
      }, 1000);
      return () => clearInterval(timerRef.current!);
    }
  }, [otp.phase === "revealed" ? otp.expiresAt : 0]);

  const requestOtp = async (cred: Credential) => {
    setOtp({ phase: "sending", credId: cred.id });
    try {
      const res = await fetch(`/api/vault/${cred.id}/request-otp`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtp({ phase: "input", credId: cred.id, label: cred.label, sentTo: data.email, otp: "", error: "" });
    } catch (e: any) {
      setMsg({ text: e.message ?? "OTP gönderilemedi", ok: false });
      setOtp({ phase: "idle" });
    }
  };

  const submitOtp = async () => {
    if (otp.phase !== "input") return;
    const res = await fetch(`/api/vault/${otp.credId}/reveal`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: otp.otp }),
    });
    const data = await res.json();
    if (!res.ok) {
      setOtp({ ...otp, error: data.error ?? "Hatalı OTP" });
      return;
    }
    setOtp({ phase: "revealed", credId: otp.credId, password: data.password, expiresAt: Date.now() + 60000 });
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowPass(false); setShowModal(true); };
  const openEdit = (c: Credential) => {
    setEditing(c);
    setForm({ label: c.label, category: c.category, username: c.username ?? "",
              password: "", url: c.url ?? "", port: c.port ? String(c.port) : "", notes: c.notes ?? "" });
    setShowPass(false); setShowModal(true);
  };

  const save = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/customers/${customerId}/vault/${editing.id}`
        : `/api/customers/${customerId}/vault`;
      const body = { ...form };
      if (editing && !form.password) delete (body as any).password;
      const res = await fetch(url, { method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ text: editing ? "Güncellendi." : "Eklendi.", ok: true });
      setShowModal(false);
      const updated = await fetch(`/api/customers/${customerId}/vault`);
      if (updated.ok) setCreds(await updated.json());
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Bu erişim kaydı kalıcı olarak silinecek!")) return;
    setDeleting(id);
    await fetch(`/api/customers/${customerId}/vault/${id}`, { method: "DELETE" });
    setCreds(c => c.filter(x => x.id !== id));
    setDeleting(null);
  };

  const inp: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13, outline: "none" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 5 };

  return (
    <>
      {/* Toast */}
      {msg && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: msg.ok ? "#16a34a" : "#dc2626", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
          {msg.text}<button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 10, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: 0 }}>🔐 Erişim Bilgileri Kasası</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>{customerName} — {creds.length} kayıt · Şifreler AES-256-GCM ile şifreli · OTP doğrulama zorunlu</p>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Erişim Bilgisi Ekle</button>
      </div>

      {creds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)", fontSize: 14 }}>
          Henüz erişim bilgisi eklenmemiş.<br />
          <button onClick={openAdd} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "1px dashed #7c3aed", background: "rgba(124,58,237,.06)", color: "#7c3aed", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>İlk kaydı ekle</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {creds.map(c => {
            const cat = getCat(c.category);
            const isRevealed = otp.phase === "revealed" && otp.credId === c.id;
            const isSending  = otp.phase === "sending"  && otp.credId === c.id;
            return (
              <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(124,58,237,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{c.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>{cat.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                      {c.username && <span>👤 <strong style={{ color: "var(--text)" }}>{c.username}</strong></span>}
                      {c.url && <span>🔗 {c.url}{c.port ? `:${c.port}` : ""}</span>}
                      {c.created_by && <span>✍ {c.created_by}</span>}
                    </div>
                    {/* Password row */}
                    {c.has_password && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: c.notes ? 6 : 0 }}>
                        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Şifre:</span>
                        {isRevealed ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <code style={{ background: "#0f172a", color: "#22c55e", padding: "4px 10px", borderRadius: 6, fontSize: 13, fontFamily: "monospace", letterSpacing: "0.04em" }}>
                              {(otp as any).password}
                            </code>
                            <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>{countdown}s</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 16, letterSpacing: "0.1em", color: "var(--text-dim)" }}>●●●●●●●●</span>
                            <button onClick={() => requestOtp(c)} disabled={isSending}
                              style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(124,58,237,.4)", background: "rgba(124,58,237,.08)", color: "#7c3aed", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              {isSending ? "OTP gönderiliyor…" : "👁 Görüntüle"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {c.notes && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{c.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => openEdit(c)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Düzenle</button>
                    <button onClick={() => del(c.id)} disabled={deleting === c.id} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{deleting === c.id ? "…" : "Sil"}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OTP Input Modal */}
      {otp.phase === "input" && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 500, backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(380px,92vw)", zIndex: 501, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.5)" }}>
            <div style={{ background: "linear-gradient(135deg,#4c1d95,#1e1b4b)", padding: "20px 24px" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🔐</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>OTP Doğrulama</div>
              <div style={{ fontSize: 12, color: "#a78bfa" }}>{otp.label}</div>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 18 }}>
                <strong style={{ color: "var(--text)" }}>{otp.sentTo}</strong> adresine 6 haneli kod gönderildi. Kod 5 dakika geçerlidir.
              </p>
              <input
                value={otp.otp}
                onChange={e => setOtp({ ...otp, otp: e.target.value.replace(/\D/g, "").slice(0, 6), error: "" })}
                onKeyDown={e => e.key === "Enter" && otp.otp.length === 6 && submitOtp()}
                placeholder="000000"
                maxLength={6}
                autoFocus
                style={{ width: "100%", background: "var(--input-bg)", border: `2px solid ${otp.error ? "#ef4444" : "rgba(124,58,237,.4)"}`, borderRadius: 10, padding: "14px", color: "var(--text)", fontSize: 28, fontFamily: "monospace", textAlign: "center", letterSpacing: "0.2em", outline: "none", marginBottom: 8 }}
              />
              {otp.error && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 12, textAlign: "center" }}>{otp.error}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setOtp({ phase: "idle" })} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={submitOtp} disabled={otp.otp.length !== 6}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: otp.otp.length === 6 ? "#7c3aed" : "var(--input-bg)", color: otp.otp.length === 6 ? "#fff" : "var(--text-dim)", fontSize: 13, fontWeight: 700, cursor: otp.otp.length === 6 ? "pointer" : "not-allowed" }}>
                  Onayla
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
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(540px,94vw)", zIndex: 401, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{editing ? "Kaydı Düzenle" : "Yeni Erişim Bilgisi"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "72vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Etiket *</label>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Örn: Fortigate Firewall, DC Sunucusu" style={inp} autoFocus />
                </div>
                <div>
                  <label style={lbl}>Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Kullanıcı Adı</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin" style={inp} autoComplete="off" />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Şifre {editing && <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-dim)" }}>— boş bırakırsanız mevcut şifre korunur</span>}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={editing ? "Değiştirmek için yeni şifre girin" : "Şifre"}
                      style={{ ...inp, paddingRight: 40, fontFamily: form.password && !showPass ? "monospace" : "inherit" }}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 16 }}>
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={lbl}>URL / IP Adresi</label>
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="192.168.1.1 veya https://..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Port</label>
                  <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder="22, 3389, 443…" style={inp} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Notlar</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ek bilgiler, erişim yöntemi…" style={{ ...inp, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>İptal</button>
                <button onClick={save} disabled={saving || !form.label.trim()} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: saving ? "#5b21b6" : "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
