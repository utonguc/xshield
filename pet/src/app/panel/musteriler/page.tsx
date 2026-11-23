import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { customers, deliveryZones } from "@/db/schema";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { displayPhone, formatDate, formatTL, whatsappLink } from "@/lib/format";

export default async function CustomersPage({ searchParams }: PageProps<"/panel/musteriler">) {
  const me = await requireMember();
  const q = (await searchParams).q;
  const term = typeof q === "string" ? q.trim() : "";
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      address: customers.address,
      zone: deliveryZones.name,
      orderCount: customers.orderCount,
      totalSpent: customers.totalSpent,
      lastOrderAt: customers.lastOrderAt,
    })
    .from(customers)
    .leftJoin(deliveryZones, eq(deliveryZones.id, customers.zoneId))
    .where(
      and(
        eq(customers.tenantId, me.tenant.id),
        term ? or(ilike(customers.name, `%${term.replace(/[%_]/g, "")}%`), ilike(customers.phone, `%${term.replace(/\D/g, "").slice(-10) || "x"}%`)) : undefined,
      ),
    )
    .orderBy(desc(customers.lastOrderAt))
    .limit(300);

  return (
    <div>
      <PageHeader title="Müşteriler" description="Online sipariş veren veya kasada telefonu girilen müşteriler." />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={term} placeholder="Ad veya telefon" className="input max-w-xs" />
        <button className="btn-ghost">Ara</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="Henüz müşteri yok">İlk online siparişle birlikte müşteri listeniz oluşmaya başlar.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Müşteri</th>
                <th className="hidden md:table-cell">Adres</th>
                <th className="text-right">Sipariş</th>
                <th className="text-right">Toplam</th>
                <th className="hidden sm:table-cell">Son sipariş</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <p className="font-medium">{c.name}</p>
                    <a href={whatsappLink(c.phone)} target="_blank" rel="noopener" className="text-xs text-brand-700 hover:underline">
                      {displayPhone(c.phone)}
                    </a>
                  </td>
                  <td className="hidden max-w-xs truncate text-stone-600 md:table-cell">{[c.zone, c.address].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="text-right tabular-nums">{c.orderCount}</td>
                  <td className="text-right tabular-nums">{formatTL(c.totalSpent)}</td>
                  <td className="hidden text-stone-600 sm:table-cell">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
