import Link from "next/link";
import { PawIcon } from "@/components/logo";
import { formatTL } from "@/lib/format";
import type { CatalogCard } from "@/lib/storefront";
import { imageUrl } from "@/lib/uploads";
import { AddToCartButton } from "./cart";

export function ProductCard({ p, base }: { p: CatalogCard; base: string }) {
  const href = `${base}/urun/${p.id}`;
  const quickAdd = p.singleVariantId && p.singleUnit === "adet";
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200 transition hover:shadow-lg hover:ring-stone-300">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-stone-100">
        {p.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(p.imagePath)!} alt={p.name} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
        ) : (
          <span className="grid size-full place-items-center text-stone-300">
            <PawIcon className="size-14" />
          </span>
        )}
        {!p.inStock && <span className="absolute top-2 left-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">Tükendi</span>}
        {p.inStock && p.discountPct != null && p.discountPct > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
            {p.variantCount > 1 ? "%" + p.discountPct + "’e varan indirim" : `%${p.discountPct} indirim`}
          </span>
        )}
        {p.inStock && quickAdd && p.singleStock <= 3 && (
          <span className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-amber-800">Son {p.singleStock} adet</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        {p.brand && <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{p.brand}</p>}
        <Link href={href} className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium hover:underline">
          {p.name}
        </Link>
        <div className="mt-auto pt-2">
          <p className="flex items-baseline gap-1.5">
            <span className="font-bold">
              {p.variantCount > 1 && <span className="text-xs font-normal text-stone-500">başlayan </span>}
              {formatTL(p.minPrice)}
              {p.singleUnit === "kg" && p.variantCount === 1 && <span className="text-xs font-normal text-stone-500"> / kg</span>}
            </span>
            {p.compareAt && p.compareAt > p.minPrice && <span className="text-xs text-stone-400 line-through">{formatTL(p.compareAt)}</span>}
          </p>
          <div className="mt-2">
            {quickAdd ? (
              <AddToCartButton item={{ variantId: p.singleVariantId!, qty: 1, name: p.name, unit: "adet" }} disabled={!p.inStock} className="btn-primary btn-sm w-full" />
            ) : (
              <Link href={href} className={`btn-sm w-full ${p.inStock ? "btn-ghost" : "btn-ghost opacity-60"}`}>
                {p.inStock ? "Seçenekleri gör" : "Tükendi"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
