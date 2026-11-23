import Link from "next/link";
import { Logo, PawIcon } from "@/components/logo";

const FEATURES = [
  {
    t: "Online mağaza",
    d: "pet.xshield.com.tr/dukkaniniz adresinde, telefonda kusursuz çalışan vitrin. Linki WhatsApp ve Instagram’da paylaşın, sipariş gelsin.",
    i: "🛍️",
  },
  {
    t: "Barkodlu kasa",
    d: "Telefon kamerası veya USB barkod okuyucuyla mağaza satışı. Her satış stoktan anında düşer; online stok hep gerçeği gösterir.",
    i: "🧾",
  },
  {
    t: "Stok ve SKT takibi",
    d: "Mal kabul, sayım, fire. Kritik stok ve son kullanma tarihi yaklaşan mamalar için uyarı. Her hareket kayıt altında.",
    i: "📦",
  },
  {
    t: "Kendi kuryenizle teslimat",
    d: "Mahalle mahalle teslimat ücreti ve minimum tutar. Kuryeniz telefonundan siparişi görür, yol tarifi alır, “teslim ettim” der.",
    i: "🛵",
  },
  {
    t: "Ortak barkod kataloğu",
    d: "Bir mama barkodunu okutun; başka bir petshop daha önce eklediyse ürün adı ve markası kendiliğinden gelir.",
    i: "⚡",
  },
  {
    t: "Açık mama, gramajlar",
    d: "Kiloyla satış, 1 kg / 3 kg / 15 kg gibi seçenekler, indirimli fiyat gösterimi. Petshop’a göre tasarlandı.",
    i: "🐾",
  },
];

export default function Landing() {
  return (
    <div className="bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/giris" className="btn-ghost">
            Giriş
          </Link>
          <Link href="/kayit" className="btn-primary">
            Mağaza aç
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-20 md:grid-cols-2 md:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">
            <PawIcon className="size-4" /> Petshoplar için
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">Dükkânınızdaki her ürün, artık internette de satılsın.</h1>
          <p className="mt-4 text-lg text-stone-600">
            Online mağaza, barkodlu kasa ve stok takibi tek yerde. Rafta ne varsa vitrinde o var; mağazada satılan ürün online’da da düşer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/kayit" className="btn-primary px-6 py-3 text-base">
              Mağazanızı açın
            </Link>
            <Link href="/giris" className="btn-ghost px-6 py-3 text-base">
              Panele giriş
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-stone-200">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
                <PawIcon className="size-6" />
              </span>
              <div>
                <p className="font-bold">Patiler Petshop</p>
                <p className="text-xs text-stone-500">pet.xshield.com.tr/patiler</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Açık</span>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ["Yetişkin Kedi Maması Tavuklu · 3 kg", "649,90 ₺", "Stok: 12"],
                ["Topaklanan Bentonit Kedi Kumu · 10 L", "229,00 ₺", "Stok: 3"],
                ["Ayarlanabilir Göğüs Tasması · M", "349,00 ₺", "Stok: 7"],
              ].map(([n, p, s]) => (
                <li key={n} className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate">{n}</span>
                  <span className={`text-xs ${s === "Stok: 3" ? "font-semibold text-amber-700" : "text-stone-500"}`}>{s}</span>
                  <span className="font-semibold tabular-nums">{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white">
              <span aria-hidden>🛎️</span> Yeni sipariş #1043 · Moda Mah. · 878,90 ₺
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Mahalle petshopunun ihtiyacı olan her şey</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="rounded-2xl bg-paper p-6 ring-1 ring-stone-200">
                <p className="text-3xl" aria-hidden>
                  {f.i}
                </p>
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-stone-600">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Üç adımda yayında</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["Mağazanızı açın", "Mağaza adı ve adresinizi seçin. Kategoriler hazır gelir."],
            ["Ürünleri okutun", "Barkodu okutun, fiyat ve stoğu girin. Fotoğrafı telefondan çekin."],
            ["Linki paylaşın", "Teslimat bölgelerinizi belirleyin, mağaza linkinizi müşterilerinize gönderin."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
              <span className="grid size-9 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-stone-600">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <Link href="/kayit" className="btn-primary px-8 py-3.5 text-base">
            Hemen başlayın
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} xShield ·{" "}
        <a href="https://xshield.com.tr" className="hover:underline">
          xshield.com.tr
        </a>
      </footer>
    </div>
  );
}
