"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";

// ─── Data ─────────────────────────────────────────────────────────────────────

const services = [
  { num: "01", icon: "☁️", title: "Cloud Sunucu", color: "#3b82f6", rgb: "59,130,246",
    desc: "Yüksek performanslı, ölçeklenebilir bulut altyapısı. Kaynaklarınızı anlık büyütün, maliyetlerinizi optimize edin.",
    tags: ["Yük Dengeleme", "Otomatik Yedekleme", "7/24 İzleme"] },
  { num: "02", icon: "🌐", title: "Ağ Yönetimi", color: "#06b6d4", rgb: "6,182,212",
    desc: "Kurumsal ağ tasarımı, yapılandırması ve sürekli yönetimi. Firewall, VPN, SD-WAN teknolojileriyle güvenli altyapı.",
    tags: ["Firewall", "VPN & SD-WAN", "VLAN Segmentasyonu"] },
  { num: "03", icon: "🖥️", title: "Sunucu Yönetimi", color: "#8b5cf6", rgb: "139,92,246",
    desc: "Fiziksel ve sanal sunucu kurulum, bakım ve proaktif izleme. Yama yönetimi ve performans optimizasyonu.",
    tags: ["Linux / Windows", "Sanallaştırma", "Proaktif İzleme"] },
  { num: "04", icon: "🛡️", title: "Siber Güvenlik", color: "#ef4444", rgb: "239,68,68",
    desc: "Sızma testleri, güvenlik açığı taramaları ve SOC hizmetleriyle kurumsal varlıklarınızı koruyun.",
    tags: ["Pentest", "SOC Hizmetleri", "KVKK Uyumu"] },
  { num: "05", icon: "🏗️", title: "Altyapı Hizmetleri", color: "#f59e0b", rgb: "245,158,11",
    desc: "Data center tasarımı, kablo altyapısı, UPS sistemleri ve sunucu odası kurulumundan güvenliğe.",
    tags: ["Data Center", "UPS Sistemleri", "Fiziksel Güvenlik"] },
  { num: "06", icon: "💡", title: "IT Danışmanlığı", color: "#22c55e", rgb: "34,197,94",
    desc: "Dijital dönüşüm yol haritası, özel yazılım geliştirme, ERP/CRM entegrasyonları ve IT süreç optimizasyonu.",
    tags: ["Dijital Dönüşüm", "ERP/CRM", "Özel Yazılım"] },
];

const products = [
  { name: "e-Clinic", tagline: "Klinik Yönetim Platformu", badge: "Aktif",
    desc: "Klinik ve muayenehane süreçlerini uçtan uca dijitalleştiren bulut tabanlı SaaS. Randevu yönetiminden faturalandırmaya, hasta takibinden WhatsApp bildirimine kadar her şey tek platformda.",
    features: ["Randevu & Takvim Yönetimi", "Hasta Kayıt & Takip", "E-Fatura & Ödeme", "WhatsApp Entegrasyonu", "AI Destekli Arama", "Çoklu Klinik Desteği"],
    color: "#3b82f6", rgb: "59,130,246", url: "https://eclinic.xshield.com.tr" },
  { name: "Signed", tagline: "Mail İmza Yönetim Platformu", badge: "Aktif",
    desc: "Kurumsal e-posta imzalarını merkezi panelden yönetin. Tüm çalışanların imzalarını tek seferinde güncelleyin, kampanya imzaları oluşturun, marka tutarlılığını sağlayın.",
    features: ["Merkezi İmza Yönetimi", "Kampanya İmzaları", "Active Directory Entegrasyon", "Çoklu Domain Desteği", "Anlık Güncelleme", "Detaylı Raporlama"],
    color: "#8b5cf6", rgb: "139,92,246", url: "https://signed.xshield.com.tr" },
  { name: "xCut", tagline: "Salon Yönetim Platformu", badge: "Aktif",
    desc: "Kuaför ve güzellik salonu süreçlerini uçtan uca dijitalleştiren SaaS. Randevu, stilist takibi, müşteri portföyü, finans, stok yönetimi ve salon web sitesi tek platformda.",
    features: ["Online Randevu Sistemi", "Stilist & Personel Takibi", "Müşteri CRM", "Finans & Kasa", "Stok Yönetimi", "Salon Web Sitesi"],
    color: "#7c3aed", rgb: "124,58,237", url: "https://xcut.xshield.com.tr" },
  { name: "xSignage", tagline: "Dijital Tabela Yönetimi", badge: "Aktif",
    desc: "Tüm dijital ekranlarınızı tek panelden yönetin. Playlist ve medya yönetimi, Raspberry Pi'ye anlık push, WebSocket ile gerçek zamanlı izleme.",
    features: ["Çoklu Ekran Yönetimi", "Medya & Playlist", "Anlık Push (WebSocket)", "Raspberry Pi Desteği", "Gerçek Zamanlı İzleme", "Zamanlanmış Yayın"],
    color: "#0ea5e9", rgb: "14,165,233", url: "https://signage.xshield.com.tr" },
  { name: "ShieldSpot", tagline: "Misafir Wi-Fi Hotspot Platformu", badge: "Yakında",
    desc: "İşletmenizin misafir Wi-Fi altyapısını profesyonelce yönetin. Captive portal, kimlik doğrulama, bant genişliği yönetimi ve KVKK uyumlu kayıt sistemi.",
    features: ["Captive Portal", "Sosyal Medya Login", "Bant Genişliği Yönetimi", "KVKK Uyumlu Kayıt", "Analitik Raporlama", "Çoklu Lokasyon"],
    color: "#06b6d4", rgb: "6,182,212", url: "#iletisim" },
];

