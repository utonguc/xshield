"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { variants } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { round3 } from "@/lib/format";
import { applyStockChange, StockError } from "@/lib/stock";

export type StockActionResult = { ok: boolean; message: string };

const receiveLine = z.object({
  variantId: z.uuid(),
  qty: z.number().positive().max(1_000_000),
  unitCost: z.number().min(0).max(10_000_000).nullable().optional(),
  lotNo: z.string().trim().max(40).nullable().optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export async function receiveStockAction(lines: unknown, note: string): Promise<StockActionResult> {
  const me = await requireMember();
  const parsed = z.array(receiveLine).min(1).max(200).safeParse(lines);
  if (!parsed.success) return { ok: false, message: "Lütfen miktarları kontrol edin." };
  try {
    await db.transaction(async (tx) => {
      for (const l of parsed.data) {
        await applyStockChange(tx, {
          tenantId: me.tenant.id,
          variantId: l.variantId,
          delta: l.qty,
          type: "receive",
          unitCost: l.unitCost ?? null,
          lotNo: l.lotNo ?? null,
          expiryDate: l.expiryDate ?? null,
          note: note.trim().slice(0, 200) || null,
          userId: me.user.id,
        });
        if (l.unitCost != null)
          await tx
            .update(variants)
            .set({ costPrice: l.unitCost })
            .where(and(eq(variants.id, l.variantId), eq(variants.tenantId, me.tenant.id)));
      }
    });
  } catch (e) {
    if (e instanceof StockError) return { ok: false, message: "Ürünlerden biri bulunamadı. Sayfayı yenileyip tekrar deneyin." };
    throw e;
  }
  revalidatePath("/panel", "layout");
  revalidatePath(`/${me.tenant.slug}`, "layout");
  return { ok: true, message: `${parsed.data.length} kalem stoğa eklendi.` };
}

const adjustLine = z.object({ variantId: z.uuid(), value: z.number().min(0).max(1_000_000) });

/**
 * mode = "count": value sayılan miktardır, fark kaydedilir.
 * mode = "waste": value fire miktarıdır, stoktan düşülür.
 */
export async function adjustStockAction(mode: "count" | "waste", lines: unknown, note: string): Promise<StockActionResult> {
  const me = await requireMember();
  const parsed = z.array(adjustLine).min(1).max(500).safeParse(lines);
  if (!parsed.success) return { ok: false, message: "Lütfen miktarları kontrol edin." };
  let changed = 0;
  try {
    await db.transaction(async (tx) => {
      for (const l of parsed.data) {
        let delta: number;
        if (mode === "count") {
          const [v] = await tx
            .select({ q: variants.stockQty })
            .from(variants)
            .where(and(eq(variants.id, l.variantId), eq(variants.tenantId, me.tenant.id)))
            .for("update");
          if (!v) throw new StockError("not found");
          delta = round3(l.value - Number(v.q));
        } else delta = -l.value;
        if (delta === 0) continue;
        await applyStockChange(tx, {
          tenantId: me.tenant.id,
          variantId: l.variantId,
          delta,
          type: mode,
          allowNegative: true,
          note: note.trim().slice(0, 200) || null,
          userId: me.user.id,
        });
        changed++;
      }
    });
  } catch (e) {
    if (e instanceof StockError) return { ok: false, message: "Ürünlerden biri bulunamadı. Sayfayı yenileyip tekrar deneyin." };
    throw e;
  }
  revalidatePath("/panel", "layout");
  revalidatePath(`/${me.tenant.slug}`, "layout");
  if (mode === "count") return { ok: true, message: changed ? `Sayım kaydedildi, ${changed} üründe fark işlendi.` : "Sayım kaydedildi, fark yok." };
  return { ok: true, message: `${changed} kalem fire olarak düşüldü.` };
}
