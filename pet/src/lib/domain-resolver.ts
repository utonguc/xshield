import postgres from "postgres";

/*
 * proxy.ts için alan adı → mağaza adresi (slug) çözümleyici.
 * Her istekte veritabanına gitmemek için sonuçlar kısa süre bellekte tutulur.
 * Proxy uygulamadan bağımsız çalışabileceği için kendi küçük bağlantı havuzunu kullanır.
 */

const g = globalThis as unknown as { petDomainSql?: ReturnType<typeof postgres> };
const sql = (g.petDomainSql ??= postgres(process.env.DATABASE_URL ?? "postgres://pet:pet@localhost:5432/petdb", { max: 2, idle_timeout: 60 }));

const HIT_TTL = 60_000;
const MISS_TTL = 30_000;
const cache = new Map<string, { slug: string | null; exp: number }>();

export async function resolveDomain(host: string): Promise<string | null> {
  const now = Date.now();
  const hit = cache.get(host);
  if (hit && hit.exp > now) return hit.slug;
  let slug: string | null = null;
  try {
    const rows = await sql<{ slug: string }[]>`
      select t.slug from tenant_domains d join tenants t on t.id = d.tenant_id
      where d.domain = ${host} and d.status in ('verified', 'active') limit 1`;
    slug = rows[0]?.slug ?? null;
  } catch (e) {
    console.error("[domain-resolver]", e);
    return hit?.slug ?? null; // veritabanı geçici olarak yoksa eski sonucu kullan
  }
  if (cache.size > 5000) cache.clear();
  cache.set(host, { slug, exp: now + (slug ? HIT_TTL : MISS_TTL) });
  return slug;
}
