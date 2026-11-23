import Link from "next/link";
import { and, asc, count, desc, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZones, legalPages, orders, products, stockBatches, variants } from "@/db/schema";
import { Stat } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { getStoreUrl } from "@/lib/tenant";
import { formatDate, formatDateTime, formatQty, formatTL } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/labels";

const TODAY = sql`(now() at time zone 'Europe/Istanbul')::date`;

export default async function DashboardPage({ searchParams }: PageProps<"/panel">) {
  const me = await requireMember();
  const t = me.tenant.id;
  const welcome = (await searchParams).hosgeldin === "1";
  const storeUrl = await getStoreUrl(t, me.tenant.slug);

  const [[today], [month], active, lowStock, expiring, [setup]] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${orders.total}), 0)`,
        n: count(),
        online: sql<number>`count(*) filter (where ${orders.channel} = 'online')::int`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, t), ne(orders.status, "cancelled"), sql`(${orders.createdAt} at time zone 'Europe/Istanbul')::date = ${TODAY}`)),
    db
      .select({ total: sql<string>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, t),
          ne(orders.status, "cancelled"),
          sql`date_trunc('month', ${orders.createdAt} at time zone 'Europe/Istanbul') = date_trunc('month', now() at time zone 'Europe/Istanbul')`,
        ),
      ),
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        total: orders.total,
        customerName: orders.customerName,
        fulfillment: orders.fulfillment,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, t), inArray(orders.status, ["new", "preparing", "ready", "on_the_way"])))
      .orderBy(desc(orders.createdAt))
      .limit(6),
    db
      .select({ id: variants.id, productId: products.id, name: products.name, variant: variants.name, qty: variants.stockQty, unit: variants.unit })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(variants.tenantId, t), eq(variants.isActive, true), lte(variants.stockQty, variants.lowStockThreshold)))
      .orderBy(asc(variants.stockQty))
      .limit(8),
    db
      .select({
        id: stockBatches.id,
        productId: products.id,
        name: products.name,
        variant: variants.name,
        expiry: stockBatches.expiryDate,
        qty: stockBatches.qtyRemaining,
        unit: variants.unit,
      })
      .from(stockBatches)
      .innerJoin(variants, eq(variants.id, stockBatches.variantId))
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(stockBatches.tenantId, t), gt(stockBatches.qtyRemaining, 0), sql`${stockBatches.expiryDate} <= ${TODAY} + 30`))
      .orderBy(asc(stockBatches.expiryDate))
      .limit(8),
    db
      .select({
        products: sql<number>`(select count(*) from ${products} where ${products.tenantId} = ${t})::int`,
        zones: sql<number>`(select count(*) from ${deliveryZones} where ${deliveryZones.tenantId} = ${t})::int`,
        legal: sql<number>`(select count(*) from ${legalPages} where ${legalPages.tenantId} = ${t})::int`,
      })
      .from(sql`(select 1) as x`),
  ]);

  const steps = [
    { done: setup.products > 0, label: "İlk ürününüzü ekleyin", href: "/panel/urunler/yeni" },
    { done: setup.zones > 0, label: "Teslimat bölgelerinizi tanımlayın", href: "/panel/teslimat" },
    { done: setup.legal > 0, label: "KVKK ve satış sözleşmesi metinlerinizi ekleyin", href: "/panel/ayarlar/yasal" },
  ];
  const showSetup = steps.some((s) => !s.done);
  const today_ = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{welcome ? `Hoş geldiniz, ${me.user.name.split(" ")[0]}!` : "Özet"}</h1>
        <p className="mt-1 text-sm text-stone-600">{me.tenant.name} mağazanızda bugün neler oluyor?</p>
      </div>

      {showSetup && me.role === "owner" && (
        <section className="card overflow-hidden">
          <div className="bg-brand-50 px-5 py-4">
            <h2 className="font-semibold text-brand-900">Mağazanızı hazırlayın</h2>
            <p className="text-sm text-brand-800">
              Mağaza adresiniz:{" "}
              <Link href={storeUrl.href} target="_blank" className="font-semibold underline">
                {storeUrl.label}
              </Link>
            </p>
          </div>
          <ol className="divide-y divide-stone-100">
            {steps.map((s, i) => (
              <li key={s.href}>
                <Link href={s.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-stone-50">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      s.done ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {s.done ? "✓" : i + 1}
                  </span>
                  <span className={s.done ? "text-stone-400 line-through" : "font-medium"}>{s.label}</span>
                  {!s.done && <span className="ml-auto text-brand-700">→</span>}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bugünkü satış" value={formatTL(today.total)} hint={`${today.n} işlem`} />
        <Stat label="Bugünkü online sipariş" value={today.online} />
        <Stat label="Bu ay toplam" value={formatTL(month.total)} />
        <Stat label="Bekleyen sipariş" value={active.length} hint={active.length ? "Hazırlanmayı bekliyor" : "Hepsi tamam"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <header className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold">Açık siparişler</h2>
            <Link href="/panel/siparisler" className="text-sm font-medium text-brand-700 hover:underline">
              Tümü
            </Link>
          </header>
          {active.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-stone-500">Bekleyen online sipariş yok.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {active.map((o) => (
                <li key={o.id}>
                  <Link href={`/panel/siparisler/${o.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-stone-50">
                    <span className="font-mono text-xs text-stone-500">#{o.number}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{o.customerName}</span>
                    <span className={`badge ${ORDER_STATUS_TONE[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span>
                    <span className="w-20 text-right tabular-nums">{formatTL(o.total)}</span>
                  </Link>
                  <p className="-mt-2 px-5 pb-2 pl-14 text-xs text-stone-500">
                    {o.fulfillment === "pickup" ? "Gel-al" : "Adrese teslim"} · {formatDateTime(o.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <header className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold">Azalan stok</h2>
            <Link href="/panel/stok?filtre=azalan" className="text-sm font-medium text-brand-700 hover:underline">
              Tümü
            </Link>
          </header>
          {lowStock.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-stone-500">Kritik seviyede ürün yok.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {lowStock.map((v) => (
                <li key={v.id}>
                  <Link href={`/panel/urunler/${v.productId}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-stone-50">
                    <span className="min-w-0 flex-1 truncate">
                      {v.name}
                      {v.variant && <span className="text-stone-500"> · {v.variant}</span>}
                    </span>
                    <span className={`font-semibold tabular-nums ${Number(v.qty) <= 0 ? "text-red-700" : "text-amber-700"}`}>
                      {formatQty(v.qty, v.unit)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-2">
          <header className="px-5 py-4">
            <h2 className="font-semibold">Son kullanma tarihi yaklaşanlar (30 gün)</h2>
            <p className="text-xs text-stone-500">Mal kabulde SKT girdiğiniz partiler. İndirime alıp öne çıkarmayı düşünebilirsiniz.</p>
          </header>
          {expiring.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-stone-500">Yakın zamanda SKT’si dolacak parti yok.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {expiring.map((b) => {
                const expired = b.expiry! < today_;
                return (
                  <li key={b.id}>
                    <Link href={`/panel/urunler/${b.productId}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-stone-50">
                      <span className="min-w-0 flex-1 truncate">
                        {b.name}
                        {b.variant && <span className="text-stone-500"> · {b.variant}</span>}
                      </span>
                      <span className="text-stone-500 tabular-nums">{formatQty(b.qty, b.unit)}</span>
                      <span className={`badge ${expired ? "bg-red-100 text-red-800 ring-red-200" : "bg-amber-100 text-amber-900 ring-amber-200"}`}>
                        {expired ? "SKT geçti" : "SKT"} {formatDate(b.expiry!)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
