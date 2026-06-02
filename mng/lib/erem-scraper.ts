import { query } from "@/lib/db";

const BASE = "https://eremonline.com";
const FILTER_API = `${BASE}/Arama/Filterle`;
const UA = "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0";

export interface EremProduct {
  code: string;
  title: string;
  category: string;
  priceHavale: number | null;
  priceKK: number | null;
  priceVadeli: number | null;
  currency: string;
  stockStatus: string;
  imageUrl: string;
  detailUrl: string;
}

export interface SyncResult {
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  categories: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function extractCookies(headers: Headers): string {
  const raw: string[] = [];
  try {
    const fn = (headers as unknown as { getSetCookie?(): string[] }).getSetCookie;
    if (typeof fn === "function") raw.push(...fn.call(headers));
    else { const sc = headers.get("set-cookie"); if (sc) raw.push(sc); }
  } catch { const sc = headers.get("set-cookie"); if (sc) raw.push(sc); }
  return raw.map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
}

function mergeCookies(a: string, b: string): string {
  const map = new Map<string, string>();
  for (const part of [...a.split(";"), ...b.split(";")]) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf("=");
    if (eq === -1) map.set(p, "");
    else map.set(p.slice(0, eq).trim(), p.slice(eq + 1));
  }
  return Array.from(map.entries()).filter(([k]) => k).map(([k, v]) => v ? `${k}=${v}` : k).join("; ");
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "" || v === false) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  // Turkish format: 1.234,56
  const n = s.includes(",")
    ? parseFloat(s.replace(/\./g, "").replace(",", "."))
    : parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// ── HTML product card parser ──────────────────────────────────────────────────
// cAramaKalem is rendered HTML; each product is a .product-box.style3 div
// Stock div:  class="price-horizontal col-md-1" <p>...</p>
// Price divs: class="col-md-1 price-horizontal"  (havale, kk, vadeli in order)
function parseHtmlProducts(html: string, category: string): EremProduct[] {
  const products: EremProduct[] = [];

  const blocks = html.split('<div class="product-box style3 row form-text-bahn">');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const codeM = block.match(/data-curunkodu="(\d+)"/);
    if (!codeM) continue;
    const code = codeM[1];

    const titleM = block.match(/uruntitle="([^"]+)"/);
    const title = titleM ? decodeHtml(titleM[1]) : code;

    const imgM = block.match(/<img[^>]+src='(https?:[^']+)'/i) ??
                 block.match(/<img[^>]+src="(https?:[^"]+)"/i);
    const imageUrl = imgM ? imgM[1] : "";

    // Stock: class="price-horizontal col-md-1" (note order) wraps <p>
    const stockM = block.match(/<div[^>]+class="price-horizontal col-md-1"[^>]*>\s*<p>([^<]+)<\/p>/);
    const stockStatus = stockM ? stockM[1].trim() : "unknown";

    // Prices: class="col-md-1 price-horizontal" (note order) — 3 in order
    const priceMatches = [...block.matchAll(/<div[^>]+class="col-md-1 price-horizontal"[^>]*>([^<]+)<\/div>/g)];
    let priceHavale: number | null = null;
    let priceKK: number | null = null;
    let priceVadeli: number | null = null;
    let currency = "USD";

    if (priceMatches[0]) {
      const raw = priceMatches[0][1].trim();
      if (raw.includes("€")) currency = "EUR";
      else if (raw.includes("₺") || /\btl\b/i.test(raw)) currency = "TRY";
      priceHavale = toNum(raw);
    }
    if (priceMatches[1]) priceKK     = toNum(priceMatches[1][1]);
    if (priceMatches[2]) priceVadeli = toNum(priceMatches[2][1]);

    products.push({
      code, title, category,
      priceHavale, priceKK, priceVadeli, currency,
      stockStatus, imageUrl,
      detailUrl: `${BASE}/Urun/UrunDetay/${code}`,
    });
  }

  return products;
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(log: (m: string) => void, bayiKodu = process.env.EREM_BAYI ?? "", kullaniciAdi = process.env.EREM_USER ?? "", parola = process.env.EREM_PASS ?? ""): Promise<string> {
  log("Form girişi yapılıyor...");
  const loginUrl = `${BASE}/Uyelik/Giris`;
  const getResp = await fetch(loginUrl, {
    headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "tr-TR,tr;q=0.9" },
  });
  let cookie = extractCookies(getResp.headers);
  const html = await getResp.text();

  const formData: Record<string, string> = {};
  const inputRe = /<input[^>]+>/gi;
  let im: RegExpExecArray | null;
  while ((im = inputRe.exec(html)) !== null) {
    const tag = im[0];
    const nameM = tag.match(/\bname="([^"]+)"/i);
    const valueM = tag.match(/\bvalue="([^"]*)"/i);
    const typeM = tag.match(/\btype="([^"]+)"/i);
    if (!nameM) continue;
    const name = nameM[1], value = valueM?.[1] ?? "", type = (typeM?.[1] ?? "text").toLowerCase();
    if (type === "submit" || type === "button" || type === "image") continue;
    const lower = name.toLowerCase();
    if (lower.includes("bayi") || lower.includes("dealer"))                   formData[name] = bayiKodu;
    else if (lower.includes("kullanici") || lower.includes("user"))           formData[name] = kullaniciAdi;
    else if (lower.includes("parola") || lower.includes("sifre") || lower.includes("pass")) formData[name] = parola;
    else                                                                       formData[name] = value;
  }
  // Exact field names as discovered from curl inspection
  if (!Object.keys(formData).some(k => k === "cBayiKodu" || k.toLowerCase().includes("bayi"))) {
    formData["cBayiKodu"]    = bayiKodu;
    formData["cKullaniciAdi"] = kullaniciAdi;
    formData["cParola"]      = parola;
  }

  const actionM = html.match(/<form[^>]+action="([^"]+)"/i);
  const postUrl = actionM?.[1] ? (actionM[1].startsWith("http") ? actionM[1] : `${BASE}${actionM[1]}`) : loginUrl;

  const postResp = await fetch(postUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA, "Cookie": cookie, "Referer": loginUrl, "Origin": BASE,
    },
    body: new URLSearchParams(formData).toString(),
    redirect: "manual",
  });

  log(`Login → ${postResp.status} ${postResp.headers.get("location") ?? ""}`);
  const postCookies = extractCookies(postResp.headers);
  if (postCookies) cookie = mergeCookies(cookie, postCookies);

  const location = postResp.headers.get("location");
  if (location) {
    const red = location.startsWith("http") ? location : `${BASE}${location}`;
    const redResp = await fetch(red, { headers: { "User-Agent": UA, "Cookie": cookie }, redirect: "manual" });
    const rc = extractCookies(redResp.headers);
    if (rc) cookie = mergeCookies(cookie, rc);
  }

  return cookie;
}

