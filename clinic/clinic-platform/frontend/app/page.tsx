"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_NAME, COMPANY_NAME } from "@/lib/version";

/* ── Pricing ─────────────────────────────────────────────────────────── */
const PLANS = [
  {
    key: "starter", name: "Başlangıç", price: "₺1.290", priceYear: "₺1.032",
    period: "/ay", desc: "1-2 doktorlu küçük klinikler için",
    color: "#0e7490", highlight: false,
    features: ["Dashboard", "Hasta & CRM yönetimi", "Randevu takvimi", "Doktor yönetimi", "5 kullanıcıya kadar", "E-posta desteği"],
    missing: ["Web sitesi & online randevu", "Finans & faturalama", "Raporlar & analitik", "Stok & demirbaş", "WhatsApp entegrasyonu"],
  },
  {
    key: "klinik", name: "Klinik", price: "₺2.490", priceYear: "₺1.992",
    period: "/ay", desc: "Büyüyen klinikler için tam paket",
    color: "#1d4ed8", highlight: true,
    features: ["Başlangıç paketi dahil", "Web sitesi & online randevu", "Finans & faturalama & PDF", "Raporlar & analitik", "Görevler & belge yönetimi", "Çalışma takvimi", "Randevu istekleri", "15 kullanıcıya kadar", "Öncelikli destek"],
    missing: ["Stok & demirbaş", "WhatsApp kampanyaları", "Anket & memnuniyet", "Denetim günlüğü"],
  },
  {
    key: "pro", name: "Pro", price: "₺3.990", priceYear: "₺3.192",
    period: "/ay", desc: "Çok doktorlu & çok branşlı klinikler",
    color: "#7c3aed", highlight: false,
    features: ["Klinik paketi dahil", "Stok & demirbaş takibi", "WhatsApp kampanyaları", "Anket & memnuniyet sistemi", "Denetim günlüğü", "Sınırsız kullanıcı", "API erişimi", "Özel entegrasyon desteği"],
    missing: [],
  },
];

