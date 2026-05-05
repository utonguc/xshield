"use client";
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      padding: "60px 0 32px",
    }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 34, height: 34,
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 15, color: "#fff",
              }}>x</div>
              <span style={{ fontWeight: 700, fontSize: 19, color: "var(--text)" }}>
                x<span style={{ color: "var(--blue)" }}>Shield</span>
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.7, maxWidth: 220 }}>
              Teknoloji altyapınızı güçlendiren, işlerinizi geleceğe taşıyan güvenilir IT ortağınız.
            </p>
          </div>

          {/* Hizmetler */}
          <div>
            <h4 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, marginBottom: 16, letterSpacing: "0.5px", textTransform: "uppercase" }}>Hizmetler</h4>
            {["Cloud Sunucu", "Ağ Yönetimi", "Sunucu Yönetimi", "Siber Güvenlik", "Altyapı Hizmetleri", "IT Danışmanlığı"].map(s => (
              <a key={s} href="#hizmetler" style={{ display: "block", color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 14, marginBottom: 8 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>{s}</a>
            ))}
          </div>

          {/* Ürünler */}
          <div>
            <h4 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, marginBottom: 16, letterSpacing: "0.5px", textTransform: "uppercase" }}>Ürünler</h4>
            {[
              { label: "e-Clinic", href: "https://eclinic.xshield.com.tr", external: true },
              { label: "Signed", href: "https://signed.xshield.com.tr", external: true },
              { label: "xCut", href: "https://xcut.xshield.com.tr", external: true },
              { label: "xSignage", href: "https://signage.xshield.com.tr", external: true },
              { label: "ShieldSpot", href: "#urunler", external: false },
            ].map(p => (
              <a key={p.label} href={p.href}
                target={p.external ? "_blank" : undefined}
                rel={p.external ? "noopener noreferrer" : undefined}
                style={{ display: "block", color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 14, marginBottom: 8 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>{p.label}</a>
            ))}
          </div>

          {/* Yasal */}
          <div>
            <h4 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, marginBottom: 16, letterSpacing: "0.5px", textTransform: "uppercase" }}>Yasal</h4>
            {[
              { label: "KVKK Aydınlatma Metni", href: "/kvkk" },
              { label: "Gizlilik Politikası", href: "/gizlilik" },
              { label: "SSS", href: "#sss" },
              { label: "Teklif Süreci", href: "#teklif-sureci" },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ display: "block", color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 14, marginBottom: 8 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>{l.label}</a>
            ))}
          </div>

          {/* İletişim */}
          <div>
            <h4 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, marginBottom: 16, letterSpacing: "0.5px", textTransform: "uppercase" }}>İletişim</h4>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 8 }}>info@xshield.com.tr</p>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 8 }}>xshield.com.tr</p>
            <a href="#iletisim" style={{
              display: "inline-block", marginTop: 8, padding: "8px 18px",
              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 8, color: "var(--blue-light)", textDecoration: "none", fontSize: 13, fontWeight: 600,
            }}>Bize Ulaşın →</a>
          </div>
        </div>

        <div style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13 }}>
            © {year} xShield Teknoloji. Tüm hakları saklıdır.
          </p>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13 }}>
            Türkiye&apos;nin güvenilir IT ortağı
          </p>
        </div>
      </div>
    </footer>
  );
}
