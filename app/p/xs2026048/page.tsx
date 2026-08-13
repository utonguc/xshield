import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IT Danışmanlık Teklifi — Jazz Travel | xShield",
  robots: { index: false, follow: false },
};

export default function JazzProposalPage() {
  return (
    <>
      <style>{css}</style>
      <div className="doc">

        {/* ── COVER ── */}
        <div className="cover" id="cover">
          <div className="cover-brand">
            <div className="xshield">x<span>Shield</span></div>
            <div className="vl" />
            <div className="tagline">Yazılım & Dijital Platformlar</div>
          </div>
          <div className="cover-hero">
            <div className="eyebrow">Yönetilen IT Hizmetleri & Danışmanlık Teklifi</div>
            <div className="cover-title">Stratejik<br/>IT Ortaklığı</div>
            <div className="cover-sub">Jazz Travel için özel hazırlanmış aylık sabit ücretli IT yönetim ve danışmanlık paketi</div>
            <div className="pills">
              {["IT Yönetimi","Siber Güvenlik","Dijitalleşme","Yazılım Koordinasyonu","Altyapı Yönetimi","Aylık Sabit Ücret"].map(p => (
                <span key={p} className="pill">{p}</span>
              ))}
            </div>
          </div>
          <div className="cover-meta">
            <div>
              <div className="meta-label">Hazırlayan</div>
              <div className="meta-name">xShield Yazılım</div>
              <div className="meta-sub">xshield.com.tr</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="cover-badge">Mayıs 2026</div>
              <div className="meta-sub" style={{marginTop:8}}>Müşteri: Jazz Travel</div>
              <div className="meta-sub">Teklif No: XS-2026-048</div>
            </div>
          </div>
        </div>

        {/* ── 1. HAKKIMIZDA ── */}
        <div className="section" id="about">
          <div className="eyebrow">xShield Kimdir?</div>
          <h1 className="ptitle">Teknoloji Sorunlarınızın Tek Muhatabı</h1>
          <p className="pdesc">xShield; yazılım geliştirme, siber güvenlik ve yönetilen IT hizmetleri alanlarında faaliyet gösteren, kurumsal müşterilerine stratejik teknoloji ortaklığı sunan bir dijital platform şirketidir.</p>
          <div className="cards col2">
            <div className="card">
              <div className="ci">🎯</div>
              <h4>Tek Muhatap, Sıfır Karmaşa</h4>
              <p>Yazılım, donanım, ağ veya güvenlik — tüm IT talepleriniz için tek bir iletişim noktası. Siz sorunu tarif edin, geri kalanını biz halledelim.</p>
            </div>
            <div className="card">
              <div className="ci">🔗</div>
              <h4>Tedarikçi Köprüsü</h4>
              <p>Samo Tour, Sejour veya yazıcı üreticileri gibi 3. taraf destek ekipleriyle teknik dili konuşan, sorununuzu doğru aktaran aracı rolünü üstleniriz.</p>
            </div>
            <div className="card">
              <div className="ci">📊</div>
              <h4>Şeffaf & Ölçülebilir</h4>
              <p>Her talep kayıt altında. Aylık hizmet raporu ile gerçekleştirilen işleri, yanıt sürelerini ve açık konuları takip edersiniz.</p>
            </div>
            <div className="card">
              <div className="ci">🚀</div>
              <h4>Büyüme Ortağı</h4>
              <p>Günlük sorun çözmenin ötesinde; mevcut teknoloji envaternizi analiz eder, dijitalleşme yol haritanızı çizer ve uzun vadeli hedeflerinize katkı sağlarız.</p>
            </div>
          </div>
        </div>

        {/* ── 2. KAPSAM ── */}
        <div className="section section-alt" id="scope">
          <div className="eyebrow">Bölüm 2</div>
          <h1 className="ptitle">Hizmet Kapsamı — Genel Bakış</h1>
          <p className="pdesc">20–30 kişilik, tek lokasyonlu yapı için tasarlanmış kapsamlı IT yönetim paketi. Aylık sabit ücret: <strong>$500</strong></p>
          <div className="scope-grid">
            {scopeItems.map(s => (
              <div key={s.title} className="scope-item">
                <span className="scope-icon">{s.icon}</span>
                <span className="scope-title">{s.title}</span>
              </div>
            ))}
          </div>
          <div className="hl green" style={{marginTop:28}}>
            <strong>Paket Felsefesi:</strong> Jazz Travel ekibi IT sorunlarıyla değil, işiyle ilgilenmeli. Tüm teknoloji süreçleri xShield koordinasyonunda, şeffaf biçimde yürütülür.
          </div>
        </div>

        {/* ── 3. YARDIM MASASI ── */}
        <div className="section" id="helpdesk">
          <div className="eyebrow">Bölüm 3</div>
          <h1 className="ptitle">Yardım Masası & Sorun Yönetimi</h1>
          <p className="pdesc">Tüm IT talepleri kayıt altına alınır, takip edilir ve raporlanır.</p>

          <h2><span className="h2n">1</span> Nasıl Çalışır?</h2>
          <div className="flow">
            {["Kullanıcı e-posta ile talep açar","xShield talebi alır ve öncelik atar","Analiz & çözüm süreci başlar","Çözüm kullanıcıya bildirilir","Kayıt kapatılır & raporlanır"].map((step, i) => (
              <div key={i} className="flow-step">
                <div className="flow-n">{i + 1}</div>
                <div className="flow-text">{step}</div>
                {i < 4 && <div className="flow-arrow">→</div>}
              </div>
            ))}
          </div>
          <div className="hl orange" style={{marginTop:20}}>
            <strong>Önemli:</strong> Tüm talepler e-posta ile iletilmelidir. Sözlü veya telefon ile bildirilen sorunlar kayıt sistemine dahil edilmez; dolayısıyla aylık raporlara yansımaz ve SLA kapsamına girmez.
          </div>

          <h2><span className="h2n">2</span> Servis Seviyesi Taahhüdü (SLA)</h2>
          <div className="sla-table">
            <div className="sla-head">
              <div>Öncelik</div><div>Tanım</div><div>İlk Yanıt</div><div>Çözüm Hedefi</div>
            </div>
            {sla.map(r => (
              <div key={r[0]} className="sla-row">
                <div><span className={`sla-badge p${r[4]}`}>{r[0]}</span></div>
                <div className="sla-desc">{r[1]}</div>
                <div><strong>{r[2]}</strong></div>
                <div>{r[3]}</div>
              </div>
            ))}
          </div>
          <p style={{fontSize:11.5,color:"#64748b",marginTop:8}}>* Çalışma saatleri: Pazartesi–Cuma 09:00–18:00. Acil durumlarda WhatsApp/telefon ile öncelikli iletişim.</p>

          <h2><span className="h2n">3</span> Aylık Hizmet Raporu</h2>
          <div className="cards col3" style={{marginTop:8}}>
            <div className="card"><h4>Talep İstatistikleri</h4><p>Açılan, kapatılan ve bekleyen talepler; kategoriye ve kullanıcıya göre dağılım.</p></div>
            <div className="card"><h4>Performans Metrikleri</h4><p>Ortalama yanıt süresi, çözüm süresi ve SLA uyum oranı.</p></div>
            <div className="card"><h4>Öneriler & Aksiyon Planı</h4><p>Tekrarlayan sorunlar için kalıcı çözüm önerileri ve bir sonraki ay öncelikleri.</p></div>
          </div>
        </div>

        {/* ── 4. YAZILIM KOORDİNASYON ── */}
        <div className="section" id="software">
          <div className="eyebrow">Bölüm 4</div>
          <h1 className="ptitle">Yazılım Destek Koordinasyonu</h1>
          <p className="pdesc">Samo Tour, Sejour ve diğer özel yazılımlarda yaşanan sorunlarda xShield teknik köprü rolünü üstlenir.</p>

          <div className="hl orange">
            <strong>Sorumluluk Sınırı:</strong> xShield; Samo Tour ve Sejour yazılımlarının kaynak kodu, veritabanı veya sunucu altyapısına erişimi olmadığından bu yazılımların doğrudan teknik desteğini vermez. xShield&apos;in değeri, sorunu doğru analiz ederek yazılım üreticisinin destek ekibiyle etkin iletişim kurabilmesinden gelir.
          </div>

          <h2><span className="h2n">1</span> Koordinasyon Metodolojisi</h2>
          <div className="method-grid">
            <div className="method-step">
              <div className="ms-n">01</div>
              <h4>Sorun Tespiti</h4>
              <p>Kullanıcının yaşadığı sorun detaylıca dinlenir. Hata mesajları, ekran görüntüleri ve tekrarlanabilirlik analiz edilir.</p>
            </div>
            <div className="method-step">
              <div className="ms-n">02</div>
              <h4>Teknik Analiz</h4>
              <p>Sorunun yazılım mı, altyapı mı yoksa kullanıcı kaynaklı mı olduğu belirlenir. Log kayıtları ve sistem durumu incelenir.</p>
            </div>
            <div className="method-step">
              <div className="ms-n">03</div>
              <h4>Üretici İletişimi</h4>
              <p>Sorun, yazılım üreticisinin destek ekibine teknik terminoloji ile aktarılır. Gerekli ekler (log, screenshot, repro adımları) hazırlanır.</p>
            </div>
            <div className="method-step">
              <div className="ms-n">04</div>
              <h4>Takip & Aktarım</h4>
              <p>Üretici tarafındaki süreç takip edilir. Çözüm geldiğinde kullanıcıya uygulanır ve kayıt kapatılır.</p>
            </div>
          </div>

          <h2 style={{marginTop:28}}><span className="h2n">2</span> Yazıcı & Çevre Birimi Yönetimi</h2>
          <p>Yazıcı arızaları ve çevre birimi sorunlarında aynı metodoloji uygulanır: sorun analiz edilir, yetkili servis veya üretici destek hattı ile teknik iletişim kurulur. xShield, kullanıcı ile servis sağlayıcı arasındaki koordinasyonu yürütür.</p>
          <div className="cards col2">
            <div className="card">
              <h4>Kapsam Dahili</h4>
              <p>Yazıcı tanımlama, sürücü kurulumu, ağ yazıcısı yapılandırması, paylaşım ayarları, servis yönlendirme ve takip.</p>
            </div>
            <div className="card">
              <h4>Kapsam Dışı</h4>
              <p>Fiziksel parça değişimi, sarf malzeme (mürekkep, toner) temini ve yetkili servis ücretleri müşteri tarafından karşılanır.</p>
            </div>
          </div>
        </div>

        {/* ── 5. ALTYAPI ── */}
        <div className="section section-dark" id="infrastructure">
          <div className="eyebrow" style={{color:"#60a5fa"}}>Bölüm 5</div>
          <h1 className="ptitle" style={{color:"#f1f5f9"}}>Ağ & Altyapı Yönetimi</h1>
          <p className="pdesc" style={{color:"#94a3b8"}}>Ofis ağının sorunsuz, güvenli ve ölçeklenebilir çalışması için tüm altyapı bileşenlerinin yapılandırma ve yönetimi.</p>

          <div className="infra-grid">
            {infraItems.map(item => (
              <div key={item.title} className="infra-card">
                <div className="infra-icon">{item.icon}</div>
                <div className="infra-body">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                  <ul>{item.items.map(i => <li key={i}>{i}</li>)}</ul>
                </div>
              </div>
            ))}
          </div>

          <div className="hl-dark" style={{marginTop:28}}>
            <strong>⚠ Bulut Hizmetleri & Çalışma Garantisi:</strong> Jazz Travel bünyesinde fiziksel sunucu bulunmadığından, kullanılan yazılım ve hizmetlerin kesintisiz çalışma garantisi tamamen ilgili bulut servis sağlayıcısının sorumluluğundadır. xShield; bulut hizmetlerinin seçimi, yönetimi ve olası kesintilerde sağlayıcı ile koordinasyon konusunda destek sağlar ancak servis sürekliliğinden sorumlu tutulamaz.
          </div>
        </div>

        {/* ── 6. E-POSTA ── */}
        <div className="section" id="mail">
          <div className="eyebrow">Bölüm 6</div>
          <h1 className="ptitle">E-posta Sistemi Yönetimi</h1>
          <p className="pdesc">Kurumsal e-posta altyapısının güvenli, verimli ve düzenli çalışmasının sağlanması.</p>
          <div className="cards col2">
            <div className="card blue">
              <h4>Kullanıcı Yönetimi</h4>
              <p>Hesap açma/kapatma, şifre sıfırlama, kota yönetimi, grup ve dağıtım listesi yapılandırması.</p>
            </div>
            <div className="card blue">
              <h4>Güvenlik & Spam</h4>
              <p>Spam filtresi yapılandırması, SPF/DKIM/DMARC kaydı yönetimi, phishing koruması.</p>
            </div>
            <div className="card blue">
              <h4>Microsoft 365 / Google Workspace</h4>
              <p>Lisans yönetimi, uygulama izinleri, paylaşımlı takvim, Teams/Meet altyapısı yapılandırması.</p>
            </div>
            <div className="card blue">
              <h4>Arşiv & Uyumluluk</h4>
              <p>E-posta arşivleme politikası, yasal saklama gereksinimleri ve yedekleme yapılandırması.</p>
            </div>
          </div>
        </div>

        {/* ── 7. DİJİTALLEŞME & SİBER GÜVENLİK ── */}
        <div className="section" id="digital">
          <div className="eyebrow">Bölüm 7</div>
          <h1 className="ptitle">Dijitalleşme & Siber Güvenlik</h1>
          <p className="pdesc">Teknoloji envanterinden siber güvenlik stratejisine, Jazz Travel&apos;in dijital dönüşüm yolculuğunda rehberlik.</p>

          <h2><span className="h2n">1</span> Teknoloji Envanteri & Yol Haritası</h2>
          <div className="roadmap">
            <div className="rm-step">
              <div className="rm-icon">📋</div>
              <h4>Envanter Çıkarımı</h4>
              <p>Tüm donanım, yazılım lisansları, bulut abonelikleri ve ağ cihazlarının kataloglanması. Hangi cihaz nerede, ne kadar eski, ne zaman değişmeli?</p>
            </div>
            <div className="rm-arrow">→</div>
            <div className="rm-step">
              <div className="rm-icon">🎯</div>
              <h4>Hedef Mimari</h4>
              <p>Mevcut durum analizi sonucunda iş süreçlerini destekleyen ideal teknoloji mimarisinin belirlenmesi. Öncelikli iyileştirme alanları tespit edilir.</p>
            </div>
            <div className="rm-arrow">→</div>
            <div className="rm-step">
              <div className="rm-icon">🗺️</div>
              <h4>Dijitalleşme Planı</h4>
              <p>Belirlenen hedeflere ulaşmak için somut adımlar, tahmini maliyet ve öncelik sıralaması ile eylem planı oluşturulur.</p>
            </div>
            <div className="rm-arrow">→</div>
            <div className="rm-step">
              <div className="rm-icon">📈</div>
              <h4>Sürekli İyileştirme</h4>
              <p>Çeyrek dönemlik IT değerlendirme toplantıları. Plan güncellenir, yeni teknolojiler değerlendirilir.</p>
            </div>
          </div>

          <h2><span className="h2n">2</span> Siber Güvenlik Hizmetleri</h2>
          <div className="cards col2">
            <div className="card">
              <div className="ci">🔐</div>
              <h4>Kimlik & Erişim Yönetimi</h4>
              <p>Güçlü şifre politikası, çok faktörlü kimlik doğrulama (MFA), kullanıcı yetki matrisi ve düzenli erişim gözden geçirmesi.</p>
            </div>
            <div className="card">
              <div className="ci">🛡️</div>
              <h4>Tehdit İzleme & Müdahale</h4>
              <p>Olağandışı giriş denemeleri, şüpheli trafik ve güvenlik olaylarının tespiti. Olay müdahale sürecinin koordinasyonu.</p>
            </div>
            <div className="card">
              <div className="ci">📚</div>
              <h4>Kullanıcı Farkındalık Eğitimi</h4>
              <p>Yılda 2 kez phishing simülasyonu ve güvenlik bilinci eğitimi. Sosyal mühendislik saldırılarına karşı hazırlık.</p>
            </div>
            <div className="card">
              <div className="ci">🔄</div>
              <h4>Yama & Güncelleme Yönetimi</h4>
              <p>İşletim sistemi ve kritik yazılım güncellemelerinin takibi. Yama yönetimi politikası ve uygulama koordinasyonu.</p>
            </div>
            <div className="card">
              <div className="ci">💾</div>
              <h4>Yedekleme Danışmanlığı</h4>
              <p>Veri yedekleme stratejisinin tasarımı, 3-2-1 yedekleme kuralı uygulaması ve kurtarma testlerinin koordinasyonu.</p>
            </div>
            <div className="card">
              <div className="ci">📜</div>
              <h4>KVKK & Uyumluluk</h4>
              <p>Kişisel veri işleme süreçlerinde teknik uyumluluk danışmanlığı ve veri güvenliği önlemlerinin değerlendirilmesi.</p>
            </div>
          </div>
        </div>

        {/* ── 8. DEĞER KATAN ── */}
        <div className="section section-alt" id="value">
          <div className="eyebrow">Bölüm 8</div>
          <h1 className="ptitle">Değer Katan Hizmetler</h1>
          <p className="pdesc">Standart IT desteğinin ötesinde, iş süreçlerinizi doğrudan etkileyen stratejik katkılar.</p>

          <div className="value-grid">
            <div className="value-card">
              <div className="vc-header">
                <span className="vc-icon">👤</span>
                <h3>İşe Giriş / Çıkış Yönetimi</h3>
              </div>
              <p>Yeni çalışanın ilk IT kurulumundan ayrılan çalışanın hesap kapatma sürecine kadar tüm işlemler xShield koordinasyonunda yürütülür.</p>
              <ul>
                <li>E-posta ve sistem hesabı açılması</li>
                <li>Cihaz kurulumu ve yazılım yüklemesi</li>
                <li>Yazılım (Samo Tour, Sejour) erişim tanımlaması</li>
                <li>Güvenlik politikası ve kullanım kuralları bilgilendirmesi</li>
                <li>Ayrılışta hesap kapatma, veri aktarımı, erişim iptali</li>
              </ul>
              <div className="vc-note">Yeni personelin IT kurulumu için ilk başvuru noktası xShield&apos;dir.</div>
            </div>

            <div className="value-card">
              <div className="vc-header">
                <span className="vc-icon">⚙️</span>
                <h3>Küçük Ölçekli Yazılım Geliştirme</h3>
              </div>
              <p>İş süreçlerinizi kolaylaştıracak iç araçlar için sınırlı kapsamda yazılım geliştirme desteği sağlanır.</p>
              <ul>
                <li>Otomasyon scriptleri ve iş akışı araçları</li>
                <li>İç raporlama ve dashboard araçları</li>
                <li>Form ve veri toplama çözümleri</li>
                <li>API entegrasyonları (sınırlı kapsam)</li>
              </ul>
              <div className="vc-note">Büyük ölçekli yazılım projeleri ayrı teklifle değerlendirilir.</div>
            </div>

            <div className="value-card">
              <div className="vc-header">
                <span className="vc-icon">🛒</span>
                <h3>Satın Alma & Tedarik Danışmanlığı</h3>
              </div>
              <p>IT alımlarında doğru ürünü, doğru fiyata, doğru tedarikçiden almanızı sağlayacak teknik danışmanlık.</p>
              <ul>
                <li>Donanım ve yazılım ürün araştırması</li>
                <li>Fiyat/performans karşılaştırması</li>
                <li>Tedarikçi değerlendirmesi</li>
                <li>Satın alma sürecinde teknik şartname hazırlanması</li>
                <li>Lisans optimizasyonu ve yenileme takibi</li>
              </ul>
              <div className="vc-note">Tedarik kararlarında bağımsız teknik görüş sağlanır.</div>
            </div>
          </div>
        </div>

        {/* ── 9. SORUMLULUKLAR ── */}
        <div className="section" id="responsibilities">
          <div className="eyebrow">Bölüm 9</div>
          <h1 className="ptitle">Sorumluluk Sınırları</h1>
          <p className="pdesc">Hizmet kalitesi için açık sorumluluk tanımları.</p>

          <div className="resp-grid">
            <div>
              <h2><span className="h2n" style={{background:"#059669"}}>✓</span> Kapsam Dahili</h2>
              <ul className="resp-list">
                {inScope.map(i => <li key={i} className="in"><span>✓</span>{i}</li>)}
              </ul>
            </div>
            <div>
              <h2><span className="h2n" style={{background:"#dc2626"}}>✕</span> Kapsam Dışı</h2>
              <ul className="resp-list">
                {outScope.map(i => <li key={i} className="out"><span>✕</span>{i}</li>)}
              </ul>
            </div>
          </div>

          <h2 style={{marginTop:32}}><span className="h2n">!</span> Karşılıklı Yükümlülükler</h2>
          <table>
            <thead><tr><th>Konu</th><th>xShield Yükümlülüğü</th><th>Jazz Travel Yükümlülüğü</th></tr></thead>
            <tbody>
              <tr><td>Talep yönetimi</td><td>E-posta ile açılan tüm taleplere SLA dahilinde yanıt</td><td>Tüm taleplerin e-posta ile kayıt altına alınması</td></tr>
              <tr><td>Erişim & bilgi</td><td>Gizlilik taahhüdü, güvenli erişim yönetimi</td><td>Gerekli sistem erişimlerinin zamanında sağlanması</td></tr>
              <tr><td>3. parti yazılımlar</td><td>Sorun analizi ve üretici koordinasyonu</td><td>Yazılım lisans bilgileri ve üretici hesaplarının paylaşılması</td></tr>
              <tr><td>Donanım değişimi</td><td>Teknik şartname ve tedarikçi yönlendirmesi</td><td>Yeni donanım maliyetinin karşılanması</td></tr>
              <tr><td>Bulut hizmetleri</td><td>Sağlayıcı koordinasyonu ve kesinti iletişimi</td><td>Bulut abonelik ücretleri Jazz Travel sorumluluğundadır</td></tr>
              <tr><td>Güvenlik olayı</td><td>Tespit, analiz ve müdahale koordinasyonu</td><td>Olayların derhal bildirilmesi, önerilerin uygulanması</td></tr>
            </tbody>
          </table>
        </div>

        {/* ── 10. TEKLİF ── */}
        <div className="section" id="proposal">
          <div className="eyebrow">Bölüm 10</div>
          <h1 className="ptitle">Teklif & Koşullar</h1>
          <p className="pdesc">Jazz Travel için özel hazırlanmış aylık sabit ücretli IT yönetim paketi.</p>

          <div className="parties">
            <div className="party">
              <div className="party-lbl">Hizmet Sağlayıcı</div>
              <p><strong>xShield Yazılım</strong><br/>xshield.com.tr<br/>info@xshield.com.tr</p>
            </div>
            <div className="party">
              <div className="party-lbl">Müşteri</div>
              <p><strong>Jazz Travel</strong><br/>20–30 Çalışan · 1 Lokasyon</p>
            </div>
          </div>

          <div className="price-box">
            <div className="price-head">
              <h3>Aylık Hizmet Bedeli</h3>
              <div className="price-total">$500<span style={{fontSize:16,fontWeight:400,color:"#94a3b8"}}> / ay</span></div>
            </div>
            <div className="price-rows">
              <div className="price-row"><span>Yardım masası & sorun yönetimi (sınırsız talep)</span><strong>✓</strong></div>
              <div className="price-row"><span>Yazılım destek koordinasyonu (Samo Tour, Sejour, diğer)</span><strong>✓</strong></div>
              <div className="price-row"><span>Ağ & altyapı yönetimi (AP, Switch, NAS, Firewall)</span><strong>✓</strong></div>
              <div className="price-row"><span>E-posta sistemi yönetimi</span><strong>✓</strong></div>
              <div className="price-row"><span>Siber güvenlik & farkındalık eğitimi</span><strong>✓</strong></div>
              <div className="price-row"><span>İşe giriş/çıkış IT yönetimi</span><strong>✓</strong></div>
              <div className="price-row"><span>Aylık hizmet raporu</span><strong>✓</strong></div>
              <div className="price-row"><span>Çeyreklik IT değerlendirme toplantısı</span><strong>✓</strong></div>
            </div>
          </div>

          <h2><span className="h2n">1</span> Sözleşme Koşulları</h2>
          <table style={{marginBottom:8}}>
            <thead><tr><th>Konu</th><th>Detay</th></tr></thead>
            <tbody>
              <tr><td>Sözleşme süresi</td><td>Minimum 3 ay; 12 aylık taahhüt için öncelikli destek garantisi</td></tr>
              <tr><td>Fesih bildirimi</td><td>30 gün önceden yazılı bildirim</td></tr>
              <tr><td>Ödeme</td><td>Aylık, ay başında peşin; fatura kesim tarihi ay ilk iş günü</td></tr>
              <tr><td>İlk kurulum</td><td>Onboarding haftası (envanter + sistem tanımlama) ücretsiz</td></tr>
              <tr><td>Çalışma saatleri</td><td>Pazartesi–Cuma 09:00–18:00; acil durum hattı ayrıca tanımlanır</td></tr>
            </tbody>
          </table>
          <p style={{fontSize:11.5,color:"#64748b",marginBottom:32}}>* Fiyatlara KDV dahil değildir. 3. parti hizmet bedelleri (bulut abonelikler, donanım, yetkili servis ücretleri) kapsam dışıdır.</p>

          <div className="cta-block">
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:4}}>Bir Sonraki Adım</div>
              <div style={{fontSize:13,color:"#64748b"}}>Bu teklifi onaylamak veya detayları görüşmek için iletişime geçin. Onboarding haftasını ücretsiz başlatmaya hazırız.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end"}}>
              <a className="cta-btn" href="mailto:info@xshield.com.tr">✉ Teklifi Onayla</a>
              <span style={{fontSize:11,color:"#94a3b8",textAlign:"right"}}>Teklif No: XS-2026-048 · 30 gün geçerli</span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

