import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZones, tenants } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { formatTL } from "@/lib/format";
import { deleteZoneAction } from "./actions";
import { DeliverySettingsForm, ZoneForm } from "./forms";

export default async function DeliveryPage() {
  const me = await requireMember(["owner"]);
  const [[t], zones] = await Promise.all([
    db
      .select({
        deliveryEnabled: tenants.deliveryEnabled,
        pickupEnabled: tenants.pickupEnabled,
        acceptingOrders: tenants.acceptingOrders,
        minOrderAmount: tenants.minOrderAmount,
      })
      .from(tenants)
      .where(eq(tenants.id, me.tenant.id)),
    db.select().from(deliveryZones).where(eq(deliveryZones.tenantId, me.tenant.id)).orderBy(asc(deliveryZones.sort), asc(deliveryZones.name)),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Teslimat" description="Kendi kuryenizle hangi bölgelere, hangi ücretle teslimat yaptığınızı belirleyin." />
      <DeliverySettingsForm t={t} />

      <section className="card p-5">
        <h2 className="font-semibold">Teslimat bölgeleri</h2>
        <p className="mb-4 text-sm text-stone-600">Müşteri sipariş verirken bölgesini seçer; ücret ve minimum tutar buna göre hesaplanır.</p>
        <div className="space-y-4">
          {zones.map((z) => (
            <details key={z.id} className="group rounded-xl ring-1 ring-stone-200">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{z.name}</span>
                {!z.isActive && <span className="badge bg-stone-100 text-stone-600 ring-stone-200">Pasif</span>}
                <span className="text-stone-500">
                  Ücret: {Number(z.fee) ? formatTL(z.fee) : "Ücretsiz"}
                  {Number(z.minOrder) > 0 && ` · Min. ${formatTL(z.minOrder)}`}
                  {z.freeOver != null && ` · ${formatTL(z.freeOver)} üstü ücretsiz`}
                  {z.etaText && ` · ${z.etaText}`}
                </span>
                <span className="ml-auto text-xs font-medium text-brand-700 group-open:hidden">Düzenle</span>
              </summary>
              <div className="space-y-3 border-t border-stone-100 p-4">
                <ZoneForm zone={{ ...z, fee: Number(z.fee), minOrder: Number(z.minOrder), freeOver: z.freeOver == null ? null : Number(z.freeOver) }} />
                <form action={deleteZoneAction.bind(null, z.id)}>
                  <button className="text-xs font-medium text-red-700 hover:underline">Bölgeyi sil</button>
                </form>
              </div>
            </details>
          ))}
          <div className="rounded-xl bg-stone-50 p-4">
            <p className="mb-3 text-sm font-semibold">Yeni bölge</p>
            <ZoneForm zone={{ id: null, name: "", fee: 0, minOrder: 0, freeOver: null, etaText: null, isActive: true }} />
          </div>
        </div>
      </section>
    </div>
  );
}
