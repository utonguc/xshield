"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizePhone, round2 } from "@/lib/format";
import { createOrder, OrderError } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { getLegalKinds, getZones, quoteVariants, type QuotedVariant } from "@/lib/storefront";
import { getStoreBySlug } from "@/lib/tenant";

export async function quoteCartAction(slug: string, ids: string[]): Promise<QuotedVariant[]> {
  const store = await getStoreBySlug(slug);
  if (!store || store.status !== "active") return [];
  return quoteVariants(store.id, Array.isArray(ids) ? ids.map(String) : []);
}

const orderSchema = z.object({
  items: z
    .array(z.object({ variantId: z.uuid(), qty: z.number().positive().max(1000) }))
    .min(1, "Sepetiniz boş.")
    .max(100),
  fulfillment: z.enum(["delivery", "pickup"]),
  zoneId: z.uuid().nullable().optional(),
  name: z.string().trim().min(2, "Adınızı girin.").max(80),
  phone: z.string().trim().max(20),
  address: z.string().trim().max(500).optional(),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["cash_on_delivery", "card_on_delivery", "bank_transfer"]),
  acceptedTerms: z.boolean(),
  website: z.string().max(0).optional(), // bot tuzağı (gizli alan)
});

export type PlaceOrderResult = { ok: true; code: string } | { ok: false; error: string };

export async function placeOrderAction(slug: string, input: unknown): Promise<PlaceOrderResult> {
  const store = await getStoreBySlug(slug);
  if (!store || store.status !== "active") return { ok: false, error: "Mağaza bulunamadı." };
  if (!store.acceptingOrders) return { ok: false, error: "Mağaza şu anda online sipariş almıyor." };

  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`order:${ip}`, 10, 60 * 60_000)) return { ok: false, error: "Çok fazla sipariş denemesi. Lütfen biraz sonra tekrar deneyin." };

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.website) return { ok: false, error: "Geçersiz istek." };

  const phone = normalizePhone(d.phone);
  if (!phone) return { ok: false, error: "Lütfen geçerli bir cep telefonu girin (05XX XXX XX XX)." };

  const legal = await getLegalKinds(store.id);
  if ((legal.includes("mesafeli-satis") || legal.includes("on-bilgilendirme")) && !d.acceptedTerms)
    return { ok: false, error: "Devam etmek için sözleşmeleri onaylamanız gerekiyor." };

  const payOk =
    (d.paymentMethod === "cash_on_delivery" && store.payCashOnDelivery) ||
    (d.paymentMethod === "card_on_delivery" && store.payCardOnDelivery) ||
    (d.paymentMethod === "bank_transfer" && store.payBankTransfer);
  if (!payOk) return { ok: false, error: "Seçilen ödeme yöntemi bu mağazada kullanılamıyor." };

  // Teslimat ücreti ve minimum tutar sunucuda hesaplanır.
  const quoted = await quoteVariants(store.id, d.items.map((i) => i.variantId));
  const priceOf = new Map(quoted.map((q) => [q.id, q.price]));
  const subtotal = round2(d.items.reduce((s, i) => s + (priceOf.get(i.variantId) ?? 0) * i.qty, 0));

  let deliveryFee = 0;
  let minOrder = Number(store.minOrderAmount);
  let zoneId: string | null = null;
  let address: string | null = null;
  if (d.fulfillment === "delivery") {
    if (!store.deliveryEnabled) return { ok: false, error: "Bu mağaza adrese teslimat yapmıyor." };
    if (!d.address || d.address.length < 10) return { ok: false, error: "Lütfen açık adresinizi yazın." };
    address = d.address;
    const zones = await getZones(store.id);
    if (zones.length) {
      const z = zones.find((x) => x.id === d.zoneId);
      if (!z) return { ok: false, error: "Lütfen teslimat bölgenizi seçin." };
      zoneId = z.id;
      minOrder = Math.max(minOrder, z.minOrder);
      deliveryFee = z.freeOver != null && subtotal >= z.freeOver ? 0 : z.fee;
    }
  } else if (!store.pickupEnabled) return { ok: false, error: "Bu mağazada gel-al seçeneği yok." };

  if (subtotal < minOrder) return { ok: false, error: `Minimum sipariş tutarı ${minOrder.toLocaleString("tr-TR")} ₺.` };

  try {
    const order = await createOrder({
      tenantId: store.id,
      channel: "online",
      fulfillment: d.fulfillment,
      paymentMethod: d.paymentMethod,
      lines: d.items,
      deliveryFee,
      zoneId,
      customer: { name: d.name, phone, address },
      note: d.note || null,
    });
    revalidatePath(`/${slug}`, "layout");
    revalidatePath("/panel", "layout");
    return { ok: true, code: order.code };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    throw e;
  }
}