/* ── DATA ── */

const scopeItems = [
  { icon:"🎫", title:"Yardım Masası & Talep Yönetimi" },
  { icon:"🔗", title:"Samo Tour & Sejour Koordinasyonu" },
  { icon:"🖨️", title:"Yazıcı & Çevre Birimi Yönetimi" },
  { icon:"📡", title:"AP & Switch Yönetimi" },
  { icon:"🔥", title:"Firewall Yapılandırması" },
  { icon:"🗄️", title:"NAS Yönetimi" },
  { icon:"✉️", title:"E-posta Sistemi Yönetimi" },
  { icon:"🛡️", title:"Siber Güvenlik" },
  { icon:"🗺️", title:"Dijitalleşme Yol Haritası" },
  { icon:"👤", title:"İşe Giriş / Çıkış IT Yönetimi" },
  { icon:"⚙️", title:"Küçük Ölçekli Yazılım Geliştirme" },
  { icon:"🛒", title:"Satın Alma & Tedarik Danışmanlığı" },
  { icon:"📊", title:"Aylık Hizmet Raporu" },
  { icon:"☁️", title:"Bulut Hizmet Koordinasyonu" },
  { icon:"📋", title:"Teknoloji Envanteri" },
  { icon:"🔑", title:"Lisans & Varlık Yönetimi" },
];

