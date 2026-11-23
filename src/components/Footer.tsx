import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[var(--surface)] border-t border-[var(--border)] pt-15 pb-8">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-[34px] h-[34px] rounded-lg bg-[var(--ink)] flex items-center justify-center font-black text-accent text-sm leading-none">
                x
              </div>
              <span className="font-bold text-lg text-[var(--ink)]">xShield</span>
            </div>
            <p className="text-[var(--muted)] text-sm leading-relaxed max-w-[220px]">
              Teknoloji altyapınızı güçlendiren, işlerinizi geleceğe taşıyan güvenilir IT ortağınız.
            </p>
          </div>

          <div>
            <h4 className="text-[var(--ink)] font-semibold text-sm mb-4 tracking-wide uppercase">Hizmetler</h4>
            {["Cloud Sunucu", "Ağ Yönetimi", "Sunucu Yönetimi", "Siber Güvenlik", "Altyapı Hizmetleri", "IT Danışmanlığı"].map(
              (s) => (
                <a
                  key={s}
                  href="/#hizmetler"
                  className="block text-[var(--muted)] no-underline text-sm mb-2 hover:text-[var(--ink)] transition-colors"
                >
                  {s}
                </a>
              ),
            )}
          </div>

          <div>
            <h4 className="text-[var(--ink)] font-semibold text-sm mb-4 tracking-wide uppercase">Ürünler</h4>
            {["e-Clinic", "Signed", "xCut", "xSignage", "Pekiyi", "goX", "xShield Pet"].map((p) => (
              <a
                key={p}
                href="/#urunler"
                className="block text-[var(--muted)] no-underline text-sm mb-2 hover:text-[var(--ink)] transition-colors"
              >
                {p}
              </a>
            ))}
          </div>

          <div>
            <h4 className="text-[var(--ink)] font-semibold text-sm mb-4 tracking-wide uppercase">İletişim</h4>
            <p className="text-[var(--muted)] text-sm mb-2">info@xshield.com.tr</p>
            <p className="text-[var(--muted)] text-sm mb-2">xshield.com.tr</p>
            <a
              href="/#iletisim"
              className="inline-block mt-2 px-[18px] py-2 rounded-lg bg-[var(--ink)] text-white no-underline text-[13px] font-semibold"
            >
              Bize Ulaşın →
            </a>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-6 flex flex-wrap justify-between items-center gap-x-6 gap-y-3">
          <p className="text-[var(--subtle)] text-[13px]">© {year} xShield Teknoloji. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/blog" className="text-[var(--subtle)] text-[13px] no-underline hover:text-[var(--ink)] transition-colors">
              Blog
            </Link>
            <Link to="/gizlilik" className="text-[var(--subtle)] text-[13px] no-underline hover:text-[var(--ink)] transition-colors">
              Gizlilik Politikası
            </Link>
            <Link to="/kvkk" className="text-[var(--subtle)] text-[13px] no-underline hover:text-[var(--ink)] transition-colors">
              KVKK Aydınlatma Metni
            </Link>
            <p className="text-[var(--subtle)] text-[13px] m-0">Türkiye'nin güvenilir IT ortağı</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
