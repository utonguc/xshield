"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { LEGAL_KINDS, legalPages, tenants } from "@/db/schema";
import type { FormState } from "@/components/form";
import { requireMember } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { removeImage, saveImage, UploadError } from "@/lib/uploads";

const txt = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max) || null;

export async function saveStoreSettingsAction(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  const name = txt(f, "name", 80);
  if (!name || name.length < 2) return { error: "Mağaza adı gerekli." };

  const phoneRaw = txt(f, "phone", 20);
  const waRaw = txt(f, "whatsapp", 20);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const whatsapp = waRaw ? normalizePhone(waRaw) : null;
  if (phoneRaw && !phone) return { error: "Telefon numarası geçersiz (05XX XXX XX XX)." };
  if (waRaw && !whatsapp) return { error: "WhatsApp numarası geçersiz (05XX XXX XX XX)." };

  const payBankTransfer = f.get("payBankTransfer") === "on";
  const iban = txt(f, "iban", 40)?.replace(/\s/g, "").toUpperCase() ?? null;
  if (payBankTransfer && !(iban && /^TR\d{24}$/.test(iban))) return { error: "Havale/EFT için geçerli bir TR IBAN girin (TR + 24 rakam)." };
  const payCashOnDelivery = f.get("payCashOnDelivery") === "on";
  const payCardOnDelivery = f.get("payCardOnDelivery") === "on";
  if (!payBankTransfer && !payCashOnDelivery && !payCardOnDelivery) return { error: "En az bir ödeme yöntemi seçin." };

  let logoPath: string | null = null;
  try {
    logoPath = await saveImage(f.get("logo") as File | null, me.tenant.id);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const [cur] = await db.select({ logoPath: tenants.logoPath }).from(tenants).where(eq(tenants.id, me.tenant.id));
  const dropLogo = !!logoPath || f.get("removeLogo") === "1";

  await db
    .update(tenants)
    .set({
      name,
      tagline: txt(f, "tagline", 120),
      about: txt(f, "about", 2000),
      phone,
      whatsapp,
      email: txt(f, "email", 120),
      address: txt(f, "address", 300),
      city: txt(f, "city", 60),
      district: txt(f, "district", 60),
      workingHours: txt(f, "workingHours", 200),
      payCashOnDelivery,
      payCardOnDelivery,
      payBankTransfer,
      iban,
      ibanHolder: txt(f, "ibanHolder", 120),
      orderNote: txt(f, "orderNote", 500),
      companyTitle: txt(f, "companyTitle", 200),
      taxOffice: txt(f, "taxOffice", 80),
      taxNumber: txt(f, "taxNumber", 20),
      ...(logoPath ? { logoPath } : dropLogo ? { logoPath: null } : {}),
    })
    .where(eq(tenants.id, me.tenant.id));
  if (dropLogo && cur?.logoPath) await removeImage(cur.logoPath);

  revalidatePath("/panel", "layout");
  revalidatePath(`/${me.tenant.slug}`, "layout");
  return { message: "Ayarlar kaydedildi." };
}

export async function saveLegalAction(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  for (const kind of LEGAL_KINDS) {
    const body = String(f.get(kind) ?? "").trim().slice(0, 50_000);
    if (body)
      await db
        .insert(legalPages)
        .values({ tenantId: me.tenant.id, kind, body })
        .onConflictDoUpdate({ target: [legalPages.tenantId, legalPages.kind], set: { body, updatedAt: new Date() } });
    else await db.delete(legalPages).where(and(eq(legalPages.tenantId, me.tenant.id), eq(legalPages.kind, kind)));
  }
  revalidatePath("/panel", "layout");
  revalidatePath(`/${me.tenant.slug}`, "layout");
  return { message: "Metinler kaydedildi." };
}
