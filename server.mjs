// Production statik sunucu — eski Next.js SSR uygulamasının yerine geçer.
// Aynı container adı/port (3001) korunduğu için nginx reverse-proxy
// yapılandırmasında hiçbir değişiklik gerekmez.
import express from "express";
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const port = process.env.PORT || 3001;

const app = express();
app.use(express.json());

// Hash'li asset dosyaları (içerik-adresli) sonsuza kadar cache'lenebilir.
app.use(
  "/assets",
  express.static(path.join(dist, "assets"), {
    immutable: true,
    maxAge: "1y",
  }),
);

// Diğer statik dosyalar + prerender edilmiş sayfalar (ör. /gizlilik/index.html,
// /blog/<slug>/index.html) — index:true (varsayılan) olmalı, aksi halde bu
// dizin-index dosyaları hiç servis edilmez ve her istek yanlışlıkla kök
// index.html'e (SPA fallback'e) düşer.
app.use(express.static(dist, { maxAge: "1h" }));

// İletişim formu — container'da zaten tanımlı SMTP_* ortam değişkenlerini
// kullanır (bkz. infra/docker-compose.yml, xshield_web servisi).
app.post("/api/contact", async (req, res) => {
  const { name, company, email, service, message } = req.body ?? {};

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Ad, e-posta ve mesaj zorunlu." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SSL === "true" || process.env.SMTP_PORT === "465",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });

    const tarih = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
    const row = (label, value) =>
      value
        ? `<tr><td style="padding:8px 12px;color:#5f5f67;font-size:13px;white-space:nowrap;vertical-align:top;width:160px">${label}</td><td style="padding:8px 12px;color:#101014;font-size:13px">${value}</td></tr>`
        : "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f6f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px">
    <div style="font-size:20px;font-weight:800;color:#101014;margin-bottom:4px">xShield — Yeni İletişim Formu</div>
    <div style="font-size:13px;color:#9c9ca3;margin-bottom:24px">${tarih}</div>
    <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e3da;border-radius:8px;overflow:hidden">
      ${row("Ad Soyad", name)}
      ${row("Firma", company)}
      ${row("E-posta", email)}
      ${row("İlgilenilen Hizmet", service)}
      ${row("Mesaj", (message || "").replace(/\n/g, "<br/>"))}
    </table>
  </div>
</body></html>`;

    await transporter.sendMail({
      from: `"xShield Web Formu" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: "info@xshield.com.tr",
      replyTo: email,
      subject: `Yeni İletişim Formu — ${company || name}`,
      html,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("contact-form mail error:", err);
    res.status(500).json({ ok: false, error: "Mesaj gönderilemedi, lütfen tekrar deneyin." });
  }
});

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
