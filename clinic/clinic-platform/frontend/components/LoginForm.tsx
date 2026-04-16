"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, setToken } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "E-posta veya şifre hatalı.");
        return;
      }

      setToken(data.accessToken);
      if (data.trialDaysLeft !== null && data.trialDaysLeft !== undefined) {
        localStorage.setItem("trialDaysLeft", String(data.trialDaysLeft));
      } else {
        localStorage.removeItem("trialDaysLeft");
      }
      setMessage("Giriş başarılı, yönlendiriliyor...");
      setTimeout(() => router.push("/dashboard"), 400);
    } catch {
      setIsError(true);
      setMessage("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1.5px solid #e4e7ec",
    fontSize: 16,   // prevents iOS auto-zoom
    color: "var(--text, #101828)",
    background: "var(--surface, #fff)",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
    minHeight: 52,
    WebkitAppearance: "none",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
      {/* E-posta */}
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)" }}>
          E-posta
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="kullanici@klinik-adiniz.com"
          required
          autoComplete="email"
          style={inputBase}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e4e7ec")}
        />
      </div>

      {/* Şifre */}
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)" }}>
          Şifre
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifrenizi girin"
            required
            autoComplete="current-password"
            style={{ ...inputBase, paddingRight: 44 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e4e7ec")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "#667085", fontSize: 16, padding: 2, lineHeight: 1,
            }}
            tabIndex={-1}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      {/* Hata / Başarı mesajı */}
      {message && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          background: isError ? "#fef3f2" : "#f0fdf4",
          color: isError ? "#b42318" : "#15803d",
          border: `1px solid ${isError ? "#fecdca" : "#bbf7d0"}`,
        }}>
          {isError ? "⚠ " : "✓ "}{message}
        </div>
      )}

      {/* Giriş butonu */}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "16px 0",
          border: 0,
          borderRadius: 12,
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: 16,
          minHeight: 56,
          background: loading ? "#93c5fd" : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
          color: "#fff",
          letterSpacing: "0.2px",
          transition: "opacity 0.15s",
          boxShadow: loading ? "none" : "0 2px 8px rgba(29,78,216,0.25)",
        }}
      >
        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
