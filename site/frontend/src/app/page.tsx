import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">SY</div>
          <span className="font-semibold text-lg">SiteYönet</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Giriş Yap</Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Ücretsiz Başla
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-4 py-24">
        <div className="inline-block bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs px-3 py-1 rounded-full mb-6">
          10 daireye kadar ücretsiz
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Sitenizi profesyonelce<br />
          <span className="text-blue-400">yönetin</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
          Aidat takibi, sorun yönetimi, toplantı planlaması ve daha fazlası.
          Küçükten büyüğe her konut sitesi için.
        </p>
        <Link href="/register"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors inline-block">
          Hemen Başla — Ücretsiz
        </Link>
      </section>

      {/* Özellikler */}
      <section className="px-8 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-12">Her şey tek platformda</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "💰", title: "Aidat Yönetimi", desc: "Daire bazlı aidat takibi, otomatik kayıt oluşturma ve ödeme geçmişi" },
            { icon: "🔧", title: "Sorun Takibi", desc: "Sakinlerin bildirdiği sorunları kategorize edin, atayın ve çözün" },
            { icon: "📅", title: "Toplantı Takvimi", desc: "Toplantıları planlayın, gündem paylaşın, tutanakları kaydedin" },
            { icon: "📢", title: "Duyurular", desc: "Sakinlere anında duyuru gönderin, önemli bildirimleri sabitleyin" },
            { icon: "🏦", title: "Banka Tanımları", desc: "IBAN bilgilerini kaydedin, ödemeleri kolayca yönlendirin" },
            { icon: "📊", title: "Raporlar", desc: "Dönem bazlı aidat raporları, tahsilat oranları ve analizler" },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fiyatlandırma */}
      <section className="px-8 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-12">Daire sayınıza göre fiyatlandırma</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-slate-400 mb-2">Ücretsiz</div>
            <div className="text-3xl font-bold mb-1">₺0</div>
            <div className="text-slate-400 text-sm mb-6">10 daireye kadar</div>
            <Link href="/register" className="block text-center bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm transition-colors">
              Başla
            </Link>
          </div>
          <div className="bg-blue-600 border border-blue-500 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-400 text-blue-900 text-xs px-3 py-1 rounded-full font-medium">
              Popüler
            </div>
            <div className="text-sm text-blue-200 mb-2">Başlangıç</div>
            <div className="text-3xl font-bold mb-1">₺500</div>
            <div className="text-blue-200 text-sm mb-6">11–50 daire / ay</div>
            <Link href="/register" className="block text-center bg-white text-blue-700 hover:bg-blue-50 py-2 rounded-lg text-sm transition-colors font-medium">
              Başla
            </Link>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-sm text-slate-400 mb-2">Profesyonel</div>
            <div className="text-3xl font-bold mb-1">₺1.500</div>
            <div className="text-slate-400 text-sm mb-6">51–200 daire / ay</div>
            <Link href="/register" className="block text-center bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm transition-colors">
              Başla
            </Link>
          </div>
        </div>
        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <div className="font-semibold mb-1">200+ Daire — Kurumsal</div>
          <p className="text-slate-400 text-sm mb-4">Büyük siteler için özel fiyatlandırma ve destek</p>
          <a href="mailto:info@xshield.com.tr" className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg text-sm transition-colors inline-block">
            İletişime Geç
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 px-8 py-6 text-center text-slate-500 text-sm">
        © 2025 SiteYönet · xShield · <a href="mailto:info@xshield.com.tr" className="hover:text-slate-300">info@xshield.com.tr</a>
      </footer>
    </div>
  );
}
