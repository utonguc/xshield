import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, tenantDomains, tenants } from "@/db/schema";
import { Logo } from "@/components/logo";
import { Stat } from "@/components/page-header";
import { TagsForm } from "@/components/tags-form";
import { getPlatformAnalytics } from "@/lib/analytics";
import { appUrl } from "@/lib/seo";
import { savePlatformTagsAction } from "./actions";
import { getSession, isPlatformAdmin } from "@/lib/auth";
import { displayPhone, formatDate, formatTL } from "@/lib/format";

export const metadata: Metadata = { title: "Platform yönetimi — xShield Pet", robots: { index: false } };

async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/giris");
  if (!isPlatformAdmin(s.user.email)) notFound();
  return s;
}

async function toggleStatus(tenantId: string) {
  "use server";
  await requireAdmin();
  await db
    .update(tenants)
    .set({ status: sql`case when ${tenants.status} = 'active' then 'suspended' else 'active' end` })
    .where(eq(tenants.id, tenantId));
  revalidatePath("/yonetim");
}

export default async function AdminPage() {
  await requireAdmin();
  const tags = await getPlatformAnalytics();
  const rows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      status: tenants.status,
      city: tenants.city,
      district: tenants.district,
      phone: tenants.phone,
      createdAt: tenants.createdAt,
      products: sql<number>`(select count(*) from ${products} where ${products.tenantId} = ${tenants.id})::int`,
      orders30: sql<number>`(select count(*) from ${orders} where ${orders.tenantId} = ${tenants.id} and ${orders.status} <> 'cancelled' and ${orders.createdAt} > now() - interval '30 days')::int`,
      online30: sql<number>`(select count(*) from ${orders} where ${orders.tenantId} = ${tenants.id} and ${orders.channel} = 'online' and ${orders.status} <> 'cancelled' and ${orders.createdAt} > now() - interval '30 days')::int`,
      domains: sql<string | null>`(select string_agg(${tenantDomains.domain} || case when ${tenantDomains.status} = 'pending' then ' (bekliyor)' else '' end, ', ') from ${tenantDomains} where ${tenantDomains.tenantId} = ${tenants.id})`,
      gmv30: sql<string>`(select coalesce(sum(${orders.total}), 0) from ${orders} where ${orders.tenantId} = ${tenants.id} and ${orders.status} <> 'cancelled' and ${orders.createdAt} > now() - interval '30 days')`,
    })
    .from(tenants)
    .orderBy(desc(tenants.createdAt));

  const totalGmv = rows.reduce((s, r) => s + Number(r.gmv30), 0);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/yonetim" />
        <span className="text-sm text-stone-500">Platform yönetimi</span>
      </header>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Mağaza" value={rows.length} hint={`${rows.filter((r) => r.status === "active").length} aktif`} />
        <Stat label="Son 30 gün işlem" value={rows.reduce((s, r) => s + r.orders30, 0)} />
        <Stat label="Son 30 gün online sipariş" value={rows.reduce((s, r) => s + r.online30, 0)} />
        <Stat label="Son 30 gün ciro (tüm mağazalar)" value={formatTL(totalGmv)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Mağaza</th>
              <th className="hidden md:table-cell">Konum</th>
              <th className="text-right">Ürün</th>
              <th className="text-right">30g işlem</th>
              <th className="text-right">30g ciro</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/${r.slug}`} target="_blank" className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <span className="block text-xs text-stone-500">
                    /{r.slug} · {displayPhone(r.phone)} · {formatDate(r.createdAt)}
                  </span>
                  {r.domains && <span className="block text-xs text-brand-700">🌐 {r.domains}</span>}
                </td>
                <td className="hidden text-stone-600 md:table-cell">{[r.district, r.city].filter(Boolean).join(", ") || "—"}</td>
                <td className="text-right tabular-nums">{r.products}</td>
                <td className="text-right tabular-nums">
                  {r.orders30} <span className="text-xs text-stone-500">({r.online30} online)</span>
                </td>
                <td className="text-right tabular-nums">{formatTL(r.gmv30)}</td>
                <td>
                  <form action={toggleStatus.bind(null, r.id)}>
                    <button className={`badge cursor-pointer ${r.status === "active" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-red-50 text-red-800 ring-red-200"}`}>
                      {r.status === "active" ? "Aktif · askıya al" : "Askıda · aktifleştir"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section id="seo" className="card mt-8 p-5">
        <h2 className="font-semibold">SEO ve Analitik — {appUrl().replace(/^https?:\/\//, "")}</h2>
        <p className="mb-5 text-sm text-stone-600">
          Tanıtım sayfası ve giriş/kayıt sayfaları ile platform adresindeki mağaza vitrinlerinde kullanılır. Kendi alan adını bağlayan mağazalar kendi
          kodlarını mağaza panelinden (Ayarlar → SEO ve Analitik) girer. Site haritası: <code>{appUrl()}/sitemap.xml</code>
        </p>
        <TagsForm action={savePlatformTagsAction} ga={tags.gaId} gsc={tags.gscToken} siteUrl={`${appUrl()}/`} />
      </section>
    </div>
  );
}
