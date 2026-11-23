import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZones, orderItems, orders, type OrderStatus } from "@/db/schema";
import { formatDateTime, formatQty, formatTL, whatsappLink } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS } from "@/lib/labels";
import { getStoreBySlug } from "@/lib/tenant";
import { AutoRefresh } from "@/app/panel/siparisler/auto-refresh";

export const metadata: Metadata = { title: "Sipariş takibi", robots: { index: false } };

export default async function OrderTrackingPage({ params }: PageProps<"/[store]/siparis/[code]">) {
  const { store: slug, code } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || !/^[A-Z2-9]{10}$/.test(code)) notFound();

  const [row] = await db
    .select({ o: orders, zone: deliveryZones.name })
    .from(orders)
    .leftJoin(deliveryZones, eq(deliveryZones.id, orders.zoneId))
    .where(and(eq(orders.code, code), eq(orders.tenantId, store.id), eq(orders.channel, "online")));
  if (!row) notFound();
  const o = row.o;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));

  const steps: OrderStatus[] = o.fulfillment === "pickup" ? ["new", "preparing", "ready", "delivered"] : ["new", "preparing", "on_the_way", "delivered"];
  const stepLabels: Partial<Record<OrderStatus, string>> = {
    new: "Alındı",
    preparing: "Hazırlanıyor",
    ready: "Teslime hazır",
    on_the_way: "Yolda",
    delivered: o.fulfillment === "pickup" ? "Teslim alındı" : "Teslim edildi",
  };
  const current = steps.indexOf(o.status);
  const cancelled = o.status === "cancelled";
  const live = !cancelled && o.status !== "delivered";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <AutoRefresh seconds={live ? 30 : 0} />
      <div className="rounded-3xl bg-white p-6 text-center ring-1 ring-stone-200 sm:p-8">
        <p className="text-4xl" aria-hidden>
          {cancelled ? "😿" : o.status === "delivered" ? "🎉" : "🐾"}
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {cancelled ? "Siparişiniz iptal edildi" : o.status === "new" ? "Siparişiniz alındı!" : ORDER_STATUS_LABELS[o.status]}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Sipariş no <span className="font-mono font-semibold">#{o.number}</span> · {formatDateTime(o.createdAt)}
        </p>
        <p className="mt-1 text-xs text-stone-500">Bu sayfanın bağlantısını saklayarak siparişinizi takip edebilirsiniz.</p>

        {!cancelled && (
          <ol className="mt-8 grid grid-cols-4 gap-1 text-xs">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-col items-center gap-2">
                <span className={`h-1.5 w-full rounded-full ${i <= current ? "bg-brand-500" : "bg-stone-200"}`} />
                <span className={i <= current ? "font-semibold text-ink" : "text-stone-400"}>{stepLabels[s]}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {o.paymentMethod === "bank_transfer" && o.paymentStatus === "pending" && !cancelled && store.iban && (
        <section className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm ring-1 ring-amber-200">
          <h2 className="font-semibold text-amber-900">Havale / EFT bilgileri</h2>
          <p className="mt-2">
            Lütfen <strong>{formatTL(o.total)}</strong> tutarını aşağıdaki hesaba gönderin, açıklamaya <strong>#{o.number}</strong> yazın.
          </p>
          <p className="mt-2 font-mono text-base font-semibold break-all">{store.iban.replace(/(.{4})/g, "$1 ").trim()}</p>
          {store.ibanHolder && <p>{store.ibanHolder}</p>}
        </section>
      )}

      <section className="mt-6 rounded-2xl bg-white ring-1 ring-stone-200">
        <ul className="divide-y divide-stone-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 px-5 py-3">
              <span>
                {i.productName}
                {i.variantName && <span className="text-stone-500"> · {i.variantName}</span>}
                <span className="text-stone-500"> × {formatQty(i.qty, i.unit === "kg" ? "kg" : null)}</span>
              </span>
              <span className="tabular-nums">{formatTL(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-stone-200 px-5 py-3 text-sm">
          {Number(o.deliveryFee) > 0 && (
            <div className="flex justify-between">
              <dt className="text-stone-600">Teslimat</dt>
              <dd className="tabular-nums">{formatTL(o.deliveryFee)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <dt>Toplam</dt>
            <dd className="tabular-nums">{formatTL(o.total)}</dd>
          </div>
          <div className="flex justify-between text-stone-600">
            <dt>Ödeme</dt>
            <dd>
              {PAYMENT_LABELS[o.paymentMethod]}
              {o.paymentStatus === "paid" && " · ödendi"}
            </dd>
          </div>
        </dl>
        <div className="border-t border-stone-200 px-5 py-3 text-sm text-stone-600">
          {o.fulfillment === "delivery" ? (
            <p>
              <span className="font-medium text-ink">Teslimat adresi{row.zone && ` (${row.zone})`}:</span> {o.address}
            </p>
          ) : (
            <p>
              <span className="font-medium text-ink">Mağazadan teslim alınacak:</span> {[store.address, store.district, store.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {store.whatsapp && (
          <a href={whatsappLink(store.whatsapp, `Merhaba, #${o.number} numaralı siparişim hakkında yazıyorum.`)} target="_blank" rel="noopener" className="btn-ghost">
            Mağazaya WhatsApp’tan yaz
          </a>
        )}
        <Link href={`/${store.slug}`} className="btn-primary">
          Alışverişe devam et
        </Link>
      </div>
    </main>
  );
}
