"use client";

import { useActionState, useState } from "react";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { registerAction } from "../actions";

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
const toSlug = (s: string) =>
  s
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function RegisterForm({ host }: { host: string }) {
  const [state, action] = useActionState(registerAction, undefined);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="mt-6 space-y-4">
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Mağaza</legend>
        <div>
          <label className="label" htmlFor="storeName">
            Mağaza adı
          </label>
          <input
            id="storeName"
            name="storeName"
            required
            className="input"
            placeholder="Örn. Patiler Petshop"
            onChange={(e) => !slugTouched && setSlug(toSlug(e.target.value))}
          />
          <FieldError state={state} name="storeName" />
        </div>
        <div>
          <label className="label" htmlFor="slug">
            Mağaza adresi
          </label>
          <div className="flex items-center overflow-hidden rounded-xl bg-white ring-1 ring-stone-300 focus-within:ring-2 focus-within:ring-brand-500">
            <span className="shrink-0 pl-3.5 text-sm text-stone-500">{host}/</span>
            <input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(toSlug(e.target.value));
              }}
              className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pr-3.5 text-sm focus:outline-none"
              placeholder="patiler"
            />
          </div>
          <FieldError state={state} name="slug" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="city">
              İl
            </label>
            <input id="city" name="city" className="input" placeholder="İstanbul" />
          </div>
          <div>
            <label className="label" htmlFor="district">
              İlçe
            </label>
            <input id="district" name="district" className="input" placeholder="Kadıköy" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-stone-200 pt-4">
        <legend className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Hesap</legend>
        <div>
          <label className="label" htmlFor="name">
            Adınız soyadınız
          </label>
          <input id="name" name="name" required autoComplete="name" className="input" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Cep telefonu
          </label>
          <input id="phone" name="phone" required type="tel" autoComplete="tel" className="input" placeholder="05XX XXX XX XX" />
          <FieldError state={state} name="phone" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-posta
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          <FieldError state={state} name="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Şifre
          </label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          <p className="hint">En az 8 karakter.</p>
          <FieldError state={state} name="password" />
        </div>
      </fieldset>

      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Mağazanız açılıyor…">
        Mağazamı aç
      </SubmitButton>
    </form>
  );
}
