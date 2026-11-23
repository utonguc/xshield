import "server-only";
import { cache } from "react";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tenantDomains } from "@/db/schema";

export const appUrl = () => (process.env.APP_URL ?? "https://pet.xshield.com.tr").replace(/\/$/, "");

/**
 * Mağazanın arama motorlarına gösterilecek kalıcı (canonical) kök adresi:
 * doğrulanmış kendi alan adı varsa https://alanadi, yoksa https://pet.xshield.com.tr/slug.
 * Aynı içerik iki adreste de açıldığı için Google'a hangisinin asıl olduğunu söyler.
 */
export const getStoreCanonicalBase = cache(async (tenantId: string, slug: string) => {
  const [d] = await db
    .select({ domain: tenantDomains.domain })
    .from(tenantDomains)
    .where(and(eq(tenantDomains.tenantId, tenantId), inArray(tenantDomains.status, ["verified", "active"])))
    .orderBy(asc(tenantDomains.createdAt))
    .limit(1);
  return d ? `https://${d.domain}` : `${appUrl()}/${slug}`;
});

/** Kök adres + yol ("/" kökün kendisi) */
export const joinUrl = (base: string, path: string) => (path === "/" || path === "" ? base : `${base}${path.startsWith("/") ? "" : "/"}${path}`);
