"use client";
import { useState } from "react";

const faqs = [
  {
    q: "xShield hangi şehirlerde hizmet veriyor?",
    a: "Türkiye genelinde uzaktan destek sağlıyoruz. Yerinde hizmet için İstanbul, Ankara, İzmir ve çevre illerde aktif şekilde çalışıyoruz. Diğer şehirler için koordineli saha destek ağımızla çözüm üretebiliyoruz.",
  },
  {
    q: "SLA taahhütleriniz neler?",
    a: "Kritik sistemler için 2 saat içinde ilk müdahale, 4 saat içinde çözüm garantisi veriyoruz. Standart destek paketlerinde iş günü 09:00–18:00 arası 4 saat içinde müdahale taahhüdümüz var. Tüm SLA detayları sözleşmede açıkça belirtilir.",
  },
  {
    q: "Ücretsiz altyapı analizi nasıl yapılıyor?",
    a: "Uzman ekibimiz mevcut altyapınızı uzaktan veya yerinde inceleyerek darboğazları, güvenlik açıklarını ve iyileştirme fırsatlarını raporluyor. Süreç 1–2 iş günü sürüyor, size özel detaylı rapor teslim ediyoruz. Tamamen ücretsiz ve taahhütsüz.",
  },
  {
    q: "Mevcut sistemlerimizle uyumlu musunuz?",
    a: "Evet. Windows Server, Linux, VMware, Hyper-V, Cisco, Fortinet, MikroTik, Microsoft 365, Google Workspace ve çok daha fazlası ile çalışıyoruz. Önceliğimiz mevcut altyapınıza entegre olmak; sıfırdan kurulum zorunluluğu yoktur.",
  },
  {
    q: "Hangi sektörlere hizmet veriyorsunuz?",
    a: "Sağlık (e-Clinic platformumuz), güzellik & kişisel bakım (xCut), finans, perakende, hukuk ve kamu sektörlerinde deneyimliyiz. Her sektörün KVKK, GDPR, PCI-DSS gibi uyumluluk gerekliliklerini bilen bir ekiple çalışıyorsunuz.",
  },
  {
    q: "Destek nasıl sağlanıyor?",
    a: "7/24 izleme sistemlerimizle kritik olayları proaktif olarak tespit ediyoruz. Müşterilerimiz e-posta, telefon veya destek portalı üzerinden bize ulaşabilir. Acil durumlarda doğrudan mühendise erişim imkânı sunuyoruz.",
  },
  {
    q: "SaaS ürünlerinizi kendi altyapımızda çalıştırabilir miyiz?",
    a: "e-Clinic ve Signed için on-premise kurulum seçeneklerimiz mevcuttur. Bu seçenek, büyük kurumsal yapılar veya özel veri barındırma gereksinimleri olan müşteriler için uygundur. Detaylar için bizimle iletişime geçin.",
  },
  {
    q: "Proje maliyetleri nasıl belirleniyor?",
    a: "Fiyatlandırma ihtiyacınıza özeldir. Ücretsiz keşif görüşmesinden sonra kapsam ve taahhütleri içeren net bir teklif sunuyoruz. Gizli ücret veya sürpriz fatura yoktur. Yönetilen hizmetler için aylık sabit ücret modelimiz mevcuttur.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="sss" style={{ padding: "96px 0" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="tag" style={{ display: "inline-flex", marginBottom: 16 }}>
            <span>❓</span> Sık Sorulan Sorular
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
            Merak Ettikleriniz
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 17, maxWidth: 480, margin: "0 auto" }}>
            En sık sorulan soruların yanıtlarını burada bulabilirsiniz.
          </p>
        </div>

        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: open === i ? "rgba(59,130,246,0.07)" : "rgba(15,32,53,0.75)",
              border: `1px solid ${open === i ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.12)"}`,
              borderRadius: 14,
              overflow: "hidden",
              transition: "border-color 0.3s, background 0.3s",
            }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "20px 24px", gap: 16, textAlign: "left",
                }}>
                <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 15.5, lineHeight: 1.4 }}>
                  {faq.q}
                </span>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: open === i ? "#3b82f6" : "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.3s",
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
                    transform: open === i ? "rotate(180deg)" : "none",
                    transition: "transform 0.3s",
                    color: open === i ? "#fff" : "var(--blue-light)",
                  }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>

              {open === i && (
                <div style={{ padding: "0 24px 20px" }}>
                  <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.85 }}>
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 52 }}>
          <p style={{ color: "var(--muted)", fontSize: 15, marginBottom: 18 }}>
            Başka sorularınız mı var?
          </p>
          <a href="#iletisim" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px",
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 10, color: "var(--blue-light)", textDecoration: "none",
            fontSize: 14, fontWeight: 600,
            transition: "background 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.18)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(59,130,246,0.1)")}>
            Bize Sorun →
          </a>
        </div>
      </div>
    </section>
  );
}