const sla = [
  ["KRİTİK","İş tamamen durdu (sistem erişimi yok, veri kaybı riski)","2 saat","4 iş saati","h"],
  ["YÜKSEK","Ciddi iş etkisi (temel işlev çalışmıyor)","4 saat","1 iş günü","m"],
  ["NORMAL","Standart sorun veya yavaşlama","1 iş günü","3 iş günü","l"],
  ["BİLGİ","Soru, öneri veya bilgi talebi","2 iş günü","5 iş günü","i"],
];

const infraItems = [
  {
    icon:"📡",
    title:"Erişim Noktaları (AP)",
    desc:"Kablosuz ağ altyapısının yönetimi ve optimizasyonu.",
    items:["SSID ve kanal yapılandırması","Misafir ağı segmentasyonu","Sinyal kalitesi izleme ve iyileştirme","Firmware güncelleme yönetimi"],
  },
  {
    icon:"🔀",
    title:"Switch & Ağ Yönetimi",
    desc:"LAN altyapısı ve ağ segmentasyonu.",
    items:["VLAN yapılandırması","Port güvenliği ve yönetimi","Ağ topolojisi dokümantasyonu","Bant genişliği izleme"],
  },
  {
    icon:"🔥",
    title:"Firewall Yönetimi",
    desc:"Ağ güvenliğinin merkezi noktası.",
    items:["Güvenlik kuralları yönetimi","VPN tüneli kurulumu ve yönetimi","İçerik filtreleme politikaları","Güvenlik günlüğü izleme"],
  },
  {
    icon:"🗄️",
    title:"NAS (Ağ Depolama)",
    desc:"Merkezi dosya depolama ve yönetimi.",
    items:["Kullanıcı paylaşım klasörü yapılandırması","Yedekleme politikası entegrasyonu","Erişim yetki yönetimi","Kapasite izleme ve planlama"],
  },
];

