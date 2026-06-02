import { query } from "@/lib/db";

const BASE = "https://www.b2bdepo.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0";

export interface B2BDepoProduct {
  code: string;
  title: string;
  category: string;
  price: number | null;
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

function toNum(v: string | null | undefined): number | null {
  if (!v) return null;
  const s = v.trim().replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
  if (!s) return null;
  const n = s.includes(",") ? parseFloat(s.replace(/\./g, "").replace(",", ".")) : parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── HTML parser ───────────────────────────────────────────────────────────────
// Split on product-left divs; extract code, title, image, price, stock
function parseProductsFromHtml(html: string, category: string): B2BDepoProduct[] {
  const products: B2BDepoProduct[] = [];
  const blocks = html.split('<div class="product product-left ">');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Product code from "Ürün Kodu: XXXXX" paragraph
    const codeM = block.match(/[Üü]r[üu]n\s+Kodu:\s*([^\s<]+)/);
    if (!codeM) continue;
    const code = codeM[1].replace(/[<>]/g, "").trim();

    // Title
    const titleM = block.match(/product-caption-title">([^<]+)</);
    const title = titleM ? decodeHtml(titleM[1].trim()) : code;

    // Image (relative URL → absolute)
    const imgM = block.match(/product-img-primary"\s+src="([^"]+)"/);
    const imageUrl = imgM ? (imgM[1].startsWith("http") ? imgM[1] : `${BASE}${imgM[1]}`) : "";

    // Detail URL from purn- link
    const purnM = block.match(/href="(\/[^"]+purn-\d+)"/);
    const detailUrl = purnM ? `${BASE}${purnM[1]}` : "";

    // Price
    const priceM = block.match(/product-caption-price-satisFiyati">([^<]+)</);
    const priceRaw = priceM ? priceM[1] : null;
    const price = toNum(priceRaw?.replace(/[^\d,.\-]/g, ""));

    // Currency
    let currency = "TRY";
    if (priceRaw?.includes("$")) currency = "USD";
    else if (priceRaw?.includes("€")) currency = "EUR";

    // Stock: aggregate depot stocks into a summary
    const depotMatches = [...block.matchAll(/<span>([^<]+Depo:[^<]+)<\/span>/g)];
    let stockStatus = "unknown";
    if (depotMatches.length > 0) {
      const hasStock = depotMatches.some(m => {
        const qty = m[1].split(":")[1]?.trim();
        return qty && qty !== "0";
      });
      stockStatus = hasStock ? "Stok Var" : "Stok Yok";
    }

    products.push({ code, title, category, price, currency, stockStatus, imageUrl, detailUrl });
  }

  return products;
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(
  bayiKodu: string, kullaniciAdi: string, parola: string,
  log: (m: string) => void
): Promise<string> {
  log("B2BDepo giriş yapılıyor...");

  const headers = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
    "Connection": "keep-alive",
  };

  // Step 1: Home page (Cloudflare warm-up)
  const r0 = await fetch(`${BASE}/`, { headers });
  let cookie = extractCookies(r0.headers);
  await r0.text();
  await new Promise(r => setTimeout(r, 1500));

  // Step 2: Login page
  const r1 = await fetch(`${BASE}/BayiGiris`, { headers: { ...headers, "Cookie": cookie, "Referer": `${BASE}/` } });
  const c1 = extractCookies(r1.headers);
  if (c1) cookie = mergeCookies(cookie, c1);
  await r1.text();
  await new Promise(r => setTimeout(r, 800));

  // Step 3: POST login — url=%2FHome so CF passes on success redirect
  const body = new URLSearchParams({
    bayiKodu, kullaniciAdi, sifre: parola,
    url: "/Home", GuvenlikSorusu: "",
  });

  const r2 = await fetch(`${BASE}/Login`, {
    method: "POST",
    redirect: "manual",
    headers: {
      ...headers,
      "Cookie": cookie,
      "Referer": `${BASE}/BayiGiris`,
      "Origin": BASE,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const location = r2.headers.get("location") ?? "";
  const c2 = extractCookies(r2.headers);
  if (c2) cookie = mergeCookies(cookie, c2);

  if (!location.includes("/Home") && !location.includes("/home")) {
    throw new Error(`Giriş başarısız — yönlendirme: ${location}`);
  }
  log(`B2BDepo giriş başarılı → ${location}`);

  // Step 4: Follow redirect to get session
  const r3 = await fetch(location.startsWith("http") ? location : `${BASE}${location}`, {
    headers: { ...headers, "Cookie": cookie, "Referer": `${BASE}/BayiGiris` },
  });
  const c3 = extractCookies(r3.headers);
  if (c3) cookie = mergeCookies(cookie, c3);
  await r3.text();

  return cookie;
}

// ── Categories ────────────────────────────────────────────────────────────────
interface Category { name: string; slug: string }

async function getCategories(cookie: string): Promise<Category[]> {
  const r = await fetch(`${BASE}/Home`, {
    headers: { "User-Agent": UA, "Cookie": cookie, "Accept": "text/html" },
  });
  const html = await r.text();
  const cats: Map<string, Category> = new Map();

  // Extract all ktgr- links from the navigation/menu
  const re = /href="(\/([^"]+)-ktgr-\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    const raw = m[2].replace(/-/g, " ").replace(/\burunleri\b/gi, "Ürünleri").trim();
    const name = decodeHtml(raw);
    if (!cats.has(slug)) cats.set(slug, { name, slug });
  }
  return Array.from(cats.values());
}

// ── Fetch category page ───────────────────────────────────────────────────────
async function fetchCategoryPage(
  cookie: string, catSlug: string, catName: string, page: number, debug = false
): Promise<{ products: B2BDepoProduct[]; totalPages: number }> {
  const url = `${BASE}${catSlug}?sayfa=${page}&listelemeAdet=20`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA, "Cookie": cookie,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Referer": `${BASE}/Home`,
    },
  });

  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();

  if (debug) {
    const countM = html.match(/(\d+)\s*adet\s*[üu]r[üu]n\s*listelenmi[sş]/i) ??
                   html.match(/Toplam\s+(\d+)\s+sayfa/i);
    console.log(`[b2bdepo][${catName}] page=${page} debug: ${countM?.[0] ?? "no count found"}`);
  }

  const products = parseProductsFromHtml(html, catName);

  // Extract total page count: "Toplam X sayfa"
  const totalM = html.match(/Toplam\s+(\d+)\s+sayfa/i);
  let totalPages = totalM ? parseInt(totalM[1]) : 1;

  // Fallback: find max page in onclick="Filtrele(0, N, ..."
  if (totalPages === 1) {
    const pageNums = [...html.matchAll(/Filtrele\(\d+,\s*(\d+),/g)].map(x => parseInt(x[1]));
    if (pageNums.length > 0) totalPages = Math.max(...pageNums);
  }

  return { products, totalPages };
}

// ── Upsert ────────────────────────────────────────────────────────────────────
async function upsertProduct(p: B2BDepoProduct): Promise<void> {
  await query(
    `INSERT INTO supplier_products
       (source,product_code,title,category,price_havale,price_kk,price_vadeli,currency,stock_status,image_url,detail_url,last_synced)
     VALUES ('bilsam',$1,$2,$3,$4,$4,$4,$5,$6,$7,$8,now())
     ON CONFLICT (source,product_code) DO UPDATE SET
       title=$2,category=$3,price_havale=$4,price_kk=$4,price_vadeli=$4,
       currency=$5,stock_status=$6,image_url=$7,detail_url=$8,last_synced=now()`,
    [p.code, p.title, p.category, p.price, p.currency, p.stockStatus, p.imageUrl, p.detailUrl]
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function runB2BDepoSync(
  bayiKodu: string, kullaniciAdi: string, parola: string,
  onProgress?: (msg: string) => void
): Promise<SyncResult> {
  const log = (msg: string) => { onProgress?.(msg); console.log(`[b2bdepo-sync] ${msg}`); };

  const cookie = await login(bayiKodu, kullaniciAdi, parola, log);

  log("Kategoriler alınıyor...");
  const categories = await getCategories(cookie);
  log(`${categories.length} kategori bulundu.`);

  const result: SyncResult = { total: 0, inserted: 0, updated: 0, errors: 0, categories: [] };
  let firstDebug = true;

  for (const cat of categories) {
    try {
      const first = await fetchCategoryPage(cookie, cat.slug, cat.name, 1, firstDebug);
      firstDebug = false;

      if (first.products.length === 0) continue;

      result.categories.push(cat.name);
      log(`▶ ${cat.name} — ${first.totalPages} sayfa, ${first.products.length} ürün/sayfa`);
      result.total += first.products.length;
      for (const p of first.products) {
        try { await upsertProduct(p); result.inserted++; }
        catch (e) { result.errors++; console.error(`upsert ${p.code}:`, e); }
      }

      for (let page = 2; page <= first.totalPages; page++) {
        await new Promise(r => setTimeout(r, 400));
        const { products } = await fetchCategoryPage(cookie, cat.slug, cat.name, page);
        if (products.length === 0) break;
        log(`  ${cat.name} sayfa ${page}: ${products.length}`);
        result.total += products.length;
        for (const p of products) {
          try { await upsertProduct(p); result.inserted++; }
          catch (e) { result.errors++; }
        }
      }

      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      result.errors++;
      log(`HATA [${cat.name}]: ${String(err)}`);
    }
  }

  if (result.total === 0) log("⚠ Hiç ürün parse edilemedi.");
  return result;
}
