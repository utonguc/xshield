export type LegalSection = { title: string; body: string[] };

export const privacyPolicy: { title: string; updated: string; sections: LegalSection[] } = {
  title: "Gizlilik Politikası",
  updated: "Son güncelleme: Ocak 2025",
  sections: [
    {
      title: "1. Genel Bakış",
      body: [
        "Bu Gizlilik Politikası, xShield Teknoloji (\"xShield\", \"Şirket\", \"biz\") tarafından işletilen xshield.com.tr web sitesi ve bağlı SaaS platformları aracılığıyla toplanan bilgilerin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.",
        "Sitemizi kullanmaya devam ederek bu politikayı kabul etmiş sayılırsınız. Bu politikayı kabul etmiyorsanız lütfen sitemizi kullanmayınız.",
      ],
    },
    {
      title: "2. Topladığımız Bilgiler",
      body: [
        "Doğrudan sağlanan bilgiler: İletişim formlarında girilen ad, e-posta, telefon ve mesaj içerikleri; demo/teklif taleplerinde paylaşılan iş bilgileri; SaaS ürünlerimizde oluşturulan hesap bilgileri.",
        "Otomatik olarak toplanan bilgiler: IP adresi, tarayıcı türü ve versiyonu, işletim sistemi, ziyaret edilen sayfalar ve süre, çerez verileri, referans URL.",
      ],
    },
    {
      title: "3. Bilgilerin Kullanım Amacı",
      body: [
        "Teklif, destek ve bilgi taleplerinizi yanıtlamak; hizmetlerimizi sunmak ve geliştirmek; hesap yönetimi ve müşteri ilişkileri yürütmek; yasal yükümlülüklerimizi yerine getirmek; güvenlik tehditlerini tespit etmek ve önlemek; site performansını ölçmek; hizmetlerimiz hakkında bilgilendirme yapmak (rıza dahilinde).",
      ],
    },
    {
      title: "4. Bilgilerin Paylaşımı",
      body: [
        "Kişisel bilgilerinizi şu durumlar dışında üçüncü taraflarla paylaşmayız: hizmet sağlayıcılar (hosting, e-posta gönderimi gibi operasyonel iş ortakları, gizlilik sözleşmesi çerçevesinde), yasal zorunluluklar (mahkeme kararı/idari emir), iş transferleri (şirket birleşmesi/devralma, önceden bilgilendirme ile), açık rıza verdiğiniz üçüncü taraflar.",
      ],
    },
    {
      title: "5. Veri Güvenliği",
      body: [
        "TLS/SSL ile şifreli veri iletimi, veritabanı düzeyinde şifreleme, erişim denetimi ve yetkilendirme kontrolleri, düzenli güvenlik denetimleri ve sızma testleri uyguluyoruz. Tüm veriler Türkiye'deki sunucularda saklanmaktadır.",
        "Hiçbir internet iletimi veya elektronik depolama yöntemi %100 güvenli değildir. Makul ölçüde koruma sağlasak da mutlak güvenliği garanti edemeyiz.",
      ],
    },
    {
      title: "6. Çerezler (Cookies)",
      body: [
        "Zorunlu çerezler sitenin temel işlevleri için gereklidir ve devre dışı bırakılamaz. Tercih çerezleri dil/görünüm tercihlerinizi hatırlar. Analitik çerezler site kullanımını anonim şekilde ölçer.",
        "Tarayıcı ayarlarınızdan çerezleri yönetebilir veya silebilirsiniz.",
      ],
    },
    {
      title: "7. Üçüncü Taraf Bağlantılar",
      body: [
        "Web sitemiz üçüncü taraf web sitelerine bağlantılar içerebilir. Bu sitelerin gizlilik uygulamalarından sorumlu değiliz.",
      ],
    },
    {
      title: "8. Veri Saklama Süreleri",
      body: [
        "İletişim ve teklif talepleri: sonuçlandırılmasından itibaren 2 yıl. Müşteri sözleşme kayıtları: sözleşme bitiminden itibaren 10 yıl (TTK). Fatura ve mali kayıtlar: 5 yıl (VUK). Teknik loglar: 6 ay.",
      ],
    },
    {
      title: "9. Çocukların Gizliliği",
      body: [
        "Hizmetlerimiz 18 yaşın altındaki kişilere yönelik değildir. Böyle bir veri toplandığını fark edersek derhal sileriz.",
      ],
    },
    {
      title: "10. Politika Değişiklikleri",
      body: [
        "Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikler web sitemizde belirgin duyuru ile bildirilir.",
      ],
    },
    {
      title: "11. İletişim",
      body: [
        "xShield Teknoloji — E-posta: info@xshield.com.tr — Web: xshield.com.tr. KVKK kapsamındaki haklarınız için KVKK Aydınlatma Metni sayfamızı inceleyin.",
      ],
    },
  ],
};

