"use client";

import { useEffect, useRef, useState } from "react";
import { searchVariantsAction, type VariantHit } from "@/app/panel/actions";
import { BarcodeScanner } from "./barcode-scanner";
import { formatQty, formatTL } from "@/lib/format";

/**
 * Barkod okut / ürün ara kutusu. USB-Bluetooth barkod okuyucular barkodu yazıp
 * Enter'a bastığından, Enter ile gelen tam barkod eşleşmesi doğrudan eklenir.
 */
export function VariantPicker({
  onPick,
  onUnknownBarcode,
  placeholder = "Barkod okutun veya ürün adı yazın",
  autoFocus = true,
}: {
  onPick: (v: VariantHit) => void;
  onUnknownBarcode?: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<VariantHit[]>([]);
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const my = ++seq.current;
    const id = setTimeout(async () => {
      const r = await searchVariantsAction(term);
      if (my === seq.current) {
        setHits(r.hits);
        setOpen(true);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  /** submittedCode verilirse kutu yalnızca hâlâ o kodu içeriyorsa temizlenir (bu arada yazılanı silmemek için). */
  function pick(v: VariantHit, submittedCode?: string) {
    onPick(v);
    setQ((cur) => (submittedCode === undefined || cur.trim() === submittedCode ? "" : cur));
    setHits([]);
    setOpen(false);
    setMsg(null);
    input.current?.focus();
  }

  async function submitCode(code: string) {
    const c = code.trim();
    if (!c) return;
    seq.current++;
    const r = await searchVariantsAction(c);
    if (r.exact) return pick(r.exact, c);
    if (r.hits.length === 1) return pick(r.hits[0], c);
    if (r.hits.length === 0 && /^\d{6,}$/.test(c)) {
      setMsg(`${c} barkodlu ürün bulunamadı.`);
      onUnknownBarcode?.(c);
      setQ((cur) => (cur.trim() === c ? "" : cur));
      return;
    }
    setHits(r.hits);
    setOpen(true);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={input}
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setMsg(null);
            if (e.target.value.trim().length < 2) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCode(q);
            } else if (e.key === "Escape") setOpen(false);
          }}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="input text-base"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="button" onClick={() => setScan(true)} className="btn-ghost shrink-0 px-3" title="Kamerayla okut" aria-label="Kamerayla okut">
          📷
        </button>
      </div>
      {msg && <p className="mt-1 text-sm text-amber-800">{msg}</p>}
      {open && hits.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-auto rounded-xl bg-white shadow-xl ring-1 ring-stone-200">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {h.productName}
                    {h.variantName && <span className="text-stone-500"> · {h.variantName}</span>}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {[h.brand, h.barcode].filter(Boolean).join(" · ")} · Stok: {formatQty(h.stockQty, h.unit)}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatTL(h.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && hits.length === 0 && (
        <p className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl bg-white px-4 py-3 text-sm text-stone-500 shadow-xl ring-1 ring-stone-200">Sonuç yok.</p>
      )}
      {scan && (
        <BarcodeScanner
          onClose={() => setScan(false)}
          onDetected={(code) => {
            setScan(false);
            submitCode(code);
          }}
        />
      )}
    </div>
  );
}
