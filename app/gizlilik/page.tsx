import type { Metadata } from "next";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | xShield Teknoloji",
  description: "xShield Teknoloji gizlilik politikası: kişisel verilerinizi nasıl topladığımız, kullandığımız ve koruduğumuz.",
};

export default function GizlilikPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: "#030508", minHeight: "100vh", paddingTop: 120, paddingBottom: 100 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#8b5cf6", marginBottom: 16 }}>Yasal</div>
            <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.4rem)", fontWeight: 900, letterSpacing: "-2px", color: "#fff", lineHeight: 1.1, margin: 0 }}>
              Gizlilik Politikası
            </h1>
            <p style={{ marginTop: 16, color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Son güncelleme: Ocak 2025</p>
          </div>

          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.9 }}>

            <Section title="1. Genel Bakış">
              <p>Bu Gizlilik Politikası, <strong style={{ color: "#fff" }}>xShield Teknoloji</strong> (&ldquo;xShield&rdquo;, &ldquo;Şirket&rdquo;, &ldquo;biz&rdquo;) tarafından işletilen <strong style={{ color: "#fff" }}>xshield.com.tr</strong> web sitesi ve bağlı SaaS platformları aracılığıyla toplanan bilgilerin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.</p>
              <p>Sitemizi kullanmaya devam ederek bu politikayı kabul etmiş sayılırsınız. Bu politikayı kabul etmiyorsanız lütfen sitemizi kullanmayınız.</p>
            </Section>

            <Section title="2. Topladığımız Bilgiler">
              <p><strong style={{ color: "#fff" }}>Doğrudan Sağlanan Bilgiler:</strong></p>
              <ul>
                <li>İletişim formlarında girilen ad, e-posta, telefon ve mesaj içerikleri</li>
                <li>Demo/teklif taleplerinde paylaşılan iş bilgileri</li>
                <li>SaaS ürünlerimizde oluşturulan hesap bilgileri</li>
              </ul>
              <p><strong style={{ color: "#fff" }}>Otomatik Olarak Toplanan Bilgiler:</strong></p>
              <ul>
                <li>IP adresi, tarayıcı türü ve versiyonu</li>
                <li>İşletim sistemi</li>
                <li>Ziyaret edilen sayfalar ve ziyaret süresi</li>
                <li>Çerez ve benzeri izleme teknolojilerinden elde edilen veriler</li>
                <li>Referans URL (sitemize nasıl ulaştığınız)</li>
              </ul>
            </Section>

            <Section title="3. Bilgilerin Kullanım Amacı">
              <p>Topladığımız bilgileri şu amaçlarla kullanırız:</p>
              <ul>
                <li>Teklif, destek ve bilgi taleplerinizi yanıtlamak</li>
                <li>Hizmetlerimizi sunmak ve geliştirmek</li>
                <li>Hesap yönetimi ve müşteri ilişkileri yürütmek</li>
                <li>Yasal yükümlülüklerimizi yerine getirmek</li>
                <li>Güvenlik tehditlerini tespit etmek ve önlemek</li>
                <li>Site performansını ölçmek ve kullanıcı deneyimini iyileştirmek</li>
                <li>Hizmetlerimiz hakkında bilgilendirme yapmak (rıza dahilinde)</li>
              </ul>
            </Section>

            <Section title="4. Bilgilerin Paylaşımı">
              <p>Kişisel bilgilerinizi aşağıdaki durumlar dışında üçüncü taraflarla paylaşmayız:</p>
              <ul>
                <li><strong style={{ color: "#fff" }}>Hizmet Sağlayıcılar:</strong> Altyapı, hosting, e-posta gönderimi gibi operasyonel hizmetler için çalıştığımız iş ortakları — yalnızca hizmet kapsamında, gizlilik sözleşmesi çerçevesinde</li>
                <li><strong style={{ color: "#fff" }}>Yasal Zorunluluklar:</strong> Mahkeme kararı, idari emir veya yasal düzenleme gerektirdiğinde</li>
                <li><strong style={{ color: "#fff" }}>İş Transferleri:</strong> Şirket birleşmesi veya devralma durumunda, önceden bilgilendirme yapılarak</li>
                <li><strong style={{ color: "#fff" }}>Açık Rıza:</strong> Açıkça onay verdiğiniz üçüncü taraflarla</li>
              </ul>
            </Section>

            <Section title="5. Veri Güvenliği">
              <p>Kişisel verilerinizin güvenliği için endüstri standardı teknik ve idari önlemler uyguluyoruz:</p>
              <ul>
                <li>TLS/SSL ile şifreli veri iletimi</li>
                <li>Veritabanı düzeyinde şifreleme</li>
                <li>Erişim denetimi ve yetkilendirme kontrolleri</li>
                <li>Düzenli güvenlik denetimleri ve sızma testleri</li>
                <li>Tüm veriler Türkiye&apos;deki sunucularda saklanmaktadır</li>
              </ul>
              <p>Hiçbir internet iletimi veya elektronik depolama yöntemi %100 güvenli değildir. Makul ölçüde koruma sağlasak da mutlak güvenliği garanti edemeyiz.</p>
            </Section>

            <Section title="6. Çerezler (Cookies)">
              <p>Web sitemiz çerezler kullanmaktadır. Kullandığımız çerez türleri:</p>
              <ul>
                <li><strong style={{ color: "#fff" }}>Zorunlu Çerezler:</strong> Sitenin temel işlevleri için gereklidir; devre dışı bırakılamaz.</li>
                <li><strong style={{ color: "#fff" }}>Tercih Çerezleri:</strong> Dil ve görünüm gibi tercihlerinizi hatırlar.</li>
                <li><strong style={{ color: "#fff" }}>Analitik Çerezler:</strong> Site kullanımını anlayıp iyileştirmek için anonim istatistik toplar.</li>
              </ul>
              <p>Tarayıcı ayarlarınızdan çerezleri yönetebilir veya silebilirsiniz. Tarayıcınızın &ldquo;Yardım&rdquo; bölümü bu konuda rehberlik sağlar.</p>
            </Section>

            <Section title="7. Üçüncü Taraf Bağlantılar">
              <p>Web sitemiz üçüncü taraf web sitelerine bağlantılar içerebilir. Bu sitelerin gizlilik uygulamalarından sorumlu değiliz. Bağlantıya tıkladığınızda ilgili sitenin gizlilik politikasını incelemenizi öneririz.</p>
            </Section>

            <Section title="8. Veri Saklama Süreleri">
              <p>Kişisel verileriniz şu sürelere kadar saklanır:</p>
              <ul>
                <li>İletişim ve teklif talepleri: Sonuçlandırılmasından itibaren 2 yıl</li>
                <li>Müşteri sözleşme kayıtları: Sözleşme bitiminden itibaren 10 yıl (TTK)</li>
                <li>Fatura ve mali kayıtlar: 5 yıl (VUK)</li>
                <li>Teknik loglar: 6 ay</li>
              </ul>
            </Section>

            <Section title="9. Çocukların Gizliliği">
              <p>Hizmetlerimiz 18 yaşın altındaki kişilere yönelik değildir. 18 yaşın altındaki bir kullanıcıya ait kişisel veri toplandığını fark edersek, bu veriyi derhal sileriz. Böyle bir durumdan haberdar olursanız lütfen bizimle iletişime geçin.</p>
            </Section>

            <Section title="10. Politika Değişiklikleri">
              <p>Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikler e-posta veya web sitemizde belirgin duyuru ile bildirilir. Güncel tarihi sayfanın üst kısmında görüntüleyebilirsiniz. Değişiklikler yayınlandıktan sonra siteyi kullanmaya devam etmeniz yeni politikayı kabul ettiğiniz anlamına gelir.</p>
            </Section>

            <Section title="11. İletişim">
              <p>Gizlilik politikamız veya kişisel verilerinizle ilgili sorularınız için:</p>
              <p><strong style={{ color: "#fff" }}>xShield Teknoloji</strong><br />
              E-posta: <a href="mailto:info@xshield.com.tr" style={{ color: "#8b5cf6", textDecoration: "none" }}>info@xshield.com.tr</a><br />
              Web: <a href="https://xshield.com.tr" style={{ color: "#8b5cf6", textDecoration: "none" }}>xshield.com.tr</a></p>
              <p>KVKK kapsamındaki haklarınızı kullanmak için lütfen <a href="/kvkk" style={{ color: "#8b5cf6", textDecoration: "none" }}>KVKK Aydınlatma Metni</a> sayfamızı inceleyin.</p>
            </Section>

          </div>

          <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="/" style={{ padding: "12px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Ana Sayfaya Dön</a>
            <a href="/kvkk" style={{ padding: "12px 24px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, color: "#a78bfa", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>KVKK Aydınlatma Metni →</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 16, letterSpacing: "-0.3px" }}>{title}</h2>
      {children}
    </div>
  );
}
