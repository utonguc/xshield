"use client";

import { useFormStatus } from "react-dom";

export type FormState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | undefined;

export function SubmitButton({
  children,
  pendingText = "Kaydediliyor…",
  className = "btn-primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} className={className} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800 ring-1 ring-red-200">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
        {state.message}
      </p>
    );
  return null;
}

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const msg = state?.fieldErrors?.[name];
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}
