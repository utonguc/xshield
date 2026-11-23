import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, variants } from "@/db/schema";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { formatQty, formatTL } from "@/lib/format";
import { imageUrl } from "@/lib/uploads";

export default async function ProductsPage({ searchParams }: PageProps<"/panel/urunler">) {
  const me = await requireMember();
  const t = me.tenant.id;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = typeof sp.kategori === "string" ? sp.kategori : "";

  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.tenantId, t)).orderBy(asc(categories.sort), asc(categories.name));
  const term = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      imagePath: products.imagePath,
      isPublished: products.isPublished,
      category: categories.name,
      variantCount: sql<number>`count(${variants.id}) filter (where ${variants.isActive})::int`,
      minPrice: sql<string | null>`min(${variants.price}) filter (where ${variants.isActive})`,
      maxPrice: sql<string | null>`max(${variants.price}) filter (where ${variants.isActive})`,
      stock: sql<string>`coalesce(sum(${variants.stockQty}) filter (where ${variants.isActive}), 0)`,
      units: sql<string>`string_agg(distinct ${variants.unit}, ',')`,
      low: sql<boolean>`bool_or(${variants.isActive} and ${variants.stockQty} <= ${variants.lowStockThreshold})`,
    })
    .from(products)
    .leftJoin(variants, eq(variants.productId, products.id))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.tenantId, t),
        cat ? eq(products.categoryId, cat) : undefined,
        q ? or(ilike(products.name, term), ilike(products.brand, term), sql`exists (select 1 from ${variants} v2 where v2.product_id = ${products.id} and v2.barcode = ${q})`) : undefined,
      ),
    )
    .groupBy(products.id, categories.name)
    .orderBy(desc(products.updatedAt))
    .limit(300);

  return (
    <div>
      <PageHeader
        title="Ürünler"
        description={`${rows.length} ürün`}
        actions={
          <Link href="/panel/urunler/yeni" className="btn-primary">
            + Ürün ekle
          </Link>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Ürün adı, marka veya barkod" className="input max-w-xs" />
        <select name="kategori" defaultValue={cat} className="input max-w-[14rem]">
          <option value="">Tüm kategoriler</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn-ghost">Filtrele</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={q || cat ? "Aramaya uygun ürün yok" : "Henüz ürün eklemediniz"}>
          {!q && !cat && (
            <>
              Barkod okutarak hızlıca ürün ekleyebilirsiniz; ortak katalogda olan ürünlerin adı ve markası otomatik dolar.
              <div className="mt-4">
                <Link href="/panel/urunler/yeni" className="btn-primary">
                  İlk ürünü ekle
                </Link>
              </div>
            </>
          )}
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Ürün</th>
                <th className="hidden md:table-cell">Kategori</th>
                <th className="text-right">Fiyat</th>
                <th className="text-right">Stok</th>
                <th className="hidden sm:table-cell">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td>
                    <Link href={`/panel/urunler/${r.id}`} className="flex items-center gap-3">
                      <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        {r.imagePath && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl(r.imagePath)!} alt="" className="size-full object-cover" loading="lazy" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block text-xs text-stone-500">
                          {[r.brand, r.variantCount > 1 ? `${r.variantCount} seçenek` : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden text-stone-600 md:table-cell">{r.category ?? "—"}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">
                    {r.minPrice == null ? "—" : r.minPrice === r.maxPrice ? formatTL(r.minPrice) : `${formatTL(r.minPrice)} – ${formatTL(r.maxPrice)}`}
                  </td>
                  <td className={`text-right whitespace-nowrap tabular-nums ${r.low ? "font-semibold text-amber-700" : ""}`}>
                    {formatQty(r.stock, r.units === "kg" ? "kg" : null)}
                  </td>
                  <td className="hidden sm:table-cell">
                    {r.isPublished ? (
                      <span className="badge bg-emerald-50 text-emerald-800 ring-emerald-200">Satışta</span>
                    ) : (
                      <span className="badge bg-stone-100 text-stone-600 ring-stone-200">Yalnız kasada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
