import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const firma = data.firmaAdi || "Bilinmiyor";
    const tarih = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const row = (label: string, value: string) =>
      value
        ? `<tr><td style="padding:8px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;vertical-align:top;width:220px">${label}</td><td style="padding:8px 12px;color:#e2e8f0;font-size:13px">${value}</td></tr>`
        : "";

    const section = (title: string, rows: string) =>
      `<div style="margin-bottom:28px">
        <div style="background:#1e293b;padding:8px 16px;border-radius:6px 6px 0 0;font-size:12px;font-weight:700;color:#60a5fa;letter-spacing:1.5px;text-transform:uppercase">${title}</div>
        <table style="width:100%;border-collapse:collapse;background:#0f172a;border-radius:0 0 6px 6px;overflow:hidden">${rows}</table>
      </div>`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:700px;margin:0 auto;padding:32px 24px">

    <div style="margin-bottom:32px">
      <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:6px">Yeni Keşif Formu</div>
      <div style="font-size:13px;color:#64748b">${tarih} — <span style="color:#60a5fa">${firma}</span></div>
    </div>

    ${section("İletişim Bilgileri",
      row("Firma Adı", data.firmaAdi) +
      row("Yetkili Adı / Soyadı", data.yetkiliAdi) +
      row("E-posta", data.email) +
      row("Telefon", data.telefon)
    )}

    ${section("Mevcut Durum — Ürün Verisi",
      row("Ürünler nerede tutuluyor?", data.urunKaynagi) +
      row("Ürün aktiflik durumu", data.urunAktiflik) +
      row("Ürün fotoğrafları var mı?", data.urunFotograf) +
      row("Mevcut ürün bilgileri", data.urunBilgiler) +
      row("Varyant var mı?", data.urunVaryant)
    )}

    ${section("Stok Takibi",
      row("Stok hareketleri nasıl takip ediliyor?", data.stokTakip) +
      row("Birden fazla depo/lokasyon var mı?", data.stokDepo) +
      row("Stok sayımı ne sıklıkla yapılıyor?", data.stokSayim) +
      row("Tedarikçi takibi kapsama giriyor mu?", data.stokTedarik) +
      row("Minimum stok / otomatik uyarı isteniliyor mu?", data.stokUyari)
    )}

    ${section("B2B Portal",
      row("Portali kimler kullanacak?", data.b2bKullanici) +
      row("Müşteri bazlı fiyatlandırma olacak mı?", data.b2bFiyat) +
      row("Toplu sipariş / liste yükleme gerekiyor mu?", data.b2bToplu) +
      row("Sipariş onay akışı var mı?", data.b2bOnay) +
      row("Müşteriler bakiye/borç görebilecek mi?", data.b2bBakiye)
    )}

    ${section("Entegrasyonlar",
      row("Mevcut muhasebe / ERP yazılımı", data.entERP) +
      row("E-fatura / e-arşiv / e-irsaliye kapsama giriyor mu?", data.entEFatura) +
      row("Kargo entegrasyonu düşünülüyor mu?", data.entKargo) +
      row("Ödeme altyapısı / sanal POS gerekiyor mu?", data.entOdeme)
    )}

    ${section("Ölçek ve Proje Yönetimi",
      row("Aynı anda tahmini kullanıcı sayısı", data.olcekKullanici) +
      row("Günlük ortalama sipariş adedi", data.olcekSiparis) +
      row("Mobil erişim gerekiyor mu?", data.olcekMobil) +
      row("Teslim tarihi beklentisi", data.pmTarih) +
      row("Teknik muhatap / IT sorumlusu var mı?", data.pmMuhatap) +
      row("Eğitim ihtiyacı — kaç kullanıcı?", data.pmEgitim) +
      row("Proje sonrası bakım / destek beklentisi", data.pmDestek)
    )}

  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"xShield Keşif Formu" <${process.env.SMTP_FROM}>`,
      to: "umuttonguc@gmail.com",
      subject: `Keşif Formu — ${firma}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("form-mail error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
