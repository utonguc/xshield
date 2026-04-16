"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { portalFetch, setPortalToken, setPortalClinicId, getPortalToken } from "@/lib/portalApi";

function PortalLoginInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug   = searchParams.get("clinic") ?? "";

  const [mode,       setMode]      = useState<"login" | "register">("login");
  const [clinicId,   setClinicId]  = useState("");
  const [clinicName, setClinicName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1d4ed8");
  const [email,      setEmail]     = useState("");
  const [password,   setPassword]  = useState("");
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (getPortalToken()) router.replace("/portal");
  }, [router]);

  // Resolve clinic from slug
  useEffect(() => {
    if (!clinicSlug) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/ClinicWebsite/by-slug/${encodeURIComponent(clinicSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setClinicId(d.clinicId ?? "");
          setClinicName(d.clinicName ?? "");
          setPrimaryColor(d.primaryColor ?? "#1d4ed8");
          setPortalClinicId(d.clinicId ?? "");
        }
      });
  }, [clinicSlug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!clinicId) { setError("Klinik bulunamadı. URL'yi kontrol edin."); return; }
    setLoading(true);
    try {
      const res = await portalFetch(`/${mode}`, {
        method: "POST",
        body: JSON.stringify({ clinicId, email, password }),
      });
      const d = await res.json();
      if (res.ok) {
        setPortalToken(d.token);
        setPortalClinicId(clinicId);
        router.replace("/portal");
      } else {
        setError(d.message ?? "Hata oluştu.");
      }
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 12,
    border: "1.5px solid #e2e8f0", fontSize: 14,
    outline: "none", boxSizing: "border-box",
    background: "var(--surface, #fff)", color: "var(--text, #0f172a)",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--surface-2, #f8fafc)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--surface, #fff)", borderRadius: 24,
        boxShadow: "0 8px 40px rgba(15,23,42,0.12)",
        border: "1px solid #eaecf0", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "32px 32px 24px",
          background: primaryColor,
          color: "#fff",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{clinicName || "Hasta Portalı"}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            {mode === "login" ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "28px 32px 32px" }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                style={inp}
                onFocus={e => (e.target.style.borderColor = primaryColor)}
                onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-2, #344054)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "En az 6 karakter" : "••••••••"}
                required
                style={inp}
                onFocus={e => (e.target.style.borderColor = primaryColor)}
                onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 13,
                background: "#fef3f2", color: "#b42318", border: "1px solid #fecdca",
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px", borderRadius: 12, border: "none",
                background: loading ? "#94a3b8" : primaryColor,
                color: "#fff", fontWeight: 800, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
              }}
            >
              {loading ? "Lütfen bekleyin..." : (mode === "login" ? "Giriş Yap" : "Hesap Oluştur")}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
            {mode === "login" ? (
              <>
                Hesabınız yok mu?{" "}
                <button onClick={() => { setMode("register"); setError(""); }} style={{ background: "none", border: "none", color: primaryColor, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Kayıt olun
                </button>
              </>
            ) : (
              <>
                Zaten hesabınız var mı?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: primaryColor, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Giriş yapın
                </button>
              </>
            )}
          </div>

          {mode === "register" && (
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 12, color: "#0369a1" }}>
              Kayıt olabilmek için e-postanızın kliniğimizde kayıtlı olması gerekir. Kayıtlı değilseniz lütfen kliniğimizle iletişime geçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Yükleniyor...</div>}>
      <PortalLoginInner />
    </Suspense>
  );
}
