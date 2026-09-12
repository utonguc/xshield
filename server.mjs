// Production statik sunucu — eski Next.js SSR uygulamasının yerine geçer.
// Aynı container adı/port (3001) korunduğu için nginx reverse-proxy
// yapılandırmasında hiçbir değişiklik gerekmez.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const port = process.env.PORT || 3001;

const app = express();

// Hash'li asset dosyaları (içerik-adresli) sonsuza kadar cache'lenebilir.
app.use(
  "/assets",
  express.static(path.join(dist, "assets"), {
    immutable: true,
    maxAge: "1y",
  }),
);

// Diğer statik dosyalar (favicon vb.) — kısa cache.
app.use(express.static(dist, { index: false, maxAge: "1h" }));

// react-router client-side routing için SPA fallback: bilinmeyen her yol
// index.html'e düşer, yönlendirmeyi tarayıcıda react-router üstlenir.
// Express 5 (path-to-regexp v8), adsız "*" joker karakterini artık kabul
// etmiyor — regex ile tüm yolları eşleştiriyoruz.
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(port, () => {
  console.log(`xshield_web (static) listening on :${port}`);
});
