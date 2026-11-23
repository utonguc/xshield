"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { addMemberAction, resetPasswordAction } from "./actions";

export function AddMemberForm() {
  const [state, action] = useActionState(addMemberAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="card space-y-4 p-5">
      <h2 className="font-semibold">Ekibe kişi ekle</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-xs" htmlFor={"member-f1"}>Ad soyad</label>
          <input id={"member-f1"} name="name" required className="input" />
        </div>
        <div>
          <label className="label text-xs" htmlFor={"member-f2"}>Rol</label>
          <select id={"member-f2"} name="role" className="input" defaultValue="courier">
            <option value="courier">Kurye — yalnızca kendisine atanan teslimatları görür</option>
            <option value="staff">Personel — kasa, ürün, stok ve siparişler</option>
          </select>
        </div>
        <div>
          <label className="label text-xs" htmlFor={"member-f3"}>E-posta (giriş için)</label>
          <input id={"member-f3"} name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label text-xs" htmlFor={"member-f4"}>Cep telefonu</label>
          <input id={"member-f4"} name="phone" type="tel" className="input" placeholder="İsteğe bağlı" />
        </div>
        <div>
          <label className="label text-xs" htmlFor={"member-f5"}>Geçici şifre</label>
          <input id={"member-f5"} name="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Ekle</SubmitButton>
    </form>
  );
}

export function ResetPassword({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(resetPasswordAction.bind(null, userId), undefined);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-stone-600 hover:underline">
        Şifre değiştir
      </button>
    );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="password" minLength={8} required placeholder="Yeni şifre" className="input w-40 py-1.5" />
      <SubmitButton className="btn-ghost btn-sm">Kaydet</SubmitButton>
      {state?.error && <span className="text-xs text-red-700">{state.error}</span>}
      {state?.message && <span className="text-xs text-emerald-700">{state.message}</span>}
    </form>
  );
}
