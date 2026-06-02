import https from "node:https";
import { URL } from "node:url";
import { query } from "@/lib/db";

const BASE = "https://www.ergenelektronik.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface ErgenProduct {
  code: string;
  title: string;
  category: string;
  priceHavale: number | null;
  priceKk: number | null;
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

// ── HTTP helper (bypasses fetch's opaque-redirect header stripping) ────────────
type RawResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

function rawGet(url: string, cookieStr: string, referer?: string): Promise<RawResponse> {
  return rawRequest("GET", url, cookieStr, undefined, referer);
}

function rawPost(url: string, cookieStr: string, body: string, referer?: string): Promise<RawResponse> {
  return rawRequest("POST", url, cookieStr, body, referer);
}

function rawRequest(
  method: string,
  urlStr: string,
  cookieStr: string,
  body?: string,
  referer?: string
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts: https.RequestOptions = {
      method,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3",
        ...(cookieStr ? { "Cookie": cookieStr } : {}),
        ...(referer ? { "Referer": referer } : {}),
        ...(body ? {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          "Origin": `${u.protocol}//${u.hostname}`,
        } : {}),
      },
    };

    const req = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body: Buffer.concat(chunks).toString("utf-8"),
        });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────
function parseCookiesFromHeaders(headers: Record<string, string | string[] | undefined>): Map<string, string> {
  const setCookieHdrs = headers["set-cookie"] as string[] | string | undefined;
  const raw: string[] = Array.isArray(setCookieHdrs)
    ? setCookieHdrs
    : setCookieHdrs ? [setCookieHdrs] : [];

  const map = new Map<string, string>();
  for (const h of raw) {
    const nv = h.split(";")[0].trim();
    const eq = nv.indexOf("=");
    if (eq === -1) continue;
    const name = nv.slice(0, eq).trim();
    const value = nv.slice(eq + 1);
    if (!name) continue;
    if (value === "") {
      map.set(name, "\x00"); // clearing sentinel
    } else {
      map.set(name, value);
    }
  }
  return map;
}

function mergeCookieMaps(base: Map<string, string>, update: Map<string, string>): Map<string, string> {
  const result = new Map(base);
  for (const [k, v] of update) {
    if (v === "\x00") result.delete(k);
    else result.set(k, v);
  }
  return result;
}

function cookieString(map: Map<string, string>): string {
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

// ── Parse helpers ──────────────────────────────────────────────────────────────
function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function parsePrice(text: string): { value: number | null; currency: string } {
  const m = text.match(/([\d.,]+)\s*(USD|TL|EUR|GBP)/i);
  if (!m) return { value: null, currency: "USD" };
  const raw = m[1].replace(/\./g, "").replace(",", ".");
  return { value: parseFloat(raw) || null, currency: m[2].toUpperCase() };
}

// ── Login ──────────────────────────────────────────────────────────────────────
async function login(
  kullaniciAdi: string,
  parola: string,
  log: (m: string) => void
): Promise<{ cookieMap: Map<string, string>; html: string }> {
  log("Ergen Elektronik giriş yapılıyor...");

  // Step 1: GET homepage — VIEWSTATE + cookies
  const r0 = await rawGet(`${BASE}/`, "");
  let cookieMap = parseCookiesFromHeaders(r0.headers);

  const vs  = r0.body.match(/name="__VIEWSTATE"[^>]*value="([^"]+)"/)?.[1] ?? "";
  const vsg = r0.body.match(/name="__VIEWSTATEGENERATOR"[^>]*value="([^"]+)"/)?.[1] ?? "";
  const ev  = r0.body.match(/name="__EVENTVALIDATION"[^>]*value="([^"]+)"/)?.[1] ?? "";
  if (!vs) throw new Error("VIEWSTATE bulunamadı");

  // Step 2: POST login — capture 302 Set-Cookie headers (unavailable via fetch)
  const formBody = new URLSearchParams({
    "__EVENTTARGET": "", "__EVENTARGUMENT": "", "__LASTFOCUS": "",
    "__VIEWSTATE": vs, "__VIEWSTATEGENERATOR": vsg, "__EVENTVALIDATION": ev,
    "ctl00$login1$txt_username": kullaniciAdi,
    "ctl00$login1$txt_password": parola,
    "ctl00$login1$btn_login": "Giris",
  }).toString();

  const r1 = await rawPost(`${BASE}/`, cookieString(cookieMap), formBody, `${BASE}/`);
  cookieMap = mergeCookieMaps(cookieMap, parseCookiesFromHeaders(r1.headers));

  if (r1.status !== 302 && r1.status !== 301) {
    if (r1.body.includes("btn_login") || r1.body.includes("Hatalı")) {
      throw new Error("Ergen giriş başarısız — kullanıcı adı veya şifre hatalı");
    }
  }

  const location = (r1.headers["location"] as string | undefined) ?? "";
  const target = location.startsWith("http") ? location : `${BASE}${location || "/"}`;

  // Step 3: Follow redirect to logged-in home page
  const r2 = await rawGet(target, cookieString(cookieMap), `${BASE}/`);
  cookieMap = mergeCookieMaps(cookieMap, parseCookiesFromHeaders(r2.headers));

  if (!r2.body.includes("inframe") && r2.body.includes("btn_login")) {
    throw new Error("Ergen giriş başarısız — ürün sayfasına ulaşılamadı");
  }

  log(`Ergen giriş başarılı — sayfa boyutu: ${Math.round(r2.body.length / 1024)}KB`);
  return { cookieMap, html: r2.body };
}

