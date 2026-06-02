"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteActions({
  quoteId,
  quoteNo,
  contactEmail,
  status,
}: {
  quoteId: number;
  quoteNo: string;
  contactEmail: string;
  status: string;
}) {
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [emailTo, setEmailTo]     = useState(contactEmail);
  const [sending, setSending]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [copying, setCopying]     = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const sendEmail = async () => {
    if (!emailTo) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo }),
      });
      if (res.ok) {
        setMsg({ text: "Teklif başarıyla gönderildi!", ok: true });
        setShowEmail(false);
        router.refresh();
      } else {
        setMsg({ text: "Gönderim hatası: " + (await res.text()), ok: false });
      }
    } finally {
      setSending(false);
    }
  };

  const deleteQuote = async () => {
    if (!confirm(`"${quoteNo}" numaralı teklif silinecek. Emin misiniz?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
      router.push("/quotes");
    } finally {
      setDeleting(false);
    }
  };

  const copyQuote = async () => {
    setCopying(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/copy`, { method: "POST" });
      if (!res.ok) throw new Error("Kopyalama başarısız");
      const { id, quote_no } = await res.json();
      setMsg({ text: `${quote_no} olarak kopyalandı — düzenleme sayfasına yönlendiriliyorsunuz…`, ok: true });
      setTimeout(() => router.push(`/quotes/${id}/edit`), 1200);
    } catch {
      setMsg({ text: "Kopyalama sırasında hata oluştu", ok: false });
      setCopying(false);
    }
  };

  const btn: React.CSSProperties = {
    padding: "9px 16px", borderRadius: 8, border: "none",
    fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  };

  return (
    <>
      {msg && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 999,
          padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.ok ? "#16a34a" : "#dc2626", color: "#fff",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 10, fontSize: 16 }}>×</button>
        </div>
      )}

      <button onClick={() => window.print()}
        style={{ ...btn, background: "#0f172a", color: "#fff", border: "1px solid #1e3a5f" }}>
        PDF İndir / Yazdır
      </button>

      <button onClick={() => setShowEmail(!showEmail)}
        style={{ ...btn, background: "#2563eb", color: "#fff" }}>
        E-posta Gönder
      </button>

      <button onClick={copyQuote} disabled={copying}
        style={{ ...btn, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
        {copying ? "Kopyalanıyor…" : "📋 Kopyala"}
      </button>

      <button onClick={deleteQuote} disabled={deleting}
        style={{ ...btn, background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
        {deleting ? "Siliniyor…" : "Sil"}
      </button>

      {showEmail && (
        <>
          <div onClick={() => setShowEmail(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "min(420px,92vw)", zIndex: 401,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Teklif E-posta Gönder</div>
              <button onClick={() => setShowEmail(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--section-title)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                  Alıcı E-posta Adresi
                </label>
                <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="ornek@firma.com"
                  style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5, background: "var(--card2)", borderRadius: 8, padding: "10px 12px" }}>
                Teklif <strong style={{ color: "var(--text-sub)" }}>HTML formatında</strong> gönderilecek. xShield markasıyla hazırlanmış profesyonel e-posta şablonu kullanılır.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowEmail(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  İptal
                </button>
                <button onClick={sendEmail} disabled={sending || !emailTo}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: sending ? "#1d4ed8" : "#2563eb", color: "#fff", fontSize: 13, fontWeight: 700, cursor: sending || !emailTo ? "not-allowed" : "pointer" }}>
                  {sending ? "Gönderiliyor..." : "Gönder"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
