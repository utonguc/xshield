import Link from "next/link";
import { notFound } from "next/navigation";
import { PET_TYPES, type PetType } from "@/db/schema";
import { formatTL } from "@/lib/format";
import { PET_TYPE_LABELS } from "@/lib/labels";
import { getCatalog, getStoreCategories, getZones } from "@/lib/storefront";
import { getStoreBase, getStoreBySlug } from "@/lib/tenant";
import { ProductCard } from "./product-card";

const PET_EMOJI: Partial<Record<PetType, string>> = { kedi: "🐱", kopek: "🐶", kus: "🐦", balik: "🐠", kemirgen: "🐹", surungen: "🦎" };

export default async function StoreHome({ params, searchParams }: PageProps<"/[store]">) {
  const store = await getStoreBySlug((await params).store);
  if (!store) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const pet = typeof sp.tur === "string" && (PET_TYPES as readonly string[]).includes(sp.tur) ? (sp.tur as PetType) : null;
  const catSlug = typeof sp.kategori === "string" ? sp.kategori : null;

  const [cats, zones] = await Promise.all([getStoreCategories(store.id), getZones(store.id)]);
  const cat = cats.find((c) => c.slug === catSlug) ?? null;
  const items = await getCatalog(store.id, { q, petType: pet, categoryId: cat?.id ?? null });
  const base = await getStoreBase(store.slug);
  const home = base || "/";

  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { q: q || null, tur: pet, kategori: cat?.slug ?? null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${home}?${s}` : home;
  };
  const filtered = !!(q || pet || cat);
  const minFee = zones.length ? Math.min(...zones.map((z) => z.fee)) : null;
  const maxFee = zones.length ? Math.max(...zones.map((z) => z.fee)) : null;
  const freeOver = zones.map((z) => z.freeOver).filter((x): x is number => x != null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {!filtered && (
        <section className="relative overflow-hidden rounded-3xl bg-brand-600 px-6 py-8 text-white sm:px-10 sm:py-12">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{store.tagline || `${store.name} artık online!`}</h1>
            <p className="mt-2 text-brand-50">Mama, kum, oyuncak ve aksesuar — mahallenizdeki petshoptan, kapınıza.</p>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              {store.deliveryEnabled && (
                <li className="rounded-full bg-white/15 px-3 py-1">
                  🛵 Adrese teslim{maxFee === 0 ? " · ücretsiz" : minFee ? ` · ${formatTL(minFee)}’den başlayan` : ""}
                </li>
              )}
              {freeOver.length > 0 && <li className="rounded-full bg-white/15 px-3 py-1">{formatTL(Math.min(...freeOver))} üzeri teslimat ücretsiz</li>}
              {store.pickupEnabled && <li className="rounded-full bg-white/15 px-3 py-1">🏪 Gel-al</li>}
              {store.payCashOnDelivery && <li className="rounded-full bg-white/15 px-3 py-1">💵 Kapıda ödeme</li>}
            </ul>
          </div>
          <svg viewBox="0 0 24 24" fill="currentColor" className="absolute -right-8 -bottom-10 size-64 text-white/10" aria-hidden>
            <ellipse cx="6.2" cy="9.3" rx="2.1" ry="2.6" />
            <ellipse cx="10" cy="5.6" rx="2.1" ry="2.7" />
            <ellipse cx="14.4" cy="5.6" rx="2.1" ry="2.7" />
            <ellipse cx="18" cy="9.5" rx="2.1" ry="2.6" />
            <path d="M12.1 10.6c-2.6 0-6.1 3.7-6.1 6.4 0 1.9 1.4 2.9 3.1 2.9 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3.1-1 3.1-2.9 0-2.7-3.5-6.4-6.1-6.4Z" />
          </svg>
        </section>
      )}

      <form action={home} className="mt-5 md:hidden">
        <input name="q" defaultValue={q} placeholder="Mama, kum, tasma ara…" className="input bg-white" aria-label="Ürün ara" />
      </form>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Hayvan türü">
        <Link href={link({ tur: null })} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 ${!pet ? "bg-ink text-white ring-ink" : "bg-white ring-stone-200 hover:ring-stone-400"}`}>
          Hepsi
        </Link>
        {(Object.keys(PET_EMOJI) as PetType[]).map((t) => (
          <Link
            key={t}
            href={link({ tur: pet === t ? null : t })}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 ${pet === t ? "bg-ink text-white ring-ink" : "bg-white ring-stone-200 hover:ring-stone-400"}`}
          >
            {PET_EMOJI[t]} {PET_TYPE_LABELS[t]}
          </Link>
        ))}
      </nav>

      {cats.length > 0 && (
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Kategoriler">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={link({ kategori: cat?.id === c.id ? null : c.slug })}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-sm ${cat?.id === c.id ? "bg-brand-100 font-semibold text-brand-900" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{q ? `“${q}” için sonuçlar` : (cat?.name ?? (pet ? `${PET_TYPE_LABELS[pet]} ürünleri` : "Tüm ürünler"))}</h2>
        {filtered && (
          <Link href={home} className="text-sm text-brand-700 hover:underline">
            Filtreleri temizle
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white px-6 py-12 text-center text-stone-500 ring-1 ring-stone-200">
          {filtered ? "Aradığınız kriterlere uygun ürün bulunamadı." : "Mağazamız çok yakında ürünleriyle burada!"}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} base={base} />
          ))}
        </div>
      )}
    </main>
  );
}
