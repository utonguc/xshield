import type { Metadata } from "next";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZones, orderItems, orders } from "@/db/schema";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { AutoRefresh } from "@/app/panel/siparisler/auto-refresh";
import { requireMember } from "@/lib/auth";
import { displayPhone, formatDateTime, formatQty, formatTL, whatsappLink } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_LABELS } from "@/lib/labels";
import { CourierButtons } from "./courier-buttons";

export const metadata: Metadata = { title: "Teslimatlarım — xShield Pet" };

export default async function CourierPage() {
  const me = await requireMember(["courier", "owner", "staff"]);
  const mine = and(eq(orders.tenantId, me.tenant.id), eq(orders.courierId, me.user.id));

  const [active, doneToday] = await Promise.all([
    db
      .select({ o: orders, zone: deliveryZones.name })
      .from(orders)
      .leftJoin(deliveryZones, eq(deliveryZones.id, orders.zoneId))
      .where(and(mine, inArray(orders.status, ["new", "preparing", "ready", "on_the_way"])))
      .orderBy(orders.createdAt),
    db
      .select({ id: orders.id, number: orders.number, total: orders.total, paymentMethod: orders.paymentMethod, customerName: orders.customerName })
      .from(orders)
      .where(
        and(
          mine,
          eq(orders.status, "delivered"),
          sql`(${orders.updatedAt} at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date`,
        ),
      )
      .orderBy(desc(orders.updatedAt)),
  ]);
  const items = active.length
    ? await db
        .select()
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            active.map((a) => a.o.id),
          ),
        )
    : [];
  const cashToday = doneToday.filter((d) => d.paymentMethod === "cash_on_delivery").reduce((s, d) => s + Number(d.total), 0);

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-4">
      <AutoRefresh seconds={30} />
      <header className="mb-4 flex items-center justify-between">
        <Logo href="/kurye" />
        <form action={logoutAction}>
          <button className="text-sm font-medium text-stone-600">Çıkış</button>
        </form>
      </header>
      <h1 className="text-xl font-bold">Merhaba {me.user.name.split(" ")[0]} 👋</h1>
      <p className="text-sm text-stone-600">{me.tenant.name} · Size atanan teslimatlar</p>

      <div className="mt-4 space-y-4">
        {active.length === 0 && <p className="card px-5 py-10 text-center text-sm text-stone-500">Şu an size atanmış teslimat yok.</p>}
        {active.map(({ o, zone }) => {
          const collect = o.paymentStatus === "pending" && o.paymentMethod !== "bank_transfer" ? `${formatTL(o.total)} (${PAYMENT_LABELS[o.paymentMethod]})` : null;
          return (
            <article key={o.id} className="card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono font-bold">#{o.number}</p>
                <span className={`badge ${ORDER_STATUS_TONE[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span>
              </div>
              <div>
                <p className="font-semibold">{o.customerName}</p>
                <p className="text-sm whitespace-pre-line text-stone-700">
                  {zone && <span className="font-medium">{zone} · </span>}
                  {o.address}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn-ghost btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address ?? "")}`} target="_blank" rel="noopener">
                  🗺 Yol tarifi
                </a>
                {o.customerPhone && (
                  <>
                    <a className="btn-ghost btn-sm" href={`tel:0${o.customerPhone}`}>
                      📞 {displayPhone(o.customerPhone)}
                    </a>
                    <a className="btn-ghost btn-sm" href={whatsappLink(o.customerPhone)} target="_blank" rel="noopener">
                      WhatsApp
                    </a>
                  </>
                )}
              </div>
              <ul className="rounded-xl bg-stone-50 px-3 py-2 text-sm">
                {items
                  .filter((i) => i.orderId === o.id)
                  .map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span>
                        {i.productName}
                        {i.variantName && ` · ${i.variantName}`}
                      </span>
                      <span className="tabular-nums">{formatQty(i.qty, i.unit)}</span>
                    </li>
                  ))}
              </ul>
              {o.note && <p className="text-sm text-stone-600">Not: {o.note}</p>}
              <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${collect ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
                {collect ? `Tahsil edilecek: ${collect}` : "Ödeme alınmış — tahsilat yok"}
              </p>
              <p className="text-xs text-stone-500">Sipariş zamanı: {formatDateTime(o.createdAt)}</p>
              <CourierButtons orderId={o.id} status={o.status} collect={collect} />
            </article>
          );
        })}
      </div>

      {doneToday.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-stone-600">Bugün teslim ettikleriniz ({doneToday.length})</h2>
          <ul className="card divide-y divide-stone-100 text-sm">
            {doneToday.map((d) => (
              <li key={d.id} className="flex justify-between px-4 py-2">
                <span>
                  #{d.number} · {d.customerName}
                </span>
                <span className="tabular-nums">{formatTL(d.total)}</span>
              </li>
            ))}
          </ul>
          {cashToday > 0 && <p className="mt-2 text-sm font-semibold">Mağazaya teslim edilecek nakit: {formatTL(cashToday)}</p>}
        </section>
      )}
    </div>
  );
}