// ── Parse ──────────────────────────────────────────────────────────────────────
function parseProducts(html: string): ErgenProduct[] {
  const products: ErgenProduct[] = [];

  type Token = { pos: number; type: "cat" | "prod" };
  const tokens: Token[] = [];

  const h2Re = /<h2>([^<]+)<\/h2>/g;
  const infRe = /<div class="inframe"\s*>/g;
  let m: RegExpExecArray | null;

  while ((m = h2Re.exec(html)) !== null) tokens.push({ pos: m.index, type: "cat" });
  while ((m = infRe.exec(html)) !== null) tokens.push({ pos: m.index, type: "prod" });
  tokens.sort((a, b) => a.pos - b.pos);

  const h2Matches: string[] = [];
  const prodPositions: number[] = [];

  const h2Re2 = /<h2>([^<]+)<\/h2>/g;
  while ((m = h2Re2.exec(html)) !== null) h2Matches.push(m[1].trim());

  const infRe2 = /<div class="inframe"\s*>/g;
  while ((m = infRe2.exec(html)) !== null) prodPositions.push(m.index);

  let catIdx = 0;
  let prodIdx = 0;
  let currentCat = "";

  for (const tok of tokens) {
    if (tok.type === "cat") {
      currentCat = h2Matches[catIdx++] ?? currentCat;
    } else {
      const pos = prodPositions[prodIdx++];
      const nextProdPos = prodPositions[prodIdx] ?? html.length;
      const chunk = html.slice(pos, nextProdPos);
      const p = parseOneProduct(chunk, currentCat);
      if (p) products.push(p);
    }
  }

  return products;
}

function parseOneProduct(chunk: string, category: string): ErgenProduct | null {
  const code = chunk.match(/hdn_stok_kodu[^>]*value="([^"]+)"/)?.[1];
  const rawName = chunk.match(/hdn_stok_adi[^>]*value="([^"]+)"/)?.[1];
  if (!code || !rawName) return null;

  const title = decodeHtml(rawName);
  const href = chunk.match(/href='(\/urun\/[^']+)'/)?.[1];
  const img = chunk.match(/src\s*=\s*'(https?:[^']+)'/)?.[1] ?? "";
  const mevcut = chunk.match(/class="mevcut">([^<]+)</)?.[1]?.trim() ?? "Bilinmiyor";

  function extractPrice(typeFrame: string): string {
    const re = new RegExp(
      `data-typeframe='${typeFrame}'[\\s\\S]*?data-type='fiyat'[^>]*>\\s*([\\d,. ]+(?:USD|TL|EUR|GBP))`,
      "i"
    );
    return chunk.match(re)?.[1]?.trim() ?? "";
  }

  const nakit  = parsePrice(extractPrice("nakit"));
  const taksit = parsePrice(extractPrice("taksit"));
  const cari   = parsePrice(extractPrice("cari"));
  const currency = nakit.currency || taksit.currency || cari.currency || "USD";

  return {
    code, title, category,
    priceHavale: nakit.value,
    priceKk: cari.value,
    priceVadeli: taksit.value,
    currency,
    stockStatus: mevcut,
    imageUrl: img,
    detailUrl: href ? `${BASE}${href}` : "",
  };
}

// ── DB Upsert ──────────────────────────────────────────────────────────────────
async function upsertProduct(p: ErgenProduct): Promise<void> {
  await query(
    `INSERT INTO supplier_products
       (source,product_code,title,category,price_havale,price_kk,price_vadeli,currency,stock_status,image_url,detail_url,last_synced)
     VALUES ('ergen',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
     ON CONFLICT (source,product_code) DO UPDATE SET
       title=$2,category=$3,price_havale=$4,price_kk=$5,price_vadeli=$6,
       currency=$7,stock_status=$8,image_url=$9,detail_url=$10,last_synced=now()`,
    [p.code, p.title, p.category, p.priceHavale, p.priceKk, p.priceVadeli,
     p.currency, p.stockStatus, p.imageUrl, p.detailUrl]
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export async function runErgenSync(
  _bayiKodu: string,
  kullaniciAdi: string,
  parola: string,
  onProgress?: (msg: string) => void
): Promise<SyncResult> {
  const log = (msg: string) => { onProgress?.(msg); console.log(`[ergen-sync] ${msg}`); };

  const { html } = await login(kullaniciAdi, parola, log);

  log("Ürünler ayrıştırılıyor...");
  const products = parseProducts(html);
  log(`${products.length} ürün bulundu.`);

  const result: SyncResult = {
    total: products.length,
    inserted: 0,
    updated: 0,
    errors: 0,
    categories: [...new Set(products.map(p => p.category))],
  };

  log(`Kategoriler: ${result.categories.join(", ")}`);

  const syncStart = new Date();

  for (const p of products) {
    try {
      await upsertProduct(p);
      result.inserted++;
    } catch (e) {
      result.errors++;
      console.error(`[ergen-sync] upsert ${p.code}:`, e);
    }
  }

  // Remove products no longer in the catalog
  if (result.total > 0) {
    const delResult = await query<{ count: string }>(
      "DELETE FROM supplier_products WHERE source='ergen' AND last_synced < $1",
      [syncStart]
    );
    const removed = (delResult as unknown as { rowCount?: number })?.rowCount ?? 0;
    if (removed > 0) log(`${removed} eski ürün silindi.`);
  }

  if (result.total === 0) log("⚠ Hiç ürün parse edilemedi.");
  else log(`✅ Tamamlandı: ${result.inserted} ürün, ${result.errors} hata`);

  return result;
}
