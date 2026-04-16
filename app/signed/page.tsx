import type { Metadata } from "next";
import Navbar from "@/src/components/SignedNavbar";

export const metadata: Metadata = {
  title: "Signed | Kurumsal Mail İmza Yönetim Platformu — xShield",
  description:
    "Tüm çalışanlarınızın e-posta imzalarını tek panelden yönetin. Marka tutarlılığı, kampanya imzaları, Exchange ve Google Workspace entegrasyonu.",
};

const features = [
  {
    icon: "✉️",
    title: "Merkezi İmza Yönetimi",
    desc: "Tüm çalışanların e-posta imzalarını tek bir admin panelinden anlık olarak güncelleyin. Kullanıcı başına farklı şablonlar atayın.",
  },
  {
    icon: "🎨",
    title: "Sürükle-Bırak Editör",
    desc: "Kod yazmadan profesyonel imza şablonları oluşturun. Logo, banner, sosyal medya ikonları ve kişisel bilgileri kolayca ekleyin.",
  },
  {
    icon: "📣",
    title: "Kampanya İmzaları",
    desc: "Belirli tarih aralıklarında otomatik devreye giren kampanya banner'ları oluşturun. Promosyonlarınızı her e-postada görünür kılın.",
  },
  {
    icon: "🔗",
    title: "Exchange & Google Workspace",
    desc: "Microsoft Exchange, Office 365 ve Google Workspace ile sorunsuz entegrasyon. Sunucu taraflı imza enjeksiyonu sayesinde her cihazda çalışır.",
  },
  {
    icon: "📊",
    title: "Tıklama & Görüntüleme Analitik",
    desc: "İmzanızdaki linklere kaç kişinin tıkladığını, hangi kampanyanın daha çok ilgi gördüğünü detaylı raporlarla takip edin.",
  },
  {
    icon: "🛡️",
    title: "Yasal Disclaimer Yönetimi",
    desc: "Sektöre özgü yasal uyarıları tüm giden e-postalara otomatik olarak ekleyin. KVKK ve GDPR uyumlu şablonlar hazır.",
  },
  {
    icon: "👥",
    title: "Departman & Kural Motoru",
    desc: "Satış ekibine farklı, destek ekibine farklı imza atayın. Kural motoru ile domain, departman veya kullanıcıya göre imza seçimi yapın.",
  },
  {
    icon: "🌐",
    title: "Self-Servis Portal",
    desc: "Çalışanlar fotoğraf ve iletişim bilgilerini self-servis portaldan güncelleyebilir; şablon yapısı ve marka tutarlılığı korunur.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "₺499",
    period: "/ay",
    desc: "Küçük ekipler için",
    features: ["50 kullanıcıya kadar", "5 şablon", "Exchange entegrasyonu", "Temel analitik", "E-posta desteği"],
    color: "#3b82f6",
    highlight: false,
  },
  {
    name: "Business",
    price: "₺1.299",
    period: "/ay",
    desc: "Büyüyen şirketler için",
    features: ["250 kullanıcıya kadar", "Sınırsız şablon", "Exchange + Google Workspace", "Kampanya yönetimi", "Gelişmiş analitik", "Öncelikli destek"],
    color: "#8b5cf6",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Özel",
    period: "",
    desc: "Büyük kurumlar için",
    features: ["Sınırsız kullanıcı", "Özel entegrasyon", "Kural motoru", "SLA garantisi", "Dedicated support", "On-premise seçeneği"],
    color: "#06b6d4",
    highlight: false,
  },
];

const steps = [
  { n: "01", title: "Şablonunuzu Oluşturun", desc: "Sürükle-bırak editörle markanıza uygun imza tasarlayın." },
  { n: "02", title: "Entegrasyonu Yapın", desc: "Exchange veya Google Workspace'i birkaç adımda bağlayın." },
  { n: "03", title: "Kullanıcılara Atayın", desc: "Departman veya kişi bazında şablonları atayın." },
  { n: "04", title: "Otomatik Çalışır", desc: "Her giden e-postaya imza otomatik eklenir, takibini yapın." },
];

