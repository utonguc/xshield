import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PaymentMethod } from "@/db/schema";
import { getLegalKinds, getZones } from "@/lib/storefront";
import { getStoreBase, getStoreBySlug } from "@/lib/tenant";
import { Checkout } from "./checkout";

export const metadata: Metadata = { title: "Sepet", robots: { index: false } };

export default async function CartPage({ params }: PageProps<"/[store]/sepet">) {
  const store = await getStoreBySlug((await params).store);
  if (!store) notFound();
  const [zones, legal] = await Promise.all([getZones(store.id), getLegalKinds(store.id)]);
  const payments: PaymentMethod[] = [];
  if (store.payCashOnDelivery) payments.push("cash_on_delivery");
  if (store.payCardOnDelivery) payments.push("card_on_delivery");
  if (store.payBankTransfer) payments.push("bank_transfer");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Sepet ve sipariş</h1>
      <Checkout
        cfg={{
          slug: store.slug,
          base: await getStoreBase(store.slug),
          acceptingOrders: store.acceptingOrders,
          deliveryEnabled: store.deliveryEnabled,
          pickupEnabled: store.pickupEnabled,
          minOrderAmount: Number(store.minOrderAmount),
          zones,
          payments,
          legal,
          orderNote: store.orderNote,
          pickupAddress: [store.address, store.district, store.city].filter(Boolean).join(", ") || null,
        }}
      />
    </main>
  );
}
