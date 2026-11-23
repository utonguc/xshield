import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { ReceiveForm } from "../stock-forms";

export default async function ReceivePage({ searchParams }: PageProps<"/panel/stok/giris">) {
  const me = await requireMember();
  const productId = (await searchParams).urun;
  const preset =
    typeof productId === "string" && /^[0-9a-f-]{36}$/.test(productId)
      ? await db
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
          .where(and(eq(variants.productId, productId), eq(variants.tenantId, me.tenant.id), eq(variants.isActive, true)))
          .orderBy(asc(variants.sort))
      : [];
  return (
    <div>
      <p className="mb-4 text-sm text-stone-600">Tedarikçiden gelen ürünleri okutun, miktarı girin. Son kullanma tarihi girerseniz SKT uyarısı alırsınız.</p>
      <ReceiveForm
        preset={preset.map((p) => ({ ...p, price: Number(p.price), costPrice: p.costPrice == null ? null : Number(p.costPrice), stockQty: Number(p.stockQty) }))}
      />
    </div>
  );
}
