"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { catalogItems, categories, orderItems, PET_TYPES, products, stockMovements, UNITS, variants } from "@/db/schema";
import type { FormState } from "@/components/form";
import { requireMember } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { applyStockChange } from "@/lib/stock";
import { removeImage, saveImage, UploadError } from "@/lib/uploads";

const money = z.coerce.number().min(0, "Fiyat negatif olamaz.").max(10_000_000);
const optMoney = z.preprocess((v) => (v === "" || v == null ? null : v), money.nullable());

const variantSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().max(60).default(""),
  barcode: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(40).regex(/^[0-9A-Za-z-]+$/, "Barkod geçersiz.").nullable()),
  sku: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(40).nullable()),
  unit: z.enum(UNITS),
  price: money,
  compareAtPrice: optMoney,
  costPrice: optMoney,
  lowStockThreshold: z.coerce.number().min(0).max(100000).default(2),
  initialStock: z.coerce.number().min(0).max(1_000_000).default(0),
  isActive: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı gerekli.").max(160),
  brand: z.string().trim().max(80).optional(),
  categoryId: z.preprocess((v) => (v ? v : null), z.uuid().nullable()),
  newCategory: z.string().trim().max(60).optional(),
  petType: z.enum(PET_TYPES),
  description: z.string().trim().max(5000).optional(),
  isPublished: z.boolean(),
  variants: z.array(variantSchema).min(1, "En az bir satış birimi gerekli.").max(30),
});

export async function saveProductAction(productId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember();
  const t = me.tenant.id;

  let variantsRaw: unknown;
  try {
    variantsRaw = JSON.parse(String(formData.get("variants") ?? "[]"));
  } catch {
    return { error: "Form verisi okunamadı." };
  }
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    brand: formData.get("brand") ?? undefined,
    categoryId: formData.get("categoryId"),
    newCategory: formData.get("newCategory") ?? undefined,
    petType: formData.get("petType"),
    description: formData.get("description") ?? undefined,
    isPublished: formData.get("isPublished") === "on",
    variants: variantsRaw,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path[0] === "variants" && typeof issue.path[1] === "number" ? `${issue.path[1] + 1}. satış birimi: ` : "";
    return { error: where + issue.message };
  }
  const d = parsed.data;

  const barcodes = d.variants.map((v) => v.barcode).filter((b): b is string => !!b);
  if (new Set(barcodes).size !== barcodes.length) return { error: "Aynı barkod birden fazla satış biriminde kullanılmış." };
  for (const v of d.variants) if (v.unit === "adet" && !Number.isInteger(v.initialStock)) return { error: "Adetli ürünlerde stok tam sayı olmalı." };
  if (barcodes.length) {
    const clash = await db
      .select({ barcode: variants.barcode, productId: variants.productId })
      .from(variants)
      .where(and(eq(variants.tenantId, t), inArray(variants.barcode, barcodes)));
    const other = clash.find((c) => c.productId !== productId);
    if (other) return { error: `${other.barcode} barkodu başka bir ürününüzde zaten kayıtlı.` };
  }

  let imagePath: string | null = null;
  try {
    imagePath = await saveImage(formData.get("image") as File | null, t);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  let existing: { imagePath: string | null } | undefined;
  if (productId) {
    [existing] = await db
      .select({ imagePath: products.imagePath })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.tenantId, t)));
    if (!existing) return { error: "Ürün bulunamadı." };
  }
  const removeOld = formData.get("removeImage") === "1" || !!imagePath;

  let categoryId = d.categoryId;
  const savedId = await db.transaction(async (tx) => {
    if (d.newCategory) {
      const slug = slugify(d.newCategory);
      const [c] = await tx
        .insert(categories)
        .values({ tenantId: t, name: d.newCategory, slug, sort: 100 })
        .onConflictDoUpdate({ target: [categories.tenantId, categories.slug], set: { name: d.newCategory } })
        .returning({ id: categories.id });
      categoryId = c.id;
    } else if (categoryId) {
      const [c] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.tenantId, t)));
      if (!c) categoryId = null;
    }

    const fields = {
      name: d.name,
      brand: d.brand || null,
      categoryId,
      petType: d.petType,
      description: d.description || null,
      isPublished: d.isPublished,
      updatedAt: new Date(),
      ...(imagePath ? { imagePath } : removeOld ? { imagePath: null } : {}),
    };

    let pid = productId;
    if (pid) {
      await tx.update(products).set(fields).where(and(eq(products.id, pid), eq(products.tenantId, t)));
    } else {
      const [p] = await tx.insert(products).values({ ...fields, tenantId: t }).returning({ id: products.id });
      pid = p.id;
    }

    // Formdan çıkarılan varyantlar: hareketi varsa pasife al, yoksa sil.
    const keepIds = d.variants.map((v) => v.id).filter((x): x is string => !!x);
    const removed = await tx
      .select({ id: variants.id })
      .from(variants)
      .where(and(eq(variants.productId, pid), eq(variants.tenantId, t), keepIds.length ? notInArray(variants.id, keepIds) : sql`true`));
    for (const r of removed) {
      const [used] = await tx.select({ id: stockMovements.id }).from(stockMovements).where(eq(stockMovements.variantId, r.id)).limit(1);
      if (used) await tx.update(variants).set({ isActive: false }).where(eq(variants.id, r.id));
      else await tx.delete(variants).where(eq(variants.id, r.id));
    }

    for (const [i, v] of d.variants.entries()) {
      const vf = {
        name: v.name,
        barcode: v.barcode,
        sku: v.sku,
        unit: v.unit,
        price: v.price,
        compareAtPrice: v.compareAtPrice && v.compareAtPrice > v.price ? v.compareAtPrice : null,
        costPrice: v.costPrice,
        lowStockThreshold: v.lowStockThreshold,
        isActive: v.isActive,
        sort: i,
      };
      if (v.id) {
        await tx
          .update(variants)
          .set(vf)
          .where(and(eq(variants.id, v.id), eq(variants.productId, pid), eq(variants.tenantId, t)));
      } else {
        const [nv] = await tx.insert(variants).values({ ...vf, tenantId: t, productId: pid }).returning({ id: variants.id });
        if (v.initialStock > 0)
          await applyStockChange(tx, {
            tenantId: t,
            variantId: nv.id,
            delta: v.initialStock,
            type: "receive",
            note: "Açılış stoğu",
            unitCost: v.costPrice,
            userId: me.user.id,
          });
      }
    }

    // Ortak barkod kataloğunu besle (yalnızca ad/marka bilgisi; fiyat/stok paylaşılmaz).
    const categoryName = categoryId
      ? (await tx.select({ name: categories.name }).from(categories).where(eq(categories.id, categoryId)))[0]?.name
      : null;
    for (const v of d.variants)
      if (v.barcode)
        await tx
          .insert(catalogItems)
          .values({ barcode: v.barcode, name: d.name, brand: d.brand || null, variantName: v.name || null, petType: d.petType, categoryName, unit: v.unit })
          .onConflictDoNothing();
    return pid;
  });

  if (removeOld && existing?.imagePath) await removeImage(existing.imagePath);
  revalidatePath("/panel/urunler");
  revalidatePath(`/${me.tenant.slug}`, "layout");
  redirect(`/panel/urunler/${savedId}?kaydedildi=1`);
}

