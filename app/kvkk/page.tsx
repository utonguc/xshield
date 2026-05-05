import type { Metadata } from "next";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni | xShield Teknoloji",
  description: "xShield Teknoloji olarak kişisel verilerinizin işlenmesine ilişkin aydınlatma metni.",
};

export default function KvkkPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: "#030508", minHeight: "100vh", paddingTop: 120, paddingBottom: 100 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#3b82f6", marginBottom: 16 }}>Yasal</div>
            <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.4rem)", fontWeight: 900, letterSpacing: "-2px", color: "#fff", lineHeight: 1.1, margin: 0 }}>
              KVKK Aydınlatma Metni
            </h1>
            <p style={{ marginTop: 16, color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Son güncelleme: Ocak 2025</p>
          </div>

          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.9 }}>

            <Section title="1. Veri Sorumlusu">
              <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) kapsamında <strong style={{ color: "#fff" }}>xShield Teknoloji</strong> (&ldquo;Şirket&rdquo;, &ldquo;biz&rdquo;) veri sorumlusu sıfatını haizdir. Bu metin, web sitemiz (<strong style={{ color: "#fff" }}>xshield.com.tr</strong>) aracılığıyla toplanan kişisel verilerin hangi amaçlarla, hangi hukuki dayanaklarla ve hangi süreyle işlendiğini açıklamaktadır.</p>
            </Section>

            <Section title="2. Toplanan Kişisel Veriler">
              <p>Hizmetlerimizden faydalanmanız ve iletişim formlarını doldurmanız esnasında aşağıdaki kişisel veriler toplanabilir:</p>
              <ul>
                <li><strong style={{ color: "#fff" }}>Kimlik verisi:</strong> Ad, soyad</li>
                <li><strong style={{ color: "#fff" }}>İletişim verisi:</strong> E-posta adresi, telefon numarası</li>
                <li><strong style={{ color: "#fff" }}>Kurumsal bilgi:</strong> Şirket adı, iş unvanı</li>
                <li><strong style={{ color: "#fff" }}>İşlem verisi:</strong> Talep ve mesaj içerikleri</li>
                <li><strong style={{ color: "#fff" }}>Teknik veri:</strong> IP adresi, tarayıcı türü, ziyaret tarihi/saati, çerez verileri</li>
              </ul>
            </Section>

            <Section title="3. Kişisel Verilerin İşlenme Amaçları">
              <p>Toplanan kişisel veriler aşağıdaki amaçlarla işlenmektedir:</p>
              <ul>
                <li>Teklif, bilgi ve destek taleplerinin yanıtlanması</li>
                <li>Hizmet ve ürün bilgilendirmesi yapılması</li>
                <li>Sözleşme ilişkisinin kurulması ve yürütülmesi</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                <li>Web sitesi kullanımının analiz edilmesi ve iyileştirilmesi</li>
                <li>Müşteri memnuniyeti ölçümü ve hizmet kalitesinin artırılması</li>
              </ul>
            </Section>

            <Section title="4. Kişisel Veri İşlemenin Hukuki Dayanağı">
              <p>Kişisel verileriniz KVKK&apos;nın 5. ve 6. maddeleri kapsamında aşağıdaki hukuki dayanaklar çerçevesinde işlenmektedir:</p>
              <ul>
                <li>Açık rızanızın bulunması (form gönderimi)</li>
                <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması</li>
                <li>Veri sorumlusunun hukuki yükümlülüklerini yerine getirmesi</li>
                <li>Veri sorumlusunun meşru menfaatlerinin korunması</li>
              </ul>
            </Section>

            <Section title="5. Kişisel Verilerin Aktarılması">
              <p>Kişisel verileriniz; yasal zorunluluklar dışında, açık rızanız olmaksızın üçüncü taraflara aktarılmaz. Aşağıdaki durumlarda veri paylaşımı söz konusu olabilir:</p>
              <ul>
                <li>Hizmet aldığımız teknik altyapı sağlayıcıları (bulut, hosting, e-posta hizmet sağlayıcıları) — yalnızca hizmet kapsamında ve gizlilik sözleşmesi çerçevesinde</li>
                <li>Yetkili kamu kurum ve kuruluşları — yasal zorunluluk halinde</li>
                <li>İş ortakları — yalnızca ilgili hizmetin sunulması için gerekli ölçüde ve açık rıza alınarak</li>
              </ul>
              <p>Yurt dışına veri aktarımı, KVKK&apos;nın 9. maddesi kapsamında ve gerekli güvenceler sağlanarak yapılmaktadır.</p>
            </Section>

            <Section title="6. Kişisel Verilerin Saklanma Süresi">
              <p>Kişisel verileriniz, işlenme amacının gerektirdiği süre boyunca ve yasal saklama yükümlülükleri gözetilerek saklanır. Ticari kayıtlar Türk Ticaret Kanunu gereği 10 yıl; vergi ile ilgili veriler Vergi Usul Kanunu gereği 5 yıl süreyle muhafaza edilir. İletişim form verileri ise talebinizin sonuçlandırılmasından itibaren en fazla 2 yıl saklanır.</p>
            </Section>

            <Section title="7. İlgili Kişinin Hakları">
              <p>KVKK&apos;nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
              <ul>
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
                <li>Silinmesini veya yok edilmesini isteme</li>
                <li>Düzeltme, silme/yok etme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme</li>
                <li>Münhasıran otomatik sistemler aracılığıyla analiz edilmesi suretiyle aleyhinize bir sonuç ortaya çıkmasına itiraz etme</li>
                <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
              </ul>
              <p>Haklarınızı kullanmak için <strong style={{ color: "#3b82f6" }}>info@xshield.com.tr</strong> adresine yazılı olarak başvurabilirsiniz. Talebiniz en geç 30 gün içinde yanıtlanacaktır.</p>
            </Section>

            <Section title="8. Çerez (Cookie) Politikası">
              <p>Web sitemiz, kullanım deneyimini iyileştirmek amacıyla çerezler kullanmaktadır. Oturum çerezleri tarayıcınız kapatıldığında silinir; tercih çerezleri ise 1 yıla kadar saklanabilir. Tarayıcınızın ayarlarından çerezleri devre dışı bırakabilirsiniz; ancak bu durumda bazı site işlevleri çalışmayabilir.</p>
            </Section>

            <Section title="9. İletişim">
              <p>Bu aydınlatma metnine ilişkin sorularınız veya veri işleme ile ilgili talepleriniz için:</p>
              <p><strong style={{ color: "#fff" }}>xShield Teknoloji</strong><br />
              E-posta: <a href="mailto:info@xshield.com.tr" style={{ color: "#3b82f6", textDecoration: "none" }}>info@xshield.com.tr</a><br />
              Web: <a href="https://xshield.com.tr" style={{ color: "#3b82f6", textDecoration: "none" }}>xshield.com.tr</a></p>
            </Section>

          </div>

          <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="/" style={{ padding: "12px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Ana Sayfaya Dön</a>
            <a href="/gizlilik" style={{ padding: "12px 24px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, color: "#60a5fa", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Gizlilik Politikası →</a>
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
