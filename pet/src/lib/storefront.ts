import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, deliveryZones, legalPages, products, variants, type PetType } from "@/db/schema";

const activeVariant = and(eq(variants.isActive, true));

export type CatalogCard = {
  id: string;
  name: string;
  brand: string | null;
  imagePath: string | null;
  minPrice: number;
  compareAt: number | null;
  discountPct: number | null;
  inStock: boolean;
  variantCount: number;
  singleVariantId: string | null;
  singleUnit: "adet" | "kg";
  singleStock: number;
};

export async function getCatalog(tenantId: string, f: { q?: string; petType?: PetType | null; categoryId?: string | null; limit?: number }) {
  const term = f.q ? `%${f.q.replace(/[%_]/g, "")}%` : null;
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      imagePath: products.imagePath,
      minPrice: sql<string>`min(${variants.price})`,
      // Üstü çizili fiyat yalnızca tek seçenekli üründe; rozet ise her seçeneğin kendi indirimine göre.
      compareAt: sql<string | null>`case when count(*) = 1 then max(${variants.compareAtPrice}) end`,
      discountPct: sql<number | null>`round(max(100 * (1 - ${variants.price} / nullif(${variants.compareAtPrice}, 0))) filter (where ${variants.compareAtPrice} > ${variants.price} and ${variants.stockQty} > 0))::int`,
      inStock: sql<boolean>`bool_or(${variants.stockQty} > 0)`,
      variantCount: sql<number>`count(${variants.id})::int`,
      singleVariantId: sql<string | null>`case when count(*) = 1 then min(${variants.id}::text) end`,
      singleUnit: sql<"adet" | "kg">`min(${variants.unit})`,
      singleStock: sql<string>`max(${variants.stockQty})`,
    })
    .from(products)
    .innerJoin(variants, and(eq(variants.productId, products.id), activeVariant))
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.isPublished, true),
        f.petType ? or(eq(products.petType, f.petType), eq(products.petType, "genel")) : undefined,
        f.categoryId ? eq(products.categoryId, f.categoryId) : undefined,
        term ? or(ilike(products.name, term), ilike(products.brand, term)) : undefined,
      ),
    )
    .groupBy(products.id)
    // Stokta olanlar önce, sonra en yeniler.
    .orderBy(sql`bool_or(${variants.stockQty} > 0) desc`, desc(products.createdAt))
    .limit(f.limit ?? 120);
  return rows.map(
    (r): CatalogCard => ({
      ...r,
      minPrice: Number(r.minPrice),
      compareAt: r.compareAt == null ? null : Number(r.compareAt),
      singleStock: Number(r.singleStock),
    }),
  );
}

/** Vitrinde ürünü olan kategoriler. */
export async function getStoreCategories(tenantId: string) {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, n: sql<number>`count(distinct ${products.id})::int` })
    .from(categories)
    .innerJoin(products, and(eq(products.categoryId, categories.id), eq(products.isPublished, true)))
    .where(eq(categories.tenantId, tenantId))
    .groupBy(categories.id)
    .orderBy(asc(categories.sort), asc(categories.name));
}

export async function getStoreProduct(tenantId: string, productId: string) {
  if (!/^[0-9a-f-]{36}$/.test(productId)) return null;
  const [p] = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      description: products.description,
      imagePath: products.imagePath,
      petType: products.petType,
      categoryId: products.categoryId,
      category: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId), eq(products.isPublished, true)));
  if (!p) return null;
  const vs = await db
    .select({
      id: variants.id,
      name: variants.name,
      unit: variants.unit,
      price: variants.price,
      compareAtPrice: variants.compareAtPrice,
      stockQty: variants.stockQty,
      barcode: variants.barcode,
    })
    .from(variants)
    .where(and(eq(variants.productId, productId), activeVariant))
    .orderBy(asc(variants.sort));
  if (vs.length === 0) return null;
  return {
    ...p,
    variants: vs.map((v) => ({ ...v, price: Number(v.price), compareAtPrice: v.compareAtPrice == null ? null : Number(v.compareAtPrice), stockQty: Number(v.stockQty) })),
  };
}

export async function getLegalKinds(tenantId: string) {
  return (await db.select({ kind: legalPages.kind }).from(legalPages).where(eq(legalPages.tenantId, tenantId))).map((r) => r.kind);
}

export async function getZones(tenantId: string) {
  const zs = await db
    .select()
    .from(deliveryZones)
    .where(and(eq(deliveryZones.tenantId, tenantId), eq(deliveryZones.isActive, true)))
    .orderBy(asc(deliveryZones.sort), asc(deliveryZones.name));
  return zs.map((z) => ({
    id: z.id,
    name: z.name,
    fee: Number(z.fee),
    minOrder: Number(z.minOrder),
    freeOver: z.freeOver == null ? null : Number(z.freeOver),
    etaText: z.etaText,
  }));
}
export type Zone = Awaited<ReturnType<typeof getZones>>[number];

/** Sepetteki varyantların güncel fiyat/stok bilgisi. */
export async function quoteVariants(tenantId: string, ids: string[]) {
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, 100);
  if (!clean.length) return [];
  const rows = await db
    .select({
      id: variants.id,
      productId: products.id,
      productName: products.name,
      variantName: variants.name,
      imagePath: products.imagePath,
      unit: variants.unit,
      price: variants.price,
      stockQty: variants.stockQty,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(eq(variants.tenantId, tenantId), inArray(variants.id, clean), eq(variants.isActive, true), eq(products.isPublished, true)));
  return rows.map((r) => ({ ...r, price: Number(r.price), stockQty: Number(r.stockQty) }));
}
export type QuotedVariant = Awaited<ReturnType<typeof quoteVariants>>[number];
