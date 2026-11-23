import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { memberships, sessions, tenants, users, type Role } from "@/db/schema";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "pet_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length);
  return timingSafeEqual(expected, actual);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const secureCookies = () => (process.env.APP_URL ?? "").startsWith("https://");

export async function createSession(userId: string, tenantId: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ id: hashToken(token), userId, tenantId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

export type SessionInfo = {
  sessionId: string;
  user: { id: string; name: string; email: string };
  tenant: { id: string; slug: string; name: string; status: "active" | "suspended" } | null;
  role: Role | null;
};

/** Mevcut oturum (istek başına bir kez çözülür). */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({
      sessionId: sessions.id,
      tenantId: sessions.tenantId,
      user: { id: users.id, name: users.name, email: users.email, isActive: users.isActive },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.user.isActive) return null;

  let tenant: SessionInfo["tenant"] = null;
  let role: Role | null = null;
  if (row.tenantId) {
    const [m] = await db
      .select({ role: memberships.role, id: tenants.id, slug: tenants.slug, name: tenants.name, status: tenants.status })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(and(eq(memberships.userId, row.user.id), eq(memberships.tenantId, row.tenantId)))
      .limit(1);
    if (m) {
      tenant = { id: m.id, slug: m.slug, name: m.name, status: m.status };
      role = m.role;
    }
  }
  return {
    sessionId: row.sessionId,
    user: { id: row.user.id, name: row.user.name, email: row.user.email },
    tenant,
    role,
  };
});

export type MemberContext = SessionInfo & { tenant: NonNullable<SessionInfo["tenant"]>; role: Role };

/**
 * Panel sayfaları ve server action'lar için yetki kontrolü.
 * Her server action bunu kendisi çağırmalı — sayfa yetkisi action'ı korumaz.
 */
export async function requireMember(allowed: Role[] = ["owner", "staff"]): Promise<MemberContext> {
  const s = await getSession();
  if (!s) redirect("/giris");
  if (!s.tenant || !s.role) redirect("/giris?hata=magaza");
  if (!allowed.includes(s.role)) redirect(s.role === "courier" ? "/kurye" : "/panel");
  return s as MemberContext;
}

export function isPlatformAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
