"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { memberships, sessions, users } from "@/db/schema";
import type { FormState } from "@/components/form";
import { hashPassword, requireMember } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(2, "Ad soyad girin.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta girin.")),
  phone: z.string().trim().optional(),
  role: z.enum(["staff", "courier"]),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(200),
});

export async function addMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { error: "Telefon numarası geçersiz." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email));
  if (existing) {
    // Başka bir hesaba ait e-postanın şifresini mağaza sahibi değiştiremez.
    return { error: "Bu e-posta ile kayıtlı bir hesap zaten var. Lütfen farklı bir e-posta kullanın." };
  }
  await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({ email: d.email, name: d.name, phone, passwordHash: await hashPassword(d.password) })
      .returning({ id: users.id });
    await tx.insert(memberships).values({ tenantId: me.tenant.id, userId: u.id, role: d.role });
  });
  revalidatePath("/panel/ekip");
  return { ok: true, message: `${d.name} eklendi. Giriş bilgilerini kendisiyle paylaşın: ${d.email}` };
}

async function assertManageable(ownerTenant: string, userId: string, selfId: string) {
  if (userId === selfId) return null;
  const [m] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.tenantId, ownerTenant), eq(memberships.userId, userId)));
  return m && m.role !== "owner" ? m : null;
}

export async function removeMemberAction(userId: string) {
  const me = await requireMember(["owner"]);
  if (!(await assertManageable(me.tenant.id, userId, me.user.id))) return;
  await db.transaction(async (tx) => {
    await tx.delete(memberships).where(and(eq(memberships.tenantId, me.tenant.id), eq(memberships.userId, userId)));
    await tx.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.tenantId, me.tenant.id)));
    // Başka mağazaya bağlı değilse hesabı da kapat.
    const [other] = await tx.select({ t: memberships.tenantId }).from(memberships).where(eq(memberships.userId, userId)).limit(1);
    if (!other) await tx.update(users).set({ isActive: false }).where(eq(users.id, userId));
  });
  revalidatePath("/panel/ekip");
}

export async function resetPasswordAction(userId: string, _: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  // Personel/kurye hesapları yalnızca bu ekrandan, bu mağaza için açılır; bu yüzden şifreyi mağaza sahibi sıfırlayabilir.
  if (!(await assertManageable(me.tenant.id, userId, me.user.id))) return { error: "Bu kullanıcı için işlem yapılamaz." };
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return { ok: true, message: "Şifre değiştirildi." };
}
