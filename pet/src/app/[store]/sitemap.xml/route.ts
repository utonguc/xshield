import { getStoreCanonicalBase } from "@/lib/seo";
import { sitemapXml, storeEntries } from "@/lib/sitemap";
import { getStoreBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Mağazanın site haritası. Kendi alan adında /sitemap.xml olarak (proxy buraya yönlendirir),
 * platformda /slug/sitemap.xml olarak açılır; adresler her zaman mağazanın asıl adresindedir.
 */
export async function GET(_: Request, ctx: RouteContext<"/[store]/sitemap.xml">) {
  const store = await getStoreBySlug((await ctx.params).store);
  if (!store || store.status !== "active") return new Response("Not found", { status: 404 });
  const base = await getStoreCanonicalBase(store.id, store.slug);
  return sitemapXml(await storeEntries(store.id, base));
}
