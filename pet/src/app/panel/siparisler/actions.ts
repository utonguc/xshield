"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, orderEvents, orders, ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { changeOrderStatus, OrderError } from "@/lib/orders";

export type OrderActionState = { error?: string } | undefined;

function refresh(slug: string, id: string) {
  revalidatePath("/panel", "layout");
  revalidatePath(`/panel/siparisler/${id}`);
  revalidatePath(`/${slug}`, "layout");
  revalidatePath("/kurye");
}

export async function setOrderStatusAction(orderId: string, status: string, _: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const me = await requireMember();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return { error: "Geçersiz durum." };
  try {
    await changeOrderStatus(me.tenant.id, orderId, status as OrderStatus, {
      userId: me.user.id,
      note: String(formData.get("note") ?? "").trim().slice(0, 300) || null,
    });
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }
  refresh(me.tenant.slug, orderId);
}

export async function assignCourierAction(orderId: string, formData: FormData) {
  const me = await requireMember();
  const courierId = String(formData.get("courierId") ?? "") || null;
  if (courierId) {
    const [m] = await db
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.tenantId, me.tenant.id), eq(memberships.userId, courierId)));
    if (!m) return;
  }
  const [o] = await db
    .update(orders)
    .set({ courierId, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, me.tenant.id)))
    .returning({ status: orders.status });
  if (o)
    await db.insert(orderEvents).values({
      tenantId: me.tenant.id,
      orderId,
      status: o.status,
      note: courierId ? "Kurye atandı" : "Kurye ataması kaldırıldı",
      userId: me.user.id,
    });
  refresh(me.tenant.slug, orderId);
}

export async function markPaidAction(orderId: string) {
  const me = await requireMember();
  const [o] = await db
    .update(orders)
    .set({ paymentStatus: "paid", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, me.tenant.id)))
    .returning({ status: orders.status });
  if (o) await db.insert(orderEvents).values({ tenantId: me.tenant.id, orderId, status: o.status, note: "Ödeme alındı olarak işaretlendi", userId: me.user.id });
  refresh(me.tenant.slug, orderId);
}