/* ── Module details ──────────────────────────────────────────────────── */
const MODULES = [
  {
    icon: "🗓",
    title: "Randevu Yönetimi",
    color: "#1d4ed8",
    short: "Akıllı takvim, online randevu ve otomatik hatırlatmalar.",
    details: [
      "Haftalık & günlük doktor takvimi görünümü",
      "Slot bazlı müsaitlik yönetimi, çakışma kontrolü",
      "Online randevu formu — web sitenizden doğrudan",
      "WhatsApp & SMS ile 24 saat öncesi otomatik hatırlatma",
      "Randevu onaylama / iptal / yeniden planlama",
      "Randevu geçmişi ve hasta bazlı takip",
    ],
  },
  {
    icon: "👥",
    title: "Hasta & CRM",
    color: "#0e7490",
    short: "Hasta kartı, tedavi geçmişi ve lead pipeline yönetimi.",
    details: [
      "Kapsamlı hasta kartı: 13 özel alan, fotoğraf, notlar",
      "Tedavi geçmişi, dosyalar ve belgeler",
      "Kanban pipeline ile potansiyel hasta takibi",
      "İletişim geçmişi ve aktivite log'u",
      "Hasta portalı — hastalar bilgilerini görebilir",
      "Toplu filtreleme, etiketleme ve arama",
    ],
  },
  {
    icon: "🌐",
    title: "Web Sitesi Builder",
    color: "#7c3aed",
    short: "Kod yazmadan klinik web sitenizi oluşturun.",
    details: [
      "Özelleştirilebilir klinik tanıtım sayfası",
      "Doktor profil sayfaları, fotoğraf ve biyografi",
      "Hizmet & fiyat listesi yayını",
      "Entegre online randevu formu",
      "SEO ayarları: meta başlık, açıklama, anahtar kelimeler",
      "Özel alan adı (custom domain) desteği",
      "Modern, mobil uyumlu temalar",
    ],
  },
  {
    icon: "📊",
    title: "Raporlar & Analitik",
    color: "#d97706",
    short: "Klinik performansınızı gerçek verilerle ölçün.",
    details: [
      "Günlük / haftalık / aylık KPI dashboard'u",
      "Gelir & gider analizi, branş bazlı karşılaştırma",
      "Doktor bazlı performans raporu",
      "Hasta kaynak analizi (nasıl buldu?)",
      "Excel & PDF export",
      "Zamanlanmış raporlar — e-posta ile otomatik gönderim",
    ],
  },
  {
    icon: "💬",
    title: "WhatsApp Entegrasyonu",
    color: "#16a34a",
    short: "Hastalarınızla WhatsApp üzerinden iletişim kurun.",
    details: [
      "Bireysel WhatsApp mesajı gönderimi",
      "Toplu kampanya mesajları",
      "Randevu hatırlatma otomasyonu",
      "Mesaj geçmişi ve iletim durumu takibi",
      "WhatsApp Business API entegrasyonu",
      "Mesaj şablonları oluşturun ve kaydedin",
    ],
  },
  {
    icon: "🧾",
    title: "Finans & Faturalama",
    color: "#dc2626",
    short: "Fatura oluşturun, ödemeleri ve gelirinizi takip edin.",
    details: [
      "Randevuya bağlı fatura oluşturma",
      "PDF fatura indirme ve gönderme",
      "Ödeme durumu takibi (ödendi / bekliyor / iptal)",
      "Gelir & gider kayıtları",
      "Branş ve doktor bazlı ciro raporları",
      "KDV dahil/hariç fiyatlandırma seçenekleri",
    ],
  },
  {
    icon: "📦",
    title: "Stok & Demirbaş",
    color: "#0e7490",
    short: "Malzeme ve ekipmanlarınızı takip altında tutun.",
    details: [
      "Stok giriş/çıkış kayıtları",
      "Kritik stok uyarıları — otomatik bildirim",
      "Malzeme bazlı kullanım raporu",
      "Demirbaş (ekipman) envanteri",
      "Bakım planlaması ve tarih takibi",
      "Tedarikçi bilgileri ve satın alma geçmişi",
    ],
  },
  {
    icon: "⭐",
    title: "Anket & Memnuniyet",
    color: "#7c3aed",
    short: "Hasta memnuniyetini ölçün, geri bildirim toplayın.",
    details: [
      "Özelleştirilebilir anket formları",
      "Randevu sonrası otomatik anket gönderimi",
      "NPS (Net Promoter Score) hesaplama",
      "Memnuniyet trendleri ve doktor bazlı karşılaştırma",
      "Anket sonuçlarını web sitenizde yayınlama",
      "Olumsuz geri bildirimlerde anlık uyarı",
    ],
  },
];

/* ── How it works ────────────────────────────────────────────────────── */
const STEPS = [
  { num: "01", title: "Kayıt olun", desc: "30 saniyelik kayıt formu. Kredi kartı yok, kurulum yok, anında erişim." },
  { num: "02", title: "Kliniğinizi kurun", desc: "Klinik bilgilerinizi, doktorlarınızı ve çalışma saatlerini 10 dakikada girin." },
  { num: "03", title: "Büyüyün", desc: "Randevu alın, hastaları yönetin, raporları izleyin. Her şey otomatik çalışır." },
];

