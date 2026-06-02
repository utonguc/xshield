import "server-only";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query, queryOne } from "./db";

const COOKIE = "mng_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: "admin" | "support";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ id: user.id, username: user.username, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function loginUser(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const row = await queryOne<{ id: number; username: string; email: string; role: string; password_hash: string; is_active: boolean }>(
    "SELECT id, username, email, role, password_hash, is_active FROM users WHERE username=$1",
    [username]
  );
  if (!row || !row.is_active) return null;
  if (!verifyPassword(password, row.password_hash)) return null;

  await query("UPDATE users SET last_login=now() WHERE id=$1", [row.id]);

  return { id: row.id, username: row.username, email: row.email, role: row.role as "admin" | "support" };
}
