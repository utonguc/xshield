"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZones, tenants } from "@/db/schema";
import type { FormState } from "@/components/form";
import { requireMember } from "@/lib/auth";
import { parseDecimal } from "@/lib/format";

function done(slug: string) {
  revalidatePath("/panel/teslimat");
  revalidatePath(`/${slug}`, "layout");
}

export async function saveDeliverySettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  const deliveryEnabled = formData.get("deliveryEnabled") === "on";
  const pickupEnabled = formData.get("pickupEnabled") === "on";
  if (!deliveryEnabled && !pickupEnabled) return { error: "Adrese teslim veya gel-al seçeneklerinden en az biri açık olmalı." };
  await db
    .update(tenants)
    .set({
      deliveryEnabled,
      pickupEnabled,
      acceptingOrders: formData.get("acceptingOrders") === "on",
      minOrderAmount: Math.max(0, parseDecimal(formData.get("minOrderAmount")) ?? 0),
    })
    .where(eq(tenants.id, me.tenant.id));
  done(me.tenant.slug);
  return { message: "Teslimat ayarları kaydedildi." };
}

export async function saveZoneAction(zoneId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (name.length < 2) return { error: "Bölge adı girin (örn. Moda Mahallesi)." };
  const values = {
    name,
    fee: Math.max(0, parseDecimal(formData.get("fee")) ?? 0),
    minOrder: Math.max(0, parseDecimal(formData.get("minOrder")) ?? 0),
    freeOver: parseDecimal(formData.get("freeOver")),
    etaText: String(formData.get("etaText") ?? "").trim().slice(0, 60) || null,
    isActive: formData.get("isActive") === "on",
  };
  if (zoneId) await db.update(deliveryZones).set(values).where(and(eq(deliveryZones.id, zoneId), eq(deliveryZones.tenantId, me.tenant.id)));
  else await db.insert(deliveryZones).values({ ...values, tenantId: me.tenant.id });
  done(me.tenant.slug);
  return { ok: true, message: zoneId ? "Bölge güncellendi." : "Bölge eklendi." };
}

export async function deleteZoneAction(zoneId: string) {
  const me = await requireMember(["owner"]);
  await db.delete(deliveryZones).where(and(eq(deliveryZones.id, zoneId), eq(deliveryZones.tenantId, me.tenant.id)));
  done(me.tenant.slug);
}
