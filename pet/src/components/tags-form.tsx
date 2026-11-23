"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, type FormState } from "./form";

/** GA4 + Search Console etiket formu (platform yönetimi ve mağaza paneli ortak kullanır). */
export function TagsForm({
  action,
  ga,
  gsc,
  siteUrl,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  ga: string | null;
  gsc: string | null;
  siteUrl: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="label" htmlFor="ga">
          Google Analytics (GA4) ölçüm kimliği
        </label>
        <input id="ga" name="ga" defaultValue={ga ?? ""} className="input max-w-md font-mono" placeholder="G-XXXXXXXXXX" autoComplete="off" spellCheck={false} />
        <p className="hint">
          Analytics → Yönetici → Veri akışları → Web akışı → “Ölçüm kimliği”. Google’ın verdiği gtag kodunun tamamını da yapıştırabilirsiniz; kimlik
          otomatik ayıklanır. Ziyaretçi çerez çubuğunda onay verene kadar Analytics çerez kullanmaz (KVKK).
        </p>
      </div>
      <div>
        <label className="label" htmlFor="gsc">
          Google Search Console doğrulama kodu
        </label>
        <input
          id="gsc"
          name="gsc"
          defaultValue={gsc ?? ""}
          className="input max-w-xl font-mono"
          placeholder={'<meta name="google-site-verification" content="..." /> veya yalnızca kod'}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="hint">
          Search Console’da <strong>URL öneki</strong> ile <code className="rounded bg-stone-100 px-1">{siteUrl}</code> mülkünü ekleyin, doğrulama yöntemi
          olarak “HTML etiketi”ni seçin ve verilen etiketi buraya yapıştırın. Kaydettikten sonra Search Console’da “Doğrula”ya basın. Doğrulandıktan
          sonra “Site haritaları” bölümüne <code className="rounded bg-stone-100 px-1">sitemap.xml</code> ekleyin.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Kaydet</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
