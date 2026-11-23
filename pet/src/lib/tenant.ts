import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";

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
