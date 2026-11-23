import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  customers,
  orderEvents,
  orderItems,
  orders,
  products,
  stockMovements,
  tenants,
  variants,
  type OrderStatus,
  type PaymentMethod,
} from "@/db/schema";
import { round2, round3 } from "./format";
import { applyStockChange, StockError } from "./stock";

export type OrderLineInput = { variantId: string; qty: number; unitPrice?: number };

type CreateOrderInput = {
  tenantId: string;
  channel: "online" | "pos";
  fulfillment: "delivery" | "pickup" | "instore";
  paymentMethod: PaymentMethod;
  lines: OrderLineInput[];
  deliveryFee?: number;
  discount?: number;
  zoneId?: string | null;
  customer?: { name: string; phone: string; address?: string | null } | null;
  note?: string | null;
  userId?: string | null;
};

export class OrderError extends Error {}

/** Okunabilir ama tahmin edilemez takip kodu (karışan harfler yok). */
function orderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Online sipariş ve mağaza satışı için ortak akış. Fiyatlar her zaman
 * veritabanından okunur (POS'ta kasiyerin elle değiştirdiği fiyat hariç);
 * istemciden gelen tutarlara güvenilmez.
 */
export async function createOrder(input: CreateOrderInput) {
  // Aynı varyant iki kez gelirse birleştir; kilit sırası sabit olsun diye id'ye göre sırala.
  const merged = new Map<string, OrderLineInput>();
  for (const l of input.lines) {
    if (!(l.qty > 0)) continue;
    const prev = merged.get(l.variantId);
    merged.set(l.variantId, { variantId: l.variantId, qty: round3((prev?.qty ?? 0) + l.qty), unitPrice: l.unitPrice ?? prev?.unitPrice });
  }
  const lines = [...merged.values()].sort((a, b) => a.variantId.localeCompare(b.variantId));
  if (lines.length === 0) throw new OrderError("Sepet boş.");
  if (lines.length > 100) throw new OrderError("Bir siparişte en fazla 100 kalem olabilir.");

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: variants.id,
        name: variants.name,
        unit: variants.unit,
        price: variants.price,
        isActive: variants.isActive,
        productName: products.name,
        isPublished: products.isPublished,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(
        and(
          eq(variants.tenantId, input.tenantId),
          inArray(
            variants.id,
            lines.map((l) => l.variantId),
          ),
        ),
      );
    const byId = new Map(rows.map((r) => [r.id, r]));

    const items = lines.map((l) => {
      const v = byId.get(l.variantId);
      if (!v || (input.channel === "online" && (!v.isActive || !v.isPublished)))
        throw new OrderError("Sepetteki bir ürün artık satışta değil. Lütfen sepetinizi güncelleyin.");
      if (v.unit === "adet" && !Number.isInteger(l.qty)) throw new OrderError(`${v.productName}: adet tam sayı olmalı.`);
      const unitPrice = input.channel === "pos" && l.unitPrice != null && l.unitPrice >= 0 ? round2(l.unitPrice) : Number(v.price);
      return {
        variantId: v.id,
        productName: v.productName,
        variantName: v.name || null,
        unit: v.unit,
        qty: l.qty,
        unitPrice,
        lineTotal: round2(unitPrice * l.qty),
      };
    });

    const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0));
    const deliveryFee = round2(input.deliveryFee ?? 0);
    const discount = Math.min(round2(input.discount ?? 0), subtotal + deliveryFee);
    const total = round2(subtotal + deliveryFee - discount);

    const [seq] = await tx
      .update(tenants)
      .set({ orderSeq: sql`${tenants.orderSeq} + 1` })
      .where(eq(tenants.id, input.tenantId))
      .returning({ n: tenants.orderSeq });

    let customerId: string | null = null;
    if (input.customer?.phone) {
      const [c] = await tx
        .insert(customers)
        .values({
          tenantId: input.tenantId,
          phone: input.customer.phone,
          name: input.customer.name,
          address: input.customer.address ?? null,
          zoneId: input.zoneId ?? null,
          orderCount: 1,
          totalSpent: total,
          lastOrderAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [customers.tenantId, customers.phone],
          set: {
            name: input.customer.name,
            address: sql`coalesce(${input.customer.address ?? null}, ${customers.address})`,
            zoneId: sql`coalesce(${input.zoneId ?? null}::uuid, ${customers.zoneId})`,
            orderCount: sql`${customers.orderCount} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${total}`,
            lastOrderAt: new Date(),
          },
        })
        .returning({ id: customers.id });
      customerId = c.id;
    }

    const status: OrderStatus = input.channel === "pos" ? "completed" : "new";
    const [order] = await tx
      .insert(orders)
      .values({
        tenantId: input.tenantId,
        number: seq.n,
        code: orderCode(),
        channel: input.channel,
        status,
        fulfillment: input.fulfillment,
        zoneId: input.zoneId ?? null,
        customerId,
        customerName: input.customer?.name ?? null,
        customerPhone: input.customer?.phone ?? null,
        address: input.customer?.address ?? null,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.channel === "pos" ? "paid" : "pending",
        subtotal,
        deliveryFee,
        discount,
        total,
        note: input.note ?? null,
        createdBy: input.userId ?? null,
      })
      .returning({ id: orders.id, number: orders.number, code: orders.code, total: orders.total });

    await tx.insert(orderItems).values(items.map((i) => ({ ...i, tenantId: input.tenantId, orderId: order.id })));
    await tx.insert(orderEvents).values({ tenantId: input.tenantId, orderId: order.id, status, userId: input.userId ?? null });

    for (const i of items) {
      try {
        await applyStockChange(tx, {
          tenantId: input.tenantId,
          variantId: i.variantId,
          delta: -i.qty,
          type: input.channel === "pos" ? "sale_pos" : "sale_online",
          allowNegative: input.channel === "pos",
          orderId: order.id,
          userId: input.userId ?? null,
        });
      } catch (e) {
        if (e instanceof StockError) {
          const left = await tx.select({ q: variants.stockQty }).from(variants).where(eq(variants.id, i.variantId));
          const name = [i.productName, i.variantName].filter(Boolean).join(" – ");
          throw new OrderError(`${name} için yeterli stok yok (kalan: ${Number(left[0]?.q ?? 0)}).`);
        }
        throw e;
      }
    }
    return order;
  });
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["preparing", "ready", "on_the_way", "delivered", "cancelled"],
  preparing: ["ready", "on_the_way", "delivered", "cancelled"],
  ready: ["on_the_way", "delivered", "cancelled"],
  on_the_way: ["delivered", "cancelled"],
  delivered: [],
  completed: ["cancelled"],
  cancelled: [],
};

