"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { createOrder, OrderError } from "@/lib/orders";

const schema = z.object({
  lines: z
    .array(z.object({ variantId: z.uuid(), qty: z.number().positive().max(100000), unitPrice: z.number().min(0).max(10_000_000) }))
    .min(1)
    .max(100),
  discount: z.number().min(0).max(10_000_000),
  paymentMethod: z.enum(["cash", "card"]),
  customerName: z.string().trim().max(80).optional(),
  customerPhone: z.string().trim().max(20).optional(),
});

export type PosResult = { ok: true; orderId: string; number: number; total: number } | { ok: false; error: string };

export async function posSaleAction(input: unknown): Promise<PosResult> {
  const me = await requireMember();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Satış bilgileri geçersiz." };
  const d = parsed.data;
  const phone = d.customerPhone ? normalizePhone(d.customerPhone) : null;
  if (d.customerPhone && !phone) return { ok: false, error: "Müşteri telefonu geçersiz." };
  try {
    const order = await createOrder({
      tenantId: me.tenant.id,
      channel: "pos",
      fulfillment: "instore",
      paymentMethod: d.paymentMethod,
      lines: d.lines,
      discount: d.discount,
      customer: phone ? { name: d.customerName || "Mağaza müşterisi", phone } : null,
      userId: me.user.id,
    });
    revalidatePath("/panel", "layout");
    revalidatePath(`/${me.tenant.slug}`, "layout");
    return { ok: true, orderId: order.id, number: order.number, total: Number(order.total) };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    throw e;
  }
}
