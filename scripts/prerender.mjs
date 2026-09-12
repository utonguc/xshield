// Build sonrası çalışır (postbuild): dist/ içindeki her rotayı gerçek bir
// tarayıcıda bir kez render edip sonucu statik HTML olarak üzerine yazar.
// Amaç: JavaScript ÇALIŞTIRMAYAN arama motoru/AI ajanı botlarının (birçok
// AI crawler dahil) boş bir <div id="root"> yerine gerçek içerik görmesi.
// Script etiketi dokunulmadan kalır — gerçek bir tarayıcı sayfayı açtığında
// React normal şekilde devralır (client-side render), sadece ilk boya artık
// gerçek metin içeriyor.
import express from "express";
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const PORT = 4576;

// Blog slug'larını src/data/blog.ts'den (TS derlemeden, basit regex ile)
// çıkarır — yeni yazı eklendiğinde bu listeyi elle güncellemeye gerek kalmaz.
async function blogRoutes() {
  const src = await fs.readFile(path.join(root, "src/data/blog.ts"), "utf8");
  const slugs = [...src.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  return slugs.map((slug) => `/blog/${slug}`);
}

const routes = ["/", "/gizlilik", "/kvkk", "/blog", ...(await blogRoutes())];

async function scrollThroughPage(page) {
  // whileInView tetiklenen bölümlerin (Pillars, Products, Roadmap, vb.)
  // görünürlük gözlemcilerinin çalışıp içeriği "settled" hale getirmesi için
  // sayfayı baştan sona kaydırır, sonra başa döner.
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve(undefined);
        }
      }, 90);
    });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));
}

async function main() {
  const app = express();
  app.use(express.static(dist, { index: false }));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  const server = app.listen(PORT);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const route of routes) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle0", timeout: 30_000 });
      await scrollThroughPage(page);

      const html = "<!doctype html>\n" + (await page.evaluate(() => document.documentElement.outerHTML));

      const outPath = route === "/" ? path.join(dist, "index.html") : path.join(dist, route, "index.html");
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, html, "utf8");
      console.log(`prerender: ${route} -> ${path.relative(dist, outPath)} (${(html.length / 1024).toFixed(0)} KB)`);

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error("prerender başarısız:", err);
  process.exit(1);
});