export const allowedTransitions = (s: OrderStatus) => TRANSITIONS[s];

/** Durum değişikliği; iptalde düşülen stok geri eklenir. */
export async function changeOrderStatus(
  tenantId: string,
  orderId: string,
  next: OrderStatus,
  opts: { userId: string; note?: string | null; courierId?: string | null },
) {
  return db.transaction(async (tx) => {
    const [o] = await tx
      .select({ status: orders.status, paymentMethod: orders.paymentMethod, courierId: orders.courierId })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .for("update");
    if (!o) throw new OrderError("Sipariş bulunamadı.");
    if (o.status === next) return;
    if (!TRANSITIONS[o.status].includes(next)) throw new OrderError("Bu durum değişikliği yapılamaz.");

    const patch: Partial<typeof orders.$inferInsert> = { status: next, updatedAt: new Date() };
    if (next === "delivered" && (o.paymentMethod === "cash_on_delivery" || o.paymentMethod === "card_on_delivery"))
      patch.paymentStatus = "paid";
    if (opts.courierId !== undefined) patch.courierId = opts.courierId;
    await tx.update(orders).set(patch).where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({ tenantId, orderId, status: next, note: opts.note ?? null, userId: opts.userId });

    if (next === "cancelled") await restock(tx, tenantId, orderId, opts.userId);
  });
}

async function restock(tx: Tx, tenantId: string, orderId: string, userId: string) {
  // Defterdeki gerçek çıkışları geri al (sipariş kalemlerinden değil) — böylece iki kez iade olmaz.
  const moves = await tx
    .select({ variantId: stockMovements.variantId, delta: sql<string>`sum(${stockMovements.qtyDelta})` })
    .from(stockMovements)
    .where(and(eq(stockMovements.tenantId, tenantId), eq(stockMovements.orderId, orderId)))
    .groupBy(stockMovements.variantId);
  for (const m of moves) {
    const net = Number(m.delta);
    if (net < 0)
      await applyStockChange(tx, { tenantId, variantId: m.variantId, delta: -net, type: "cancel", orderId, userId });
  }
}
