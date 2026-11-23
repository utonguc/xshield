"use client";

import { useActionState } from "react";
import type { LegalKind } from "@/db/schema";
import { FormMessage, SubmitButton } from "@/components/form";
import { ImagePicker } from "@/components/image-picker";
import { LEGAL_LABELS } from "@/lib/labels";
import { saveLegalAction, saveStoreSettingsAction } from "./actions";

type StoreSettings = {
  name: string;
  tagline: string | null;
  about: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  workingHours: string | null;
  logoUrl: string | null;
  payCashOnDelivery: boolean;
  payCardOnDelivery: boolean;
  payBankTransfer: boolean;
  iban: string | null;
  ibanHolder: string | null;
  orderNote: string | null;
  companyTitle: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
};

const phone = (p: string | null) => (p ? `0${p}` : "");

function Field({ label, name, def, hint, ...rest }: { label: string; name: string; def?: string | null; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} defaultValue={def ?? ""} className="input" {...rest} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function StoreSettingsForm({ s }: { s: StoreSettings }) {
  const [state, action] = useActionState(saveStoreSettingsAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Mağaza bilgileri</h2>
        <div className="sm:col-span-2">
          <ImagePicker name="logo" current={s.logoUrl} label="Logo" />
        </div>
        <Field label="Mağaza adı" name="name" def={s.name} required />
        <Field label="Kısa slogan" name="tagline" def={s.tagline} placeholder="Örn. Kadıköy’ün mahalle petshopu" />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="about">
            Hakkımızda
          </label>
          <textarea id="about" name="about" rows={3} defaultValue={s.about ?? ""} className="input" />
        </div>
        <Field label="Telefon" name="phone" def={phone(s.phone)} type="tel" />
        <Field label="WhatsApp" name="whatsapp" def={phone(s.whatsapp)} type="tel" hint="Müşteriler vitrinden size WhatsApp’tan yazabilir." />
        <Field label="E-posta" name="email" def={s.email} type="email" />
        <Field label="Çalışma saatleri" name="workingHours" def={s.workingHours} placeholder="Hafta içi 09:00-21:00, Pazar 11:00-19:00" />
        <div className="sm:col-span-2">
          <Field label="Adres" name="address" def={s.address} />
        </div>
        <Field label="İl" name="city" def={s.city} />
        <Field label="İlçe" name="district" def={s.district} />
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Ödeme yöntemleri</h2>
          <p className="text-sm text-stone-600">
            Online kart ödemesi için sanal POS entegrasyonunuzu kendiniz yapacağınız için, şimdilik kapıda ve havale ile ödeme alınır.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="payCashOnDelivery" defaultChecked={s.payCashOnDelivery} /> Kapıda nakit
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="payCardOnDelivery" defaultChecked={s.payCardOnDelivery} /> Kapıda kredi kartı (kuryenin mobil POS’u ile)
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="payBankTransfer" defaultChecked={s.payBankTransfer} /> Havale / EFT
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="IBAN" name="iban" def={s.iban} placeholder="TR00 0000 0000 0000 0000 0000 00" />
          <Field label="Hesap sahibi" name="ibanHolder" def={s.ibanHolder} />
        </div>
        <div>
          <label className="label" htmlFor="orderNote">
            Sipariş sayfasında gösterilecek not
          </label>
          <textarea id="orderNote" name="orderNote" rows={2} defaultValue={s.orderNote ?? ""} className="input" placeholder="Örn. 18:00’den sonraki siparişler ertesi gün teslim edilir." />
        </div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <h2 className="font-semibold">Satıcı bilgileri</h2>
          <p className="text-sm text-stone-600">Mesafeli satış sözleşmesi ve vitrin altbilgisinde gösterilir. Faturalarınızı kendi e-fatura sisteminizden kesersiniz.</p>
        </div>
        <Field label="Ünvan" name="companyTitle" def={s.companyTitle} />
        <Field label="Vergi dairesi" name="taxOffice" def={s.taxOffice} />
        <Field label="Vergi / TC kimlik no" name="taxNumber" def={s.taxNumber} />
      </section>

      <div className="flex items-center gap-4">
        <SubmitButton>Kaydet</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function LegalForm({ bodies }: { bodies: Partial<Record<LegalKind, string>> }) {
  const [state, action] = useActionState(saveLegalAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
        Bu metinler mağazanızın altbilgisinde ve sipariş ekranında müşterilerinize gösterilir. Metinlerin içeriği ve hukuki uygunluğu mağaza sahibinin
        sorumluluğundadır; gerekirse bir hukukçuya danışın. Boş bıraktığınız metin vitrinde gösterilmez.
      </p>
      {(Object.keys(LEGAL_LABELS) as LegalKind[]).map((k) => (
        <section key={k} className="card p-5">
          <label className="label text-base font-semibold" htmlFor={k}>
            {LEGAL_LABELS[k]}
          </label>
          <textarea id={k} name={k} rows={8} defaultValue={bodies[k] ?? ""} className="input font-mono text-xs leading-relaxed" />
        </section>
      ))}
      <div className="flex items-center gap-4">
        <SubmitButton>Kaydet</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
