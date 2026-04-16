"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch, staticUrl } from "@/lib/api";

type Me = {
  userId: string;
  userName: string;
  fullName: string;
  email?: string;
  role?: string;
  clinicName: string;
  profilePhotoUrl?: string;
};

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: "#7c3aed", KlinikYonetici: "#1d4ed8",
  Doktor: "#065f46", Resepsiyon: "#92400e",
  Asistan: "#0e7490", Teknisyen: "#374151",
};

export default function ProfilPage() {
  const [me, setMe]       = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Photo upload
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Password form
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [pwMsg, setPwMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [savingPw, setSavingPw]     = useState(false);

  useEffect(() => {
    apiFetch("/Auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setMe(d);
          setFullName(d.fullName);
          setEmail(d.email ?? "");
          setPhotoPreview(staticUrl(d.profilePhotoUrl) ?? "");
        }
        setLoading(false);
      });
  }, []);

  const uploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    setPhotoMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await apiFetch("/Auth/photo", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    setUploadingPhoto(false);
    if (r.ok) {
      setPhotoPreview(staticUrl(d.profilePhotoUrl) ?? "");
      setMe(prev => prev ? { ...prev, profilePhotoUrl: d.profilePhotoUrl } : null);
      setPhotoMsg({ text: "Fotoğraf güncellendi.", ok: true });
    } else {
      setPhotoMsg({ text: d.message ?? "Yükleme başarısız.", ok: false });
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const r = await apiFetch("/Auth/profile", {
      method: "PUT",
      body: JSON.stringify({ fullName, email }),
    });
    const d = await r.json().catch(() => ({}));
    setSavingProfile(false);
    setProfileMsg({ text: d.message ?? (r.ok ? "Kaydedildi." : "Hata."), ok: r.ok });
    if (r.ok) setMe(prev => prev ? { ...prev, fullName, email } : null);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ text: "Yeni şifreler eşleşmiyor.", ok: false }); return; }
    if (newPw.length < 6)    { setPwMsg({ text: "Şifre en az 6 karakter olmalı.", ok: false }); return; }
    setSavingPw(true);
    setPwMsg(null);
    const r = await apiFetch("/Auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const d = await r.json().catch(() => ({}));
    setSavingPw(false);
    setPwMsg({ text: d.message ?? (r.ok ? "Şifre değiştirildi." : "Hata."), ok: r.ok });
    if (r.ok) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  if (loading) return (
    <AppShell title="Profil">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div style={{ width: 32, height: 32, border: "4px solid #e2e8f0",
          borderTopColor: "#1d4ed8", borderRadius: "50%",
          animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );

  const roleColor = ROLE_COLORS[me?.role ?? ""] ?? "#374151";

  return (
    <AppShell title="Profil" description="Hesap bilgilerinizi görüntüleyin ve güncelleyin">
      <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Avatar card */}
        <div style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: 24,
          display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: roleColor, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, fontWeight: 800, overflow: "hidden",
            }}>
              {photoPreview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (me?.fullName ?? "?").charAt(0).toUpperCase()}
            </div>
            <label style={{
              position: "absolute", bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: "50%",
              background: "#1d4ed8", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, cursor: "pointer", border: "2px solid #fff",
            }}>
              {uploadingPhoto ? "…" : "✎"}
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text, #0f172a)" }}>{me?.fullName}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{me?.userName}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
                background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40`,
              }}>{me?.role ?? "—"}</span>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999,
                background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
              }}>{me?.clinicName}</span>
            </div>
            {photoMsg && (
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600,
                color: photoMsg.ok ? "#166534" : "#b42318" }}>{photoMsg.text}</div>
            )}
          </div>
        </div>

        {/* Profile edit form */}
        <div style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text, #0f172a)", marginBottom: 20 }}>
            Profil Bilgileri
          </div>
          <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>
                Kullanıcı Adı
              </label>
              <input value={me?.userName ?? ""} disabled style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #e4e7ec", fontSize: 13,
                background: "var(--surface-2, #f8fafc)", color: "#98a2b3", boxSizing: "border-box",
              }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>
                Ad Soyad *
              </label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #e4e7ec", fontSize: 13, boxSizing: "border-box",
              }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>
                E-posta
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #e4e7ec", fontSize: 13, boxSizing: "border-box",
              }} />
            </div>

            {profileMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: profileMsg.ok ? "#f0fdf4" : "#fef3f2",
                color: profileMsg.ok ? "#166534" : "#b42318",
                border: `1px solid ${profileMsg.ok ? "#bbf7d0" : "#fecaca"}`,
              }}>{profileMsg.text}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={savingProfile} style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: savingProfile ? "#93c5fd" : "#1d4ed8",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: savingProfile ? "not-allowed" : "pointer",
              }}>
                {savingProfile ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>

        {/* Password change form */}
        <div style={{ background: "var(--surface, #fff)", borderRadius: 16, border: "1px solid #eaecf0", padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text, #0f172a)", marginBottom: 20 }}>
            Şifre Değiştir
          </div>
          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Mevcut Şifre", value: currentPw, onChange: setCurrentPw },
              { label: "Yeni Şifre",   value: newPw,     onChange: setNewPw },
              { label: "Yeni Şifre (Tekrar)", value: confirmPw, onChange: setConfirmPw },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 10,
                      border: "1px solid #e4e7ec", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>
            ))}

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b", cursor: "pointer" }}>
              <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} />
              Şifreleri göster
            </label>

            {pwMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: pwMsg.ok ? "#f0fdf4" : "#fef3f2",
                color: pwMsg.ok ? "#166534" : "#b42318",
                border: `1px solid ${pwMsg.ok ? "#bbf7d0" : "#fecaca"}`,
              }}>{pwMsg.text}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={savingPw} style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: savingPw ? "#93c5fd" : "#0f172a",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: savingPw ? "not-allowed" : "pointer",
              }}>
                {savingPw ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </AppShell>
  );
}
