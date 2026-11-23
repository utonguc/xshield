"use server";

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { requireMember } from "@/lib/auth";

export type VariantHit = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  brand: string | null;
  barcode: string | null;
  unit: "adet" | "kg";
  price: number;
  costPrice: number | null;
  stockQty: number;
};

/** Kasa, mal kabul ve sayım ekranlarındaki ürün arama/barkod okutma. */
export async function searchVariantsAction(query: string): Promise<{ exact: VariantHit | null; hits: VariantHit[] }> {
  const me = await requireMember();
  const q = query.trim().slice(0, 80);
  if (!q) return { exact: null, hits: [] };
  const term = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db
    .select({
      id: variants.id,
      productId: products.id,
      productName: products.name,
      variantName: variants.name,
      brand: products.brand,
      barcode: variants.barcode,
      unit: variants.unit,
      price: variants.price,
      costPrice: variants.costPrice,
      stockQty: variants.stockQty,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(
      and(
        eq(variants.tenantId, me.tenant.id),
        eq(variants.isActive, true),
        or(eq(variants.barcode, q), eq(variants.sku, q), ilike(products.name, term), ilike(products.brand, term), ilike(variants.name, term)),
      ),
    )
    .orderBy(sql`case when ${variants.barcode} = ${q} then 0 else 1 end`, asc(products.name), asc(variants.sort))
    .limit(12);
  const hits = rows.map((r) => ({ ...r, price: Number(r.price), costPrice: r.costPrice == null ? null : Number(r.costPrice), stockQty: Number(r.stockQty) }));
  const exact = hits.find((h) => h.barcode === q) ?? null;
  return { exact, hits };
}