// ── Filter API ────────────────────────────────────────────────────────────────
function buildFilterUrl(kategori: string, page: number): string {
  const filter = {
    cIcerik: "", cKategori: kategori ? `('${kategori}')` : "",
    cAltkategori: "", cSisKategori: "", cMarka: "",
    nFiyatMax: "999999", nFiyatMin: "0", nSayfaIndex: page,
    cSiralama: "FA", cAramaTarzi: "L", lSadeceStokta: false,
    cAramaAlan: "STK", Ozellikler: [], OdemeSekli: 0, cDepo: "",
  };
  return `${FILTER_API}?strFiltre=${encodeURIComponent(JSON.stringify(filter, null, 2))}`;
}

async function fetchFilterApi(
  cookie: string, kategori: string, page: number, debug = false
): Promise<{ products: EremProduct[]; totalPages: number; totalCount: number }> {
  const url = buildFilterUrl(kategori, page);
  const resp = await fetch(url, {
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "User-Agent": UA, "Cookie": cookie,
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${BASE}/Arama/sonuc?Kategori=${encodeURIComponent(kategori)}`,
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const ct = resp.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    const body = await resp.text();
    throw new Error(`JSON beklendi ama ${ct} — ${body.slice(0, 200)}`);
  }

  const data = await resp.json() as Record<string, unknown>;

  const tc = typeof data.nUrunSayi === "number" ? data.nUrunSayi : 0;
  if (debug || tc > 0) {
    console.log(`[erem][${kategori}] lResult=${data.lResult} nUrunSayi=${tc} page=${page}`);
    if (tc > 0 && typeof data.cAramaKalem === "string") {
      const sample = data.cAramaKalem.slice(0, 400);
      console.log(`[erem] cAramaKalem HTML sample: ${sample}`);
    }
  }

  const totalCount = typeof data.nUrunSayi === "number" ? data.nUrunSayi : 0;

  // ── cAramaKalem is HTML, not a JSON array ─────────────────────────────────
  let products: EremProduct[] = [];
  let totalPages = 1;

  if (typeof data.cAramaKalem === "string" && data.cAramaKalem.length > 20) {
    products = parseHtmlProducts(data.cAramaKalem, kategori);

    // Pagination: check cAramaSayalama for page links
    if (typeof data.cAramaSayalama === "string") {
      const pageLinks = [...data.cAramaSayalama.matchAll(/nSayfaIndex[^"]*"(\d+)"|sayfa=(\d+)/gi)];
      const maxPage = pageLinks.reduce((mx, m) => Math.max(mx, parseInt(m[1] ?? m[2])), 1);
      if (maxPage > 1) totalPages = maxPage;
      else if (totalCount > products.length && products.length > 0) {
        totalPages = Math.ceil(totalCount / products.length);
      }
    }
  } else if (Array.isArray(data.cAramaKalem)) {
    // Fallback: JSON array format (unlikely but handle it)
    products = (data.cAramaKalem as Record<string, unknown>[])
      .map(r => {
        const code = String(r.urunkod ?? r.UrunKod ?? r.kod ?? "");
        if (!code) return null;
        return {
          code, title: String(r.uruntitle ?? r.UrunAdi ?? code),
          category: kategori,
          priceHavale: toNum(r.havale ?? r.Havale),
          priceKK: toNum(r.kk ?? r.KK),
          priceVadeli: toNum(r.vadeli ?? r.Vadeli),
          currency: "USD", stockStatus: String(r.urunstokdurum ?? "unknown"),
          imageUrl: String(r.urunresim ?? ""), detailUrl: `${BASE}/Urun/UrunDetay/${code}`,
        } as EremProduct;
      })
      .filter(Boolean) as EremProduct[];
  }

  return { products, totalPages, totalCount };
}

// ── Categories ────────────────────────────────────────────────────────────────
async function getCategories(cookie: string): Promise<string[]> {
  try {
    const resp = await fetch(`${BASE}/`, { headers: { "User-Agent": UA, "Cookie": cookie, "Accept": "text/html" } });
    const html = await resp.text();
    const cats = new Set<string>();
    const re = /href="[^"]*(?:Arama|Kategori)[^"]*"[^>]*>([^<]{2,80})</gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const name = decodeHtml(m[1]).replace(/\s+/g, " ").trim();
      if (name.length >= 2 && name.length <= 80) cats.add(name);
    }
    return Array.from(cats);
  } catch { return []; }
}

// ── Upsert ────────────────────────────────────────────────────────────────────
async function upsertProduct(p: EremProduct): Promise<void> {
  await query(
    `INSERT INTO supplier_products (source,product_code,title,category,price_havale,price_kk,price_vadeli,currency,stock_status,image_url,detail_url,last_synced)
     VALUES ('erem',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
     ON CONFLICT (source,product_code) DO UPDATE SET title=$2,category=$3,price_havale=$4,price_kk=$5,price_vadeli=$6,currency=$7,stock_status=$8,image_url=$9,detail_url=$10,last_synced=now()`,
    [p.code, p.title, p.category, p.priceHavale, p.priceKK, p.priceVadeli, p.currency, p.stockStatus, p.imageUrl, p.detailUrl]
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function runEremSync(
  credentials?: { bayiKodu?: string; kullaniciAdi?: string; parola?: string },
  onProgress?: (msg: string) => void
): Promise<SyncResult> {
  const log = (msg: string) => { onProgress?.(msg); console.log(`[erem-sync] ${msg}`); };

  const bayiKodu = credentials?.bayiKodu || process.env.EREM_BAYI || "";
  const kullaniciAdi = credentials?.kullaniciAdi || process.env.EREM_USER || "";
  const parola = credentials?.parola || process.env.EREM_PASS || "";

  log("Oturum başlatılıyor...");
  const cookie = await login(log, bayiKodu, kullaniciAdi, parola);

  log("Kategoriler alınıyor...");
  const rawCats = await getCategories(cookie);
  const categories = rawCats.length > 0
    ? [...new Set(rawCats.map(decodeHtml))]
    : ["Network Ürünleri","Güvenlik Çözümleri","Rack Kabinetler","Bilgisayar ve Bileşenleri",
       "Çevre Birimleri","Kurumsal Ürünler","Yangın Alarm Sistemleri","Müzik Sistemleri","Telekom Ürünleri","Plastik","Kablolar"];
  log(`${categories.length} kategori.`);

  const result: SyncResult = { total: 0, inserted: 0, updated: 0, errors: 0, categories: [] };
  let firstDebug = true;

  for (const cat of categories) {
    try {
      result.categories.push(cat);
      const first = await fetchFilterApi(cookie, cat, 1, firstDebug);
      firstDebug = false;

      if (first.totalCount === 0) continue;

      log(`▶ ${cat} — ${first.totalCount} ürün (parse: ${first.products.length})`);
      result.total += first.products.length;
      for (const p of first.products) {
        try { await upsertProduct(p); result.inserted++; }
        catch (e) { result.errors++; console.error(`upsert ${p.code}:`, e); }
      }

      for (let page = 2; page <= first.totalPages; page++) {
        await new Promise(r => setTimeout(r, 300));
        const { products } = await fetchFilterApi(cookie, cat, page);
        if (products.length === 0) break;
        log(`  sayfa ${page}: ${products.length}`);
        result.total += products.length;
        for (const p of products) {
          try { await upsertProduct(p); result.inserted++; }
          catch (e) { result.errors++; }
        }
      }
    } catch (err) {
      result.errors++;
      log(`HATA [${cat}]: ${String(err)}`);
    }
  }

  if (result.total === 0) log("⚠ Hiç ürün parse edilemedi. Docker loglarına bakın.");

  return result;
}
