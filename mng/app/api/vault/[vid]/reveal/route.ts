import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";
import { decryptPassword, hashOtp } from "@/lib/vault-crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { vid } = await params;
  const { otp } = await req.json();
  if (!otp) return NextResponse.json({ error: "OTP gerekli" }, { status: 400 });

  // Verify OTP
  const otpRow = await queryOne<{ id: number }>(
    `SELECT id FROM vault_otp_sessions
     WHERE admin_id=$1 AND credential_id=$2 AND otp_hash=$3
       AND used_at IS NULL AND expires_at > now()`,
    [session.id, Number(vid), hashOtp(String(otp))]
  );
  if (!otpRow) return NextResponse.json({ error: "Geçersiz veya süresi dolmuş OTP" }, { status: 403 });

  // Mark OTP as used immediately
  await query("UPDATE vault_otp_sessions SET used_at=now() WHERE id=$1", [otpRow.id]);

  // Get credential
  const cred = await queryOne<{ encrypted_pass: string; pass_iv: string; pass_tag: string }>(
    "SELECT encrypted_pass, pass_iv, pass_tag FROM credential_vaults WHERE id=$1",
    [Number(vid)]
  );
  if (!cred?.encrypted_pass) return NextResponse.json({ error: "Şifre bulunamadı" }, { status: 404 });

  // Decrypt
  const plaintext = decryptPassword(cred.encrypted_pass, cred.pass_iv, cred.pass_tag);

  // Audit log
  await query(
    "INSERT INTO vault_access_logs (credential_id, admin_id, admin_name) VALUES ($1,$2,$3)",
    [Number(vid), session.id, session.username]
  );

  return NextResponse.json({ password: plaintext });
}
