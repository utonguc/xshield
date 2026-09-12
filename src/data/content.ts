// ── Site content (Türkçe) ──────────────────────────────────────────────────

export const navLinks = [
  { label: "Hizmetler", href: "/#hizmetler" },
  { label: "Süreç", href: "/#surec" },
  { label: "Ürünler", href: "/#urunler" },
  { label: "Güvenlik", href: "/#guvenlik-yol-haritasi" },
  { label: "Hakkımızda", href: "/#hakkimizda" },
  { label: "İletişim", href: "/#iletisim" },
];

// `countTo` verilenler ekrana girince 0'dan sayarak animasyonla belirir
// (bkz. components/AnimatedStat.tsx); verilmeyenler ("7/24" gibi) sabit metin.
export const stats = [
  { value: "99.9%", countTo: 99.9, decimals: 1, suffix: "%", label: "Uptime SLA" },
  { value: "7/24", label: "Teknik Destek" },
  { value: "< 2sa", label: "Ortalama Yanıt Süresi" },
  { value: "50+", countTo: 50, suffix: "+", label: "Mutlu Müşteri" },
];

export const services = [
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

export const products = [
  {
    name: "e-Clinic",
    tagline: "Klinik Yönetim Platformu",
    badge: "Aktif",
    desc: "Klinik ve muayenehane süreçlerini uçtan uca dijitalleştiren bulut tabanlı SaaS. Randevu yönetiminden faturalandırmaya, hasta takibinden WhatsApp bildirimine kadar her şey tek platformda.",
    features: [
      { icon: "📅", text: "Randevu & Takvim Yönetimi" },
      { icon: "🗂️", text: "Hasta Kayıt & Takip" },
      { icon: "🧾", text: "E-Fatura & Ödeme" },
      { icon: "💬", text: "WhatsApp Entegrasyonu" },
      { icon: "🤖", text: "AI Destekli Arama" },
      { icon: "🏥", text: "Çoklu Klinik Desteği" },
    ],
    color: "#0e8f6b",
    colorRgb: "14,143,107",
    url: "https://eclinic.xshield.com.tr",
  },
  {
    name: "Signed",
    tagline: "Mail İmza Yönetim Platformu",
    badge: "Aktif",
    desc: "Kurumsal e-posta imzalarını merkezi panelden yönetin. Tüm çalışanların imzalarını tek seferinde güncelleyin, kampanya imzaları oluşturun, marka tutarlılığını sağlayın.",
    features: [
      { icon: "✉️", text: "Merkezi İmza Yönetimi" },
      { icon: "📣", text: "Kampanya İmzaları" },
      { icon: "🔗", text: "Active Directory Entegrasyon" },
      { icon: "🌐", text: "Çoklu Domain Desteği" },
      { icon: "⚡", text: "Anlık Güncelleme" },
      { icon: "📊", text: "Detaylı Raporlama" },
    ],
    color: "#e2790c",
    colorRgb: "226,121,12",
    url: "https://signed.xshield.com.tr",
  },
  {
    name: "xCut",
    tagline: "Salon Yönetim Platformu",
    badge: "Aktif",
    desc: "Kuaför ve güzellik salonu süreçlerini uçtan uca dijitalleştiren SaaS. Randevu, stilist takibi, müşteri portföyü, finans, stok yönetimi ve salon web sitesi tek platformda.",
    features: [
      { icon: "📅", text: "Online Randevu Sistemi" },
      { icon: "💇", text: "Stilist & Personel Takibi" },
      { icon: "👥", text: "Müşteri CRM" },
      { icon: "💰", text: "Finans & Kasa" },
      { icon: "📦", text: "Stok Yönetimi" },
      { icon: "🌐", text: "Salon Web Sitesi" },
    ],
    color: "#b4442e",
    colorRgb: "180,68,46",
    url: "https://xcut.xshield.com.tr",
  },
  {
    name: "xSignage",
    tagline: "Dijital Tabela Yönetimi",
    badge: "Aktif",
    desc: "Tüm dijital ekranlarınızı tek panelden yönetin. Playlist ve medya yönetimi, Raspberry Pi'ye anlık push, WebSocket ile gerçek zamanlı izleme.",
    features: [
      { icon: "🖥️", text: "Çoklu Ekran Yönetimi" },
      { icon: "🎞️", text: "Medya & Playlist" },
      { icon: "⚡", text: "Anlık Push (WebSocket)" },
      { icon: "📟", text: "Raspberry Pi Desteği" },
      { icon: "📡", text: "Gerçek Zamanlı İzleme" },
      { icon: "🕐", text: "Zamanlanmış Yayın" },
    ],
    color: "#1b1d22",
    colorRgb: "27,29,34",
    url: "https://signage.xshield.com.tr",
  },
  {
    name: "ShieldSpot",
    tagline: "Misafir Wi-Fi Hotspot Platformu",
    badge: "Yakında",
    desc: "İşletmenizin misafir Wi-Fi altyapısını profesyonelce yönetin. Captive portal, kimlik doğrulama, bant genişliği yönetimi ve KVKK uyumlu kayıt sistemi.",
    features: [
      { icon: "📡", text: "Captive Portal" },
      { icon: "📱", text: "Sosyal Medya Login" },
      { icon: "⚡", text: "Bant Genişliği Yönetimi" },
      { icon: "🛡️", text: "KVKK Uyumlu Kayıt" },
      { icon: "📊", text: "Analitik Raporlama" },
      { icon: "📍", text: "Çoklu Lokasyon" },
    ],
    color: "#6b7a00",
    colorRgb: "107,122,0",
    url: "#iletisim",
  },
];

// ── Danışmanlık süreci yol haritası: anlaşma öncesinden bakım sonrasına ────
export const processSteps = [
  {
    icon: "🤝",
    title: "Ön Görüşme & Keşif",
    desc: "İşletmenizi, hedeflerinizi ve mevcut teknoloji yapınızı dinliyoruz. Bu aşamada herhangi bir taahhüt yok — sadece doğru resmi çıkarıyoruz.",
  },
  {
    icon: "🔍",
    title: "İhtiyaç Analizi",
    desc: "Departmanlarla birebir görüşmeler, iş süreç haritalama ve risk/öncelik değerlendirmesiyle gerçek ihtiyacı ve kısıtları netleştiriyoruz.",
  },
  {
    icon: "🗂️",
    title: "Envanter Çıkarma",
    desc: "Tüm donanım, yazılım lisansları, sunucular, ağ topolojisi ve veri akışlarını uçtan uca haritalayıp tek bir envanter dokümanında topluyoruz.",
  },
  {
    icon: "📐",
    title: "Teklif & Yol Haritası",
    desc: "Bulgulara dayanan somut bir çözüm önerisi, net kapsam, zaman çizelgesi ve fiyatlandırmayla birlikte sunuluyor — sürprizsiz.",
  },
  {
    icon: "🚀",
    title: "Anlaşma & Uygulama",
    desc: "Sözleşme imzalandıktan sonra kurulum/geçiş süreci planlı şekilde, iş sürekliliğinizi aksatmadan devreye alınır.",
  },
  {
    icon: "🛠️",
    title: "Bakım & Sürekli Destek",
    desc: "SLA taahhütlü 7/24 izleme, düzenli sağlık raporları, proaktif bakım ve yıllık gözden geçirme ile ilişki anlaşma sonrasında da sürüyor.",
  },
];

// ── Siber güvenlik hizmetinin kendi özel yol haritası ──────────────────────
export const securitySteps = [
  {
    icon: "🗺️",
    title: "Varlık Envanteri",
    desc: "Uç noktalar, sunucular, bulut kaynakları ve veri sınıflandırması çıkarılarak saldırı yüzeyi net şekilde ortaya konur.",
  },
  {
    icon: "🩻",
    title: "Güvenlik Açığı Taraması",
    desc: "Otomatik ve manuel tarama araçlarıyla bilinen zafiyetler, yanlış yapılandırmalar ve güncel olmayan bileşenler tespit edilir.",
  },
  {
    icon: "🎯",
    title: "Sızma Testi",
    desc: "Gerçek saldırgan senaryolarını simüle eden yetkilendirilmiş pentest ile teorik değil, kanıtlanmış riskler ortaya çıkarılır.",
  },
  {
    icon: "📊",
    title: "Risk Raporu & Önceliklendirme",
    desc: "Bulgular etki/olasılık bazında sıralanır; yönetim ve teknik ekip için ayrı ayrı anlaşılır raporlar hazırlanır.",
  },
  {
    icon: "🧩",
    title: "İyileştirme & Sertleştirme",
    desc: "Yama yönetimi, konfigürasyon sıkılaştırma ve politika güncellemeleriyle tespit edilen açıklar kapatılır.",
  },
  {
    icon: "📡",
    title: "Sürekli İzleme (SOC)",
    desc: "7/24 tehdit izleme ve olay müdahale süreciyle güvenlik bir seferlik proje değil, sürekli bir disipline dönüşür.",
  },
  {
    icon: "⚖️",
    title: "KVKK / GDPR Uyumu",
    desc: "Yasal yükümlülükler düzenli denetimlerle takip edilir, mevzuat değişikliklerine karşı altyapı güncel tutulur.",
  },
];

export const whyItems = [
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

export const aboutHighlights = [
  { icon: "🌍", title: "Uzaktan & Yerinde", desc: "Türkiye genelinde uzaktan ve sahadaki ekibimizle yerinde destek sağlıyoruz." },
  { icon: "📋", title: "SLA Taahhütlü", desc: "Her hizmet paketi için net SLA taahhütleri ve performans garantisi." },
  { icon: "🔄", title: "7/24 Destek", desc: "Kritik sistemler için kesintisiz izleme ve acil müdahale hizmeti." },
  { icon: "🎯", title: "Sektör Uzmanı", desc: "Sağlık, finans, perakende ve kamu sektörlerinde derin deneyim." },
];

export const contactInfo = [
  { icon: "✉️", label: "E-posta", value: "info@xshield.com.tr" },
  { icon: "🌐", label: "Web", value: "xshield.com.tr" },
  { icon: "🕐", label: "Çalışma Saatleri", value: "Hafta içi 09:00 – 18:00 (Acil destek 7/24)" },
];
