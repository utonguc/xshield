"use client";

import { useState } from "react";
import { formatQty, formatTL } from "@/lib/format";
import { AddToCartButton } from "../../cart";

type V = { id: string; name: string; unit: "adet" | "kg"; price: number; compareAtPrice: number | null; stockQty: number };

export function VariantSelect({ productName, variants, canOrder }: { productName: string; variants: V[]; canOrder: boolean }) {
  const first = variants.find((v) => v.stockQty > 0) ?? variants[0];
  const [id, setId] = useState(first.id);
  const v = variants.find((x) => x.id === id) ?? first;
  const [qty, setQty] = useState(v.unit === "kg" ? 1 : 1);
  const step = v.unit === "kg" ? 0.5 : 1;
  const max = Math.max(0, v.stockQty);
  const out = v.stockQty <= 0;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight">{formatTL(v.price)}</span>
        {v.unit === "kg" && <span className="text-stone-500">/ kg</span>}
        {v.compareAtPrice && v.compareAtPrice > v.price && <span className="text-lg text-stone-400 line-through">{formatTL(v.compareAtPrice)}</span>}
      </div>

      {variants.length > 1 && (
        <div>
          <p className="label">Seçenek</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setId(x.id);
                  setQty(1);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-medium ring-1 transition ${
                  x.id === v.id ? "bg-ink text-white ring-ink" : "bg-white ring-stone-300 hover:ring-stone-500"
                } ${x.stockQty <= 0 ? "opacity-50" : ""}`}
              >
                {x.name || "Standart"}
                {x.stockQty <= 0 && " · tükendi"}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className={`text-sm font-medium ${out ? "text-red-700" : v.stockQty <= 3 ? "text-amber-700" : "text-emerald-700"}`}>
        {out ? "Stokta yok" : v.stockQty <= 3 ? `Son ${formatQty(v.stockQty, v.unit)}` : "Stokta var"}
      </p>

      {!out && canOrder && (
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-white ring-1 ring-stone-300">
            <button type="button" className="px-4 py-2.5 text-lg" onClick={() => setQty((q) => Math.max(step, Math.round((q - step) * 10) / 10))} aria-label="Azalt">
              −
            </button>
            <span className="min-w-16 text-center font-semibold tabular-nums">{formatQty(qty, v.unit === "kg" ? "kg" : null)}</span>
            <button type="button" className="px-4 py-2.5 text-lg" onClick={() => setQty((q) => Math.min(max, Math.round((q + step) * 10) / 10))} aria-label="Artır">
              +
            </button>
          </div>
          <AddToCartButton
            item={{ variantId: v.id, qty, name: `${productName}${v.name ? ` · ${v.name}` : ""}`, unit: v.unit }}
            className="btn-primary flex-1 py-3 text-base"
          />
        </div>
      )}
      {!canOrder && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Mağaza şu anda online sipariş almıyor.</p>}
    </div>
  );
}
