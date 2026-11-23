import "server-only";
import { and, eq, inArray, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, tenantDomains, tenants, variants } from "@/db/schema";

export type SitemapEntry = { loc: string; lastmod?: Date; priority?: number };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function sitemapXml(entries: SitemapEntry[]) {
  const body = entries
    .map(
      (e) =>
        `  <url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : ""}${
          e.priority != null ? `<priority>${e.priority.toFixed(1)}</priority>` : ""
        }</url>`,
    )
    .join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

/** Bir mağazanın indekslenecek sayfaları: ana sayfa, ürünü olan kategoriler, yayındaki ürünler. */
export async function storeEntries(tenantId: string, base: string): Promise<SitemapEntry[]> {
  const [prods, cats] = await Promise.all([
    db
      .select({ id: products.id, updatedAt: products.updatedAt })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isPublished, true),
          sql`exists (select 1 from ${variants} v where v.product_id = ${products.id} and v.is_active)`,
        ),
      )
      .limit(5000),
    db
      .selectDistinct({ slug: categories.slug })
      .from(categories)
      .innerJoin(products, and(eq(products.categoryId, categories.id), eq(products.isPublished, true)))
      .where(eq(categories.tenantId, tenantId)),
  ]);
  const newest = prods.reduce<Date | undefined>((m, p) => (!m || p.updatedAt > m ? p.updatedAt : m), undefined);
  return [
    { loc: base, lastmod: newest, priority: 1 },
    ...cats.map((c) => ({ loc: `${base}?kategori=${encodeURIComponent(c.slug)}`, priority: 0.6 })),
    ...prods.map((p) => ({ loc: `${base}/urun/${p.id}`, lastmod: p.updatedAt, priority: 0.8 })),
  ];
}

/** Platform haritasına girecek mağazalar: aktif ve kendi alan adı olmayanlar (onlar kendi alan adında listelenir). */
export async function platformStores() {
  return db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(
      and(
        eq(tenants.status, "active"),
        notExists(
          db
            .select({ x: sql`1` })
            .from(tenantDomains)
            .where(and(eq(tenantDomains.tenantId, tenants.id), inArray(tenantDomains.status, ["verified", "active"]))),
        ),
      ),
    );
}
