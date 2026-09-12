export type BlogBlock = { type: "p"; text: string } | { type: "h2"; text: string } | { type: "ul"; items: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  readTime: string;
  category: string;
  content: BlogBlock[];
};

const p = (text: string): BlogBlock => ({ type: "p", text });
const h2 = (text: string): BlogBlock => ({ type: "h2", text });
const ul = (items: string[]): BlogBlock => ({ type: "ul", items });

export const blogPosts: BlogPost[] = [
  {
    slug: "kvkk-uyumu-7-adim",
    title: "KVKK Uyumu İçin İşletmelerin Bilmesi Gereken 7 Adım",
    excerpt:
      "6698 sayılı KVKK, kişisel veri işleyen hemen her işletmeyi kapsıyor. Cezai riskten kaçınmak için atılması gereken temel adımları derledik.",
    date: "2026-08-04",
    readTime: "6 dk",
    category: "Uyumluluk",
    content: [
      p(
        "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK), müşteri, çalışan ya da tedarikçi verisi işleyen hemen her işletmeyi ilgilendiriyor. Uygulamada birçok küçük ve orta ölçekli işletme, KVKK'yı sadece bir web sitesi metni sanıyor — oysa kanun somut, denetlenebilir yükümlülükler getiriyor. İşte pratikte atılması gereken 7 adım.",
      ),
      h2("1. Veri Envanterinizi Çıkarın"),
      p(
        "Hangi kişisel veriyi, nereden, hangi amaçla topladığınızı bilmeden uyum sağlamak mümkün değil. Müşteri formları, çalışan özlük dosyaları, çağrı merkezi kayıtları, çerezler — hepsi envantere girmeli.",
      ),
      h2("2. Aydınlatma Metni ve Açık Rıza Süreçlerini Ayırın"),
      p(
        "Aydınlatma metni (bilgilendirme) ile açık rıza (onay) birbirinden farklı hukuki araçlardır. Bir sözleşmenin ifası için zorunlu olan veri işleme açık rıza gerektirmez, ancak pazarlama amaçlı işleme için açık rıza şarttır. Bu ayrımı doğru kurmamak en sık karşılaşılan hatalardan biri.",
      ),
      h2("3. VERBİS Kaydınızı Kontrol Edin"),
      p(
        "Belirli çalışan sayısı/ciro eşiklerini aşan ya da özel nitelikli veri işleyen işletmelerin Veri Sorumluları Sicili'ne (VERBİS) kayıt olması zorunlu. Kayıt yükümlülüğünüz olup olmadığını netleştirin ve varsa güncel tutun.",
      ),
      h2("4. Veri Saklama Sürelerini Belirleyin"),
      p(
        "KVKK, verinin işlenme amacı ortadan kalktığında silinmesini/yok edilmesini/anonimleştirilmesini öngörür. Fatura kayıtları (VUK: 5 yıl), ticari kayıtlar (TTK: 10 yıl) gibi yasal süreler dışında veriyi süresiz saklamak başlı başına bir risktir.",
      ),
      h2("5. Teknik ve İdari Tedbirleri Belgeleyin"),
      ul([
        "Erişim yetkilendirme ve rol bazlı kontrol",
        "Şifreleme (transit ve at-rest)",
        "Düzenli yedekleme ve felaket kurtarma planı",
        "Periyodik güvenlik açığı taraması / sızma testi",
      ]),
      p("Bir denetimde \"tedbir aldık\" demek yetmez; alınan tedbirin ne olduğunu ve ne zaman uygulandığını gösterebilmeniz gerekir."),
      h2("6. Veri İhlali Bildirim Sürecinizi Önceden Kurun"),
      p(
        "Bir veri ihlali yaşandığında Kişisel Verileri Koruma Kurumu'na 72 saat içinde bildirim yapılması gerekiyor. Bu süreci ihlal anında değil, önceden tasarlamış olmak fark yaratır.",
      ),
      h2("7. İlgili Kişi Başvurularını Yönetecek Bir Süreç Kurun"),
      p(
        "KVKK'nın 11. maddesi, kişilere verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme gibi haklar tanıyor. Bu başvurulara 30 gün içinde yanıt verecek bir iç süreciniz olmalı.",
      ),
      p(
        "xShield olarak siber güvenlik hizmetimiz kapsamında KVKK/GDPR uyumluluk danışmanlığı da veriyoruz — envanterden teknik tedbirlere kadar süreci birlikte yürütüyoruz.",
      ),
    ],
  },
  {
    slug: "sizma-testi-nedir-ne-siklikla",
    title: "Sızma Testi (Pentest) Nedir, Ne Sıklıkla Yapılmalı?",
    excerpt:
      "Güvenlik açığı taraması ile sızma testi aynı şey değil. İkisi arasındaki farkı ve doğru test sıklığını anlatıyoruz.",
    date: "2026-07-18",
    readTime: "5 dk",
    category: "Siber Güvenlik",
    content: [
      p(
        "Sızma testi (pentest), yetkilendirilmiş bir uzmanın gerçek bir saldırganın kullanacağı yöntemleri simüle ederek sisteminizdeki açıkları bulmasıdır. Amaç yalnızca açık listelemek değil, o açığın gerçekte istismar edilip edilemeyeceğini kanıtlamaktır.",
      ),
      h2("Güvenlik Açığı Taraması ile Farkı"),
      p(
        "Otomatik güvenlik açığı taraması, bilinen zafiyetleri ve yanlış yapılandırmaları hızlıca listeler — ucuz ve sık yapılabilir, ama yanlış pozitif oranı yüksektir ve iş mantığındaki (business logic) açıkları göremez. Sızma testi ise manuel, senaryo bazlıdır ve gerçek riski ortaya koyar. İkisi birbirinin yerine geçmez, tamamlayıcıdır.",
      ),
      h2("Test Türleri"),
      ul([
        "Black-box: Test ekibi sisteminiz hakkında hiçbir iç bilgiye sahip değil — dışarıdan bir saldırganı simüle eder.",
        "Gray-box: Sınırlı bilgiyle (örn. bir kullanıcı hesabı) test edilir — çalışan/yetkili hesabı ele geçirilmiş senaryosu.",
        "White-box: Kaynak koda ve mimariye tam erişimle yapılır — en derinlemesine ama en uzun süren tür.",
      ]),
      h2("Ne Sıklıkla Yapılmalı?"),
      p(
        "Genel kabul gören pratik, yılda en az bir kez kapsamlı bir sızma testi yaptırmaktır. Ancak şu durumlarda ek test şart:",
      ),
      ul([
        "Yeni bir uygulama/sistem canlıya alınmadan önce",
        "Altyapıda büyük bir değişiklik (yeni sunucu, ağ mimarisi değişimi) sonrası",
        "Bir güvenlik olayı yaşandıktan sonra",
        "Yasal/sektörel uyum gerekliliği varsa (ör. ödeme sistemleri, sağlık verisi)",
      ]),
      h2("Test Sonrası: Asıl İş Burada Başlıyor"),
      p(
        "Bir pentest raporu, bulunan açıkları önceliklendirilmiş şekilde listeler. Değeri, bulguların gerçekten kapatılmasında (remediation) ve kapatıldığının doğrulanmasında (retest) ortaya çıkar. Rapor çekmecede kalırsa test sadece bir maliyet olur.",
      ),
      p(
        "xShield'in siber güvenlik hizmeti, tek seferlik bir test değil; envanterden sürekli izlemeye (SOC) uzanan bir döngü olarak kurgulanıyor.",
      ),
    ],
  },
  {
    slug: "bulut-mu-yerinde-sunucu-mu",
    title: "Bulut mu, Yerinde Sunucu mu? Doğru Altyapı Kararı",
    excerpt:
      "Her işletme için 'doğru' tek bir cevap yok. Karar verirken gerçekten sormanız gereken sorular ve maliyet kalemleri.",
    date: "2026-06-22",
    readTime: "7 dk",
    category: "Altyapı",
    content: [
      p(
        "\"Buluta geçmeli miyiz?\" sorusunun tek doğru cevabı yok — işin doğasına, veri hassasiyetine ve büyüme hızına göre değişir. Karar vermeden önce sormanız gereken sorular var.",
      ),
      h2("1. Yük Ne Kadar Dalgalı?"),
      p(
        "Trafiğiniz yıl boyunca sabitse (ör. iç sistemler), yerinde/dedike bir sunucu uzun vadede daha ucuz olabilir. Sezonluk yoğunluk yaşıyorsanız (e-ticaret, eğitim dönemi), bulutun anlık ölçeklenme avantajı çok daha değerli.",
      ),
      h2("2. Veri Nerede Saklanmalı?"),
      p(
        "KVKK ve sektörel mevzuat, bazı veri türlerinin yurt içinde saklanmasını gerektirebilir. Bulut sağlayıcınızın veri merkezi lokasyonunu ve sözleşmedeki veri işleme şartlarını netleştirmeden karar vermeyin.",
      ),
      h2("3. Ekibinizin Operasyonel Kapasitesi Ne Durumda?"),
      p(
        "Yerinde sunucu, donanım arızası, güç kesintisi, fiziksel güvenlik gibi sorumlulukları size yükler. Bunları yönetecek bir ekip/süreç yoksa, yönetilen bulut hizmetleri riski önemli ölçüde azaltır.",
      ),
      h2("4. Gerçek Maliyeti Karşılaştırın"),
      ul([
        "Yerinde: donanım amortismanı, elektrik/soğutma, fiziksel güvenlik, yedek parça, personel",
        "Bulut: aylık kaynak kullanım bedeli, veri transfer ücretleri, yönetim/izleme hizmeti",
      ]),
      p(
        "Sadece sunucu fiyatını karşılaştırmak yanıltıcıdır — toplam sahip olma maliyetine (TCO) bakmak gerekir.",
      ),
      h2("5. Hibrit Bir Yaklaşım Mümkün mü?"),
      p(
        "Birçok işletme için en pratik çözüm ikisi arasında keskin bir seçim değil, hibrit bir mimari: kritik/hassas veriyi yerinde tutup, ölçeklenmesi gereken iş yüklerini buluta taşımak.",
      ),
      p(
        "xShield olarak hem Cloud Sunucu hem Sunucu Yönetimi hem de Altyapı Hizmetleri sunuyoruz — karar aşamasında rakamlarla, mevcut altyapınızı analiz ederek destek oluyoruz.",
      ),
    ],
  },
  {
    slug: "yedekleme-stratejisinde-5-hata",
    title: "Yedekleme Stratejinizde Sıkça Yapılan 5 Hata",
    excerpt:
      "Yedek almak yetmez — geri yükleyebilmeniz gerekir. En sık rastladığımız 5 yedekleme hatası ve nasıl önlenir.",
    date: "2026-05-30",
    readTime: "5 dk",
    category: "Sunucu Yönetimi",
    content: [
      p(
        "\"Yedeğimiz var\" cümlesi çoğu zaman yanlış bir güven duygusu yaratır. Gerçekte önemli olan, o yedeğin ihtiyaç anında gerçekten geri yüklenebilir olmasıdır. Sahada en sık karşılaştığımız 5 hatayı derledik.",
      ),
      h2("1. Yedeği Hiç Test Etmemek"),
      p(
        "Yedekleme işi \"başarılı\" logu üretse bile, geri yükleme (restore) denenmeden o yedeğin gerçekten sağlam olduğu bilinemez. Bozuk bir yedekle, felaket anında elinizde hiçbir şey olmadığını fark edersiniz.",
      ),
      h2("2. Tek Kopya, Tek Lokasyon"),
      p(
        "Yedeğin üretim sunucusuyla aynı fiziksel lokasyonda/aynı disk üzerinde tutulması, bir yangın, sel ya da fidye yazılımı saldırısında yedeğin de kaybolması anlamına gelir. Yaygın kabul gören 3-2-1 kuralı: 3 kopya, 2 farklı ortam, 1 tanesi lokasyon dışında (off-site).",
      ),
      h2("3. Kurtarma Süresini (RTO) Hiç Ölçmemek"),
      p(
        "\"Yedeğimiz var\" ile \"4 saatte ayağa kaldırabiliriz\" çok farklı iddialar. Kurtarma Süresi Hedefi'ni (RTO — Recovery Time Objective) belirleyip gerçek bir tatbikatla ölçmeden, kesinti anında süreyi tahmin etmek imkansız.",
      ),
      h2("4. Fidye Yazılımına Karşı Korumasız Yedekler"),
      p(
        "Ağdan erişilebilir, değişmez (immutable) olmayan yedekler, fidye yazılımı saldırısında saldırganın önce şifrelediği kaynaklardan biridir. En az bir yedek kopyasının izole/değiştirilemez (air-gapped veya immutable storage) olması kritik.",
      ),
      h2("5. Yedekleme Kapsamını Güncel Tutmamak"),
      p(
        "Yeni bir veritabanı, yeni bir sunucu ya da yeni bir SaaS entegrasyonu eklendiğinde yedekleme kapsamı da güncellenmeli. Aksi halde altı ay sonra \"meğer o sistem hiç yedeklenmiyormuş\" diye acı bir sürprizle karşılaşabilirsiniz.",
      ),
      p(
        "xShield'in Sunucu Yönetimi ve Altyapı Hizmetleri kapsamında düzenli yedekleme, restore testleri ve RTO/RPO hedeflerinin takibi standart olarak yer alıyor.",
      ),
    ],
  },
];

export function getPostBySlug(slug: string) {
  return blogPosts.find((p) => p.slug === slug);
}