export default function SignedPage() {
  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        background: "linear-gradient(160deg, #060d1f 0%, #0d1b2e 50%, #150d2e 100%)",
        position: "relative", overflow: "hidden", paddingTop: 100,
      }}>
        <div style={{
          position: "absolute", top: "10%", right: "5%",
          width: 500, height: 500,
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", left: "0%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <div className="tag" style={{ display: "inline-flex", marginBottom: 24, background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.3)", color: "#a78bfa" }}>
                <span>✉️</span> Mail İmza Yönetim Platformu
              </div>
              <h1 style={{
                fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)", fontWeight: 900,
                lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20, color: "var(--text)",
              }}>
                Kurumsal İmzanızı<br />
                <span style={{
                  background: "linear-gradient(135deg, #a78bfa, #8b5cf6)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>Tek Panelden</span><br />
                Yönetin
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.8, marginBottom: 36, maxWidth: 460 }}>
                Tüm çalışanlarınızın e-posta imzalarını merkezi olarak kontrol edin.
                Marka tutarlılığı, kampanya yönetimi ve detaylı analitik bir arada.
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <a href="#iletisim" style={{
                  padding: "14px 32px",
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  borderRadius: 10, color: "#fff", textDecoration: "none",
                  fontSize: 15, fontWeight: 700,
                  boxShadow: "0 6px 28px rgba(139,92,246,0.4)",
                }}>Demo Talep Et</a>
                <a href="#ozellikler" style={{
                  padding: "14px 32px",
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  borderRadius: 10, color: "#a78bfa", textDecoration: "none",
                  fontSize: 15, fontWeight: 600,
                }}>Özellikleri Gör</a>
              </div>
            </div>

            {/* Mock e-mail preview */}
            <div style={{
              background: "rgba(13,27,46,0.8)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 16, overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1)",
            }}>
              {/* Email client titlebar */}
              <div style={{
                padding: "12px 16px",
                background: "rgba(139,92,246,0.1)",
                borderBottom: "1px solid rgba(139,92,246,0.15)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {["#ef4444","#f59e0b","#22c55e"].map(c => (
                  <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
                ))}
                <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>Yeni E-posta — Outlook</span>
              </div>
              {/* Email content */}
              <div style={{ padding: "24px 20px" }}>
                <div style={{ marginBottom: 16 }}>
                  {[["Kime:", "müşteri@firma.com"], ["Konu:", "Toplantı Talebi — Q2 Planlaması"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <span style={{ color: "var(--subtle)", fontSize: 12, minWidth: 50 }}>{l}</span>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 16 }}>
                  {[80, 95, 70, 55].map((w, i) => (
                    <div key={i} style={{ height: 7, width: `${w}%`, background: "#1e3a5f", borderRadius: 3, marginBottom: 8 }} />
                  ))}
                </div>
                {/* Signature block */}
                <div style={{
                  borderTop: "2px solid #8b5cf6",
                  paddingTop: 14,
                  background: "rgba(139,92,246,0.05)",
                  borderRadius: "0 0 8px 8px",
                  padding: "14px 12px",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0,
                    }}>A</div>
                    <div>
                      <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>Ahmet Yılmaz</div>
                      <div style={{ color: "#a78bfa", fontSize: 11, marginBottom: 4 }}>Satış Müdürü — xShield Teknoloji</div>
                      <div style={{ color: "var(--muted)", fontSize: 11 }}>📞 +90 212 000 00 00 &nbsp;·&nbsp; 🌐 xshield.com.tr</div>
                    </div>
                  </div>
                  {/* Campaign banner */}
                  <div style={{
                    marginTop: 10, padding: "8px 10px",
                    background: "linear-gradient(90deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))",
                    border: "1px solid rgba(139,92,246,0.3)",
                    borderRadius: 6, textAlign: "center",
                  }}>
                    <span style={{ color: "#a78bfa", fontSize: 10, fontWeight: 600 }}>
                      🎯 Yaz Kampanyası — %20 indirim için tıklayın →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR ── */}
      <section className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              4 Adımda Kurulum
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 16 }}>Teknik bilgi gerektirmez, kurulum süresi 30 dakikadan az.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
            {steps.map((s) => (
              <div key={s.n} className="glass-card" style={{ padding: "28px 24px", position: "relative" }}>
                <div style={{
                  fontSize: 36, fontWeight: 900, color: "rgba(139,92,246,0.2)",
                  lineHeight: 1, marginBottom: 12,
                }}>{s.n}</div>
                <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ÖZELLİKLER ── */}
      <section id="ozellikler" className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="tag" style={{ display: "inline-flex", marginBottom: 16, background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.3)", color: "#a78bfa" }}>
              <span>⚡</span> Özellikler
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              İhtiyacınız Olan Her Şey
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
              E-posta imzanızı sadece bir imza olmaktan çıkarın, marka iletişim aracına dönüştürün.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} className="glass-card" style={{ padding: "26px 22px", display: "flex", gap: 16 }}>
                <div style={{
                  width: 46, height: 46, flexShrink: 0,
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>{f.icon}</div>
                <div>
                  <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FİYATLANDIRMA ── */}
      <section id="fiyat" className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="tag" style={{ display: "inline-flex", marginBottom: 16, background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.3)", color: "#a78bfa" }}>
              <span>💎</span> Fiyatlandırma
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              Şeffaf Fiyatlar
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 16 }}>Gizli ücret yok. İhtiyacınıza göre plan seçin.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            {plans.map((p) => (
              <div key={p.name} style={{
                padding: "36px 28px",
                borderRadius: 20,
                background: p.highlight ? `rgba(139,92,246,0.1)` : "rgba(15,32,53,0.8)",
                border: `1px solid ${p.highlight ? "rgba(139,92,246,0.5)" : "var(--border)"}`,
                position: "relative",
              }}>
                {p.highlight && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    padding: "4px 16px", background: "#8b5cf6", borderRadius: 999,
                    fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap",
                  }}>En Popüler</div>
                )}
                <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: "var(--text)" }}>{p.price}</span>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>{p.period}</span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>{p.desc}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ color: "var(--text)", fontSize: 13 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href="#iletisim" style={{
                  display: "block", textAlign: "center", padding: "12px 20px",
                  background: p.highlight ? "#8b5cf6" : "transparent",
                  border: `1px solid ${p.highlight ? "#8b5cf6" : "rgba(139,92,246,0.3)"}`,
                  borderRadius: 9, color: p.highlight ? "#fff" : "#a78bfa",
                  textDecoration: "none", fontSize: 14, fontWeight: 700,
                }}>
                  {p.price === "Özel" ? "Görüşme Talep Et" : "Başlayın"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── İLETİŞİM / DEMO ── */}
      <section id="iletisim" className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              Demo <span style={{
                background: "linear-gradient(135deg, #a78bfa, #8b5cf6)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>Talep Et</span>
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 16 }}>
              Uzmanlarımız size özel sunum yapacak, sorularınızı yanıtlayacak.
            </p>
          </div>
          <div className="glass-card" style={{ padding: "36px 32px" }}>
            <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[["Ad Soyad *", "Ahmet Yılmaz", "text"], ["Firma *", "Şirket A.Ş.", "text"]].map(([l, p, t]) => (
                  <div key={l}>
                    <label style={{ display: "block", color: "var(--muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{l}</label>
                    <input type={t} placeholder={p} style={{
                      width: "100%", padding: "11px 14px",
                      background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
                      borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none",
                    }} />
                  </div>
                ))}
              </div>
              {[["E-posta *", "ahmet@firma.com", "email"], ["Telefon", "+90 5XX XXX XX XX", "tel"]].map(([l, p, t]) => (
                <div key={l}>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{l}</label>
                  <input type={t} placeholder={p} style={{
                    width: "100%", padding: "11px 14px",
                    background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
                    borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none",
                  }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", color: "var(--muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Kaç kullanıcı var?</label>
                <select style={{
                  width: "100%", padding: "11px 14px",
                  background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
                  borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none",
                }}>
                  <option>1-25 kullanıcı</option>
                  <option>26-100 kullanıcı</option>
                  <option>101-500 kullanıcı</option>
                  <option>500+ kullanıcı</option>
                </select>
              </div>
              <button type="submit" style={{
                padding: "14px 28px", marginTop: 4,
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                borderRadius: 9, color: "#fff", border: "none",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 6px 28px rgba(139,92,246,0.4)",
              }}>
                Demo Talep Gönder →
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: "var(--surface)", borderTop: "1px solid var(--border)",
        padding: "32px 0", textAlign: "center",
      }}>
        <div className="container">
          <p style={{ color: "var(--subtle)", fontSize: 13 }}>
            © {new Date().getFullYear()} xShield Teknoloji — Signed &nbsp;·&nbsp;
            <a href="https://xshield.com.tr" style={{ color: "var(--muted)", textDecoration: "none" }}>xshield.com.tr</a>
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          #hero-grid { grid-template-columns: 1fr !important; }
          #plan-grid { grid-template-columns: 1fr !important; }
          form > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
