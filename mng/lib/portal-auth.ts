import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query, queryOne } from "./db";
import { verifyPassword } from "./auth";

const COOKIE = "portal_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

const OTP_EXPIRE_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_PER_HOUR = 5;

export interface PortalSession {
  id: number;
  full_name: string;
  email: string;
  customer_id: number;
  company_name: string;
  employee_id: number | null;
  permission_group_id: number;
  permissions: Record<string, boolean>;
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as PortalSession;
  } catch {
    return null;
  }
}

export async function createPortalSession(user: PortalSession): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/portal",
    maxAge: 60 * 60 * 8,
  });
}

export async function deletePortalSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOtp(email: string): Promise<{ code: string; error?: string }> {
  // Rate limit: max OTP_RATE_LIMIT_PER_HOUR requests per email per hour
  const recent = await queryOne<{ cnt: string }>(
    "SELECT COUNT(*)::text AS cnt FROM portal_otps WHERE email=$1 AND created_at > now() - INTERVAL '1 hour'",
    [email]
  );
  if (parseInt(recent?.cnt ?? "0") >= OTP_RATE_LIMIT_PER_HOUR) {
    return { code: "", error: "Saatte en fazla 5 kod gönderilebilir. Lütfen bekleyin." };
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

  // Invalidate previous unused OTPs for this email
  await query("UPDATE portal_otps SET used_at=now() WHERE email=$1 AND used_at IS NULL", [email]);

  await query(
    "INSERT INTO portal_otps (email, code, purpose, expires_at) VALUES ($1,$2,'login',$3)",
    [email, code, expiresAt]
  );

  return { code };
}

export async function verifyOtp(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const otp = await queryOne<{ id: number; code: string; attempts: number; expires_at: string; used_at: string | null }>(
    "SELECT id,code,attempts,expires_at,used_at FROM portal_otps WHERE email=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
    [email]
  );

  if (!otp) return { ok: false, error: "Geçerli kod bulunamadı. Yeni kod isteyin." };
  if (otp.used_at) return { ok: false, error: "Bu kod zaten kullanıldı." };
  if (new Date(otp.expires_at) < new Date()) {
    return { ok: false, error: "Kodun süresi doldu. Yeni kod isteyin." };
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Çok fazla hatalı deneme. Yeni kod isteyin." };
  }

  if (otp.code !== code) {
    await query("UPDATE portal_otps SET attempts=attempts+1 WHERE id=$1", [otp.id]);
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return { ok: false, error: `Hatalı kod. ${left} deneme hakkınız kaldı.` };
  }

  await query("UPDATE portal_otps SET used_at=now() WHERE id=$1", [otp.id]);
  return { ok: true };
}

export async function loadPortalUser(identifier: string): Promise<PortalSession | null> {
  const id = identifier.trim().toLowerCase();
  const row = await queryOne<{
    id: number; full_name: string; email: string;
    customer_id: number; company_name: string; employee_id: number | null;
    permission_group_id: number; permissions: Record<string, boolean>;
    is_active: boolean; is_verified: boolean; password_hash: string | null;
    source: string;
  }>(
    `SELECT pu.id, pu.full_name, pu.email, pu.customer_id, c.company_name,
            pu.employee_id, pu.permission_group_id, pg.permissions,
            pu.is_active, pu.is_verified, pu.password_hash, pu.source
     FROM portal_users pu
     JOIN customers c ON c.id=pu.customer_id
     JOIN portal_permission_groups pg ON pg.id=pu.permission_group_id
     WHERE LOWER(pu.email)=$1 OR LOWER(pu.ad_username)=$1`,
    [id]
  );
  if (!row || !row.is_active) return null;
  return row;
}

export async function hasPortalPassword(identifier: string): Promise<boolean> {
  const id = identifier.trim().toLowerCase();
  const row = await queryOne<{ has_pw: boolean }>(
    `SELECT (password_hash IS NOT NULL) AS has_pw FROM portal_users
     WHERE LOWER(email)=$1 OR LOWER(ad_username)=$1`,
    [id]
  );
  return row?.has_pw ?? false;
}

export async function verifyPortalPassword(identifier: string, password: string): Promise<boolean> {
  const id = identifier.trim().toLowerCase();
  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM portal_users
     WHERE (LOWER(email)=$1 OR LOWER(ad_username)=$1) AND is_active=true AND password_hash IS NOT NULL`,
    [id]
  );
  if (!row) return false;
  try {
    return verifyPassword(password, row.password_hash);
  } catch {
    return false;
  }
}
