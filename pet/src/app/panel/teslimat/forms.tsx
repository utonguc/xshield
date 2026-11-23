"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { saveDeliverySettingsAction, saveZoneAction } from "./actions";

const s = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

export function DeliverySettingsForm({
  t,
}: {
  t: { deliveryEnabled: boolean; pickupEnabled: boolean; acceptingOrders: boolean; minOrderAmount: number };
}) {
  const [state, action] = useActionState(saveDeliverySettingsAction, undefined);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="font-semibold">Genel</h2>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="acceptingOrders" defaultChecked={t.acceptingOrders} className="mt-0.5" />
        <span>
          <span className="font-medium">Online sipariş alıyorum</span>
          <span className="block text-xs text-stone-500">Kapatırsanız vitrin açık kalır ama sipariş verilemez (tatil, yoğunluk vb.).</span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="deliveryEnabled" defaultChecked={t.deliveryEnabled} className="mt-0.5" />
        <span>
          <span className="font-medium">Adrese teslim</span>
          <span className="block text-xs text-stone-500">Kendi kuryenizle, aşağıda tanımladığınız bölgelere.</span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="pickupEnabled" defaultChecked={t.pickupEnabled} className="mt-0.5" />
        <span>
          <span className="font-medium">Gel-al</span>
          <span className="block text-xs text-stone-500">Müşteri siparişini mağazadan teslim alır.</span>
        </span>
      </label>
      <div className="max-w-xs">
        <label className="label" htmlFor="minOrderAmount">
          Genel minimum sipariş tutarı (₺)
        </label>
        <input id="minOrderAmount" name="minOrderAmount" inputMode="decimal" defaultValue={s(t.minOrderAmount)} className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Kaydet</SubmitButton>
    </form>
  );
}

export type ZoneDraft = {
  id: string | null;
  name: string;
  fee: number;
  minOrder: number;
  freeOver: number | null;
  etaText: string | null;
  isActive: boolean;
};

export function ZoneForm({ zone, onDone }: { zone: ZoneDraft; onDone?: () => void }) {
  const [state, action] = useActionState(saveZoneAction.bind(null, zone.id), undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (!zone.id) form.current?.reset();
      onDone?.();
    }
  }, [state, zone.id, onDone]);
  return (
    <form ref={form} action={action} className="grid gap-3 sm:grid-cols-12 sm:items-end">
      <div className="sm:col-span-3">
        <label className="label text-xs" htmlFor={`${zone.id ?? "new"}-zf1`}>Bölge / mahalle</label>
        <input id={`${zone.id ?? "new"}-zf1`} name="name" required defaultValue={zone.name} className="input" placeholder="Örn. Caferağa Mah." />
      </div>
      <div className="sm:col-span-2">
        <label className="label text-xs" htmlFor={`${zone.id ?? "new"}-zf2`}>Teslimat ücreti ₺</label>
        <input id={`${zone.id ?? "new"}-zf2`} name="fee" inputMode="decimal" defaultValue={s(zone.fee)} className="input" placeholder="0" />
      </div>
      <div className="sm:col-span-2">
        <label className="label text-xs" htmlFor={`${zone.id ?? "new"}-zf3`}>Min. sipariş ₺</label>
        <input id={`${zone.id ?? "new"}-zf3`} name="minOrder" inputMode="decimal" defaultValue={s(zone.minOrder)} className="input" placeholder="0" />
      </div>
      <div className="sm:col-span-2">
        <label className="label text-xs" htmlFor={`${zone.id ?? "new"}-zf4`}>Şu tutar üstü ücretsiz</label>
        <input id={`${zone.id ?? "new"}-zf4`} name="freeOver" inputMode="decimal" defaultValue={s(zone.freeOver)} className="input" placeholder="—" />
      </div>
      <div className="sm:col-span-2">
        <label className="label text-xs" htmlFor={`${zone.id ?? "new"}-zf5`}>Teslim süresi</label>
        <input id={`${zone.id ?? "new"}-zf5`} name="etaText" defaultValue={zone.etaText ?? ""} className="input" placeholder="30-60 dk" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-1">
        <label className="flex items-center gap-1.5 text-xs" title="Aktif">
          <input type="checkbox" name="isActive" defaultChecked={zone.isActive} />
          Aktif
        </label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-12">
        <SubmitButton className="btn-primary btn-sm">{zone.id ? "Güncelle" : "Bölge ekle"}</SubmitButton>
        {state?.error && <span className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
