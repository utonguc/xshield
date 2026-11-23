import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";

/*
 * Google Analytics (GA4) ve Search Console etiketleri.
 * Kullanıcılar genelde Google'ın verdiği kodu olduğu gibi yapıştırır; buradaki
 * yardımcılar hem yalın değeri hem de tam etiketi kabul edip içinden değeri çıkarır.
 */

const GA_RE = /\bG-[A-Z0-9]{4,15}\b/;
const GSC_TOKEN_RE = /^[A-Za-z0-9_-]{10,100}$/;

export type ParseResult = { value: string | null } | { error: string };

/** "G-ABC123", gtag script bloğu veya "gtag('config', 'G-ABC123')" → "G-ABC123" */
export function parseGaId(input: string): ParseResult {
  const s = input.trim();
  if (!s) return { value: null };
  const m = s.toUpperCase().match(GA_RE);
  if (!m) return { error: "Geçerli bir GA4 ölçüm kimliği girin (G- ile başlar, ör. G-ABC123XYZ)." };
  return { value: m[0] };
}

/** Doğrulama kodu veya <meta name="google-site-verification" content="..."> → kod */
export function parseGscToken(input: string): ParseResult {
  const s = input.trim();
  if (!s) return { value: null };
  const fromMeta = s.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  const token = (fromMeta ?? s).trim();
  if (!GSC_TOKEN_RE.test(token))
    return { error: "Search Console doğrulama kodu geçersiz. “HTML etiketi” yöntemindeki content değerini ya da etiketin tamamını yapıştırın." };
  return { value: token };
}

export const PLATFORM_KEYS = { ga: "ga_measurement_id", gsc: "gsc_verification" } as const;

/** Platformun (pet.xshield.com.tr) kendi etiketleri; istek başına bir kez okunur. */
export const getPlatformAnalytics = cache(async () => {
  // Veritabanından okunur: bu sayfalar derleme anında önceden üretilmesin (Docker derlemesinde DB yok).
  await connection();
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, [PLATFORM_KEYS.ga, PLATFORM_KEYS.gsc]));
  const get = (k: string) => rows.find((r) => r.key === k)?.value || null;
  return { gaId: get(PLATFORM_KEYS.ga), gscToken: get(PLATFORM_KEYS.gsc) };
});

export async function setPlatformSetting(key: string, value: string | null) {
  if (value == null) {
    await db.delete(platformSettings).where(inArray(platformSettings.key, [key]));
    return;
  }
  await db
    .insert(platformSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
}
