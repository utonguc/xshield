import "server-only";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tenantDomains, tenants } from "@/db/schema";
import { CUSTOM_DOMAIN_HEADER } from "./platform";

/** Mağaza adresi olarak kullanılamayacak yollar (uygulamanın kendi sayfaları). */
export const RESERVED_SLUGS = new Set([
  "panel", "kurye", "yonetim", "giris", "kayit", "cikis", "api", "dosya", "admin", "www", "app", "pet",
  "magaza", "destek", "yardim", "hakkimizda", "iletisim", "fiyat", "fiyatlar", "blog", "sepet", "siparis",
  "robots.txt", "sitemap.xml", "favicon.ico", "static", "public", "_next", "xshield", "kvkk", "gizlilik",
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Adres 3-40 karakter olmalı; yalnızca küçük harf, rakam ve tire içerebilir.";
  if (RESERVED_SLUGS.has(slug)) return "Bu adres kullanılamaz, lütfen başka bir adres seçin.";
  return null;
}

/**
 * Vitrin için mağaza (istek başına önbellekli). connection() sayesinde vitrin
 * sayfaları derleme anında önceden üretilmez; stok ve fiyat her istekte güncel okunur.
 */
export const getStoreBySlug = cache(async (slug: string) => {
  await connection();
  if (!SLUG_RE.test(slug)) return null;
  const [t] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return t ?? null;
});

export type Store = NonNullable<Awaited<ReturnType<typeof getStoreBySlug>>>;

/**
 * Vitrin bağlantılarının öneki: mağaza kendi alan adından açıldıysa "" (www.dukkan.com/urun/1),
 * platformdan açıldıysa "/slug" (pet.xshield.com.tr/slug/urun/1).
 */
export async function getStoreBase(slug: string) {
  return (await headers()).get(CUSTOM_DOMAIN_HEADER) ? "" : `/${slug}`;
}

/** Mağazanın herkese açık adresi: doğrulanmış kendi alan adı varsa o, yoksa platform adresi. */
export async function getStoreUrl(tenantId: string, slug: string) {
  const [d] = await db
    .select({ domain: tenantDomains.domain })
    .from(tenantDomains)
    .where(and(eq(tenantDomains.tenantId, tenantId), inArray(tenantDomains.status, ["verified", "active"])))
    .orderBy(asc(tenantDomains.createdAt))
    .limit(1);
  if (d) return { href: `https://${d.domain}`, label: d.domain };
  const app = (process.env.APP_URL ?? "https://pet.xshield.com.tr").replace(/\/$/, "");
  return { href: `/${slug}`, label: `${app.replace(/^https?:\/\//, "")}/${slug}` };
}
