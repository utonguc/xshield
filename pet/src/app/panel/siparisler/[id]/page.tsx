import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZones, memberships, orderEvents, orderItems, orders, users } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { displayPhone, formatDateTime, formatQty, formatTL, whatsappLink } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_LABELS } from "@/lib/labels";
import { allowedTransitions } from "@/lib/orders";
import { assignCourierAction, markPaidAction } from "../actions";
import { PrintButton } from "./print-button";
import { StatusButtons } from "./status-buttons";

export default async function OrderDetailPage({ params }: PageProps<"/panel/siparisler/[id]">) {
  const me = await requireMember();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = me.tenant.id;

  const [o] = await db
    .select({ order: orders, zone: deliveryZones.name })
    .from(orders)
    .leftJoin(deliveryZones, eq(deliveryZones.id, orders.zoneId))
    .where(and(eq(orders.id, id), eq(orders.tenantId, t)));
  if (!o) notFound();
  const order = o.order;

  const [items, events, couriers] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select({ id: orderEvents.id, status: orderEvents.status, note: orderEvents.note, createdAt: orderEvents.createdAt, user: users.name })
      .from(orderEvents)
      .leftJoin(users, eq(users.id, orderEvents.userId))
      .where(eq(orderEvents.orderId, id))
      .orderBy(asc(orderEvents.id)),
    db
      .select({ id: users.id, name: users.name, role: memberships.role })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.tenantId, t), eq(users.isActive, true)))
      .orderBy(asc(users.name)),
  ]);

  const next = allowedTransitions(order.status);
  const isOnline = order.channel === "online";
  const waText = `Merhaba ${order.customerName ?? ""}, ${me.tenant.name} siparişiniz (#${order.number}) hakkında yazıyoruz.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Link href="/panel/siparisler" className="text-sm text-stone-500 hover:text-ink">
            ← Siparişler
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight">
            {isOnline ? "Sipariş" : "Satış"} #{order.number}
            <span className={`badge text-sm ${ORDER_STATUS_TONE[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
          </h1>
          <p className="text-sm text-stone-500">
            {formatDateTime(order.createdAt)} · {isOnline ? "Online mağaza" : "Mağaza kasası"}
          </p>
        </div>
        <PrintButton />
      </div>

      {next.length > 0 && (
        <section className="card p-5 print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-stone-600">Siparişi ilerlet</h2>
          <StatusButtons orderId={order.id} next={next} fulfillment={order.fulfillment} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Ürün</th>
                <th className="text-right">Miktar</th>
                <th className="text-right">Birim</th>
                <th className="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.productName}
                    {i.variantName && <span className="text-stone-500"> · {i.variantName}</span>}
                  </td>
                  <td className="text-right tabular-nums">{formatQty(i.qty, i.unit)}</td>
                  <td className="text-right tabular-nums">{formatTL(i.unitPrice)}</td>
                  <td className="text-right font-medium tabular-nums">{formatTL(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="space-y-1 border-t border-stone-200 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">Ara toplam</dt>
              <dd className="tabular-nums">{formatTL(order.subtotal)}</dd>
            </div>
            {Number(order.deliveryFee) > 0 && (
              <div className="flex justify-between">
                <dt className="text-stone-600">Teslimat ücreti</dt>
                <dd className="tabular-nums">{formatTL(order.deliveryFee)}</dd>
              </div>
            )}
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-stone-600">İndirim</dt>
                <dd className="tabular-nums">−{formatTL(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-bold">
              <dt>Toplam</dt>
              <dd className="tabular-nums">{formatTL(order.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          {(order.customerName || order.customerPhone) && (
            <section className="card space-y-2 p-5 text-sm">
              <h2 className="font-semibold">Müşteri</h2>
              <p className="font-medium">{order.customerName}</p>
              {order.customerPhone && (
                <div className="flex flex-wrap gap-2 print:hidden">
                  <a href={`tel:0${order.customerPhone}`} className="btn-ghost btn-sm">
                    📞 {displayPhone(order.customerPhone)}
                  </a>
                  <a href={whatsappLink(order.customerPhone, waText)} target="_blank" rel="noopener" className="btn-ghost btn-sm">
                    WhatsApp
                  </a>
                </div>
              )}
              <p className="hidden print:block">{displayPhone(order.customerPhone)}</p>
              {order.fulfillment === "delivery" && (
                <div className="border-t border-stone-100 pt-2">
                  <p className="text-xs font-semibold text-stone-500 uppercase">Teslimat adresi {o.zone && `· ${o.zone}`}</p>
                  <p className="whitespace-pre-line">{order.address}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address ?? "")}`}
                    target="_blank"
                    rel="noopener"
                    className="text-xs font-medium text-brand-700 hover:underline print:hidden"
                  >
                    Haritada aç ↗
                  </a>
                </div>
              )}
              {order.fulfillment === "pickup" && <p className="rounded-lg bg-violet-50 px-3 py-2 text-violet-900">Müşteri mağazadan teslim alacak.</p>}
              {order.note && (
                <div className="border-t border-stone-100 pt-2">
                  <p className="text-xs font-semibold text-stone-500 uppercase">Sipariş notu</p>
                  <p className="whitespace-pre-line">{order.note}</p>
                </div>
              )}
            </section>
          )}

          <section className="card space-y-2 p-5 text-sm">
            <h2 className="font-semibold">Ödeme</h2>
            <p>{PAYMENT_LABELS[order.paymentMethod]}</p>
            {order.paymentStatus === "paid" ? (
              <span className="badge bg-emerald-50 text-emerald-800 ring-emerald-200">Ödendi</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="badge bg-amber-50 text-amber-900 ring-amber-200">Bekleniyor</span>
                {order.status !== "cancelled" && (
                  <form action={markPaidAction.bind(null, order.id)} className="print:hidden">
                    <button className="text-xs font-semibold text-brand-700 hover:underline">Ödendi olarak işaretle</button>
                  </form>
                )}
              </div>
            )}
          </section>

          {order.fulfillment === "delivery" && !["delivered", "cancelled"].includes(order.status) && (
            <section className="card p-5 text-sm print:hidden">
              <h2 className="mb-2 font-semibold">Kurye</h2>
              <form action={assignCourierAction.bind(null, order.id)} className="flex gap-2">
                <select name="courierId" defaultValue={order.courierId ?? ""} className="input">
                  <option value="">Atanmadı</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.role !== "courier" ? " (personel)" : ""}
                    </option>
                  ))}
                </select>
                <button className="btn-ghost">Ata</button>
              </form>
              {couriers.every((c) => c.role !== "courier") && (
                <p className="hint">
                  Kurye hesabı eklemek için{" "}
                  <Link href="/panel/ekip" className="underline">
                    Ekip
                  </Link>{" "}
                  sayfasına gidin. Kurye kendi telefonundan siparişi görüp “teslim edildi” işaretleyebilir.
                </p>
              )}
            </section>
          )}

          <section className="card p-5 text-sm print:hidden">
            <h2 className="mb-3 font-semibold">Geçmiş</h2>
            <ol className="space-y-3 border-l-2 border-stone-200 pl-4">
              {events.map((e, i) => {
                // Durumu değiştirmeyen olaylar (kurye ataması, ödeme) yalnızca notuyla gösterilir.
                const statusChanged = i === 0 || events[i - 1].status !== e.status;
                return (
                  <li key={e.id}>
                    <p className="font-medium">{statusChanged ? ORDER_STATUS_LABELS[e.status] : e.note}</p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(e.createdAt)}
                      {e.user && ` · ${e.user}`}
                    </p>
                    {statusChanged && e.note && <p className="text-xs text-stone-600">{e.note}</p>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