export const kvkkNotice: { title: string; updated: string; sections: LegalSection[] } = {
  title: "KVKK Aydınlatma Metni",
  updated: "Son güncelleme: Ocak 2025",
  sections: [
    {
      title: "1. Veri Sorumlusu",
      body: [
        "6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") kapsamında xShield Teknoloji veri sorumlusu sıfatını haizdir. Bu metin, xshield.com.tr aracılığıyla toplanan kişisel verilerin hangi amaçlarla, hangi hukuki dayanaklarla ve hangi süreyle işlendiğini açıklamaktadır.",
      ],
    },
    {
      title: "2. Toplanan Kişisel Veriler",
      body: [
        "Kimlik verisi: ad, soyad. İletişim verisi: e-posta, telefon. Kurumsal bilgi: şirket adı, unvan. İşlem verisi: talep ve mesaj içerikleri. Teknik veri: IP adresi, tarayıcı türü, ziyaret tarihi/saati, çerez verileri.",
      ],
    },
    {
      title: "3. Kişisel Verilerin İşlenme Amaçları",
      body: [
        "Teklif/bilgi/destek taleplerinin yanıtlanması, hizmet ve ürün bilgilendirmesi, sözleşme ilişkisinin kurulması ve yürütülmesi, yasal yükümlülüklerin yerine getirilmesi, web sitesi kullanımının analizi, müşteri memnuniyeti ölçümü.",
      ],
    },
    {
      title: "4. Kişisel Veri İşlemenin Hukuki Dayanağı",
      body: [
        "KVKK'nın 5. ve 6. maddeleri kapsamında: açık rızanızın bulunması (form gönderimi), bir sözleşmenin kurulması/ifasıyla doğrudan ilgili olması, hukuki yükümlülüklerin yerine getirilmesi, meşru menfaatlerin korunması.",
      ],
    },
    {
      title: "5. Kişisel Verilerin Aktarılması",
      body: [
        "Kişisel verileriniz, yasal zorunluluklar dışında açık rızanız olmaksızın üçüncü taraflara aktarılmaz. Teknik altyapı sağlayıcıları, yetkili kamu kurumları (yasal zorunluluk halinde) ve açık rıza ile iş ortakları istisnadır.",
        "Yurt dışına veri aktarımı, KVKK'nın 9. maddesi kapsamında gerekli güvenceler sağlanarak yapılır.",
      ],
    },
    {
      title: "6. Kişisel Verilerin Saklanma Süresi",
      body: [
        "Ticari kayıtlar TTK gereği 10 yıl; vergi verileri VUK gereği 5 yıl; iletişim form verileri talebin sonuçlandırılmasından itibaren en fazla 2 yıl saklanır.",
      ],
    },
    {
      title: "7. İlgili Kişinin Hakları",
      body: [
        "KVKK'nın 11. maddesi uyarınca: verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işlenme amacını öğrenme, aktarıldığı üçüncü kişileri bilme, düzeltilmesini/silinmesini isteme, otomatik analize itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz.",
        "Haklarınızı kullanmak için info@xshield.com.tr adresine yazılı olarak başvurabilirsiniz. Talebiniz en geç 30 gün içinde yanıtlanır.",
      ],
    },
    {
      title: "8. Çerez (Cookie) Politikası",
      body: [
        "Oturum çerezleri tarayıcı kapatıldığında silinir; tercih çerezleri 1 yıla kadar saklanabilir. Tarayıcı ayarlarından çerezleri devre dışı bırakabilirsiniz.",
      ],
    },
    {
      title: "9. İletişim",
      body: ["xShield Teknoloji — E-posta: info@xshield.com.tr — Web: xshield.com.tr"],
    },
  ],
};
