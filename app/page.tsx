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
    badge: "Aktif Platform",
    desc: "Klinik ve muayenehane süreçlerini uçtan uca dijitalleştiren bulut tabanlı SaaS platform. Randevu yönetimi, hasta takibi, faturalandırma, anket modülleri ve AI destekli arama özelliğiyle kliniğinizin verimliliğini katlayın.",
    features: [
      { icon: "🏥", text: "Çoklu klinik yönetimi" },
      { icon: "🤖", text: "AI destekli hasta arama" },
      { icon: "📊", text: "Anket & analiz modülü" },
      { icon: "🔐", text: "Rol bazlı erişim kontrolü" },
      { icon: "📈", text: "Gerçek zamanlı raporlama" },
    ],
    color: "#3b82f6",
    colorRgb: "59,130,246",
    url: "https://eclinic.xshield.com.tr",
    mockLines: [
      { w: "60%", c: "#3b82f6" }, { w: "85%", c: "#1e3a5f" }, { w: "45%", c: "#1e3a5f" },
      { w: "70%", c: "#1e3a5f" }, { w: "55%", c: "#3b82f6" }, { w: "80%", c: "#1e3a5f" },
    ],
  },
  {
    name: "Signed",
    tagline: "Mail İmza Yönetim Platformu",
    badge: "Aktif Platform",
    desc: "Kurumsal e-posta imzalarını merkezi olarak yönetin. Marka tutarlılığını sağlayın, kampanya imzaları oluşturun ve tüm çalışanların imzalarını tek bir panelden anlık güncelleyin.",
    features: [
      { icon: "✉️", text: "Merkezi imza yönetimi" },
      { icon: "🎨", text: "Marka tutarlılığı" },
      { icon: "📣", text: "Kampanya imzaları" },
      { icon: "🔗", text: "Exchange/Google Workspace" },
      { icon: "📋", text: "Çoklu şablon desteği" },
    ],
    color: "#8b5cf6",
    colorRgb: "139,92,246",
    url: "https://signed.xshield.com.tr",
    mockLines: [
      { w: "75%", c: "#8b5cf6" }, { w: "50%", c: "#2d1b69" }, { w: "90%", c: "#2d1b69" },
      { w: "65%", c: "#8b5cf6" }, { w: "40%", c: "#2d1b69" }, { w: "70%", c: "#2d1b69" },
    ],
  },
  {
    name: "xCut",
    tagline: "Salon Yönetim Platformu",
    badge: "Aktif Platform",
    desc: "Kuaför ve güzellik salonu süreçlerini uçtan uca dijitalleştiren bulut tabanlı SaaS platform. Randevu yönetimi, stilist takibi, müşteri portföyü, finans ve stok modülleriyle salonunuzu bir üst seviyeye taşıyın.",
    features: [
      { icon: "✂️", text: "Randevu & takvim yönetimi" },
      { icon: "👥", text: "Müşteri CRM & takibi" },
      { icon: "💰", text: "Fatura, finans ve stok" },
      { icon: "🌐", text: "Salon web sitesi builder" },
      { icon: "📊", text: "Gerçek zamanlı raporlama" },
    ],
    color: "#7c3aed",
    colorRgb: "124,58,237",
    url: "https://xcut.xshield.com.tr",
    mockLines: [
      { w: "65%", c: "#7c3aed" }, { w: "80%", c: "#2e1065" }, { w: "50%", c: "#2e1065" },
      { w: "75%", c: "#2e1065" }, { w: "60%", c: "#7c3aed" }, { w: "85%", c: "#2e1065" },
    ],
  },
  {
    name: "ShieldSpot",
    tagline: "Misafir İnterneti Hotspot Platformu",
    badge: "Yakında",
    desc: "İşletmenizin misafir Wi-Fi altyapısını profesyonelce yönetin. Özelleştirilebilir captive portal, kullanıcı kimlik doğrulama, bant genişliği yönetimi ve detaylı kullanım raporlarıyla misafir internetini kontrol altına alın.",
    features: [
      { icon: "📡", text: "Özel captive portal tasarımı" },
      { icon: "📱", text: "SMS/sosyal medya doğrulama" },
      { icon: "⚡", text: "Bant genişliği kontrolü" },
      { icon: "📊", text: "Detaylı kullanım raporları" },
      { icon: "🛡️", text: "KVKK uyumlu veri yönetimi" },
    ],
    color: "#06b6d4",
    colorRgb: "6,182,212",
    url: "#iletisim",
    mockLines: [
      { w: "55%", c: "#06b6d4" }, { w: "80%", c: "#0c4a6e" }, { w: "65%", c: "#0c4a6e" },
      { w: "90%", c: "#06b6d4" }, { w: "45%", c: "#0c4a6e" }, { w: "75%", c: "#0c4a6e" },
    ],
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
          <div style={{ textAlign: "center", marginBottom: 64 }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {products.map((p, i) => (
              <div key={p.name} style={{
                borderRadius: 24,
                overflow: "hidden",
                border: `1px solid rgba(${p.colorRgb},0.25)`,
                background: `linear-gradient(135deg, rgba(${p.colorRgb},0.07) 0%, rgba(13,27,46,0.95) 60%)`,
                display: "grid",
                gridTemplateColumns: i % 2 === 0 ? "1fr 1fr" : "1fr 1fr",
                position: "relative",
              }}>
                {/* Glow accent */}
                <div style={{
                  position: "absolute",
                  top: i % 2 === 0 ? "-60px" : "auto",
                  bottom: i % 2 !== 0 ? "-60px" : "auto",
                  left: i % 2 === 0 ? "-60px" : "auto",
                  right: i % 2 !== 0 ? "-60px" : "auto",
                  width: 200, height: 200,
                  background: `radial-gradient(circle, rgba(${p.colorRgb},0.2) 0%, transparent 70%)`,
                  borderRadius: "50%", pointerEvents: "none",
                }} />

                {/* Sol: İçerik */}
                <div style={{ padding: "44px 40px", order: i % 2 === 0 ? 0 : 1, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: 999,
                      background: `rgba(${p.colorRgb},0.15)`,
                      border: `1px solid rgba(${p.colorRgb},0.3)`,
                      fontSize: 11, fontWeight: 700, color: p.color,
                      letterSpacing: "0.8px", textTransform: "uppercase",
                    }}>{p.badge}</span>
                    <span style={{ color: "var(--subtle)", fontSize: 12 }}>{p.tagline}</span>
                  </div>

                  <h3 style={{
                    fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 900,
                    color: "var(--text)", marginBottom: 16, letterSpacing: "-1px", lineHeight: 1.1,
                  }}>
                    {p.name}
                  </h3>

                  <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 28, maxWidth: 420 }}>
                    {p.desc}
                  </p>

                  <a href={p.url} target={p.url.startsWith("http") ? "_blank" : undefined}
                    rel={p.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "13px 28px",
                      background: p.color,
                      borderRadius: 10, color: "#fff", textDecoration: "none",
                      fontSize: 15, fontWeight: 700,
                      boxShadow: `0 6px 28px rgba(${p.colorRgb},0.4)`,
                    }}>
                    Ürünü İncele
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </div>

                {/* Sağ: Mock UI + Özellikler */}
                <div style={{
                  padding: "44px 36px 44px 20px",
                  order: i % 2 === 0 ? 1 : 0,
                  display: "flex", flexDirection: "column", gap: 20,
                }}>
                  {/* Mock app window */}
                  <div style={{
                    background: "rgba(6,13,31,0.8)",
                    borderRadius: 12,
                    border: `1px solid rgba(${p.colorRgb},0.2)`,
                    overflow: "hidden",
                  }}>
                    {/* Titlebar */}
                    <div style={{
                      padding: "10px 14px",
                      background: `rgba(${p.colorRgb},0.1)`,
                      borderBottom: `1px solid rgba(${p.colorRgb},0.15)`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      {["#ef4444","#f59e0b","#22c55e"].map(c => (
                        <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
                      ))}
                      <div style={{
                        flex: 1, height: 18, borderRadius: 4,
                        background: "rgba(255,255,255,0.06)", marginLeft: 8,
                      }} />
                    </div>
                    {/* Content lines */}
                    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {p.mockLines.map((l, idx) => (
                        <div key={idx} style={{
                          height: idx === 0 ? 10 : 7,
                          width: l.w, borderRadius: 4,
                          background: l.c,
                          opacity: idx === 0 ? 1 : 0.6,
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Feature list */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                    {p.features.map((f) => (
                      <div key={f.text} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px",
                        background: `rgba(${p.colorRgb},0.06)`,
                        borderRadius: 8,
                        border: `1px solid rgba(${p.colorRgb},0.12)`,
                      }}>
                        <span style={{ fontSize: 14 }}>{f.icon}</span>
                        <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{f.text}</span>
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
                Kendi geliştirdiğimiz yazılım ürünleri (e-Clinic, Signed, xCut, ShieldSpot) ve yönetilen
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
                    <option>xCut</option>
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
