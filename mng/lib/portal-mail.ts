import "server-only";
import nodemailer from "nodemailer";

// Use dedicated noreply account if credentials are set, otherwise fall back to main SMTP
const smtpUser = process.env.PORTAL_SMTP_USER && process.env.PORTAL_SMTP_PASS
  ? process.env.PORTAL_SMTP_USER
  : process.env.SMTP_USER!;
const smtpPass = process.env.PORTAL_SMTP_USER && process.env.PORTAL_SMTP_PASS
  ? process.env.PORTAL_SMTP_PASS
  : process.env.SMTP_PASS!;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: { user: smtpUser, pass: smtpPass },
});

const FROM_ADDR = smtpUser;

export async function sendWelcomeEmail(to: string, fullName: string, companyName: string): Promise<void> {
  const portalUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/portal/login`
    : "https://mng.xshield.com.tr/portal/login";

  console.log(`[portal-mail] sendWelcomeEmail → ${to} (${fullName}, ${companyName})`);
  try {
    const info = await transporter.sendMail({
      from: `"xShield Portal" <${FROM_ADDR}>`,
      to,
      subject: `xShield Müşteri Portalı — Erişiminiz Tanımlandı`,
      text: `Merhaba ${fullName},\n\n${companyName} adına xShield Müşteri Portalı erişiminiz tanımlandı.\n\nGiriş yapmak için aşağıdaki bağlantıyı kullanın:\n${portalUrl}\n\nE-posta adresinizi girdikten sonra size gönderilen 6 haneli kodu kullanarak giriş yapabilirsiniz.\n\nxShield Destek Ekibi`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:480px;margin:40px auto;padding:16px">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#1e293b;padding:20px 28px;display:flex;align-items:center;gap:10px">
      <span style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-0.3px">xShield</span>
      <span style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.08em">Portal</span>
    </div>
    <div style="padding:32px 28px">
      <p style="font-size:14px;color:#475569;margin:0 0 8px">Merhaba <strong>${fullName}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6">
        <strong>${companyName}</strong> adına xShield Müşteri Portalı erişiminiz tanımlandı.
        Portala giriş yapmak için aşağıdaki butona tıklayın.
      </p>
      <a href="${portalUrl}" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:13px 24px;border-radius:9px;font-size:14px;font-weight:700;margin-bottom:24px">
        Portala Git →
      </a>
      <p style="font-size:13px;color:#64748b;margin:0 0 4px;line-height:1.6">
        Giriş yaparken e-posta adresinize gönderilecek <strong>6 haneli kodu</strong> kullanacaksınız.
        Şifre gerekmez.
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;background:#f8fafc">
      <p style="font-size:11px;color:#94a3b8;margin:0">${companyName} · xShield Müşteri Portalı</p>
    </div>
  </div>
</div>
</body>
</html>`,
    });
    console.log(`[portal-mail] sendWelcomeEmail OK → messageId=${info.messageId} response=${info.response}`);
  } catch (err) {
    console.error("[portal-mail] sendWelcomeEmail failed:", err);
  }
}

export async function sendOtpEmail(to: string, code: string, companyName: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"xShield Portal" <${FROM_ADDR}>`,
      to,
      subject: `${code} — xShield Portal Giriş Kodu`,
      text: `Giriş kodunuz: ${code}\n\nBu kod 10 dakika geçerlidir.\nBu kodu kimseyle paylaşmayın.\n\n${companyName} — xShield Müşteri Portalı`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:480px;margin:40px auto;padding:16px">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#1e293b;padding:20px 28px;display:flex;align-items:center;gap:10px">
      <span style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-0.3px">xShield</span>
      <span style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.08em">Portal</span>
    </div>
    <div style="padding:32px 28px">
      <p style="font-size:14px;color:#475569;margin:0 0 20px">Merhaba,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 28px">
        Portalinize giriş yapmak için aşağıdaki kodu kullanın:
      </p>
      <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px">
        <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#1e293b;font-family:monospace">${code}</span>
      </div>
      <p style="font-size:13px;color:#64748b;margin:0 0 8px">
        ⏱ Bu kod <strong>10 dakika</strong> süreyle geçerlidir.
      </p>
      <p style="font-size:13px;color:#64748b;margin:0">
        🔒 Bu kodu kimseyle paylaşmayın.
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;background:#f8fafc">
      <p style="font-size:11px;color:#94a3b8;margin:0">${companyName} · xShield Müşteri Portalı</p>
    </div>
  </div>
</div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[portal-mail] sendOtpEmail failed:", err);
  }
}
