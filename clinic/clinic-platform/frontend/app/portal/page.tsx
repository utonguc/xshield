"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { portalFetch, clearPortalToken, getPortalToken } from "@/lib/portalApi";
import { fmtDateTime as fmtDate, fmtDate as fmtShort } from "@/lib/tz";

type PatientMe = {
  patient: { id: string; firstName: string; lastName: string; email?: string; phone?: string; birthDate?: string; gender?: string; city?: string; country?: string };
  clinic:  { name: string; primaryColor: string; logoUrl?: string };
};
type Appointment = {
  id: string; doctorName: string; doctorBranch: string; procedureName: string;
  startAtUtc: string; endAtUtc: string; status: string; notes?: string;
};
type Invoice = {
  id: string; invoiceNo: string; issuedAt: string; dueAt?: string;
  status: string; total: number; currency: string;
};
type DocFile = {
  id: string; title: string; category: string; mimeType: string; fileSize: number; uploadedAt: string;
};

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  Scheduled: { label: "Planlandı",  bg: "#dbeafe", color: "#1d4ed8" },
  Completed: { label: "Tamamlandı", bg: "#dcfce7", color: "#166534" },
  Cancelled: { label: "İptal",      bg: "#fee2e2", color: "#991b1b" },
  NoShow:    { label: "Gelmedi",    bg: "#fef3c7", color: "#92400e" },
};
const INV_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  Draft:   { label: "Taslak",  bg: "#f1f5f9", color: "#64748b" },
  Sent:    { label: "Gönderildi", bg: "#dbeafe", color: "#1d4ed8" },
  Paid:    { label: "Ödendi",  bg: "#dcfce7", color: "#166534" },
  Overdue: { label: "Gecikmiş", bg: "#fee2e2", color: "#991b1b" },
};

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}

