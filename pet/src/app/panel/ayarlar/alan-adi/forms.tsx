"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { addDomainAction, verifyDomainAction } from "./actions";

export function AddDomainForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(addDomainAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="domain" className="sr-only">
          Alan adı
        </label>
        <input id="domain" name="domain" required disabled={disabled} placeholder="www.patilerpetshop.com" className="input max-w-sm" autoCapitalize="none" spellCheck={false} />
        <SubmitButton disabled={disabled} pendingText="Ekleniyor…">
          Alan adını ekle
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function VerifyButton({ domainId }: { domainId: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setRes(await verifyDomainAction(domainId)))} className="btn-primary btn-sm">
        {pending ? "Kontrol ediliyor…" : "Kontrol et"}
      </button>
      {res && <p className={`text-sm ${res.ok ? "text-emerald-700" : "text-amber-800"}`}>{res.message}</p>}
    </div>
  );
}

export function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex items-center gap-2">
      <code className="rounded-md bg-stone-100 px-2 py-1 font-mono text-xs break-all">{value}</code>
      <button
        type="button"
        className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // pano erişimi yoksa kullanıcı elle kopyalar
          }
        }}
      >
        {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </span>
  );
}
