import { timingSafeEqual } from "node:crypto";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tenantDomains } from "@/db/schema";

/*
 * VPS'teki sync-pet-domains.sh betiği bu adresi okuyup nginx'e ekler:
 *   server_name www.patilerpetshop.com patilerpetshop.com;
 * PET_INTERNAL_TOKEN ile korunur (Authorization: Bearer ...).
 */
export async function GET(request: Request) {
  const expected = process.env.PET_INTERNAL_TOKEN ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = expected.length >= 16 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("unauthorized", { status: 401 });

  const rows = await db
    .select({ domain: tenantDomains.domain })
    .from(tenantDomains)
    .where(inArray(tenantDomains.status, ["verified", "active"]))
    .orderBy(asc(tenantDomains.domain));
  // Alan adları kayıt sırasında doğrulandı; yine de nginx'e yalnızca güvenli karakterler gitsin.
  const names = rows.map((r) => r.domain).filter((d) => /^[a-z0-9.-]+$/.test(d));
  const body =
    "# Otomatik üretildi (xShield Pet) — elle düzenlemeyin.\n" + (names.length ? names.map((n) => `server_name ${n};`).join("\n") + "\n" : "");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