export default function PortalPage() {
  const router = useRouter();
  const [me,      setMe]      = useState<PatientMe | null>(null);
  const [appts,   setAppts]   = useState<Appointment[]>([]);
  const [invoices,setInvoices]= useState<Invoice[]>([]);
  const [docs,    setDocs]    = useState<DocFile[]>([]);
  const [tab,     setTab]     = useState<"appointments" | "invoices" | "documents" | "profile">("appointments");
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!getPortalToken()) router.replace("/portal/login");
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, apptRes, invRes, docRes] = await Promise.all([
        portalFetch("/me"),
        portalFetch("/appointments"),
        portalFetch("/invoices"),
        portalFetch("/documents"),
      ]);
      if (!meRes.ok) { clearPortalToken(); router.replace("/portal/login"); return; }
      setMe(await meRes.json());
      if (apptRes.ok) setAppts(await apptRes.json());
      if (invRes.ok)  setInvoices(await invRes.json());
      if (docRes.ok)  setDocs(await docRes.json());
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const logout = () => { clearPortalToken(); router.replace("/portal/login"); };

  const primary = me?.clinic?.primaryColor ?? "#1d4ed8";
  const upcomingAppts = appts.filter(a => new Date(a.startAtUtc) >= new Date() && a.status === "Scheduled");
  const pastAppts     = appts.filter(a => new Date(a.startAtUtc) < new Date() || a.status !== "Scheduled");

  if (loading || !me) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2, #f8fafc)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🏥</div>
        <div style={{ color: "#64748b" }}>Yükleniyor...</div>
      </div>
    </div>
  );

  const TABS = [
    { id: "appointments", label: "Randevularım", icon: "◷", count: appts.length },
    { id: "invoices",     label: "Faturalarım",  icon: "₺",  count: invoices.length },
    { id: "documents",    label: "Belgelerim",   icon: "📄", count: docs.length },
    { id: "profile",      label: "Profilim",     icon: "♥",  count: null },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-2, #f8fafc)" }}>
      {/* Header */}
      <header style={{
        background: primary, color: "#fff",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🏥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{me.clinic.name}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Hasta Portalı</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right", fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{me.patient.firstName} {me.patient.lastName}</div>
            <div style={{ opacity: 0.8, fontSize: 11 }}>{me.patient.email}</div>
          </div>
          <button onClick={logout} style={{
            padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.15)", color: "#fff",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>Çıkış</button>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Yaklaşan Randevu", value: upcomingAppts.length, icon: "◷", color: primary },
            { label: "Toplam Fatura",    value: invoices.length,      icon: "₺",  color: "#059669" },
            { label: "Belge",            value: docs.length,          icon: "📄", color: "#7c3aed" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--surface, #fff)", borderRadius: 16, padding: "16px 18px",
              border: "1px solid #eaecf0", boxShadow: "0 1px 4px rgba(16,24,40,0.06)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: `${s.color}18`, color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text, #101828)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Next appointment banner */}
        {upcomingAppts[0] && (
          <div style={{
            background: `linear-gradient(135deg, ${primary}ee, ${primary}aa)`,
            borderRadius: 16, padding: "20px 24px", marginBottom: 24, color: "#fff",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ fontSize: 36 }}>📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Bir Sonraki Randevunuz</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{upcomingAppts[0].procedureName}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                {upcomingAppts[0].doctorName} · {fmtDate(upcomingAppts[0].startAtUtc)}
              </div>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div style={{
          display: "flex", background: "#f1f5f9", borderRadius: 14,
          padding: 4, marginBottom: 20, gap: 2,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 10, border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: tab === t.id ? "#fff" : "transparent",
                color: tab === t.id ? "#101828" : "#64748b",
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <span>{t.icon}</span>
              <span style={{ display: "none" }}>{t.label}</span>
              {t.count !== null && t.count > 0 && (
                <span style={{
                  background: tab === t.id ? primary : "#e2e8f0",
                  color: tab === t.id ? "#fff" : "#64748b",
                  borderRadius: 999, fontSize: 10, fontWeight: 800,
                  padding: "1px 6px", minWidth: 16, textAlign: "center",
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Appointments tab ── */}
        {tab === "appointments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcomingAppts.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
                Yaklaşan
              </div>
            )}
            {upcomingAppts.map(a => <AppointmentCard key={a.id} a={a} primary={primary} />)}
            {pastAppts.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", margin: "8px 0 4px" }}>
                Geçmiş
              </div>
            )}
            {pastAppts.map(a => <AppointmentCard key={a.id} a={a} primary={primary} />)}
            {appts.length === 0 && <EmptyState icon="◷" message="Henüz randevu kaydı bulunmuyor." />}
          </div>
        )}

        {/* ── Invoices tab ── */}
        {tab === "invoices" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invoices.map(inv => {
              const st = INV_STATUS[inv.status] ?? { label: inv.status, bg: "#f1f5f9", color: "#64748b" };
              return (
                <div key={inv.id} style={{
                  background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0",
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: "#f0fdf4",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                  }}>₺</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text, #101828)" }}>{inv.invoiceNo}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {fmtShort(inv.issuedAt)}
                      {inv.dueAt && ` · Vade: ${fmtShort(inv.dueAt)}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text, #101828)" }}>
                      {inv.total.toLocaleString("tr-TR")} {inv.currency}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                      background: st.bg, color: st.color,
                    }}>{st.label}</span>
                  </div>
                </div>
              );
            })}
            {invoices.length === 0 && <EmptyState icon="₺" message="Henüz fatura kaydı bulunmuyor." />}
          </div>
        )}

        {/* ── Documents tab ── */}
        {tab === "documents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} style={{
                background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0",
                padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: "#f5f3ff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
                }}>
                  {d.mimeType.includes("pdf") ? "📄" : d.mimeType.includes("image") ? "🖼" : "📁"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text, #101828)" }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {d.category} · {fmtBytes(d.fileSize)} · {fmtShort(d.uploadedAt)}
                  </div>
                </div>
              </div>
            ))}
            {docs.length === 0 && <EmptyState icon="📄" message="Henüz belge kaydı bulunmuyor." />}
          </div>
        )}

        {/* ── Profile tab ── */}
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: "24px",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Kişisel Bilgiler</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Ad",      value: me.patient.firstName },
                  { label: "Soyad",   value: me.patient.lastName },
                  { label: "E-posta", value: me.patient.email },
                  { label: "Telefon", value: me.patient.phone },
                  { label: "Cinsiyet",value: me.patient.gender },
                  { label: "Şehir",   value: me.patient.city },
                ].map(f => f.value ? (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 14, color: "var(--text, #101828)", fontWeight: 500 }}>{f.value}</div>
                  </div>
                ) : null)}
              </div>
            </div>
            <ChangePasswordForm primary={primary} />
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ a, primary }: { a: Appointment; primary: string }) {
  const st = STATUS[a.status] ?? { label: a.status, bg: "#f1f5f9", color: "#64748b" };
  const isPast = new Date(a.startAtUtc) < new Date();
  return (
    <div style={{
      background: "var(--surface, #fff)", borderRadius: 14, border: "1px solid #eaecf0",
      padding: "16px 18px", opacity: isPast && a.status !== "Completed" ? 0.7 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text, #101828)" }}>{a.procedureName}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {a.doctorName}
            {a.doctorBranch && <span style={{ opacity: 0.7 }}> · {a.doctorBranch}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span>◷</span>
            <span>{fmtDate(a.startAtUtc)}</span>
          </div>
        </div>
        <span style={{
          padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: st.bg, color: st.color, flexShrink: 0,
        }}>{st.label}</span>
      </div>
      {a.notes && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--surface-2, #f8fafc)", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
          {a.notes}
        </div>
      )}
    </div>
  );
}

function ChangePasswordForm({ primary }: { primary: string }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg,   setMsg]   = useState<{ text: string; ok: boolean } | null>(null);
  const [saving,setSaving]= useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await portalFetch("/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    });
    const d = await res.json();
    setMsg({ text: d.message ?? (res.ok ? "Kaydedildi." : "Hata."), ok: res.ok });
    if (res.ok) { setOldPw(""); setNewPw(""); }
    setSaving(false);
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box",
  };

  return (
    <div style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: "24px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Şifre Değiştir</div>
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Mevcut şifre" required style={inp} />
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Yeni şifre (min. 6 karakter)" required style={inp} />
        {msg && <div style={{ fontSize: 13, fontWeight: 600, padding: "8px 12px", borderRadius: 8, background: msg.ok ? "#f0fdf4" : "#fef3f2", color: msg.ok ? "#166534" : "#b42318" }}>{msg.text}</div>}
        <button type="submit" disabled={saving} style={{ padding: "10px", borderRadius: 10, border: "none", background: saving ? "#94a3b8" : primary, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          {saving ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  );
}