const inScope = [
  "Tüm yazılım sorunlarında analiz ve üretici koordinasyonu",
  "AP, Switch, Firewall, NAS yapılandırma ve yönetimi",
  "E-posta hesapları ve sistem yönetimi",
  "Virüs/zararlı yazılım tespiti ve temizleme koordinasyonu",
  "Uzaktan destek (TeamViewer, RDP veya benzeri)",
  "Yeni cihaz kurulumu ve ağa eklenmesi",
  "Kullanıcı hesabı oluşturma, düzenleme ve silme",
  "VPN kurulumu ve yönetimi",
  "Teknoloji envanter takibi ve güncellenmesi",
  "Çeyreklik IT durum değerlendirmesi",
];

const outScope = [
  "Samo Tour ve Sejour yazılımlarının doğrudan teknik desteği",
  "Fiziksel donanım tamiri ve parça değişimi",
  "3. parti hizmet ve abonelik ücretleri",
  "Büyük ölçekli yazılım geliştirme projeleri",
  "Bulut servis sağlayıcısından kaynaklanan kesintiler",
  "Elektrik altyapısı ve fiziksel kablo döşemesi",
  "Yetkili servis gerektiren garanti işlemleri",
  "Yazılım lisans bedelleri",
];

/* ── CSS ── */
const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;font-size:13px;color:#334155;background:#0f172a;line-height:1.6}
.doc{max-width:960px;margin:0 auto}