const techPartners = [
  "Microsoft Azure", "Amazon AWS", "Google Cloud", "Cisco", "Fortinet", "MikroTik",
  "VMware vSphere", "Proxmox", "Docker", "Kubernetes", "Zabbix", "Grafana",
  "Prometheus", "Veeam Backup", "Palo Alto", "Sophos", "Ubuntu", "Windows Server",
  "Elastic Stack", "DigitalOcean", "Hetzner", "Datadog", "Acronis", "MinIO",
];

const whyItems = [
  { icon: "⚡", title: "SLA Garantili Hız", desc: "SLA taahhütlü destek hizmetimizle kritik sistem kesintileriniz minimize edilir." },
  { icon: "🔐", title: "Güvenlik Önce", desc: "Sıfır güven mimarisi ve güvenlik odaklı tasarım prensiplerimizle altyapınız daima korunur." },
  { icon: "📈", title: "Ölçeklenebilir Altyapı", desc: "Bugünün ihtiyaçlarını karşılarken yarının büyümesine de hazırlanıyoruz." },
  { icon: "🤝", title: "Uzun Vadeli Ortaklık", desc: "Proje bittiğinde ilişki bitmiyor. Proaktif bakımla uzun vadeli teknoloji ortağınız oluyoruz." },
  { icon: "📊", title: "Şeffaf Raporlama", desc: "Düzenli raporlar, performans metrikleri ve net faturalandırma. Her zaman açık ve şeffafız." },
  { icon: "🇹🇷", title: "Yerel Uzmanlık", desc: "KVKK uyumu ve yerel altyapı dinamiklerini bilen, Türkiye'de kurulu bir ekiple çalışıyorsunuz." },
];

const processSteps = [
  { num: "01", icon: "📋", title: "Başvuru", desc: "İletişim formunu doldurun veya e-posta atın. Size özel bir proje yöneticisi atanır." },
  { num: "02", icon: "🔍", title: "Ücretsiz Analiz", desc: "Mevcut altyapınızı inceleriz, iyileştirme fırsatlarını ve güvenlik açıklarını raporlarız." },
  { num: "03", icon: "📄", title: "Özel Teklif", desc: "İhtiyaçlarınıza özel, şeffaf fiyatlı bir teklif hazırlarız. Gizli maliyet yoktur." },
  { num: "04", icon: "🚀", title: "Hızlı Başlangıç", desc: "Onay sonrası en hızlı şekilde projeyi hayata geçiriyoruz. Geçiş sürecinde yanınızdayız." },
];

