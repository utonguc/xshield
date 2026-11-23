import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { blankVariant } from "../product-draft";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ searchParams }: PageProps<"/panel/urunler/yeni">) {
  const me = await requireMember();
  const barcode = (await searchParams).barkod;
  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.tenantId, me.tenant.id))
    .orderBy(asc(categories.sort), asc(categories.name));
  return (
    <div>
      <PageHeader title="Yeni ürün" description="Barkodu okutursanız ortak katalogdaki bilgiler otomatik dolar." />
      <ProductForm
        categories={cats}
        draft={{
          id: null,
          name: "",
          brand: "",
          categoryId: "",
          petType: "genel",
          description: "",
          isPublished: true,
          imageUrl: null,
          variants: [{ ...blankVariant(), barcode: typeof barcode === "string" ? barcode : "" }],
        }}
      />
    </div>
  );
}