.cover{background:linear-gradient(145deg,#0f172a 0%,#1e293b 60%,#0a2010 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:60px;min-height:100vh}
.cover-brand{display:flex;align-items:center;gap:12px}
.xshield{font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#94a3b8}
.xshield span{color:#3b82f6}
.vl{width:1px;height:24px;background:#334155}
.tagline{font-size:12px;color:#64748b;letter-spacing:0.5px}
.cover-hero{flex:1;display:flex;flex-direction:column;justify-content:center;padding:80px 0 60px}
.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#3b82f6;font-weight:700;margin-bottom:8px}
.cover-title{font-size:72px;font-weight:900;letter-spacing:-3px;line-height:1.05;margin-bottom:10px;background:linear-gradient(135deg,#fff 0%,#86efac 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cover-sub{font-size:18px;color:#94a3b8;font-weight:400;margin-bottom:48px;max-width:520px;line-height:1.6}
.pills{display:flex;gap:8px;flex-wrap:wrap}
.pill{background:rgba(134,239,172,0.12);border:1px solid rgba(134,239,172,0.3);color:#86efac;padding:5px 13px;border-radius:20px;font-size:11.5px;font-weight:500}
.cover-meta{display:flex;justify-content:space-between;align-items:flex-end}
.meta-label{font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#475569;margin-bottom:4px}
.meta-name{font-size:15px;font-weight:700;color:#cbd5e1}
.meta-sub{font-size:12px;color:#475569}
.cover-badge{display:inline-block;background:rgba(134,239,172,0.15);color:#86efac;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px}

.section{background:#fff;padding:64px 72px}
.section+.section{border-top:3px solid #f1f5f9}
.section-alt{background:#f8fafc}
.section-dark{background:#0f172a}

.ptitle{font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.6px;margin-bottom:6px}
.pdesc{font-size:13px;color:#64748b;margin-bottom:32px;max-width:580px;line-height:1.7}
h2{font-size:14px;font-weight:700;color:#0f172a;margin:24px 0 12px;display:flex;align-items:center;gap:10px}
.h2n{width:24px;height:24px;background:#2563eb;color:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
p{margin-bottom:10px;line-height:1.7}

.hl{border-left:4px solid #2563eb;background:#eff6ff;padding:14px 18px;border-radius:0 8px 8px 0;margin:16px 0;color:#1e293b;line-height:1.7;font-size:12.5px}
.hl.orange{background:#fffbeb;border-color:#d97706}
.hl.green{background:#f0fdf4;border-color:#059669}
.hl-dark{border-left:4px solid #f59e0b;background:rgba(245,158,11,0.08);padding:14px 18px;border-radius:0 8px 8px 0;color:#fde68a;font-size:12.5px;line-height:1.7}

.cards{display:grid;gap:12px;margin:16px 0}
.col2{grid-template-columns:1fr 1fr}
.col3{grid-template-columns:1fr 1fr 1fr}
.card{border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px}
.card .ci{font-size:22px;margin-bottom:10px}
.card h4{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:5px}
.card p{font-size:11.5px;color:#334155;margin:0;line-height:1.6}
.card.blue{border-color:#bfdbfe;background:#f0f9ff}

.scope-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
.scope-item{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 12px;display:flex;align-items:center;gap:10px}
.scope-icon{font-size:18px;flex-shrink:0}
.scope-title{font-size:11.5px;font-weight:600;color:#334155;line-height:1.4}

.flow{display:flex;align-items:flex-start;gap:0;margin:16px 0;flex-wrap:wrap}
.flow-step{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:120px;text-align:center;padding:12px 6px}
.flow-n{width:32px;height:32px;background:#2563eb;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.flow-text{font-size:11px;color:#334155;font-weight:500;line-height:1.4}
.flow-arrow{color:#cbd5e1;font-size:20px;padding-top:12px;flex-shrink:0}

.sla-table{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:12px}
.sla-head{display:grid;grid-template-columns:100px 1fr 120px 140px;background:#0f172a;color:#fff}
.sla-head>div{padding:10px 14px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
.sla-row{display:grid;grid-template-columns:100px 1fr 120px 140px;border-top:1px solid #e2e8f0}
.sla-row>div{padding:11px 14px;font-size:12px;color:#334155}
.sla-desc{font-size:11.5px;color:#64748b}
.sla-badge{padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap}
.sla-badge.ph{background:#fee2e2;color:#991b1b}
.sla-badge.pm{background:#fef3c7;color:#92400e}
.sla-badge.pl{background:#d1fae5;color:#065f46}
.sla-badge.pi{background:#e0f2fe;color:#075985}

.method-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;margin:20px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.method-step{padding:20px 18px;border-right:1px solid #e2e8f0}
.method-step:last-child{border-right:none}
.ms-n{font-size:28px;font-weight:900;color:#e2e8f0;margin-bottom:10px;letter-spacing:-1px}
.method-step h4{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px}
.method-step p{font-size:11.5px;color:#64748b;margin:0;line-height:1.6}

.infra-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
.infra-card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;display:flex;gap:16px}
.infra-icon{font-size:28px;flex-shrink:0;margin-top:2px}
.infra-body h4{font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:6px}
.infra-body p{font-size:11.5px;color:#94a3b8;margin-bottom:10px}
.infra-body ul{list-style:none;display:flex;flex-direction:column;gap:3px}
.infra-body ul li{font-size:11px;color:#64748b;padding-left:12px;position:relative}
.infra-body ul li::before{content:'→';position:absolute;left:0;color:#3b82f6;font-size:9px;top:2px}

.roadmap{display:flex;align-items:flex-start;gap:0;margin:20px 0}
.rm-step{flex:1;padding:20px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}
.rm-icon{font-size:28px;margin-bottom:10px}
.rm-step h4{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px}
.rm-step p{font-size:11.5px;color:#64748b;margin:0;line-height:1.6}
.rm-arrow{color:#cbd5e1;font-size:24px;padding:20px 8px 0;flex-shrink:0}

.value-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:8px}
.value-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px}
.vc-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.vc-icon{font-size:24px}
.value-card h3{font-size:13px;font-weight:700;color:#0f172a}
.value-card p{font-size:11.5px;color:#64748b;margin-bottom:10px;line-height:1.6}
.value-card ul{list-style:none;display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.value-card ul li{font-size:11px;color:#334155;padding-left:13px;position:relative}
.value-card ul li::before{content:'→';position:absolute;left:0;color:#2563eb;font-size:9px;top:2px}
.vc-note{font-size:10.5px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:10px;font-style:italic}

.resp-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:8px}
.resp-list{list-style:none;display:flex;flex-direction:column;gap:8px;margin-top:12px}
.resp-list li{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.5}
.resp-list li span{font-size:11px;font-weight:700;flex-shrink:0;margin-top:2px}
.resp-list li.in span{color:#059669}
.resp-list li.out span{color:#dc2626}

table{width:100%;border-collapse:collapse;font-size:11.5px;margin:12px 0}
th{background:#0f172a;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
td{padding:8px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;line-height:1.55}
tr:last-child td{border-bottom:none}

.parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.party{border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px}
.party-lbl{font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;font-weight:600;margin-bottom:10px}
.party p{line-height:2;color:#334155;font-size:12.5px}
.party strong{color:#0f172a}

.price-box{background:#0f172a;border-radius:10px;overflow:hidden;margin:20px 0}
.price-head{background:#1e293b;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.price-head h3{color:#fff;font-size:13px;margin:0}
.price-total{font-size:28px;font-weight:900;color:#86efac;letter-spacing:-1px}
.price-rows{padding:4px 0}
.price-row{display:flex;justify-content:space-between;padding:10px 20px;border-bottom:1px solid #1e293b;align-items:center}
.price-row:last-child{border-bottom:none}
.price-row span{color:#94a3b8;font-size:12px}
.price-row strong{color:#86efac;font-size:13px}

.cta-block{display:flex;align-items:center;justify-content:space-between;background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:24px 28px;margin-top:8px;gap:24px}
.cta-btn{background:#059669;color:#fff;padding:13px 24px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;white-space:nowrap}
.cta-btn:hover{background:#047857}
`;
