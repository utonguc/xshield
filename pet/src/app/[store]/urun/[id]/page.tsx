import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PawIcon } from "@/components/logo";
import { PET_TYPE_LABELS } from "@/lib/labels";
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
  return {
    title: [p.brand, p.name].filter(Boolean).join(" "),
    description: p.description?.slice(0, 160) ?? `${p.name} — ${store!.name}`,
    openGraph: { images: p.imagePath ? [imageUrl(p.imagePath)!] : undefined },
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 text-sm text-stone-500">
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
