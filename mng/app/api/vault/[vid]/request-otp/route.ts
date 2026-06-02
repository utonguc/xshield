import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";
import { hashOtp } from "@/lib/vault-crypto";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!, port: Number(process.env.SMTP_PORT ?? 465),
  secure: true, auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
});

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ vid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { vid } = await params;

  const cred = await queryOne<{ id: number; label: string; customer_id: number; encrypted_pass: string | null }>(
    "SELECT id, label, customer_id, encrypted_pass FROM credential_vaults WHERE id=$1",
    [Number(vid)]
  );
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!cred.encrypted_pass) return NextResponse.json({ error: "Bu kayıt için şifre yok" }, { status: 400 });

  // Invalidate old OTPs for this credential+admin
  await query(
    "UPDATE vault_otp_sessions SET used_at=now() WHERE admin_id=$1 AND credential_id=$2 AND used_at IS NULL",
    [session.id, Number(vid)]
  );

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika

  await query(
    "INSERT INTO vault_otp_sessions (admin_id, credential_id, otp_hash, expires_at) VALUES ($1,$2,$3,$4)",
    [session.id, Number(vid), hashOtp(otp), expires]
  );

  // Get admin email
  const adminRow = await queryOne<{ email: string | null }>(
    "SELECT email FROM users WHERE id=$1", [session.id]
  );
  const toEmail = adminRow?.email ?? process.env.SMTP_USER!;

  await transporter.sendMail({
    from: `"xShield Kasa" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Kasa OTP: ${cred.label}`,
    html: `
<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
  <h2 style="color:#0f172a;margin-bottom:8px">Erişim Bilgisi Görüntüleme</h2>
  <p style="color:#64748b;margin-bottom:20px">Aşağıdaki kayda erişim talep edildi:</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
    <strong style="color:#0f172a">${cred.label}</strong>
  </div>
  <div style="background:#0f172a;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
    <div style="font-size:11px;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">Tek Kullanımlık Kod</div>
    <div style="font-size:36px;font-weight:900;color:#3b82f6;letter-spacing:0.15em">${otp}</div>
    <div style="font-size:11px;color:#64748b;margin-top:8px">5 dakika geçerlidir</div>
  </div>
  <p style="color:#94a3b8;font-size:12px">Bu kodu siz talep etmediyseniz güvenlik ekibini bilgilendirin.</p>
</div>`,
  });

  return NextResponse.json({ ok: true, email: toEmail.replace(/(.{2}).*(@.*)/, "$1***$2") });
}
