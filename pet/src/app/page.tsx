import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { PawIcon } from "@/components/logo";
import { whatsappLink } from "@/lib/format";

/*
 * Pazarlama sayfası (pet.xshield.com.tr). Bilinçli olarak "şablon" görünümden uzak:
 * gazete tipografisi, kâğıt zemin, gerçek bir petshop gününden somut örnekler.
 */

const display = Fraunces({ subsets: ["latin", "latin-ext"], axes: ["opsz", "SOFT"], variable: "--f-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--f-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: "xShield Pet — Petshoplar için online mağaza, kasa ve stok",
  description:
    "Mahalle petshopu için tek sistem: rafınızdaki ürünler internette satılır, kasada satılan stoktan düşer, mama SKT’leri takip edilir, siparişi kendi kuryeniz götürür.",
};

const DAY = [
  {
    t: "09:12",
    h: "Toptancı geldi.",
    p: "Koliler açılmadan barkodu okutuyorsunuz: 12 paket 3 kg kedi maması, son kullanma Mart 2027. Stok da, SKT de kaydoldu.",
  },
  {
    t: "11:40",
    h: "Dükkândan biri 2 paket aldı.",
    p: "Kasada okuttunuz, nakit aldınız, para üstü ekranda. Online mağazada o mamadan artık 10 paket görünüyor — siz bir şey yapmadan.",
  },
  {
    t: "14:05",
    h: "Instagram’dan gelen müşteri sipariş verdi.",
    p: "Telefonunuz çaldı: “Yeni sipariş — Bostanlı, 1 paket mama + 1 kum, kapıda nakit.” Mesajlaşmadan, fiyat sormadan, adres tarif etmeden.",
  },
  {
    t: "18:30",
    h: "Kurye yola çıktı.",
    p: "Siparişi çırağınıza atadınız. Kendi telefonundan adresi açtı, yol tarifini aldı, kapıda “teslim ettim”e bastı. Müşteri de takip sayfasından izledi.",
  },
  {
    t: "21:00",
    h: "Kepenk kapanırken.",
    p: "Günün cirosu, kasa ve online ayrı ayrı. Azalan ürünler listesi yarınki siparişinize hazır. Haftaya SKT’si dolacak iki konserve de kırmızıyla duruyor.",
  },
];

const BEFORE_AFTER = [
  ["Stok", "Defterde ya da hiç tutulmuyor; rafa bakıp tahmin ediliyor.", "Her giriş, satış, fire kayıtlı. Ne kadar mal var, kaç liralık, tek ekranda."],
  ["Kasa", "Ayrı bir kasa programı ya da sadece yazar kasa.", "Barkod okuyucu veya telefon kamerasıyla satış; stok anında düşer."],
  ["Online satış", "Instagram DM’den fiyat sorup WhatsApp’tan adres almak.", "Müşteri ürünü seçer, bölgesini seçer, siparişi verir. Siz sadece hazırlarsınız."],
  ["Son kullanma", "Raftaki konserveye tek tek bakmak; fark edilmeyen bozuk ürün.", "Mal kabulde girilen SKT’ler için 30 gün önceden uyarı."],
  ["Teslimat", "Kuryeye adresi sesli mesajla anlatmak, “ödeme alındı mı?” telefonu.", "Kurye kendi ekranında adresi, tahsil edeceği tutarı ve teslim düğmesini görür."],
];

const FAQ = [
  ["Bilgisayardan anlamıyorum, kurabilir miyim?", "Mağazanız kayıt olduğunuz anda açılır; kategoriler hazır gelir. Ürünleri barkod okutarak eklersiniz — başka bir petshop aynı ürünü daha önce eklediyse adı ve markası kendiliğinden dolar. İsterseniz ürün girişini de biz yaparız (aşağıda “Kurulum hizmeti”)."],
  ["Barkod okuyucu almam şart mı?", "Hayır. Android telefonun kamerası barkod okur. Elinizde USB ya da Bluetooth barkod okuyucu varsa o da doğrudan çalışır, ayar gerekmez."],
  ["Online ödemeyi nasıl alacağım?", "Başlangıçta kapıda nakit, kapıda kart (kuryenin POS’u) ve havale/EFT var. Sanal POS’unuz varsa kendi hesabınızla bağlanması yol haritamızda; para hiçbir zaman bizim hesabımızdan geçmez."],
  ["Faturayı kim kesiyor?", "Siz, kendi e-fatura / e-arşiv sisteminizden. Biz sipariş ve tutar bilgisini düzenli tutarız; muhasebeciniz için dışa aktarma ekliyoruz."],
  ["KVKK ve mesafeli satış sözleşmesi?", "Metinlerinizi panelden girersiniz; sipariş ekranında müşteriye gösterilir ve onay alınır. Metinlerin içeriği mağaza sahibinin sorumluluğundadır."],
  ["Kendi alan adımı kullanabilir miyim?", "Profesyonel pakette evet: www.dukkaniniz.com adresini bağlarsınız, mağazanız o adresten açılır. DNS’e eklenecek iki kaydı panel adım adım gösterir."],
  ["Canlı hayvan satabilir miyim?", "Hayır. Platform yalnızca mama, kum, aksesuar, bakım ürünleri gibi evcil hayvan ürünleri içindir."],
  ["Bırakmak istersem?", "Yıllık paketin sonunda yenilemezsiniz, o kadar. Ürün ve müşteri listenizi istediğiniz zaman Excel’e alabilirsiniz."],
];

export default async function Landing() {
  await connection(); // satış iletişim bilgisi çalışma anında okunur
  const salesWhatsapp = process.env.SALES_WHATSAPP?.trim() || null;
  const salesEmail = process.env.SALES_EMAIL?.trim() || "info@xshield.com.tr";

  return (
    <div className={`${display.variable} ${sans.variable} ${mono.variable} lp`}>
      <style>{CSS}</style>

      {/* ── Üst şerit ─────────────────────────────────────────────── */}
      <header className="lp-wrap flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)]">
            <PawIcon className="size-5" />
          </span>
          <span className="lp-display text-xl leading-none">
            xShield <em>Pet</em>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-[15px] sm:gap-6">
          <a href="#gun" className="hidden hover:underline md:inline">
            Bir gün
          </a>
          <a href="#fiyat" className="hidden hover:underline md:inline">
            Fiyat
          </a>
          <a href="#sorular" className="hidden hover:underline md:inline">
            Sorular
          </a>
          <Link href="/giris" className="px-3 py-2 hover:underline">
            Giriş
          </Link>
          <Link href="/kayit" className="lp-btn">
            Mağaza aç
          </Link>
        </nav>
      </header>

      {/* ── Açılış ────────────────────────────────────────────────── */}
      <section className="lp-wrap grid gap-12 border-t border-[var(--rule)] pt-10 pb-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-16">
        <div>
          <p className="lp-kicker">Mahalle petshopları için · Kasa + stok + online mağaza</p>
          <h1 className="lp-display mt-5 text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
            Rafınızda ne varsa,
            <br />
            <span className="lp-under">internette de</span> satılsın.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--ink-2)]">
            Dükkânda okuttuğunuz mama online mağazanızdan da düşer. Mahalleden gelen sipariş telefonunuza düşer, çırağınız götürür. Defter, ayrı kasa
            programı, WhatsApp’tan fiyat sorma derdi biter.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/kayit" className="lp-btn lp-btn-lg">
              30 gün ücretsiz deneyin
            </Link>
            <a href="#gun" className="text-[15px] font-medium underline decoration-[var(--accent)] decoration-2 underline-offset-4">
              Bir günde neler değişir?
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--ink-3)]">Kart bilgisi istemiyoruz. Mağazanız kayıt olduğunuz anda açılır.</p>
        </div>

        {/* Kasa fişi + raf etiketi: ürünün gerçekte ne yaptığını gösteren iki nesne */}
        <div className="lp-stage relative mx-auto w-full max-w-md lg:mt-4">
          <div className="lp-receipt">
            <p className="text-center font-semibold tracking-wide">PATİLER PETSHOP</p>
            <p className="text-center">Moda Cd. No:12 Kadıköy</p>
            <p className="lp-dash" />
            <p className="flex justify-between">
              <span>SATIŞ #1042</span>
              <span>23.11 11:40</span>
            </p>
            <p className="lp-dash" />
            <p>Yetişkin Kedi Maması 3 kg</p>
            <p className="flex justify-between">
              <span>&nbsp;&nbsp;2 x 649,90</span>
              <span>1.299,80</span>
            </p>
            <p>Açık Kedi Maması</p>
            <p className="flex justify-between">
              <span>&nbsp;&nbsp;1,250 kg x 219,90</span>
              <span>274,88</span>
            </p>
            <p className="lp-dash" />
            <p className="flex justify-between font-semibold">
              <span>TOPLAM</span>
              <span>1.574,68</span>
            </p>
            <p className="flex justify-between">
              <span>NAKİT</span>
              <span>1.600,00</span>
            </p>
            <p className="flex justify-between">
              <span>PARA ÜSTÜ</span>
              <span>25,32</span>
            </p>
            <p className="lp-dash" />
            <p className="text-center">stok güncellendi · online: 12 → 10</p>
          </div>

          <div className="lp-tag">
            <p className="text-[11px] tracking-[0.18em] uppercase">Raf etiketi</p>
            <p className="lp-display mt-1 text-lg leading-tight">Topaklanan Kedi Kumu 10 L</p>
            <p className="mt-2 flex items-end justify-between">
              <span className="lp-mono text-xs whitespace-nowrap">Stok: 3 · azalıyor</span>
              <span className="lp-display text-2xl whitespace-nowrap">229,00 ₺</span>
            </p>
          </div>

          <div className="lp-note">
            <span className="lp-mono text-xs">14:05</span>
            <p className="mt-1 text-[15px] leading-snug">
              <strong>Yeni sipariş #1043</strong>
              <br />
              Bostanlı · 1 mama + 1 kum · kapıda nakit
            </p>
          </div>
        </div>
      </section>

      {/* ── Bir gün ───────────────────────────────────────────────── */}
      <section id="gun" className="lp-band">
        <div className="lp-wrap grid gap-12 py-20 lg:grid-cols-[1fr_1.6fr]">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <p className="lp-kicker">Bir salı günü</p>
            <h2 className="lp-display mt-4 text-4xl leading-tight sm:text-5xl">Aynı dükkân, aynı mal. Sadece hepsi tek yerde.</h2>
            <p className="mt-5 max-w-sm text-[var(--ink-2)]">
              Yeni bir iş öğrenmiyorsunuz. Zaten yaptığınız işi — mal kabul, satış, teslimat — bir ekrandan yapıyorsunuz; gerisini sistem birbirine bağlıyor.
            </p>
          </div>
          <ol className="lp-timeline">
            {DAY.map((d) => (
              <li key={d.t}>
                <span className="lp-mono lp-time">{d.t}</span>
                <div>
                  <h3 className="lp-display text-2xl">{d.h}</h3>
                  <p className="mt-2 leading-relaxed text-[var(--ink-2)]">{d.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Önce / sonra ──────────────────────────────────────────── */}
      <section className="lp-wrap py-20">
        <p className="lp-kicker">Dürüst karşılaştırma</p>
        <h2 className="lp-display mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">Bugün nasıl yapıyorsunuz, yarın nasıl yapacaksınız.</h2>
        <div className="mt-10 overflow-x-auto">
          <table className="lp-table">
            <thead>
              <tr>
                <th />
                <th>Şimdi</th>
                <th>xShield Pet ile</th>
              </tr>
            </thead>
            <tbody>
              {BEFORE_AFTER.map(([k, a, b]) => (
                <tr key={k}>
                  <th scope="row" className="lp-display text-xl font-normal">
                    {k}
                  </th>
                  <td className="text-[var(--ink-3)]">{a}</td>
                  <td>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Ne var, ne yok ────────────────────────────────────────── */}
      <section className="lp-band">
        <div className="lp-wrap py-20">
          <p className="lp-kicker">İçinde neler var</p>
          <div className="mt-8 grid gap-x-12 gap-y-10 md:grid-cols-3">
            <div>
              <h3 className="lp-display border-b border-[var(--ink)] pb-2 text-2xl">Vitrin</h3>
              <ul className="lp-list">
                <li>pet.xshield.com.tr/dukkaniniz adresi, istenirse kendi alan adınız</li>
                <li>Kedi, köpek, kuş… tür ve kategoriye göre gezinme</li>
                <li>1 kg / 3 kg / 15 kg seçenekleri, kiloyla açık mama</li>
                <li>Mahalle mahalle teslimat ücreti, “şu tutar üstü ücretsiz”</li>
                <li>Gel-al seçeneği, sipariş takip sayfası</li>
              </ul>
            </div>
            <div>
              <h3 className="lp-display border-b border-[var(--ink)] pb-2 text-2xl">Kasa ve stok</h3>
              <ul className="lp-list">
                <li>Barkod okuyucu ya da telefon kamerasıyla satış</li>
                <li>Mal kabulde alış fiyatı, lot ve son kullanma tarihi</li>
                <li>Okuttukça sayan stok sayımı, fire kaydı</li>
                <li>Azalan stok ve SKT uyarıları</li>
                <li>Ortak barkod kataloğu: ürün adı kendiliğinden gelir</li>
              </ul>
            </div>
            <div>
              <h3 className="lp-display border-b border-[var(--ink)] pb-2 text-2xl">Sipariş ve ekip</h3>
              <ul className="lp-list">
                <li>Yeni siparişte sesli uyarı, tek tıkla WhatsApp</li>
                <li>Personel ve kurye hesapları, yetkileri ayrı</li>
                <li>Kurye ekranı: adres, yol tarifi, tahsilat tutarı</li>
                <li>Müşteri listesi: kim, ne sıklıkla, ne kadar</li>
                <li>Kapıda nakit/kart ve havale ile ödeme</li>
              </ul>
            </div>
          </div>
          <p className="mt-12 max-w-2xl border-l-2 border-[var(--accent)] pl-4 text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">Yolda:</strong> Trendyol Go ve Getir hesabınızı bağlayıp fiyatlarınızı ve siparişlerinizi buradan yönetmek.
          </p>
        </div>
      </section>

      {/* ── Fiyat ─────────────────────────────────────────────────── */}
      <section id="fiyat" className="lp-wrap py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="lp-kicker">Fiyat</p>
            <h2 className="lp-display mt-4 text-4xl leading-tight sm:text-5xl">Yılda bir kez ödersiniz. Komisyon yok.</h2>
            <p className="mt-5 max-w-sm text-[var(--ink-2)]">Satıştan pay almıyoruz; paranız doğrudan size gelir. 30 gün ücretsiz deneyin, beğenmezseniz hiçbir şey ödemezsiniz.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="lp-price">
              <p className="lp-display text-2xl">Esnaf</p>
              <p className="mt-1 text-sm text-[var(--ink-3)]">Tek başına ya da bir çırakla çalışan dükkân</p>
              <p className="mt-6">
                <span className="lp-display text-5xl">7.200 ₺</span>
                <span className="text-[var(--ink-3)]"> / yıl</span>
              </p>
              <p className="lp-mono text-xs text-[var(--ink-3)]">KDV hariç · aylık 600 ₺’ye denk gelir</p>
              <ul className="lp-list mt-6">
                <li>Online mağaza (pet.xshield.com.tr/…)</li>
                <li>Barkodlu kasa, stok ve SKT takibi</li>
                <li>Teslimat bölgeleri, gel-al</li>
                <li>1 kullanıcı</li>
              </ul>
              <Link href="/kayit" className="lp-btn mt-8 w-full justify-center">
                30 gün dene
              </Link>
            </div>
            <div className="lp-price lp-price-hl">
              <p className="lp-display text-2xl">Profesyonel</p>
              <p className="mt-1 text-sm text-[var(--ink-3)]">Kuryesi, personeli olan dükkân</p>
              <p className="mt-6">
                <span className="lp-display text-5xl">14.400 ₺</span>
                <span className="text-[var(--ink-3)]"> / yıl</span>
              </p>
              <p className="lp-mono text-xs text-[var(--ink-3)]">KDV hariç · aylık 1.200 ₺’ye denk gelir</p>
              <ul className="lp-list mt-6">
                <li>Esnaf paketindeki her şey</li>
                <li>Kendi alan adınız (www.dukkaniniz.com)</li>
                <li>Personel ve kurye hesapları</li>
                <li>Öncelikli destek</li>
              </ul>
              <Link href="/kayit" className="lp-btn mt-8 w-full justify-center">
                30 gün dene
              </Link>
            </div>
            <div className="border-t border-dashed border-[var(--rule)] pt-5 text-[15px] sm:col-span-2">
              <p>
                <strong>Kurulum hizmeti:</strong> Vaktiniz yoksa ürünlerinizi barkodla biz girer, fotoğraflarını çekeriz. Ürün sayısına göre fiyat veriyoruz.
              </p>
              <p className="mt-2 text-[var(--ink-3)]">İlk mağazalarımıza kurucu fiyatı: ilk yıl %50 indirim, fiyat 2 yıl sabit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sorular ───────────────────────────────────────────────── */}
      <section id="sorular" className="lp-band">
        <div className="lp-wrap grid gap-12 py-20 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="lp-kicker">Sorular</p>
            <h2 className="lp-display mt-4 text-4xl leading-tight sm:text-5xl">En çok sorulanlar.</h2>
            <p className="mt-5 text-[var(--ink-2)]">
              Cevabını bulamadığınız bir şey mi var?{" "}
              <a href={`mailto:${salesEmail}`} className="underline decoration-[var(--accent)] decoration-2 underline-offset-4">
                {salesEmail}
              </a>
            </p>
          </div>
          <div className="divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {FAQ.map(([q, a]) => (
              <details key={q} className="lp-faq group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-medium">
                  {q}
                  <span className="lp-mono mt-1 shrink-0 text-[var(--accent)] transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-[var(--ink-2)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kapanış ───────────────────────────────────────────────── */}
      <section className="lp-wrap py-24 text-center">
        <h2 className="lp-display mx-auto max-w-3xl text-4xl leading-tight sm:text-6xl">
          Yarın sabah kepengi açarken mağazanız <span className="lp-under">internette</span> olsun.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/kayit" className="lp-btn lp-btn-lg">
            Mağazamı aç
          </Link>
          {salesWhatsapp ? (
            <a href={whatsappLink(salesWhatsapp, "Merhaba, xShield Pet hakkında bilgi almak istiyorum.")} className="lp-btn lp-btn-ghost lp-btn-lg" target="_blank" rel="noopener">
              WhatsApp’tan sorun
            </a>
          ) : (
            <a href={`mailto:${salesEmail}?subject=${encodeURIComponent("xShield Pet hakkında")}`} className="lp-btn lp-btn-ghost lp-btn-lg">
              Bize yazın
            </a>
          )}
        </div>
        <p className="mt-5 text-[var(--ink-3)]">
          Sorularınız için:{" "}
          <a href={`mailto:${salesEmail}`} className="underline">
            {salesEmail}
          </a>
        </p>
      </section>

      <footer className="border-t border-[var(--rule)]">
        <div className="lp-wrap flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-[var(--ink-3)]">
          <p>
            © {new Date().getFullYear()} xShield ·{" "}
            <a href="https://xshield.com.tr" className="hover:underline">
              xshield.com.tr
            </a>{" "}
            ·{" "}
            <a href={`mailto:${salesEmail}`} className="hover:underline">
              {salesEmail}
            </a>
          </p>
          <p className="flex gap-5">
            <Link href="/giris" className="hover:underline">
              Mağaza girişi
            </Link>
            <Link href="/kayit" className="hover:underline">
              Mağaza aç
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

const CSS = `
.lp {
  --paper: #f4efe6; --paper-2: #ebe4d6; --ink: #1d1a16; --ink-2: #4a443b; --ink-3: #7a7266;
  --rule: #cfc5b3; --accent: #c4501b;
  background: var(--paper); color: var(--ink); font-family: var(--f-sans), system-ui, sans-serif;
  background-image: radial-gradient(rgba(29,26,22,.035) 1px, transparent 1px); background-size: 3px 3px;
}
.lp-wrap { max-width: 76rem; margin: 0 auto; padding-left: 1.25rem; padding-right: 1.25rem; }
@media (min-width: 640px) { .lp-wrap { padding-left: 2rem; padding-right: 2rem; } }
.lp-display { font-family: var(--f-display), Georgia, serif; font-variation-settings: "opsz" 120, "SOFT" 40; letter-spacing: -0.015em; }
.lp-display em { font-style: italic; color: var(--accent); }
.lp-mono { font-family: var(--f-mono), ui-monospace, monospace; }
.lp-kicker { font-family: var(--f-mono), monospace; font-size: .78rem; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.lp-under { background: linear-gradient(transparent 62%, rgba(196,80,27,.22) 62%, rgba(196,80,27,.22) 92%, transparent 92%); padding: 0 .08em; }
.lp-btn { display: inline-flex; align-items: center; gap: .5rem; background: var(--ink); color: var(--paper); padding: .6rem 1.1rem; border-radius: 2px; font-weight: 500; font-size: 15px; transition: background .15s; }
.lp-btn:hover { background: var(--accent); }
.lp-btn-lg { padding: .9rem 1.5rem; font-size: 16px; }
.lp-btn-ghost { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--ink); }
.lp-btn-ghost:hover { background: var(--ink); color: var(--paper); }
.lp-band { background: var(--paper-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }

.lp-stage { padding-bottom: 6.5rem; }
.lp-receipt { position: relative; z-index: 1; margin-left: auto; width: 66%; max-width: 18rem; background: #fffdf8; padding: 1.25rem 1.1rem 1.6rem;
  font-family: var(--f-mono), monospace; font-size: 12px; line-height: 1.65; color: #2b2722; transform: rotate(1.6deg);
  box-shadow: 0 1px 0 rgba(0,0,0,.04), 0 18px 30px -18px rgba(40,30,20,.35);
  -webkit-mask: linear-gradient(#000 0 0) top/100% calc(100% - 8px) no-repeat, radial-gradient(circle 5px at 50% 100%, transparent 98%, #000) bottom/12px 8px repeat-x;
          mask: linear-gradient(#000 0 0) top/100% calc(100% - 8px) no-repeat, radial-gradient(circle 5px at 50% 100%, transparent 98%, #000) bottom/12px 8px repeat-x; }
.lp-dash { border-top: 1px dashed #a39a8b; margin: .45rem 0; }
.lp-tag { position: absolute; z-index: 2; left: 4%; bottom: 0; width: 64%; max-width: 17rem; background: #fff7d6; border: 1px solid #e2d49a; padding: .8rem .9rem; transform: rotate(-2.5deg);
  box-shadow: 0 12px 20px -14px rgba(40,30,20,.4); }
.lp-note { position: absolute; z-index: 3; left: 0; top: 34%; width: 42%; max-width: 13rem; background: var(--ink); color: var(--paper); padding: .75rem .9rem; border-radius: 3px; transform: rotate(-1deg);
  box-shadow: 0 14px 24px -14px rgba(0,0,0,.5); }
.lp-note .lp-mono { color: #b9b0a1; }

.lp-timeline { list-style: none; margin: 0; padding: 0; }
.lp-timeline li { display: grid; grid-template-columns: 4.5rem 1fr; gap: 1.25rem; padding: 1.6rem 0; border-top: 1px solid var(--rule); }
.lp-timeline li:first-child { border-top: 0; padding-top: .25rem; }
.lp-time { font-size: .95rem; color: var(--accent); padding-top: .35rem; }

.lp-table { width: 100%; min-width: 40rem; border-collapse: collapse; }
.lp-table th, .lp-table td { text-align: left; vertical-align: top; padding: 1.1rem 1rem 1.1rem 0; border-top: 1px solid var(--rule); }
.lp-table thead th { font-family: var(--f-mono), monospace; font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 400; border-top: 0; padding-bottom: .6rem; }
.lp-table thead th:last-child { color: var(--accent); }
.lp-table tbody th { width: 11rem; }

.lp-list { margin-top: 1rem; list-style: none; padding: 0; }
.lp-list li { position: relative; padding: .45rem 0 .45rem 1.1rem; line-height: 1.45; }
.lp-list li::before { content: "—"; position: absolute; left: 0; color: var(--accent); }

.lp-price { border: 1.5px solid var(--ink); padding: 1.6rem; background: #fbf8f2; display: flex; flex-direction: column; }
.lp-price ul + .lp-btn { margin-top: 2rem; }
.lp-price-hl { box-shadow: 6px 6px 0 var(--accent); }
.lp-faq summary::-webkit-details-marker { display: none; }
`;