const faqItems = [
  { q: "xShield hangi şehirlerde hizmet veriyor?",
    a: "Türkiye genelinde uzaktan destek hizmeti sunuyoruz. Büyük şehirlerde yerinde (on-site) destek de sağlıyoruz. Uzaktan çözülemeyen kritik müdahaleler için yerinde ekip gönderebiliyoruz." },
  { q: "Hizmetleriniz için nasıl teklif alabilirim?",
    a: "İletişim formunu doldurabilir, info@xshield.com.tr adresine e-posta gönderebilir veya doğrudan ulaşabilirsiniz. İlk görüşme ve altyapı analizi tamamen ücretsizdir." },
  { q: "SaaS ürünlerinizi (e-Clinic, xCut vb.) nasıl deneyebilirim?",
    a: "Tüm SaaS ürünlerimiz için ücretsiz demo hesabı açabilirsiniz. Demo talebi için ürünün web sitesindeki formu doldurmanız veya bizimle iletişime geçmeniz yeterlidir." },
  { q: "Veri güvenliğini nasıl sağlıyorsunuz?",
    a: "Tüm veriler Türkiye'deki sunucularda, şifreli olarak saklanır. KVKK uyumluluğu standart paketlerimizin bir parçasıdır. Düzenli güvenlik denetimleri yapılmaktadır." },
  { q: "Mevcut altyapımı taşıyabilir misiniz?",
    a: "Evet. Migration hizmetimiz mevcuttur. Mevcut altyapınızı analiz ederek kesintisiz geçiş planı hazırlar, tüm süreçte yanınızda oluruz." },
  { q: "Acil destek saatleriniz neler?",
    a: "Kritik sistem kesintileri için 7/24 acil destek hattımız mevcuttur. Standart iş günü destek saatleri hafta içi 09:00–18:00 olup acil müdahale SLA'mız 2 saattir." },
  { q: "SLA şartlarınız neler?",
    a: "%99,9 uptime garantisi veriyoruz. Olası kesintilerde SLA'ya uygun tazminat mekanizmamız işler. Detaylı SLA koşulları sözleşmede yer alır ve müşteriye özel düzenlenebilir." },
  { q: "Şikayet ve reklamasyon süreciniz nasıl işliyor?",
    a: "Şikayetlerinizi info@xshield.com.tr adresine iletebilirsiniz. 24 saat içinde yanıt, 72 saat içinde çözüm hedefliyoruz. Çözüme kavuşmayan durumlar yönetim kademesine eskalasyon ile ele alınır." },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("sr-v");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );
    document.querySelectorAll(".sr").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function ha(delay: number): React.CSSProperties {
  return { animation: `heroReveal 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s both` };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeProduct, setActiveProduct] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useScrollReveal();

  const handleMouse = useCallback((e: MouseEvent) => {
    if (!orbRef.current) return;
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    orbRef.current.style.left = `calc(${x * 80}% - 350px)`;
    orbRef.current.style.top  = `calc(${y * 80}% - 350px)`;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [handleMouse]);

  const P = products[activeProduct];

  return (
    <>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100dvh", display: "flex", alignItems: "center", overflow: "hidden", background: "#030508" }}>
        <div ref={orbRef} style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)", left: "calc(50% - 350px)", top: "calc(40% - 350px)", transition: "left 1.4s cubic-bezier(.25,.46,.45,.94), top 1.4s cubic-bezier(.25,.46,.45,.94)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)", pointerEvents: "none" }} />

        <div className="wrap" style={{ position: "relative", zIndex: 1, paddingTop: 140, paddingBottom: 100 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 40, ...ha(0.1) }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 999, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "1px", textTransform: "uppercase" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px #3b82f6", display: "inline-block" }} />
              Türkiye&apos;nin Güvenilir IT Ortağı
            </span>
          </div>

          <h1 style={{ margin: 0, lineHeight: 0.93, letterSpacing: "-4px", fontWeight: 900, fontSize: "clamp(3.8rem, 9vw, 8.5rem)", color: "#fff" }}>
            <span style={{ display: "block", ...ha(0.2) }}>Teknoloji</span>
            <span style={{ display: "block", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...ha(0.35) }}>Altyapınızı</span>
            <span style={{ display: "block", ...ha(0.5) }}>Güçlendiriyoruz.</span>
          </h1>

          <p style={{ marginTop: 44, fontSize: "clamp(1rem, 1.8vw, 1.2rem)", color: "rgba(255,255,255,0.45)", maxWidth: 540, lineHeight: 1.85, ...ha(0.65) }}>
            Cloud, Ağ, Siber Güvenlik ve IT Danışmanlığında uzman ekibimizle altyapınızı yönetiyoruz — kendi SaaS ürünlerimizle de işletmenizi dijitalleştiriyoruz.
          </p>

          <div style={{ display: "flex", gap: 14, marginTop: 48, flexWrap: "wrap", ...ha(0.78) }}>
            <a href="#hizmetler" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 36px", background: "linear-gradient(135deg, #3b82f6, #06b6d4)", borderRadius: 12, color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 700, boxShadow: "0 0 40px rgba(59,130,246,0.4)" }}>
              Hizmetleri İncele
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href="#iletisim" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 15, fontWeight: 600 }}>
              Ücretsiz Analiz Al
            </a>
          </div>

          <div className="hero-stats" style={{ ...ha(0.9) }}>
            {[
              { v: "99.9%", l: "Uptime SLA" },
              { v: "7/24",  l: "Teknik Destek" },
              { v: "<2sa",  l: "Yanıt Süresi" },
              { v: "50+",   l: "Mutlu Müşteri" },
            ].map((s, i) => (
              <div key={s.l} className="stat-item" style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <div style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-2px", color: "#fff", lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8, fontWeight: 600, letterSpacing: "0.3px" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HİZMETLER ────────────────────────────────────────────────────────── */}
      <section id="hizmetler" style={{ padding: "180px 0", background: "#060a14" }}>
        <div className="wrap">
          <div style={{ marginBottom: 80 }}>
            <div className="sr sec-tag" style={{ color: "#3b82f6" }}>Hizmetlerimiz</div>
            <h2 className="sr sec-h2" data-d="1">Uçtan Uca<br /><span style={{ color: "rgba(255,255,255,0.2)" }}>IT Çözümleri</span></h2>
          </div>
          <div className="services-grid">
            {services.map((s, i) => (
              <div key={s.title} className="sr service-card" data-d={String((i % 3) + 1)} style={{ "--accent": s.color, "--rgb": s.rgb } as React.CSSProperties}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 3, height: "100%", background: `linear-gradient(to bottom, ${s.color}, transparent)` }} />
                <div style={{ fontSize: 11, fontWeight: 800, color: s.color, letterSpacing: "2px", marginBottom: 20, textTransform: "uppercase" }}>{s.num}</div>
                <div style={{ fontSize: 30, marginBottom: 18 }}>{s.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.5px" }}>{s.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, lineHeight: 1.85, marginBottom: 24 }}>{s.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.tags.map(t => (
                    <span key={t} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: `rgba(${s.rgb},0.1)`, border: `1px solid rgba(${s.rgb},0.2)`, color: s.color }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ÜRÜNLER ──────────────────────────────────────────────────────────── */}
      <section id="urunler" style={{ padding: "180px 0", background: "#030508" }}>
        <div className="wrap">
          <div style={{ marginBottom: 72 }}>
            <div className="sr sec-tag" style={{ color: "#8b5cf6" }}>SaaS Ürünlerimiz</div>
            <h2 className="sr sec-h2" data-d="1">Kendi Geliştirdiğimiz<br /><span style={{ color: "rgba(255,255,255,0.2)" }}>Dijital Platformlar</span></h2>
          </div>

          <div className="sr product-shell" data-d="2">
            {/* Tab list */}
            <div className="product-tabs">
              {products.map((p, i) => (
                <button key={p.name} onClick={() => setActiveProduct(i)} className={`ptab${activeProduct === i ? " ptab-active" : ""}`} style={{ "--c": p.color, "--rgb": p.rgb } as React.CSSProperties}>
                  <div>
                    <div className="ptab-name">{p.name}</div>
                    <div className="ptab-line">{p.tagline}</div>
                  </div>
                  {p.badge === "Yakında" && <span className="badge-sm" style={{ background: `rgba(${p.rgb},0.15)`, color: p.color }}>Yakında</span>}
                </button>
              ))}
            </div>

            {/* Panels — CSS attribute selector switches visibility, zero JS inline style */}
            <div className="product-panels" data-tab={String(activeProduct)}>
              {products.map((p, i) => (
                <div key={p.name} className={`ppanel ppanel-${i}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                    <span style={{ padding: "4px 12px", borderRadius: 999, background: `rgba(${p.rgb},0.15)`, border: `1px solid rgba(${p.rgb},0.3)`, fontSize: 10, fontWeight: 800, color: p.color, letterSpacing: "2px", textTransform: "uppercase" }}>{p.badge}</span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>{p.tagline}</span>
                  </div>
                  <h3 style={{ fontSize: "clamp(3rem, 5vw, 5.5rem)", fontWeight: 900, letterSpacing: "-3px", color: "#fff", lineHeight: 0.9, marginBottom: 28 }}>{p.name}</h3>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.9, maxWidth: 500, marginBottom: 40 }}>{p.desc}</p>
                  <div className="feature-grid" style={{ marginBottom: 44 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `rgba(${p.rgb},0.12)`, border: `1px solid rgba(${p.rgb},0.3)`, fontSize: 9, color: p.color }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                  <a href={p.url} target={p.url.startsWith("http") ? "_blank" : undefined} rel={p.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", background: p.color, borderRadius: 10, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, boxShadow: `0 8px 32px rgba(${p.rgb},0.3)` }}>
                    {p.badge === "Yakında" ? "Erken Erişim Talep Et" : "Ürünü İncele"}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TEKNOLOJİ PARTNERLERİ ───────────────────────────────────────────── */}
      <section style={{ padding: "90px 0", background: "#060a14", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="sr sec-tag" style={{ color: "rgba(255,255,255,0.25)", display: "inline-block" }}>Güvendiğimiz Teknolojiler</div>
        </div>
        <div style={{ display: "flex", overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 16, flexShrink: 0, animation: "marquee 55s linear infinite", paddingRight: 16 }}>
            {[...techPartners, ...techPartners].map((t, i) => (
              <span key={i} style={{ whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.22)", padding: "8px 20px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 999 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEDEN xSHIELD ────────────────────────────────────────────────────── */}
      <section id="neden" style={{ padding: "180px 0", background: "#030508" }}>
        <div className="wrap">
          <div style={{ marginBottom: 80 }}>
            <div className="sr sec-tag" style={{ color: "#22c55e" }}>Neden xShield</div>
            <h2 className="sr sec-h2" data-d="1">Fark Yaratan<br /><span style={{ color: "rgba(255,255,255,0.2)" }}>IT Deneyimi</span></h2>
          </div>
          <div className="why-grid">
            {whyItems.map((w, i) => (
              <div key={w.title} className="sr why-card" data-d={String((i % 3) + 1)}>
                <div style={{ fontSize: 28, marginBottom: 18 }}>{w.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.3px" }}>{w.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", lineHeight: 1.85 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEKLİF SÜRECİ ────────────────────────────────────────────────────── */}
      <section id="teklif-sureci" style={{ padding: "180px 0", background: "#060a14" }}>
        <div className="wrap">
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <div className="sr sec-tag" style={{ color: "#3b82f6", textAlign: "center" }}>Teklif Süreci</div>
            <h2 className="sr sec-h2" data-d="1" style={{ textAlign: "center" }}>4 Adımda<br /><span style={{ color: "rgba(255,255,255,0.2)" }}>Çözüme Kavuşun</span></h2>
          </div>
          <div className="process-grid">
            {processSteps.map((s, i) => (
              <div key={s.num} className="sr" data-d={String(i + 1)} style={{ textAlign: "center", padding: "0 24px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", fontSize: 26 }}>{s.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", letterSpacing: "2px", marginBottom: 10, textTransform: "uppercase" }}>{s.num}</div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: "#fff", marginBottom: 14, letterSpacing: "-0.4px" }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", lineHeight: 1.85 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HAKKIMIZDA ───────────────────────────────────────────────────────── */}
      <section id="hakkimizda" style={{ padding: "180px 0", background: "#030508" }}>
        <div className="wrap">
          <div className="about-grid">
            <div>
              <div className="sr sec-tag" style={{ color: "#06b6d4" }}>Hakkımızda</div>
              <h2 className="sr" data-d="1" style={{ fontSize: "clamp(2.2rem, 4vw, 3.8rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, marginTop: 16, marginBottom: 28, color: "#fff" }}>
                Teknoloji ile<br />İş Dünyasını<br />
                <span style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Buluşturuyoruz</span>
              </h2>
              <p className="sr" data-d="2" style={{ color: "rgba(255,255,255,0.42)", fontSize: 15, lineHeight: 1.95, marginBottom: 16 }}>
                xShield, Türkiye&apos;de kurumsal IT altyapısı, siber güvenlik ve yazılım geliştirme alanlarında hizmet veren bir teknoloji firmasıdır.
              </p>
              <p className="sr" data-d="3" style={{ color: "rgba(255,255,255,0.42)", fontSize: 15, lineHeight: 1.95, marginBottom: 48 }}>
                Kendi geliştirdiğimiz SaaS ürünleri ve yönetilen hizmet modelimizle müşterilerimizin teknoloji yükünü üstleniyoruz. Projeler bittiğinde değil, uzun vadede yanınızdayız.
              </p>
              <div className="sr" data-d="4" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <a href="#iletisim" style={{ padding: "13px 28px", background: "linear-gradient(135deg, #06b6d4, #3b82f6)", borderRadius: 10, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>İletişime Geçin</a>
                <a href="#hizmetler" style={{ padding: "13px 28px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Hizmetleri İncele</a>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="sr" data-d="2" style={{ padding: "36px 32px", borderRadius: 20, border: "1px solid rgba(6,182,212,0.2)", background: "rgba(6,182,212,0.04)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#06b6d4", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>Vizyonumuz</div>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, fontWeight: 500 }}>
                  Türk işletmelerinin teknoloji bağımsızlığını artırmak; kurumsal düzeyde altyapı, yazılım ve güvenlik çözümlerine global standartlarda erişim sağlamak.
                </p>
              </div>
              <div className="sr" data-d="3" style={{ padding: "36px 32px", borderRadius: 20, border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>Misyonumuz</div>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, fontWeight: 500 }}>
                  Müşterilerimizin günlük IT yükünü üstlenerek onların asıl işlerine odaklanmalarını sağlamak. Teknoloji ortaklığını proje bazlı değil, uzun vadeli ve proaktif yürütmek.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SSS ──────────────────────────────────────────────────────────────── */}
      <section id="sss" style={{ padding: "180px 0", background: "#060a14" }}>
        <div className="wrap">
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div className="sr sec-tag" style={{ color: "#8b5cf6", textAlign: "center" }}>SSS</div>
            <h2 className="sr sec-h2" data-d="1" style={{ textAlign: "center", marginBottom: 72 }}>Sık Sorulan<br /><span style={{ color: "rgba(255,255,255,0.2)" }}>Sorular</span></h2>
            {faqItems.map((f, i) => (
              <div key={i} className="sr faq-item" data-d="1" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "26px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: openFaq === i ? "#fff" : "rgba(255,255,255,0.7)", transition: "color 0.2s", lineHeight: 1.5 }}>{f.q}</span>
                  <span className={`faq-icon${openFaq === i ? " open" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <p style={{ margin: 0, paddingBottom: 26, color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.9 }}>{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── İLETİŞİM ─────────────────────────────────────────────────────────── */}
      <section id="iletisim" style={{ padding: "180px 0", background: "#030508" }}>
        <div className="wrap">
          <div className="contact-grid">
            <div>
              <div className="sr sec-tag" style={{ color: "#3b82f6" }}>İletişim</div>
              <h2 className="sr" data-d="1" style={{ fontSize: "clamp(2rem, 4vw, 3.6rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, marginTop: 16, marginBottom: 24, color: "#fff" }}>
                Projenizi<br />
                <span style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Birlikte Konuşalım</span>
              </h2>
              <p className="sr" data-d="2" style={{ color: "rgba(255,255,255,0.38)", fontSize: 15, lineHeight: 1.9, marginBottom: 48 }}>
                Bir sorunuz mu var, teklif mi almak istiyorsunuz? Formu doldurun, en kısa sürede geri dönelim. İlk görüşme ve altyapı analizi tamamen ücretsizdir.
              </p>
              <div className="sr" data-d="3" style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 40 }}>
                {[
                  { icon: "✉️", label: "E-posta", value: "info@xshield.com.tr", href: "mailto:info@xshield.com.tr" },
                  { icon: "🕐", label: "Çalışma Saatleri", value: "Hft içi 09:00–18:00 · Acil destek 7/24", href: null },
                ].map(c => (
                  <div key={c.label} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>{c.label}</div>
                      {c.href
                        ? <a href={c.href} style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, textDecoration: "none" }}>{c.value}</a>
                        : <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>{c.value}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="sr" data-d="4" style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.75 }}>
                Form aracılığıyla ilettiğiniz kişisel veriler, KVKK kapsamında yalnızca iletişim amacıyla işlenmektedir.{" "}
                <a href="/kvkk" style={{ color: "#3b82f6", textDecoration: "none" }}>KVKK Aydınlatma Metni</a>
                {" · "}
                <a href="/gizlilik" style={{ color: "#3b82f6", textDecoration: "none" }}>Gizlilik Politikası</a>
              </div>
            </div>

            <div className="sr contact-form-wrap" data-d="2">
              <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[{ p: "Ad Soyad *", t: "text", ph: "Ahmet Yılmaz" }, { p: "Firma", t: "text", ph: "Şirket A.Ş." }].map(f => (
                    <div key={f.p}>
                      <label style={{ display: "block", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px" }}>{f.p}</label>
                      <input type={f.t} placeholder={f.ph} style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                        onFocus={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px" }}>E-posta *</label>
                  <input type="email" placeholder="ahmet@firma.com" style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px" }}>İlgilendiğiniz Hizmet</label>
                  <select style={{ width: "100%", padding: "12px 16px", background: "rgba(10,15,30,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 14, outline: "none", appearance: "none", boxSizing: "border-box" }}>
                    <option value="">Seçiniz...</option>
                    <optgroup label="Hizmetler"><option>Cloud Sunucu</option><option>Ağ Yönetimi</option><option>Sunucu Yönetimi</option><option>Siber Güvenlik</option><option>Altyapı Hizmetleri</option><option>IT Danışmanlığı</option></optgroup>
                    <optgroup label="Ürünler"><option>e-Clinic</option><option>Signed</option><option>xCut</option><option>xSignage</option><option>ShieldSpot</option></optgroup>
                    <option>Ücretsiz Altyapı Analizi</option><option>Diğer</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px" }}>Mesajınız *</label>
                  <textarea placeholder="Projeniz veya ihtiyacınız hakkında kısaca bilgi verin..." rows={5} style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }} />
                </div>
                <button type="submit" className="submit-btn">
                  Mesajı Gönder
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        /* ── Layout ────────────────────────────────────────────────────────── */
        .wrap { max-width: 1200px; margin: 0 auto; padding: 0 40px; }
        .sec-tag { font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; display: block; margin-bottom: 20px; }
        .sec-h2 { font-size: clamp(2.6rem, 5vw, 5rem); font-weight: 900; letter-spacing: -2.5px; line-height: 1.0; margin-top: 0; color: #fff; }

        /* ── Hero stats ─────────────────────────────────────────────────────── */
        .hero-stats { display: flex; margin-top: 72px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.07); }
        .stat-item  { flex: 1; padding-right: 32px; margin-right: 32px; }

        /* ── Scroll reveal ──────────────────────────────────────────────────── */
        .sr { opacity: 0; transform: translateY(32px); pointer-events: none;
              transition: opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1); }
        .sr.sr-v { opacity: 1; transform: none; pointer-events: auto; }
        .sr[data-d="1"] { transition-delay: 80ms; }
        .sr[data-d="2"] { transition-delay: 180ms; }
        .sr[data-d="3"] { transition-delay: 280ms; }
        .sr[data-d="4"] { transition-delay: 380ms; }

        /* ── Services ───────────────────────────────────────────────────────── */
        .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .service-card  { padding: 44px 38px; background: #060a14; position: relative; transition: background 0.3s; cursor: default; }
        .service-card:hover { background: rgba(var(--rgb),0.04) !important; }

        /* ── Product tabs ───────────────────────────────────────────────────── */
        .product-shell  { display: grid; grid-template-columns: 260px 1fr; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; overflow: hidden; }
        .product-tabs   { border-right: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
        .ptab { width: 100%; padding: 22px 26px; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.06); border-left: 3px solid transparent; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 10; transition: all 0.2s; }
        .ptab:hover { background: rgba(255,255,255,0.03); }
        .ptab-active { background: rgba(var(--rgb),0.1) !important; border-left-color: var(--c) !important; }
        .ptab-name { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.45); transition: color 0.2s; margin-bottom: 4px; }
        .ptab-active .ptab-name { color: var(--c) !important; }
        .ptab-line { font-size: 11px; color: rgba(255,255,255,0.25); font-weight: 500; }
        .badge-sm { font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 999px; letter-spacing: 0.5px; text-transform: uppercase; flex-shrink: 0; }

        /* CSS attribute selector — zero JS inline style conflict */
        .product-panels { position: relative; }
        .ppanel { display: none; padding: 56px 52px; }
        [data-tab="0"] .ppanel-0,
        [data-tab="1"] .ppanel-1,
        [data-tab="2"] .ppanel-2,
        [data-tab="3"] .ppanel-3,
        [data-tab="4"] .ppanel-4 { display: block; animation: paneIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }

        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* ── Why grid ───────────────────────────────────────────────────────── */
        .why-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .why-card  { padding: 36px 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); transition: border-color 0.3s, transform 0.3s; }
        .why-card:hover { border-color: rgba(34,197,94,0.2); transform: translateY(-4px); }

        /* ── Process ────────────────────────────────────────────────────────── */
        .process-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; position: relative; }
        .process-grid::before { content: ""; position: absolute; top: 35px; left: 12.5%; right: 12.5%; height: 1px; background: linear-gradient(90deg, transparent, rgba(59,130,246,0.25), transparent); }

        /* ── About ──────────────────────────────────────────────────────────── */
        .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }

        /* ── FAQ ────────────────────────────────────────────────────────────── */
        .faq-item { }
        .faq-icon { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; color: rgba(255,255,255,0.4); transition: transform 0.3s, border-color 0.3s; line-height: 1; font-style: normal; }
        .faq-icon.open { transform: rotate(45deg); border-color: rgba(139,92,246,0.4); color: #8b5cf6; }

        /* ── Contact ────────────────────────────────────────────────────────── */
        .contact-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
        .contact-form-wrap { padding: 44px 40px; border-radius: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); }
        .submit-btn { padding: 15px; margin-top: 4px; background: linear-gradient(135deg, #3b82f6, #06b6d4); border-radius: 10px; color: #fff; border: none; font-size: 15px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: box-shadow 0.2s, transform 0.2s; box-shadow: 0 4px 24px rgba(59,130,246,0.3); }
        .submit-btn:hover { box-shadow: 0 8px 40px rgba(59,130,246,0.5); transform: translateY(-1px); }

        /* ── Keyframes ──────────────────────────────────────────────────────── */
        @keyframes heroReveal {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes paneIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* ── Responsive ─────────────────────────────────────────────────────── */
        @media (max-width: 1024px) {
          .services-grid { grid-template-columns: repeat(2, 1fr); }
          .why-grid { grid-template-columns: repeat(2, 1fr); }
          .process-grid { grid-template-columns: repeat(2, 1fr); gap: 48px; }
          .process-grid::before { display: none; }
        }
        @media (max-width: 860px) {
          .product-shell { grid-template-columns: 1fr; }
          .product-tabs  { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; flex-wrap: wrap; }
          .ptab { width: auto; flex: 1; min-width: 140px; border-bottom: none; border-left: none !important; border-bottom: 3px solid transparent; }
          .ptab-active { border-bottom-color: var(--c) !important; background: rgba(var(--rgb),0.1) !important; }
          .ppanel { padding: 36px 28px; }
          .feature-grid { grid-template-columns: 1fr; }
          .about-grid { grid-template-columns: 1fr; gap: 48px; }
          .contact-grid { grid-template-columns: 1fr; gap: 48px; }
        }
        @media (max-width: 640px) {
          .wrap { padding: 0 20px; }
          .services-grid { grid-template-columns: 1fr; }
          .why-grid { grid-template-columns: 1fr; }
          .process-grid { grid-template-columns: 1fr; }
          .hero-stats { flex-wrap: wrap; gap: 28px; border-top: 1px solid rgba(255,255,255,0.07); }
          .stat-item { border-right: none !important; flex: 0 0 calc(50% - 14px); padding-right: 0; margin-right: 0; }
          .contact-form-wrap { padding: 28px 20px; }
        }
      `}</style>
    </>
  );
}
