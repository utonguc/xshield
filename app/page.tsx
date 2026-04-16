import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";

// ── Data ──────────────────────────────────────────────────────────────────────

const services = [
  {
    icon: "☁️",
    title: "Cloud Sunucu",
    desc: "Yüksek performanslı, ölçeklenebilir bulut altyapısı. Kaynaklarınızı anlık olarak büyütün, maliyetlerinizi optimize edin. Veri merkezi bağımsız çözümlerle iş sürekliliğinizi güvence altına alın.",
    tags: ["Yük Dengeleme", "Yedekleme", "7/24 İzleme"],
  },
  {
    icon: "🌐",
    title: "Ağ Yönetimi",
    desc: "Kurumsal ağ tasarımı, yapılandırması ve sürekli yönetimi. Firewall, VPN, VLAN ve SD-WAN teknolojileriyle güvenli ve yüksek hızlı ağ altyapısı kurun.",
    tags: ["Firewall", "VPN", "SD-WAN"],
  },
  {
    icon: "🖥️",
    title: "Sunucu Yönetimi",
    desc: "Fiziksel ve sanal sunucu kurulum, bakım ve proaktif izleme hizmetleri. Güncellemeler, yama yönetimi ve performans optimizasyonu ile sunucularınız her zaman tepe noktada çalışır.",
    tags: ["Linux/Windows", "Sanallaştırma", "Proaktif İzleme"],
  },
  {
    icon: "🛡️",
    title: "Siber Güvenlik",
    desc: "Sızma testleri, güvenlik açığı taramaları ve SOC hizmetleriyle kurumsal varlıklarınızı koruyun. KVKK/GDPR uyumluluk danışmanlığı ve olay müdahale süreçleri dahil.",
    tags: ["Pentest", "SOC", "KVKK Uyumu"],
  },
  {
    icon: "🏗️",
    title: "Altyapı Hizmetleri",
    desc: "Data center tasarımı, kablo altyapısı, UPS sistemleri ve sunucu odası kurulumundan tutun fiziksel güvenlik sistemlerine kadar eksiksiz altyapı yönetimi.",
    tags: ["Data Center", "UPS", "Fiziksel Güvenlik"],
  },
  {
    icon: "💡",
    title: "Yazılım & IT Danışmanlığı",
    desc: "Dijital dönüşüm yol haritası oluşturma, özel yazılım geliştirme, ERP/CRM entegrasyonları ve IT süreç optimizasyonu ile işletmenizi geleceğe hazırlıyoruz.",
    tags: ["Dijital Dönüşüm", "Entegrasyon", "Özel Yazılım"],
  },
];

const products = [
  {
    name: "e-Clinic",
    tagline: "Klinik Yönetim Platformu",
    desc: "Klinik ve muayenehane süreçlerini uçtan uca dijitalleştiren bulut tabanlı SaaS platform. Randevu yönetimi, hasta takibi, faturalandırma, anket modülleri ve AI destekli arama özelliğiyle kliniğinizin verimliliğini katlayın.",
    features: ["Çoklu klinik yönetimi", "AI destekli hasta arama", "Anket & analiz modülü", "Rol bazlı erişim kontrolü", "Gerçek zamanlı raporlama"],
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.08))",
  },
  {
    name: "Signed",
    tagline: "Mail İmza Yönetim Platformu",
    desc: "Kurumsal e-posta imzalarını merkezi olarak yönetin. Marka tutarlılığını sağlayın, kampanya imzaları oluşturun ve tüm çalışanların imzalarını tek bir panelden anlık güncelleyin.",
    features: ["Merkezi imza yönetimi", "Marka tutarlılığı", "Kampanya imzaları", "Exchange/Google Workspace entegrasyonu", "Çoklu şablon desteği"],
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.08))",
  },
  {
    name: "ShieldSpot",
    tagline: "Misafir İnterneti Hotspot Platformu",
    desc: "İşletmenizin misafir Wi-Fi altyapısını profesyonelce yönetin. Özelleştirilebilir captive portal, kullanıcı kimlik doğrulama, bant genişliği yönetimi ve detaylı kullanım raporlarıyla misafir internetini kontrol altına alın.",
    features: ["Özel captive portal tasarımı", "SMS/sosyal medya doğrulama", "Bant genişliği kontrolü", "Detaylı kullanım raporları", "KVKK uyumlu veri yönetimi"],
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.08))",
  },
];

