import Link from "next/link";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZones, orders, users } from "@/db/schema";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { formatDateTime, formatTL } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_LABELS } from "@/lib/labels";
import { AutoRefresh } from "./auto-refresh";

const TABS = {
  aktif: "Aktif",
  teslim: "Teslim edilen",
  iptal: "İptal",
  kasa: "Mağaza satışları",
  tumu: "Tümü",
} as const;

export default async function OrdersPage({ searchParams }: PageProps<"/panel/siparisler">) {
  const me = await requireMember();
  const sp = await searchParams;
  const tab = (typeof sp.durum === "string" && sp.durum in TABS ? sp.durum : "aktif") as keyof typeof TABS;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where = and(
    eq(orders.tenantId, me.tenant.id),
    tab === "aktif" ? and(eq(orders.channel, "online"), inArray(orders.status, ["new", "preparing", "ready", "on_the_way"])) : undefined,
    tab === "teslim" ? and(eq(orders.channel, "online"), eq(orders.status, "delivered")) : undefined,
    tab === "iptal" ? eq(orders.status, "cancelled") : undefined,
    tab === "kasa" ? eq(orders.channel, "pos") : undefined,
    q
      ? or(
          sql`${orders.number}::text = ${q.replace(/^#/, "")}`,
          sql`${orders.customerPhone} like ${"%" + q.replace(/\D/g, "").slice(-10) + "%"}`,
          sql`${orders.customerName} ilike ${"%" + q.replace(/[%_]/g, "") + "%"}`,
        )
      : undefined,
  );

  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      channel: orders.channel,
      status: orders.status,
      fulfillment: orders.fulfillment,
      customerName: orders.customerName,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      zone: deliveryZones.name,
      courier: users.name,
    })
    .from(orders)
    .leftJoin(deliveryZones, eq(deliveryZones.id, orders.zoneId))
    .leftJoin(users, eq(users.id, orders.courierId))
    .where(where)
    .orderBy(tab === "aktif" ? sql`case ${orders.status} when 'new' then 0 else 1 end` : sql`1`, desc(orders.createdAt))
    .limit(200);

  return (
    <div>
      <PageHeader title="Siparişler" description="Online siparişler ve mağaza satışları tek listede." />
      <AutoRefresh seconds={tab === "aktif" ? 30 : 0} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1">
          {Object.entries(TABS).map(([k, v]) => (
            <Link key={k} href={`/panel/siparisler?durum=${k}`} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === k ? "bg-white shadow-sm" : "text-stone-600"}`}>
              {v}
            </Link>
          ))}
        </div>
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="durum" value={tab} />
          <input name="q" defaultValue={q} placeholder="No, ad veya telefon" className="input w-48" />
          <button className="btn-ghost">Ara</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={tab === "aktif" ? "Bekleyen sipariş yok" : "Kayıt yok"}>
          {tab === "aktif" && (
            <>
              Mağaza linkinizi müşterilerinizle WhatsApp’ta, Instagram’da paylaşın:{" "}
              <Link href={`/${me.tenant.slug}`} target="_blank" className="font-semibold text-brand-700 underline">
                pet.xshield.com.tr/{me.tenant.slug}
              </Link>
            </>
          )}
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>No</th>
                <th>Müşteri</th>
                <th className="hidden md:table-cell">Teslimat</th>
                <th>Durum</th>
                <th className="hidden sm:table-cell">Ödeme</th>
                <th className="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={`hover:bg-stone-50 ${o.status === "new" ? "bg-amber-50/60" : ""}`}>
                  <td>
                    <Link href={`/panel/siparisler/${o.id}`} className="font-mono font-semibold text-brand-700 hover:underline">
                      #{o.number}
                    </Link>
                    <span className="block text-xs whitespace-nowrap text-stone-500">{formatDateTime(o.createdAt)}</span>
                  </td>
                  <td>
                    <Link href={`/panel/siparisler/${o.id}`} className="font-medium">
                      {o.customerName ?? (o.channel === "pos" ? "Mağaza satışı" : "—")}
                    </Link>
                  </td>
                  <td className="hidden text-stone-600 md:table-cell">
                    {o.fulfillment === "delivery" ? `Adrese teslim${o.zone ? ` · ${o.zone}` : ""}` : o.fulfillment === "pickup" ? "Gel-al" : "Mağazada"}
                    {o.courier && <span className="block text-xs">Kurye: {o.courier}</span>}
                  </td>
                  <td>
                    <span className={`badge ${ORDER_STATUS_TONE[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span>
                  </td>
                  <td className="hidden text-stone-600 sm:table-cell">
                    {PAYMENT_LABELS[o.paymentMethod]}
                    {o.paymentStatus === "pending" && o.status !== "cancelled" && <span className="block text-xs text-amber-700">Ödeme bekleniyor</span>}
                  </td>
                  <td className="text-right font-semibold whitespace-nowrap tabular-nums">{formatTL(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
