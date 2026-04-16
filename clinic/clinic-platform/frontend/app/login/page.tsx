import LoginForm from "@/components/LoginForm";
import { APP_NAME, APP_VERSION, COMPANY_NAME } from "@/lib/version";

export default function LoginPage() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "var(--login-cols, 1fr 1fr)",
      background: "#f6f7fb",
    }}
      className="login-page"
    >

      {/* Sol panel - marka */}
      <div className="login-brand-panel" style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 52px",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Arka plan dekorasyon */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 320, height: 320, borderRadius: "50%",
          background: "rgba(29,78,216,0.3)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -60, left: -60,
          width: 240, height: 240, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)", pointerEvents: "none",
        }} />

        {/* Logo alanı */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>✚</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.3px" }}>{APP_NAME}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>by {COMPANY_NAME}</div>
            </div>
          </div>
        </div>

        {/* Orta içerik */}
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: 38, fontWeight: 800, lineHeight: 1.2,
            letterSpacing: "-0.5px", marginBottom: 20,
          }}>
            Kliniğinizi<br />akıllıca yönetin.
          </div>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.7, margin: 0, maxWidth: 360 }}>
            Randevular, hastalar, doktorlar ve raporlar — hepsi tek platformda. Multi-klinik desteği ve modüler lisanslama ile büyüyen işinize uyum sağlar.
          </p>

          {/* Özellik listesi */}
          <div style={{ marginTop: 40, display: "grid", gap: 14 }}>
            {[
              { icon: "♥", text: "CRM & Lead Takibi" },
              { icon: "◷", text: "Randevu Takvimi" },
              { icon: "◈", text: "Gelişmiş Raporlama" },
              { icon: "▦", text: "Kişiselleştirilebilir Dashboard" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                }}>{icon}</div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alt bilgi */}
        <div style={{ position: "relative", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          © {new Date().getFullYear()} {COMPANY_NAME} · {APP_NAME} v{APP_VERSION}
        </div>
      </div>

      {/* Sağ panel - form */}
      <div className="login-form-panel" style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 52px",
        background: "#f6f7fb",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text, #101828)", letterSpacing: "-0.5px" }}>
              Hesabınıza giriş yapın
            </h1>
            <p style={{ margin: "10px 0 0", color: "#667085", fontSize: 14 }}>
              Devam etmek için kullanıcı bilgilerinizi girin.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
