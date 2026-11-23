"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { VariantHit } from "@/app/panel/actions";
import { VariantPicker } from "@/components/variant-picker";
import { formatQty, formatTL } from "@/lib/format";
import { posSaleAction, type PosResult } from "./actions";

type Line = { v: VariantHit; qty: string; price: string };

const num = (s: string) => {
  const t = s.trim().replace(/\s|₺/g, "");
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const show = (n: number) => n.toFixed(2).replace(".", ",");

export function Pos() {
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [given, setGiven] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [showCustomer, setShowCustomer] = useState(false);
  const [result, setResult] = useState<PosResult | null>(null);
  const [pending, start] = useTransition();

  const subtotal = useMemo(() => r2(lines.reduce((s, l) => s + (num(l.qty) || 0) * (num(l.price) || 0), 0)), [lines]);
  const disc = Math.min(num(discount) || 0, subtotal);
  const total = r2(subtotal - disc);
  const change = num(given) - total;

  function add(v: VariantHit) {
    setResult(null);
    setLines((ls) => {
      const i = ls.findIndex((l) => l.v.id === v.id);
      if (i >= 0 && v.unit === "adet") return ls.map((l, j) => (j === i ? { ...l, qty: String((num(l.qty) || 0) + 1) } : l));
      if (i >= 0) return ls;
      return [...ls, { v, qty: v.unit === "kg" ? "" : "1", price: show(v.price) }];
    });
  }
  const set = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.v.id === id ? { ...l, ...patch } : l)));

  const invalid = lines.length === 0 || lines.some((l) => !(num(l.qty) > 0) || !(num(l.price) >= 0) || (l.v.unit === "adet" && !Number.isInteger(num(l.qty))));

  function complete(paymentMethod: "cash" | "card") {
    start(async () => {
      const r = await posSaleAction({
        lines: lines.map((l) => ({ variantId: l.v.id, qty: num(l.qty), unitPrice: num(l.price) })),
        discount: disc,
        paymentMethod,
        customerName: customer.name || undefined,
        customerPhone: customer.phone || undefined,
      });
      setResult(r);
      if (r.ok) {
        setLines([]);
        setDiscount("");
        setGiven("");
        setCustomer({ name: "", phone: "" });
        setShowCustomer(false);
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <div className="card p-4">
          <VariantPicker onPick={add} placeholder="Barkod okutun veya ürün arayın" />
        </div>

        {result?.ok && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
            <span className="text-2xl" aria-hidden>
              ✓
            </span>
            <p className="flex-1 font-medium">
              Satış #{result.number} tamamlandı · {formatTL(result.total)}
            </p>
            <Link href={`/panel/siparisler/${result.orderId}`} className="btn-ghost btn-sm">
              Fişi gör
            </Link>
          </div>
        )}
        {result && !result.ok && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{result.error}</p>}

        <div className="card">
          {lines.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-stone-500">Sepet boş. Ürün okutarak başlayın.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {lines.map((l) => {
                const lineTotal = r2((num(l.qty) || 0) * (num(l.price) || 0));
                const over = num(l.qty) > l.v.stockQty;
                return (
                  <li key={l.v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-40 flex-1">
                      <p className="font-medium">
                        {l.v.productName}
                        {l.v.variantName && <span className="text-stone-500"> · {l.v.variantName}</span>}
                      </p>
                      <p className={`text-xs ${over ? "text-amber-700" : "text-stone-500"}`}>
                        Stok: {formatQty(l.v.stockQty, l.v.unit)}
                        {over && " — sistemde yetersiz, yine de satılabilir"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {l.v.unit === "adet" && (
                        <button type="button" className="btn-ghost size-9 p-0" onClick={() => set(l.v.id, { qty: String(Math.max(1, (num(l.qty) || 1) - 1)) })} aria-label="Azalt">
                          −
                        </button>
                      )}
                      <input
                        className="input w-20 text-center"
                        inputMode="decimal"
                        value={l.qty}
                        placeholder={l.v.unit === "kg" ? "kg" : ""}
                        autoFocus={l.v.unit === "kg"}
                        onChange={(e) => set(l.v.id, { qty: e.target.value })}
                        aria-label="Miktar"
                      />
                      {l.v.unit === "adet" && (
                        <button type="button" className="btn-ghost size-9 p-0" onClick={() => set(l.v.id, { qty: String((num(l.qty) || 0) + 1) })} aria-label="Artır">
                          +
                        </button>
                      )}
                    </div>
                    <input className="input w-24 text-right" inputMode="decimal" value={l.price} onChange={(e) => set(l.v.id, { price: e.target.value })} aria-label="Birim fiyat" title="Birim fiyat" />
                    <span className="w-24 text-right font-semibold tabular-nums">{formatTL(lineTotal)}</span>
                    <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.v.id !== l.v.id))} className="text-stone-400 hover:text-red-700" aria-label="Kaldır">
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-6">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-600">Ara toplam</dt>
            <dd className="tabular-nums">{formatTL(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-stone-600">İndirim</dt>
            <dd>
              <input className="input w-28 py-1.5 text-right" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0,00" />
            </dd>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-3 text-xl font-bold">
            <dt>Toplam</dt>
            <dd className="tabular-nums">{formatTL(total)}</dd>
          </div>
        </dl>

        <div>
          <label className="label text-xs" htmlFor={"pos-f1"}>Alınan nakit</label>
          <input id={"pos-f1"} className="input" inputMode="decimal" value={given} onChange={(e) => setGiven(e.target.value)} placeholder="Para üstü hesabı için" />
          {Number.isFinite(change) && change >= 0 && <p className="mt-1 text-sm font-semibold text-emerald-700">Para üstü: {formatTL(change)}</p>}
        </div>

        {showCustomer ? (
          <div className="space-y-2 rounded-xl bg-stone-50 p-3">
            <input className="input" placeholder="Müşteri adı" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <input className="input" placeholder="Cep telefonu" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
        ) : (
          <button type="button" onClick={() => setShowCustomer(true)} className="text-sm font-medium text-brand-700 hover:underline">
            + Müşteri bilgisi ekle (isteğe bağlı)
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={invalid || pending} onClick={() => complete("cash")} className="btn-primary py-4 text-base">
            Nakit
          </button>
          <button type="button" disabled={invalid || pending} onClick={() => complete("card")} className="btn-dark py-4 text-base">
            Kart
          </button>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Sepet temizlensin mi?")) setLines([]);
            }}
            className="w-full text-center text-xs text-stone-500 hover:text-red-700"
          >
            Sepeti temizle
          </button>
        )}
      </aside>
    </div>
  );
}