export async function deleteProductAction(productId: string) {
  const me = await requireMember();
  const t = me.tenant.id;
  const [p] = await db.select({ imagePath: products.imagePath }).from(products).where(and(eq(products.id, productId), eq(products.tenantId, t)));
  if (!p) redirect("/panel/urunler");

  const vIds = (await db.select({ id: variants.id }).from(variants).where(eq(variants.productId, productId))).map((v) => v.id);
  const [sold] = vIds.length ? await db.select({ id: orderItems.id }).from(orderItems).where(inArray(orderItems.variantId, vIds)).limit(1) : [];
  if (sold) {
    // Geçmiş satışlarda kullanılmış: raporlar bozulmasın diye arşivle.
    await db.update(products).set({ isPublished: false, updatedAt: new Date() }).where(eq(products.id, productId));
    await db.update(variants).set({ isActive: false }).where(eq(variants.productId, productId));
  } else {
    await db.delete(products).where(and(eq(products.id, productId), eq(products.tenantId, t)));
    await removeImage(p.imagePath);
  }
  revalidatePath("/panel/urunler");
  revalidatePath(`/${me.tenant.slug}`, "layout");
  redirect("/panel/urunler");
}

export type BarcodeLookup =
  | { kind: "own"; productId: string; name: string }
  | { kind: "catalog"; name: string; brand: string | null; variantName: string | null; petType: string | null; categoryName: string | null; unit: string | null }
  | { kind: "none" };

/** Ürün eklerken barkod okutulduğunda: önce kendi ürünleri, sonra ortak katalog. */
export async function lookupBarcodeAction(barcode: string): Promise<BarcodeLookup> {
  const me = await requireMember();
  const code = barcode.trim();
  if (!code || code.length > 40) return { kind: "none" };
  const [own] = await db
    .select({ productId: variants.productId, name: products.name })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(eq(variants.tenantId, me.tenant.id), eq(variants.barcode, code)))
    .limit(1);
  if (own) return { kind: "own", ...own };
  const [c] = await db.select().from(catalogItems).where(eq(catalogItems.barcode, code)).limit(1);
  if (c) return { kind: "catalog", name: c.name, brand: c.brand, variantName: c.variantName, petType: c.petType, categoryName: c.categoryName, unit: c.unit };
  return { kind: "none" };
}