const whyItems = [
  {
    icon: "⚡",
    title: "Hızlı Çözüm Üretimi",
    desc: "Sorunlarınıza en kısa sürede çözüm üretiyoruz. SLA taahhütlü destek hizmetimizle sistem kesintileriniz minimize edilir.",
  },
  {
    icon: "🔐",
    title: "Güvenlik Önce",
    desc: "Her projede güvenlik en önce gelir. Sıfır güven mimarisi ve güvenlik odaklı tasarım prensiplerimizle altyapınız daima korunur.",
  },
  {
    icon: "📈",
    title: "Ölçeklenebilir Altyapı",
    desc: "Bugünün ihtiyaçlarını karşılarken yarının büyümesine de hazırlanıyoruz. Esnek ve ölçeklenebilir çözümler sunarız.",
  },
  {
    icon: "🤝",
    title: "Uzun Vadeli Ortaklık",
    desc: "Proje bittiğinde ilişki bitmiyor; sürekli destek ve proaktif bakımla uzun vadeli teknoloji ortağınız olmayı hedefliyoruz.",
  },
  {
    icon: "📊",
    title: "Şeffaf Raporlama",
    desc: "Her servis için düzenli raporlar, performans metrikleri ve net faturalandırma. Ne yaptığımızı ve neden yaptığımızı her zaman açıklıyoruz.",
  },
  {
    icon: "🇹🇷",
    title: "Yerel Uzmanlık",
    desc: "Türkiye'nin yasal gereklilikleri, KVKK uyumu ve yerel altyapı dinamiklerini bilen bir ekiple çalışıyorsunuz.",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "7/24", label: "Teknik Destek" },
  { value: "< 2sa", label: "Ortalama Yanıt Süresi" },
  { value: "50+", label: "Mutlu Müşteri" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="grid-bg" style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        paddingTop: 100,
      }}>
        {/* Background glow blobs */}
        <div style={{
          position: "absolute", top: "15%", left: "10%",
          width: 500, height: 500,
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "5%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />

        <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div className="tag" style={{ display: "inline-flex", marginBottom: 28 }}>
            <span>🛡️</span> Türkiye&apos;nin Güvenilir IT Ortağı
          </div>

          <h1 style={{
            fontSize: "clamp(2.4rem, 6vw, 4.2rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-1.5px",
            marginBottom: 24,
            color: "var(--text)",
          }}>
            Teknoloji Altyapınızı<br />
            <span className="gradient-text">Güçlendiriyoruz</span>
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "var(--muted)",
            maxWidth: 620,
            margin: "0 auto 40px",
            lineHeight: 1.7,
          }}>
            Cloud, Ağ, Siber Güvenlik, Sunucu Yönetimi ve IT Danışmanlığında uzman ekibimizle
            işletmenizin dijital dönüşümünü hızlandırın.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#hizmetler" style={{
              padding: "14px 32px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              borderRadius: 10, color: "#fff", textDecoration: "none",
              fontSize: 16, fontWeight: 700,
              boxShadow: "0 4px 24px rgba(59,130,246,0.35)",
            }}>Hizmetleri Keşfet</a>
            <a href="#iletisim" style={{
              padding: "14px 32px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 10, color: "var(--blue-light)", textDecoration: "none",
              fontSize: 16, fontWeight: 600,
            }}>Ücretsiz Danışmanlık</a>
          </div>

          {/* Stats strip */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 24,
            maxWidth: 700,
            margin: "72px auto 0",
            padding: "32px 36px",
            background: "rgba(13,27,46,0.7)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            backdropFilter: "blur(12px)",
          }}>
            {stats.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div className="gradient-text" style={{ fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HİZMETLER ───────────────────────────────────────────────────────── */}
      <section id="hizmetler" className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div className="tag" style={{ display: "inline-flex", marginBottom: 16 }}>
              <span>⚙️</span> Hizmetlerimiz
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
              Uçtan Uca IT Çözümleri
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 520, margin: "0 auto" }}>
              İşletmenizin tüm teknoloji ihtiyaçlarını tek çatı altında karşılıyoruz.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {services.map((s) => (
              <div key={s.title} className="glass-card" style={{ padding: "32px 28px" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{s.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.75, marginBottom: 20 }}>{s.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {s.tags.map((t) => (
                    <span key={t} style={{
                      padding: "4px 12px",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 999,
                      fontSize: 12, fontWeight: 600, color: "var(--blue-light)",
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ÜRÜNLER ─────────────────────────────────────────────────────────── */}
      <section id="urunler" className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div className="tag" style={{ display: "inline-flex", marginBottom: 16 }}>
              <span>🚀</span> Yazılım Ürünlerimiz
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
              Sektöre Özel SaaS Platformlar
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 540, margin: "0 auto" }}>
              Kendi iş süreçlerimizden doğan, gerçek problemleri çözen hazır yazılım ürünleri.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {products.map((p, i) => (
              <div key={p.name} className="neon-border" style={{
                padding: "40px 36px",
                borderRadius: 20,
                background: p.gradient,
                display: "grid",
                gridTemplateColumns: i % 2 === 0 ? "1.4fr 1fr" : "1fr 1.4fr",
                gap: 40,
                alignItems: "center",
              }}>
                <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: p.color, letterSpacing: "1px", textTransform: "uppercase" }}>
                    {p.tagline}
                  </span>
                  <h3 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "var(--text)", margin: "10px 0 16px", letterSpacing: "-0.5px" }}>
                    {p.name}
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>{p.desc}</p>
                  <a href="#iletisim" style={{
                    display: "inline-block", padding: "11px 26px",
                    background: p.color, borderRadius: 9,
                    color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700,
                    boxShadow: `0 4px 20px ${p.color}44`,
                  }}>Demo Talep Et</a>
                </div>

                <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
                  <div style={{
                    padding: "28px 24px",
                    background: "rgba(6,13,31,0.6)",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(8px)",
                  }}>
                    <p style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>
                      Öne Çıkan Özellikler
                    </p>
                    {p.features.map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: p.color, flexShrink: 0,
                        }} />
                        <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 500 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HAKKIMIZDA ──────────────────────────────────────────────────────── */}
      <section id="hakkimizda" className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <div className="tag" style={{ display: "inline-flex", marginBottom: 20 }}>
                <span>🏢</span> Hakkımızda
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", marginBottom: 20, lineHeight: 1.2 }}>
                Teknoloji ile İş Dünyasını<br />
                <span className="gradient-text">Buluşturuyoruz</span>
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>
                xShield, Türkiye&apos;de kurumsal IT altyapısı, siber güvenlik ve yazılım geliştirme alanlarında
                hizmet veren bir teknoloji firmasıdır. Deneyimli mühendis ve danışman kadromuzla küçük
                ölçekli işletmelerden büyük kurumsal yapılara kadar kapsamlı çözümler sunuyoruz.
              </p>
              <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
                Kendi geliştirdiğimiz yazılım ürünleri (e-Clinic, Signed, ShieldSpot) ve yönetilen
                hizmet modelimizle müşterilerimizin teknoloji yükünü üstleniyor, onların asıl işlerine
                odaklanmalarını sağlıyoruz.
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <a href="#iletisim" style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                  borderRadius: 9, color: "#fff", textDecoration: "none",
                  fontSize: 14, fontWeight: 700,
                }}>Ekibimizle Tanışın</a>
                <a href="#hizmetler" style={{
                  padding: "12px 28px",
                  background: "transparent",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: 9, color: "var(--blue-light)", textDecoration: "none",
                  fontSize: 14, fontWeight: 600,
                }}>Hizmetleri İncele</a>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { icon: "🌍", title: "Uzaktan & Yerinde", desc: "Türkiye genelinde uzaktan ve sahadaki ekibimizle yerinde destek sağlıyoruz." },
                { icon: "📋", title: "SLA Taahhütlü", desc: "Her hizmet paketi için net SLA taahhütleri ve performans garantisi." },
                { icon: "🔄", title: "7/24 Destek", desc: "Kritik sistemler için kesintisiz izleme ve acil müdahale hizmeti." },
                { icon: "🎯", title: "Sektör Uzmanı", desc: "Sağlık, finans, perakende ve kamu sektörlerinde derin deneyim." },
              ].map((item) => (
                <div key={item.title} className="glass-card" style={{ padding: "24px 20px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                  <h4 style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{item.title}</h4>
                  <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NEDEN xSHIELD ───────────────────────────────────────────────────── */}
      <section id="neden" className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div className="tag" style={{ display: "inline-flex", marginBottom: 16 }}>
              <span>✅</span> Neden xShield
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
              Farkımızı Hissedeceksiniz
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 500, margin: "0 auto" }}>
              Sadece teknik çözüm değil, uzun vadeli iş ortağı arıyorsanız doğru yerdesiniz.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {whyItems.map((w) => (
              <div key={w.title} className="glass-card" style={{ padding: "28px 24px", display: "flex", gap: 20 }}>
                <div style={{
                  width: 52, height: 52, flexShrink: 0,
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>{w.icon}</div>
                <div>
                  <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{w.title}</h3>
                  <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section className="section" style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.1) 100%)",
        borderTop: "1px solid rgba(59,130,246,0.2)",
        borderBottom: "1px solid rgba(59,130,246,0.2)",
      }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
            Altyapınız İçin <span className="gradient-text">Ücretsiz Analiz</span> Yapıyoruz
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Mevcut IT altyapınızı inceliyor, iyileştirme fırsatlarını ve güvenlik açıklarını raporluyoruz.
            Tamamen ücretsiz, taahhütsüz.
          </p>
          <a href="#iletisim" style={{
            display: "inline-block", padding: "16px 40px",
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            borderRadius: 10, color: "#fff", textDecoration: "none",
            fontSize: 17, fontWeight: 700,
            boxShadow: "0 6px 30px rgba(59,130,246,0.4)",
          }}>Ücretsiz Analiz Talep Et</a>
        </div>
      </section>

      {/* ── İLETİŞİM ────────────────────────────────────────────────────────── */}
      <section id="iletisim" className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
            <div>
              <div className="tag" style={{ display: "inline-flex", marginBottom: 20 }}>
                <span>📬</span> İletişim
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", marginBottom: 20, lineHeight: 1.2 }}>
                Projenizi<br />
                <span className="gradient-text">Birlikte Konuşalım</span>
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 36 }}>
                Bir sorunuz mu var, teklif mi almak istiyorsunuz ya da mevcut altyapınız hakkında fikir mi
                almak istiyorsunuz? Formu doldurun, en kısa sürede dönelim.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { icon: "✉️", label: "E-posta", value: "info@xshield.com.tr" },
                  { icon: "🌐", label: "Web", value: "xshield.com.tr" },
                  { icon: "🕐", label: "Çalışma Saatleri", value: "Hafta içi 09:00 – 18:00 (Acil destek 7/24)" },
                ].map((c) => (
                  <div key={c.label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{
                      width: 40, height: 40, flexShrink: 0,
                      background: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18,
                    }}>{c.icon}</div>
                    <div>
                      <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</div>
                      <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 500, marginTop: 2 }}>{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ padding: "36px 32px" }}>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Bize Yazın</h3>
              <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", color: "var(--muted)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ad Soyad *</label>
                    <input type="text" placeholder="Ahmet Yılmaz" style={{
                      width: "100%", padding: "11px 14px",
                      background: "rgba(59,130,246,0.06)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 8, color: "var(--text)", fontSize: 14,
                      outline: "none",
                    }} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "var(--muted)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Firma</label>
                    <input type="text" placeholder="Şirket A.Ş." style={{
                      width: "100%", padding: "11px 14px",
                      background: "rgba(59,130,246,0.06)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 8, color: "var(--text)", fontSize: 14,
                      outline: "none",
                    }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>E-posta *</label>
                  <input type="email" placeholder="ahmet@firma.com" style={{
                    width: "100%", padding: "11px 14px",
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 8, color: "var(--text)", fontSize: 14,
                    outline: "none",
                  }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>İlgilendiğiniz Hizmet</label>
                  <select style={{
                    width: "100%", padding: "11px 14px",
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 8, color: "var(--text)", fontSize: 14,
                    outline: "none",
                  }}>
                    <option value="">Seçiniz...</option>
                    <option>Cloud Sunucu</option>
                    <option>Ağ Yönetimi</option>
                    <option>Sunucu Yönetimi</option>
                    <option>Siber Güvenlik</option>
                    <option>Altyapı Hizmetleri</option>
                    <option>IT Danışmanlığı</option>
                    <option>e-Clinic</option>
                    <option>Signed</option>
                    <option>ShieldSpot</option>
                    <option>Diğer</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--muted)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Mesajınız *</label>
                  <textarea placeholder="Projeniz veya ihtiyacınız hakkında kısaca bilgi verin..." rows={4} style={{
                    width: "100%", padding: "11px 14px",
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 8, color: "var(--text)", fontSize: 14,
                    outline: "none", resize: "vertical",
                  }} />
                </div>
                <button type="submit" style={{
                  padding: "13px 28px",
                  background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                  borderRadius: 9, color: "#fff", border: "none",
                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
                }}>
                  Gönder →
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 768px) {
          #hakkimizda .container > div,
          #iletisim .container > div {
            grid-template-columns: 1fr !important;
          }
          #urunler .neon-border {
            grid-template-columns: 1fr !important;
          }
          #urunler .neon-border > div {
            order: unset !important;
          }
        }
      `}</style>
    </>
  );
}
