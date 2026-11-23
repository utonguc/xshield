"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { LegalKind, PaymentMethod } from "@/db/schema";
import { PawIcon } from "@/components/logo";
import { formatQty, formatTL } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/labels";
import type { QuotedVariant, Zone } from "@/lib/storefront";
import { placeOrderAction, quoteCartAction } from "../actions";
import { useCart } from "../cart";

export type CheckoutConfig = {
  slug: string;
  acceptingOrders: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  minOrderAmount: number;
  zones: Zone[];
  payments: PaymentMethod[];
  legal: LegalKind[];
  orderNote: string | null;
  pickupAddress: string | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function Checkout({ cfg }: { cfg: CheckoutConfig }) {
  const router = useRouter();
  const cart = useCart();
  const [quotes, setQuotes] = useState<Map<string, QuotedVariant> | null>(null);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(cfg.deliveryEnabled ? "delivery" : "pickup");
  const [zoneId, setZoneId] = useState(cfg.zones.length === 1 ? cfg.zones[0].id : "");
  const [payment, setPayment] = useState<PaymentMethod>(cfg.payments[0]);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const idsKey = cart.items.map((i) => i.variantId).sort().join(",");
  useEffect(() => {
    if (!cart.ready) return;
    let alive = true;
    quoteCartAction(cfg.slug, idsKey ? idsKey.split(",") : []).then((rows) => alive && setQuotes(new Map(rows.map((r) => [r.id, r]))));
    return () => {
      alive = false;
    };
  }, [cart.ready, idsKey, cfg.slug]);

  const lines = useMemo(
    () =>
      cart.items.map((i) => {
        const q = quotes?.get(i.variantId);
        return { ...i, q, lineTotal: q ? r2(q.price * i.qty) : 0, short: q ? i.qty > q.stockQty : false };
      }),
    [cart.items, quotes],
  );
  const subtotal = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const zone = cfg.zones.find((z) => z.id === zoneId) ?? null;
  const fee = fulfillment === "delivery" && zone ? (zone.freeOver != null && subtotal >= zone.freeOver ? 0 : zone.fee) : 0;
  const minOrder = Math.max(cfg.minOrderAmount, fulfillment === "delivery" && zone ? zone.minOrder : 0);
  const total = r2(subtotal + fee);
  const unavailable = lines.some((l) => quotes && !l.q);
  const short = lines.some((l) => l.short);
  const needsTerms = cfg.legal.includes("mesafeli-satis") || cfg.legal.includes("on-bilgilendirme");
  const payments = cfg.payments;

  if (!cart.ready || (cart.items.length > 0 && !quotes))
    return <p className="py-20 text-center text-stone-500">Sepetiniz yükleniyor…</p>;

  if (cart.items.length === 0)
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <PawIcon className="size-16 text-stone-300" />
        <p className="mt-4 text-lg font-semibold">Sepetiniz boş</p>
        <Link href={`/${cfg.slug}`} className="btn-primary mt-6">
          Alışverişe başla
        </Link>
      </div>
    );

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await placeOrderAction(cfg.slug, {
        items: cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        fulfillment,
        zoneId: fulfillment === "delivery" && zoneId ? zoneId : null,
        name: form.name,
        phone: form.phone,
        address: fulfillment === "delivery" ? form.address : undefined,
        note: form.note || undefined,
        paymentMethod: payment,
        acceptedTerms: accepted,
        website: String(fd.get("website") ?? ""),
      });
      if (r.ok) {
        cart.clear();
        router.push(`/${cfg.slug}/siparis/${r.code}`);
      } else {
        setError(r.error);
        quoteCartAction(cfg.slug, cart.items.map((i) => i.variantId)).then((rows) => setQuotes(new Map(rows.map((x) => [x.id, x]))));
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <section className="rounded-2xl bg-white ring-1 ring-stone-200">
          <h2 className="px-5 pt-4 font-semibold">Sepetiniz</h2>
          <ul className="divide-y divide-stone-100">
            {lines.map((l) => (
              <li key={l.variantId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{l.q ? `${l.q.productName}${l.q.variantName ? ` · ${l.q.variantName}` : ""}` : l.name}</p>
                  {!l.q && <p className="text-xs text-red-700">Bu ürün artık satışta değil, lütfen sepetten çıkarın.</p>}
                  {l.short && <p className="text-xs text-red-700">Stokta yalnızca {formatQty(l.q!.stockQty, l.unit)} var.</p>}
                  {l.q && <p className="text-xs text-stone-500">{formatTL(l.q.price)}{l.unit === "kg" ? " / kg" : ""}</p>}
                </div>
                <div className="flex items-center rounded-xl ring-1 ring-stone-300">
                  <button
                    type="button"
                    className="px-3 py-1.5"
                    aria-label="Azalt"
                    onClick={() => cart.setQty(l.variantId, Math.round((l.qty - (l.unit === "kg" ? 0.5 : 1)) * 10) / 10)}
                  >
                    −
                  </button>
                  <span className="min-w-12 text-center text-sm font-semibold tabular-nums">{formatQty(l.qty, l.unit === "kg" ? "kg" : null)}</span>
                  <button type="button" className="px-3 py-1.5" aria-label="Artır" onClick={() => cart.setQty(l.variantId, Math.round((l.qty + (l.unit === "kg" ? 0.5 : 1)) * 10) / 10)}>
                    +
                  </button>
                </div>
                <span className="w-24 text-right font-semibold tabular-nums">{formatTL(l.lineTotal)}</span>
                <button type="button" onClick={() => cart.remove(l.variantId)} className="text-stone-400 hover:text-red-700" aria-label="Sepetten çıkar">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-semibold">Teslimat</h2>
          {cfg.deliveryEnabled && cfg.pickupEnabled && (
            <div className="grid grid-cols-2 gap-2">
              {(["delivery", "pickup"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFulfillment(f)}
                  className={`rounded-xl px-4 py-3 text-left text-sm ring-1 ${fulfillment === f ? "bg-brand-50 font-semibold ring-2 ring-brand-500" : "ring-stone-300"}`}
                >
                  {f === "delivery" ? "🛵 Adresime gelsin" : "🏪 Mağazadan alacağım"}
                </button>
              ))}
            </div>
          )}
          {fulfillment === "pickup" && cfg.pickupAddress && <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm">Teslim alma adresi: {cfg.pickupAddress}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Ad soyad
              </label>
              <input id="name" required autoComplete="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Cep telefonu
              </label>
              <input
                id="phone"
                required
                type="tel"
                autoComplete="tel"
                placeholder="05XX XXX XX XX"
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          {fulfillment === "delivery" && (
            <>
              {cfg.zones.length > 0 && (
                <div>
                  <label className="label" htmlFor="zone">
                    Teslimat bölgesi
                  </label>
                  <select id="zone" required className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                    <option value="">Bölgenizi seçin</option>
                    {cfg.zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {z.fee ? formatTL(z.fee) : "ücretsiz"}
                        {z.etaText ? ` · ${z.etaText}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="hint">Bölgeniz listede yoksa mağazayı arayarak teslimat yapılıp yapılamayacağını sorabilirsiniz.</p>
                </div>
              )}
              <div>
                <label className="label" htmlFor="address">
                  Açık adres
                </label>
                <textarea
                  id="address"
                  required
                  minLength={10}
                  rows={3}
                  autoComplete="street-address"
                  className="input"
                  placeholder="Mahalle, sokak, bina no, daire no, tarif"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="note">
              Sipariş notu <span className="font-normal text-stone-400">(isteğe bağlı)</span>
            </label>
            <input id="note" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Örn. Zili çalmayın, kapıya bırakın" />
          </div>
          {/* Botlar için görünmez tuzak alan */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h2 className="font-semibold">Ödeme</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {payments.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPayment(p)}
                className={`rounded-xl px-4 py-3 text-left text-sm ring-1 ${payment === p ? "bg-brand-50 font-semibold ring-2 ring-brand-500" : "ring-stone-300"}`}
              >
                {fulfillment === "pickup" && p === "cash_on_delivery" ? "Mağazada nakit" : fulfillment === "pickup" && p === "card_on_delivery" ? "Mağazada kartla" : PAYMENT_LABELS[p]}
              </button>
            ))}
          </div>
          {payment === "bank_transfer" && <p className="text-sm text-stone-600">IBAN bilgisi sipariş onay sayfasında gösterilecek.</p>}
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200 lg:sticky lg:top-24">
        <h2 className="font-semibold">Sipariş özeti</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-600">Ürünler</dt>
            <dd className="tabular-nums">{formatTL(subtotal)}</dd>
          </div>
          {fulfillment === "delivery" && (
            <div className="flex justify-between">
              <dt className="text-stone-600">Teslimat</dt>
              <dd className="tabular-nums">{zone || !cfg.zones.length ? (fee ? formatTL(fee) : "Ücretsiz") : "Bölge seçin"}</dd>
            </div>
          )}
          {zone?.freeOver != null && subtotal < zone.freeOver && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{formatTL(zone.freeOver - subtotal)} daha ekleyin, teslimat ücretsiz olsun.</p>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-2 text-lg font-bold">
            <dt>Toplam</dt>
            <dd className="tabular-nums">{formatTL(total)}</dd>
          </div>
        </dl>
        {cfg.orderNote && <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600">{cfg.orderNote}</p>}
        {needsTerms && (
          <label className="flex items-start gap-2 text-xs text-stone-600">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" required />
            <span>
              {cfg.legal.includes("on-bilgilendirme") && (
                <>
                  <Link href={`/${cfg.slug}/sayfa/on-bilgilendirme`} target="_blank" className="underline">
                    Ön Bilgilendirme Formu
                  </Link>
                  {cfg.legal.includes("mesafeli-satis") && " ve "}
                </>
              )}
              {cfg.legal.includes("mesafeli-satis") && (
                <Link href={`/${cfg.slug}/sayfa/mesafeli-satis`} target="_blank" className="underline">
                  Mesafeli Satış Sözleşmesi
                </Link>
              )}
              ’ni okudum, onaylıyorum.
            </span>
          </label>
        )}
        {cfg.legal.includes("kvkk") && (
          <p className="text-xs text-stone-500">
            Kişisel verileriniz{" "}
            <Link href={`/${cfg.slug}/sayfa/kvkk`} target="_blank" className="underline">
              KVKK Aydınlatma Metni
            </Link>{" "}
            kapsamında işlenir.
          </p>
        )}
        {subtotal < minOrder && <p className="text-sm text-amber-800">Minimum sipariş tutarı {formatTL(minOrder)}.</p>}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">{error}</p>}
        <button type="submit" disabled={pending || !cfg.acceptingOrders || unavailable || short || subtotal < minOrder} className="btn-primary w-full py-3.5 text-base">
          {pending ? "Sipariş gönderiliyor…" : cfg.acceptingOrders ? `Siparişi tamamla · ${formatTL(total)}` : "Şu an sipariş alınmıyor"}
        </button>
      </aside>
    </form>
  );
}
