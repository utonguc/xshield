"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, memberships, tenants, users } from "@/db/schema";
import type { FormState } from "@/components/form";
import { createSession, destroySession, hashPassword, isPlatformAdmin, verifyPassword } from "@/lib/auth";
import { normalizePhone, slugify } from "@/lib/format";
import { DEFAULT_CATEGORIES } from "@/lib/labels";
import { rateLimit } from "@/lib/rate-limit";
import { validateSlug } from "@/lib/tenant";

async function clientIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

const registerSchema = z.object({
  storeName: z.string().trim().min(2, "Mağaza adı en az 2 karakter olmalı.").max(80),
  slug: z.string().trim().toLowerCase(),
  name: z.string().trim().min(2, "Adınızı girin.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta girin.")),
  phone: z.string().trim(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(200),
  city: z.string().trim().max(60).optional(),
  district: z.string().trim().max(60).optional(),
});

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!rateLimit(`register:${await clientIp()}`, 5, 60 * 60_000))
    return { error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin." };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Lütfen işaretli alanları kontrol edin.", fieldErrors };
  }
  const d = parsed.data;
  const slug = slugify(d.slug || d.storeName);
  const slugError = validateSlug(slug);
  if (slugError) return { fieldErrors: { slug: slugError }, error: slugError };
  const phone = normalizePhone(d.phone);
  if (!phone) return { fieldErrors: { phone: "05XX XXX XX XX biçiminde bir cep telefonu girin." }, error: "Telefon numarası geçersiz." };

  const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email)).limit(1);
  if (emailTaken) return { fieldErrors: { email: "Bu e-posta ile zaten bir hesap var." }, error: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin." };
  const [slugTaken] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (slugTaken) return { fieldErrors: { slug: "Bu adres alınmış." }, error: "Bu mağaza adresi alınmış, başka bir adres deneyin." };

  const passwordHash = await hashPassword(d.password);
  const { userId, tenantId } = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(tenants)
      .values({ slug, name: d.storeName, phone, whatsapp: phone, email: d.email, city: d.city || null, district: d.district || null })
      .returning({ id: tenants.id });
    const [u] = await tx.insert(users).values({ email: d.email, passwordHash, name: d.name, phone }).returning({ id: users.id });
    await tx.insert(memberships).values({ tenantId: t.id, userId: u.id, role: "owner" });
    await tx.insert(categories).values(DEFAULT_CATEGORIES.map((name, i) => ({ tenantId: t.id, name, slug: slugify(name), sort: i })));
    return { userId: u.id, tenantId: t.id };
  });

  await createSession(userId, tenantId);
  redirect("/panel?hosgeldin=1");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "E-posta ve şifre gerekli." };

  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 30, 15 * 60_000) || !rateLimit(`login:${email}`, 10, 15 * 60_000))
    return { error: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin." };

  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Kullanıcı yoksa da aynı sürede cevap vermek için sahte doğrulama yapıyoruz.
  const ok = await verifyPassword(password, u?.passwordHash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86));
  if (!u || !ok || !u.isActive) return { error: "E-posta veya şifre hatalı." };

  const [m] = await db
    .select({ tenantId: memberships.tenantId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, u.id))
    .orderBy(desc(memberships.createdAt))
    .limit(1);

  await createSession(u.id, m?.tenantId ?? null);
  if (!m) redirect(isPlatformAdmin(u.email) ? "/yonetim" : "/giris?hata=magaza");
  const next = String(formData.get("next") ?? "");
  redirect(m.role === "courier" ? "/kurye" : next.startsWith("/panel") ? next : "/panel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/giris");
}
