import { getStoreCanonicalBase } from "@/lib/seo";
import { getStoreBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Mağazanın kendi alan adındaki robots.txt (proxy /robots.txt isteğini buraya yönlendirir). */
export async function GET(_: Request, ctx: RouteContext<"/[store]/robots.txt">) {
  const store = await getStoreBySlug((await ctx.params).store);
  if (!store) return new Response("Not found", { status: 404 });
  const base = await getStoreCanonicalBase(store.id, store.slug);
  const body =
    store.status === "active"
      ? `User-agent: *\nAllow: /\nDisallow: /sepet\nDisallow: /siparis/\n\nSitemap: ${base}/sitemap.xml\n`
      : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
