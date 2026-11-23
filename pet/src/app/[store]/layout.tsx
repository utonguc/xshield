import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PawIcon } from "@/components/logo";
import { displayPhone, whatsappLink } from "@/lib/format";
import { LEGAL_LABELS } from "@/lib/labels";
import { getLegalKinds } from "@/lib/storefront";
import { getStoreBySlug } from "@/lib/tenant";
import { imageUrl } from "@/lib/uploads";
import { CartButton, CartProvider } from "./cart";

export async function generateMetadata({ params }: LayoutProps<"/[store]">): Promise<Metadata> {
  const store = await getStoreBySlug((await params).store);
  if (!store) return {};
  const place = [store.district, store.city].filter(Boolean).join(", ");
  return {
    title: { default: `${store.name}${place ? ` — ${place}` : ""} | Online Petshop`, template: `%s | ${store.name}` },
    description: store.tagline ?? `${store.name} online petshop: mama, kum, oyuncak, aksesuar. ${place}`,
    openGraph: { siteName: store.name, images: store.logoPath ? [imageUrl(store.logoPath)!] : undefined },
  };
}

export default async function StoreLayout({ children, params }: LayoutProps<"/[store]">) {
  const store = await getStoreBySlug((await params).store);
  if (!store) notFound();
  if (store.status !== "active")
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="mt-2 text-stone-600">Bu mağaza geçici olarak hizmet dışıdır.</p>
        </div>
      </main>
    );

  const legal = await getLegalKinds(store.id);
  const base = `/${store.slug}`;

  return (
    <CartProvider slug={store.slug}>
      <div className="flex min-h-dvh flex-col bg-paper">
        <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href={base} className="flex min-w-0 items-center gap-2.5">
              {store.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(store.logoPath)!} alt="" className="size-10 rounded-xl object-cover ring-1 ring-stone-200" />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                  <PawIcon className="size-6" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-bold leading-tight">{store.name}</span>
                {(store.district || store.city) && <span className="block truncate text-xs text-stone-500">{[store.district, store.city].filter(Boolean).join(", ")}</span>}
              </span>
            </Link>
            <form action={base} className="ml-auto hidden max-w-sm flex-1 md:block">
              <input name="q" placeholder="Mama, kum, tasma ara…" className="input bg-white" aria-label="Ürün ara" />
            </form>
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              {store.whatsapp && (
                <a href={whatsappLink(store.whatsapp)} target="_blank" rel="noopener" className="btn-ghost hidden px-3 sm:inline-flex" title="WhatsApp ile yazın">
                  WhatsApp
                </a>
              )}
              <CartButton />
            </div>
          </div>
        </header>

        {!store.acceptingOrders && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">Mağazamız şu anda online sipariş almıyor. Ürünleri inceleyebilirsiniz.</div>
        )}

        <div className="flex-1">{children}</div>

        <footer className="mt-16 border-t border-stone-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
            <div>
              <p className="font-bold">{store.name}</p>
              {store.about && <p className="mt-2 text-stone-600">{store.about}</p>}
            </div>
            <div className="space-y-1 text-stone-600">
              <p className="font-semibold text-ink">İletişim</p>
              {store.address && <p>{[store.address, store.district, store.city].filter(Boolean).join(", ")}</p>}
              {store.phone && (
                <p>
                  <a href={`tel:0${store.phone}`} className="hover:underline">
                    {displayPhone(store.phone)}
                  </a>
                </p>
              )}
              {store.email && <p>{store.email}</p>}
              {store.workingHours && <p>{store.workingHours}</p>}
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Bilgilendirme</p>
              {legal.map((k) => (
                <p key={k}>
                  <Link href={`${base}/sayfa/${k}`} className="text-stone-600 hover:underline">
                    {LEGAL_LABELS[k]}
                  </Link>
                </p>
              ))}
              {store.companyTitle && (
                <p className="pt-2 text-xs text-stone-500">
                  {store.companyTitle}
                  {store.taxOffice && ` · ${store.taxOffice} V.D.`}
                  {store.taxNumber && ` · ${store.taxNumber}`}
                </p>
              )}
            </div>
          </div>
          <p className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
            <Link href="/" className="hover:text-stone-600">
              xShield Pet
            </Link>{" "}
            altyapısıyla
          </p>
        </footer>
      </div>
    </CartProvider>
  );
}
