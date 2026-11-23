import "server-only";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { stockBatches, stockMovements, variants, type MovementType } from "@/db/schema";
import { round3 } from "./format";

export class StockError extends Error {
  constructor(
    message: string,
    public variantId?: string,
  ) {
    super(message);
  }
}

type StockChange = {
  tenantId: string;
  variantId: string;
  delta: number;
  type: MovementType;
  /** Mağaza satışında raf gerçeği esastır; sistem stoğu eksiye düşebilir. */
  allowNegative?: boolean;
  orderId?: string | null;
  note?: string | null;
  userId?: string | null;
  unitCost?: number | null;
  lotNo?: string | null;
  expiryDate?: string | null;
};

/**
 * Stok değişikliğinin tek giriş noktası. Mutlaka bir transaction içinde çağrılır:
 *  1. variants.stock_qty atomik olarak güncellenir (yetersiz stokta hata),
 *  2. stock_movements defterine satır eklenir,
 *  3. SKT'li partiler güncellenir (girişte yeni parti, çıkışta FEFO tüketim).
 */
export async function applyStockChange(tx: Tx, c: StockChange): Promise<number> {
  const delta = round3(c.delta);
  if (delta === 0) throw new StockError("Miktar sıfır olamaz.", c.variantId);

  const guard = delta < 0 && !c.allowNegative ? sql` and ${variants.stockQty} + ${delta} >= 0` : sql``;
  const updated = await tx.execute<{ stock_qty: string }>(sql`
    update ${variants} set stock_qty = stock_qty + ${delta}
    where ${variants.id} = ${c.variantId} and ${variants.tenantId} = ${c.tenantId}${guard}
    returning stock_qty`);
  const row = updated[0];
  if (!row) throw new StockError("Yeterli stok yok.", c.variantId);
  const balance = Number(row.stock_qty);

  await tx.insert(stockMovements).values({
    tenantId: c.tenantId,
    variantId: c.variantId,
    type: c.type,
    qtyDelta: delta,
    balanceAfter: balance,
    unitCost: c.unitCost ?? null,
    orderId: c.orderId ?? null,
    note: c.note ?? null,
    userId: c.userId ?? null,
  });

  if (delta > 0 && c.type === "receive" && c.expiryDate) {
    await tx.insert(stockBatches).values({
      tenantId: c.tenantId,
      variantId: c.variantId,
      lotNo: c.lotNo || null,
      expiryDate: c.expiryDate,
      qtyRemaining: delta,
    });
  } else if (delta < 0) {
    await consumeBatchesFefo(tx, c.tenantId, c.variantId, -delta);
  }
  return balance;
}

/** Çıkışları en yakın SKT'li partiden düşer. Partisiz stok sessizce yok sayılır. */
async function consumeBatchesFefo(tx: Tx, tenantId: string, variantId: string, amount: number) {
  let left = amount;
  const batches = await tx
    .select({ id: stockBatches.id, qty: stockBatches.qtyRemaining })
    .from(stockBatches)
    .where(and(eq(stockBatches.tenantId, tenantId), eq(stockBatches.variantId, variantId), gt(stockBatches.qtyRemaining, 0)))
    .orderBy(asc(stockBatches.expiryDate), asc(stockBatches.receivedAt))
    .for("update");
  for (const b of batches) {
    if (left <= 0) break;
    const take = Math.min(left, Number(b.qty));
    await tx
      .update(stockBatches)
      .set({ qtyRemaining: round3(Number(b.qty) - take) })
      .where(eq(stockBatches.id, b.id));
    left = round3(left - take);
  }
}