/* ── FAQ ─────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: "30 günlük trial bittikten sonra ne olur?", a: "Hesabınız otomatik olarak donmaz — bizimle iletişime geçip bir plan seçmeniz yeterli. Verileriniz silinmez." },
  { q: "Verilerim güvende mi?", a: "Tüm veriler Türkiye'deki sunucularda şifreli olarak tutulur. SSL/TLS ile korunur, düzenli yedekleme yapılır." },
  { q: "Birden fazla şubem var, ne yapmalıyım?", a: "Pro paketimiz çok lokasyonlu kullanıma uygundur. Kurumsal fiyatlandırma için bizimle iletişime geçin." },
  { q: "Mevcut verilerimi aktarabilir miyim?", a: "Excel/CSV formatında hasta ve randevu verisi aktarımı desteklenir. Ücretsiz migrasyon desteği sağlıyoruz." },
  { q: "Faturamı nasıl ödeyebilirim?", a: "Kredi kartı, havale/EFT ve kurumsal fatura ile ödeme kabul edilir." },
  { q: "Teknik destek nasıl işliyor?", a: "Tüm paketlerde e-posta desteği mevcuttur. Klinik ve Pro paketlerde öncelikli destek ve telefon hattı dahildir." },
];

/* ══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [yearly,     setYearly]     = useState(false);
  const [openFaq,    setOpenFaq]    = useState<number | null>(null);
  const [openModule, setOpenModule] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#0f172a", background: "#fff" }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #f1f5f9",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.5px" }}>
          <span style={{ color: "#1d4ed8" }}>x</span>Shield{" "}
          <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>e-Clinic</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <a href="#moduller"  style={navLink}>Modüller</a>
          <a href="#fiyatlar"  style={navLink}>Fiyatlar</a>
          <a href="#sss"       style={navLink}>SSS</a>
          <Link href="/klinikler" style={navLink}>Klinik Rehberi</Link>
          <Link href="/klinik-bul" style={{
            padding: "7px 14px", fontSize: 14, borderRadius: 8, fontWeight: 700,
            textDecoration: "none",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "#fff",
          }}>✨ AI Ara</Link>
          <Link href="/demo" style={{
            padding: "9px 18px", borderRadius: 10,
            background: "#f1f5f9", color: "#1d4ed8",
            fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}>Ücretsiz Dene</Link>
          <Link href="/login" style={{
            padding: "9px 18px", borderRadius: 10,
            background: "#1d4ed8", color: "#fff",
            fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}>Giriş Yap</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1a2a4a 50%, #1e1b4b 100%)",
        color: "#fff", padding: "110px 24px 90px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Arka plan dekor */}
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", borderRadius: 999, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(167,139,250,0.3)", fontSize: 13, fontWeight: 700, marginBottom: 28, color: "#c4b5fd" }}>
            <span style={{ fontSize: 16 }}>✨</span> Yapay Zeka Destekli Klinik Platformu
          </div>

          <h1 style={{ margin: "0 0 24px", fontSize: "clamp(34px, 5vw, 62px)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.08 }}>
            Kliniğinizi{" "}
            <span style={{ background: "linear-gradient(90deg, #818cf8, #c084fc, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              yapay zekayla
            </span>
            <br />yönetin.
          </h1>

          <p style={{ margin: "0 auto 44px", maxWidth: 600, fontSize: 19, color: "#94a3b8", lineHeight: 1.65 }}>
            Randevu, hasta, finans, web sitesi ve AI destekli araçlar —<br />
            tüm klinik operasyonunuz tek akıllı platformda.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/demo" style={{
              padding: "16px 36px", borderRadius: 12,
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none",
              boxShadow: "0 4px 24px rgba(79,70,229,0.5)",
            }}>
              30 Gün Ücretsiz Başla →
            </Link>
            <Link href="/klinik-bul" style={{
              padding: "16px 36px", borderRadius: 12,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              ✨ AI ile Klinik Bul
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", justifyContent: "center", gap: 52, marginTop: 80, flexWrap: "wrap" }}>
            {[["500+", "Aktif Klinik"], ["98%", "Müşteri Memnuniyeti"], ["30 gün", "Ücretsiz Trial"], ["7/24", "Teknik Destek"]].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{val}</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Özellikleri ── */}
      <section style={{ padding: "88px 24px", background: "#fafafa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "#f0f0ff", border: "1px solid #c4b5fd", fontSize: 12, fontWeight: 800, color: "#6d28d9", marginBottom: 16, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              ✨ Yapay Zeka
            </div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-1px", color: "#0f172a" }}>
              Platformun her yerinde AI
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 16, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
              Yapay zeka sadece arama değil — web sitenizi yazar, içerik önerir, klinik bulmana yardım eder.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* AI Klinik Arama */}
            <div style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
              borderRadius: 20, padding: "32px 28px", color: "#fff",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", bottom: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(99,102,241,0.2)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, letterSpacing: "-0.5px" }}>AI Klinik Arama</div>
                <p style={{ fontSize: 14, color: "#a5b4fc", lineHeight: 1.65, margin: "0 0 24px" }}>
                  Semptomunu veya ihtiyacını yaz — AI hangi branşa gitmen gerektiğini anlayıp şehrindeki en uygun klinikleri listeler.
                </p>
                <Link href="/klinik-bul" style={{
                  display: "inline-block", padding: "10px 20px", borderRadius: 10,
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none",
                }}>
                  Dene → Klinik Bul
                </Link>
              </div>
            </div>

            {/* AI Web Sitesi İçerik */}
            <div style={{
              background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)",
              borderRadius: 20, padding: "32px 28px", color: "#fff",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", bottom: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(167,139,250,0.15)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✍️</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, letterSpacing: "-0.5px" }}>AI Web Sitesi Yazarı</div>
                <p style={{ fontSize: 14, color: "#d8b4fe", lineHeight: 1.65, margin: "0 0 24px" }}>
                  Klinik adı ve uzmanlık alanını gir — AI sizin için hero metnini, hakkımızda ve SEO içeriklerini saniyeler içinde oluşturur.
                </p>
                <div style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10, padding: "10px 14px",
                  fontSize: 12, color: "#e9d5ff", lineHeight: 1.6,
                }}>
                  ✨ Web Sitesi modülüne girin → "AI ile İçerik Oluştur" butonuna tıklayın
                </div>
              </div>
            </div>

            {/* Yakında */}
            <div style={{
              background: "#fff", borderRadius: 20, padding: "32px 28px",
              border: "1px dashed #c4b5fd",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 16, right: 16, padding: "4px 10px", borderRadius: 999, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 11, fontWeight: 700, color: "#15803d" }}>
                Yakında
              </div>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
              <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a", letterSpacing: "-0.5px" }}>AI Randevu Asistanı</div>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: "0 0 24px" }}>
                WhatsApp ve web siteniz üzerinden gelen mesajları AI yorumlar, uygun randevu slotunu önerir ve otomatik onay gönderir.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["WhatsApp Bot", "Slot Önerisi", "Otomatik Onay"].map(tag => (
                  <span key={tag} style={{ padding: "4px 12px", borderRadius: 999, background: "#f5f3ff", color: "#6d28d9", fontSize: 12, fontWeight: 600, border: "1px solid #e9d5ff" }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px" }}>3 adımda başlayın</h2>
          <p style={{ margin: "0 auto 56px", color: "#64748b", fontSize: 16, maxWidth: 480 }}>
            Kurulum gerektirmiyor, IT uzmanı gerekmez. Bugün kayıt olun, yarın hasta alın.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ position: "relative" }}>
                {i < STEPS.length - 1 && (
                  <div style={{ position: "absolute", top: 28, left: "calc(50% + 32px)", width: "calc(100% - 32px)", height: 2, background: "linear-gradient(90deg, #1d4ed8, #7c3aed)", opacity: 0.2, display: "none" }} className="desktop-only" />
                )}
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", color: "#fff", fontWeight: 900, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  {s.num}
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ── */}
      <section id="moduller" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px" }}>
              Her ihtiyacınız için bir modül
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 16 }}>
              Klinik yönetiminin her boyutu kapsanmış. Tıklayarak detayları inceleyin.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {MODULES.map((m, i) => (
              <div key={m.title}
                onClick={() => setOpenModule(openModule === i ? null : i)}
                style={{
                  borderRadius: 16, border: `1px solid ${openModule === i ? m.color + "60" : "#eaecf0"}`,
                  background: openModule === i ? m.color + "06" : "#fff",
                  padding: 20, cursor: "pointer", transition: "all 0.2s",
                  boxShadow: openModule === i ? `0 4px 20px ${m.color}20` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: openModule === i ? 16 : 0 }}>
                  <div style={{ fontSize: 28, width: 48, height: 48, borderRadius: 12, background: m.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.short}</div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 18, transition: "transform 0.2s", transform: openModule === i ? "rotate(180deg)" : "none" }}>
                    ›
                  </div>
                </div>
                {openModule === i && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, borderTop: `1px solid ${m.color}20` }}>
                    {m.details.map(d => (
                      <div key={d} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                        <span style={{ color: m.color, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ color: "#344054" }}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Klinik Rehberi + AI Arama promo ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
            borderRadius: 24, padding: "52px 44px",
            display: "flex", alignItems: "center", gap: 44, flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.3)", fontSize: 12, fontWeight: 800, color: "#c4b5fd", marginBottom: 16, letterSpacing: "0.5px" }}>
                ✨ AI Destekli
              </div>
              <h3 style={{ margin: "0 0 14px", fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                AI ile Klinik Bul
              </h3>
              <p style={{ margin: "0 0 28px", color: "#94a3b8", fontSize: 15, lineHeight: 1.7 }}>
                Semptomunuzu veya ihtiyacınızı yazın. Yapay zeka en uygun branşı tespit edip şehrinizdeki klinikleri listeler. Ayrıca şehir ve branşa göre klasik arama da yapabilirsiniz.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/klinik-bul" style={{
                  padding: "13px 26px", borderRadius: 10,
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(79,70,229,0.4)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  ✨ AI ile Klinik Bul →
                </Link>
                <Link href="/klinikler" style={{
                  padding: "13px 26px", borderRadius: 10,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none",
                }}>
                  Klasik Arama
                </Link>
              </div>
            </div>

            {/* Sahte chat önizleme */}
            <div style={{ flexShrink: 0, width: 300, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }} />
                AI Asistan
              </div>
              {[
                { side: "user",  text: "Sırt ağrım var, hangi doktora gitmeliyim?" },
                { side: "ai",    text: "Ortopedi veya Fizik Tedavi uzmanına gitmenizi öneririm. Şehrinizde klinik arayayım mı?" },
                { side: "user",  text: "Evet, İstanbul." },
                { side: "ai",    text: "İstanbul'da 3 ortopedi kliniği buldum 🎯" },
              ].map((m, i) => (
                <div key={i} style={{
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: m.side === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "80%", fontSize: 12, lineHeight: 1.5, padding: "8px 12px", borderRadius: 10,
                    background: m.side === "user" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)",
                    color: m.side === "user" ? "#c4b5fd" : "#e2e8f0",
                    border: `1px solid ${m.side === "user" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)"}`,
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="fiyatlar" style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px" }}>Şeffaf fiyatlandırma</h2>
            <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: 16 }}>
              Tüm paketler 30 gün ücretsiz trial ile başlar. Kredi kartı gerekmez.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#e2e8f0", borderRadius: 12, padding: "5px 6px" }}>
              {[false, true].map(y => (
                <button key={String(y)} onClick={() => setYearly(y)} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 14, transition: "all 0.15s",
                  background: yearly === y ? "#fff" : "transparent",
                  color: yearly === y ? "#0f172a" : "#64748b",
                  boxShadow: yearly === y ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {y ? <>Yıllık <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>%20 indirim</span></> : "Aylık"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
            {PLANS.map(plan => (
              <div key={plan.key} style={{
                borderRadius: 20, border: plan.highlight ? `2px solid ${plan.color}` : "1px solid #eaecf0",
                background: "#fff", overflow: "hidden",
                boxShadow: plan.highlight ? "0 8px 32px rgba(29,78,216,0.15)" : "none",
              }}>
                {plan.highlight && (
                  <div style={{ background: plan.color, color: "#fff", textAlign: "center", padding: "6px 0", fontSize: 12, fontWeight: 800, letterSpacing: "0.5px" }}>
                    EN POPÜLER
                  </div>
                )}
                <div style={{ padding: "28px 24px 24px" }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: plan.color }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 20 }}>{plan.desc}</div>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px" }}>{yearly ? plan.priceYear : plan.price}</span>
                      <span style={{ fontSize: 14, color: "#94a3b8" }}>{plan.period}</span>
                    </div>
                    {yearly && <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>Yıllık faturalandırma · {plan.price}/ay yerine</div>}
                  </div>
                  <Link href="/demo" style={{
                    display: "block", textAlign: "center", padding: "12px", borderRadius: 10,
                    background: plan.highlight ? plan.color : "#f1f5f9",
                    color: plan.highlight ? "#fff" : plan.color,
                    fontWeight: 800, fontSize: 14, textDecoration: "none",
                    border: plan.highlight ? "none" : `1px solid ${plan.color}30`,
                    marginBottom: 24,
                  }}>
                    Ücretsiz Başla
                  </Link>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                        <span style={{ color: "#22c55e", fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {plan.missing.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, opacity: 0.35 }}>
                        <span style={{ flexShrink: 0, marginTop: 1 }}>—</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 36, color: "#64748b", fontSize: 14 }}>
            Kurumsal fiyatlandırma için{" "}
            <a href="mailto:satis@xshield.com.tr" style={{ color: "#1d4ed8", fontWeight: 700 }}>satis@xshield.com.tr</a>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px" }}>Müşterilerimiz anlatıyor</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              { name: "Dr. Ayşe Kaya", clinic: "Kaya Estetik Kliniği, İstanbul", quote: "Randevu çakışmaları ve kayıp hastalar tarih oldu. WhatsApp hatırlatmaları sayesinde no-show oranımız %40 düştü." },
              { name: "Op. Dr. Mehmet Demir", clinic: "Demir Plastik Cerrahi, Ankara", quote: "Web sitesini 1 saatte kurdum. Artık online randevu alıyoruz. Aylık 50-60 yeni hasta bu kanaldan geliyor." },
              { name: "Uzm. Dr. Fatma Şahin", clinic: "Şahin Dermatoloji, İzmir", quote: "Finans modülü hayat kurtardı. Hangi branşın ne kadar getirdiğini artık net görebiliyoruz." },
            ].map(t => (
              <div key={t.name} style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaecf0", padding: 24 }}>
                <div style={{ fontSize: 32, color: "#1d4ed8", fontWeight: 900, lineHeight: 1, marginBottom: 12 }}>"</div>
                <p style={{ margin: "0 0 20px", fontSize: 14, color: "#344054", lineHeight: 1.7 }}>{t.quote}</p>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{t.clinic}</div>
                </div>
                <div style={{ display: "flex", gap: 2, marginTop: 12 }}>
                  {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ color: "#f59e0b", fontSize: 14 }}>★</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="sss" style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px" }}>Sık sorulan sorular</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQS.map((faq, i) => (
              <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                background: "#fff", borderRadius: 12, border: "1px solid #eaecf0",
                overflow: "hidden", cursor: "pointer",
              }}>
                <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{faq.q}</span>
                  <span style={{ color: "#94a3b8", fontSize: 20, flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 18px", fontSize: 14, color: "#64748b", lineHeight: 1.7, borderTop: "1px solid #f1f5f9" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        color: "#fff", padding: "80px 24px", textAlign: "center",
      }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 36, fontWeight: 900, letterSpacing: "-0.5px" }}>Hemen başlayın</h2>
        <p style={{ margin: "0 auto 36px", maxWidth: 480, fontSize: 16, color: "#94a3b8" }}>
          30 gün boyunca tüm özellikleri ücretsiz kullanın. Kurulum yok, kredi kartı yok.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/demo" style={{
            padding: "14px 32px", borderRadius: 12, background: "#1d4ed8",
            color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none",
            boxShadow: "0 4px 20px rgba(29,78,216,0.4)",
          }}>Ücretsiz Demo Başlat</Link>
          <Link href="/login" style={{
            padding: "14px 32px", borderRadius: 12,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none",
          }}>Hesabım var, giriş yap</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #f1f5f9", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, marginBottom: 40 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>
                <span style={{ color: "#1d4ed8" }}>x</span>Shield e-Clinic
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Türkiye'nin modern klinik yönetim platformu.
              </div>
            </div>
            {[
              { title: "Ürün", links: [["Özellikler", "#moduller"], ["Fiyatlar", "#fiyatlar"], ["Demo", "/demo"]] },
              { title: "Şirket", links: [["Hakkımızda", "#"], ["Blog", "#"], ["İletişim", "mailto:info@xshield.com.tr"]] },
              { title: "Kaynaklar", links: [["SSS", "#sss"], ["Klinik Rehberi", "/klinikler"], ["Gizlilik", "#"]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "#344054" }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.links.map(([lbl, href]) => (
                    <a key={lbl} href={href} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>{lbl}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>© {new Date().getFullYear()} {COMPANY_NAME}. Tüm hakları saklıdır.</span>
            <div style={{ display: "flex", gap: 20 }}>
              {[["Gizlilik Politikası", "#"], ["Kullanım Şartları", "#"]].map(([lbl, href]) => (
                <a key={lbl} href={href} style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none" }}>{lbl}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const navLink: React.CSSProperties = {
  padding: "8px 12px", fontSize: 14, color: "#344054",
  textDecoration: "none", borderRadius: 8, fontWeight: 500,
};
