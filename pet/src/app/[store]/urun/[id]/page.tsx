import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PawIcon } from "@/components/logo";
import { PET_TYPE_LABELS } from "@/lib/labels";
import { getStoreCanonicalBase } from "@/lib/seo";
import { getCatalog, getStoreProduct } from "@/lib/storefront";
import { getStoreBase, getStoreBySlug } from "@/lib/tenant";
import { imageUrl } from "@/lib/uploads";
import { ProductCard } from "../../product-card";
import { VariantSelect } from "./variant-select";

export async function generateMetadata({ params }: PageProps<"/[store]/urun/[id]">): Promise<Metadata> {
  const { store: slug, id } = await params;
  const store = await getStoreBySlug(slug);
  const p = store ? await getStoreProduct(store.id, id) : null;
  if (!p) return {};
  const base = await getStoreCanonicalBase(store!.id, store!.slug);
  const url = `${base}/urun/${p.id}`;
  const title = [p.brand, p.name].filter(Boolean).join(" ");
  const minPrice = Math.min(...p.variants.map((v) => v.price));
  const description =
    p.description?.replace(/\s+/g, " ").slice(0, 155) ??
    `${title} — ${store!.name}. ${minPrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}'den başlayan fiyatlarla, adrese teslim veya gel-al.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: p.imagePath ? [new URL(imageUrl(p.imagePath)!, base).toString()] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/[store]/urun/[id]">) {
  const { store: slug, id } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const p = await getStoreProduct(store.id, id);
  if (!p) notFound();
  const base = await getStoreBase(store.slug);
  const related = (await getCatalog(store.id, { categoryId: p.categoryId, limit: 9 })).filter((x) => x.id !== p.id).slice(0, 4);
  const canonicalBase = await getStoreCanonicalBase(store.id, store.slug);
  const productUrl = `${canonicalBase}/urun/${p.id}`;
  // schema.org/Product: Google ürün sonuçlarında fiyat ve stok durumu gösterebilir.
  const offer = (v: (typeof p.variants)[number]) => ({
    "@type": "Offer",
    price: v.price.toFixed(2),
    priceCurrency: "TRY",
    availability: v.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: productUrl,
    seller: { "@type": "Organization", name: store.name },
  });
  const gtin = p.variants.find((v) => v.barcode && /^\d{8}$|^\d{12,14}$/.test(v.barcode))?.barcode;
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: [p.brand, p.name].filter(Boolean).join(" "),
    description: p.description ?? undefined,
    image: p.imagePath ? new URL(imageUrl(p.imagePath)!, canonicalBase).toString() : undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    category: p.category ?? undefined,
    sku: p.variants.length === 1 ? p.variants[0].id : undefined,
    gtin: p.variants.length === 1 ? gtin : undefined,
    offers:
      p.variants.length === 1
        ? offer(p.variants[0])
        : {
            "@type": "AggregateOffer",
            priceCurrency: "TRY",
            lowPrice: Math.min(...p.variants.map((v) => v.price)).toFixed(2),
            highPrice: Math.max(...p.variants.map((v) => v.price)).toFixed(2),
            offerCount: p.variants.length,
            availability: p.variants.some((v) => v.stockQty > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <JsonLd data={productLd} />
      <nav className="mb-4 text-sm text-stone-500" aria-label="Sayfa yolu">
        <Link href={base || "/"} className="hover:underline">
          Ana sayfa
        </Link>
        {p.category && (
          <>
            {" / "}
            <Link href={`${base || "/"}?kategori=${p.categorySlug}`} className="hover:underline">
              {p.category}
            </Link>
          </>
        )}
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200">
          {p.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(p.imagePath)!} alt={p.name} className="size-full object-contain" />
          ) : (
            <span className="grid size-full place-items-center text-stone-200">
              <PawIcon className="size-32" />
            </span>
          )}
        </div>
        <div>
          {p.brand && <p className="text-sm font-semibold tracking-wide text-stone-500 uppercase">{p.brand}</p>}
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{p.name}</h1>
          {p.petType !== "genel" && <p className="mt-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-medium">{PET_TYPE_LABELS[p.petType]}</p>}
          <div className="mt-6">
            <VariantSelect productName={p.name} variants={p.variants} canOrder={store.acceptingOrders} />
          </div>
          {p.description && (
            <div className="mt-8 border-t border-stone-200 pt-6">
              <h2 className="font-semibold">Ürün açıklaması</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-stone-700">{p.description}</p>
            </div>
          )}
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-bold">Bunlar da ilginizi çekebilir</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} base={base} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
