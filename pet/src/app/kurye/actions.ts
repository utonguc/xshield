"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { changeOrderStatus, OrderError } from "@/lib/orders";

/** Kurye yalnızca kendisine atanmış siparişin durumunu "yolda" / "teslim edildi" yapabilir. */
export async function courierUpdateAction(orderId: string, next: "on_the_way" | "delivered"): Promise<{ error?: string }> {
  const me = await requireMember(["courier", "owner", "staff"]);
  if (next !== "on_the_way" && next !== "delivered") return { error: "Geçersiz işlem." };
  const [o] = await db
    .select({ courierId: orders.courierId })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, me.tenant.id)));
  if (!o || o.courierId !== me.user.id) return { error: "Bu sipariş size atanmamış." };
  try {
    await changeOrderStatus(me.tenant.id, orderId, next, { userId: me.user.id });
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }
  revalidatePath("/kurye");
  revalidatePath("/panel", "layout");
  revalidatePath(`/${me.tenant.slug}`, "layout");
  return {};
}
