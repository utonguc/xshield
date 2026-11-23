"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { VariantHit } from "@/app/panel/actions";
import { VariantPicker } from "@/components/variant-picker";
import { formatQty } from "@/lib/format";
import { adjustStockAction, receiveStockAction, type StockActionResult } from "./actions";

const num = (s: string) => {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};

const label = (v: VariantHit) => `${v.productName}${v.variantName ? ` · ${v.variantName}` : ""}`;

function Result({ r }: { r: StockActionResult | null }) {
  if (!r) return null;
  return (
    <p role="status" className={`rounded-xl px-4 py-3 text-sm ring-1 ${r.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-red-50 text-red-800 ring-red-200"}`}>
      {r.message}
    </p>
  );
}

type ReceiveLine = { v: VariantHit; qty: string; cost: string; lot: string; expiry: string };

export function ReceiveForm({ preset }: { preset: VariantHit[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<ReceiveLine[]>(() =>
    preset.map((v) => ({ v, qty: "", cost: v.costPrice != null ? String(v.costPrice).replace(".", ",") : "", lot: "", expiry: "" })),
  );
  const [note, setNote] = useState("");
  const [result, setResult] = useState<StockActionResult | null>(null);
  const [pending, start] = useTransition();
  const [unknown, setUnknown] = useState<string | null>(null);

  const add = (v: VariantHit) => {
    setResult(null);
    setUnknown(null);
    setLines((ls) => {
      const i = ls.findIndex((l) => l.v.id === v.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: String((num(l.qty) || 0) + 1) } : l));
      return [{ v, qty: "1", cost: v.costPrice != null ? String(v.costPrice).replace(".", ",") : "", lot: "", expiry: "" }, ...ls];
    });
  };
  const set = (id: string, patch: Partial<ReceiveLine>) => setLines((ls) => ls.map((l) => (l.v.id === id ? { ...l, ...patch } : l)));

  const valid = lines.length > 0 && lines.every((l) => num(l.qty) > 0 && (l.v.unit === "kg" || Number.isInteger(num(l.qty))));

  function submit() {
    start(async () => {
      const r = await receiveStockAction(
        lines.map((l) => ({
          variantId: l.v.id,
          qty: num(l.qty),
          unitCost: Number.isFinite(num(l.cost)) ? num(l.cost) : null,
          lotNo: l.lot || null,
          expiryDate: l.expiry || null,
        })),
        note,
      );
      setResult(r);
      if (r.ok) {
        setLines([]);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <VariantPicker onPick={add} onUnknownBarcode={setUnknown} />
        {unknown && (
          <p className="mt-2 text-sm">
            Bu barkod ürünlerinizde yok.{" "}
            <Link href={`/panel/urunler/yeni?barkod=${encodeURIComponent(unknown)}`} className="font-semibold text-brand-700 underline">
              Yeni ürün olarak ekleyin
            </Link>
          </p>
        )}
      </div>
      <Result r={result} />
      {lines.length > 0 && (
        <div className="card divide-y divide-stone-100">
          {lines.map((l) => (
            <div key={l.v.id} className="grid gap-3 p-4 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-4">
                <p className="font-medium">{label(l.v)}</p>
                <p className="text-xs text-stone-500">Mevcut: {formatQty(l.v.stockQty, l.v.unit)}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs" htmlFor={`${l.v.id}-f1`}>Gelen miktar ({l.v.unit})</label>
                <input id={`${l.v.id}-f1`} className="input" inputMode="decimal" value={l.qty} onChange={(e) => set(l.v.id, { qty: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs" htmlFor={`${l.v.id}-f2`}>Birim alış ₺</label>
                <input id={`${l.v.id}-f2`} className="input" inputMode="decimal" value={l.cost} onChange={(e) => set(l.v.id, { cost: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs" htmlFor={`${l.v.id}-f3`}>SKT</label>
                <input id={`${l.v.id}-f3`} type="date" className="input" value={l.expiry} onChange={(e) => set(l.v.id, { expiry: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2">
                <div className="flex-1">
                  <label className="label text-xs" htmlFor={`${l.v.id}-f4`}>Lot</label>
                  <input id={`${l.v.id}-f4`} className="input" value={l.lot} onChange={(e) => set(l.v.id, { lot: e.target.value })} />
                </div>
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.v.id !== l.v.id))} className="btn-ghost px-3" aria-label="Satırı kaldır">
                  ✕
                </button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-60 flex-1">
              <label className="label text-xs" htmlFor="receive-note">Not (tedarikçi, fatura no…)</label>
              <input id="receive-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </div>
            <button onClick={submit} disabled={!valid || pending} className="btn-primary">
              {pending ? "Kaydediliyor…" : `${lines.length} kalemi stoğa ekle`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type AdjustLine = { v: VariantHit; value: string };

export function AdjustForm({ mode }: { mode: "count" | "waste" }) {
  const router = useRouter();
  const [lines, setLines] = useState<AdjustLine[]>([]);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<StockActionResult | null>(null);
  const [pending, start] = useTransition();

  const add = (v: VariantHit) => {
    setResult(null);
    setLines((ls) => {
      const i = ls.findIndex((l) => l.v.id === v.id);
      // Sayımda aynı barkod tekrar okutulursa sayılan adet artar (rafı tek tek okutma).
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, value: String((num(l.value) || 0) + 1) } : l));
      return [{ v, value: mode === "count" ? "1" : "1" }, ...ls];
    });
  };

  const valid = lines.length > 0 && lines.every((l) => num(l.value) >= 0 && (mode === "count" || num(l.value) > 0));

  function submit() {
    start(async () => {
      const r = await adjustStockAction(
        mode,
        lines.map((l) => ({ variantId: l.v.id, value: num(l.value) })),
        note,
      );
      setResult(r);
      if (r.ok) {
        setLines([]);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <VariantPicker onPick={add} />
        <p className="hint">
          {mode === "count"
            ? "Raftaki ürünleri tek tek okutun; aynı barkod her okutulduğunda sayılan miktar 1 artar. Miktarı elle de düzeltebilirsiniz."
            : "Bozulan, son kullanma tarihi geçen veya hasarlı ürünleri stoktan düşün."}
        </p>
      </div>
      <Result r={result} />
      {lines.length > 0 && (
        <div className="card divide-y divide-stone-100">
          {lines.map((l) => {
            const val = num(l.value);
            const diff = mode === "count" && Number.isFinite(val) ? val - l.v.stockQty : null;
            return (
              <div key={l.v.id} className="flex flex-wrap items-end gap-3 p-4">
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{label(l.v)}</p>
                  <p className="text-xs text-stone-500">Sistemdeki stok: {formatQty(l.v.stockQty, l.v.unit)}</p>
                </div>
                <div className="w-32">
                  <label className="label text-xs" htmlFor={`${l.v.id}-f6`}>{mode === "count" ? "Sayılan" : "Fire miktarı"}</label>
                  <input id={`${l.v.id}-f6`} className="input" inputMode="decimal" value={l.value} onChange={(e) => setLines((ls) => ls.map((x) => (x.v.id === l.v.id ? { ...x, value: e.target.value } : x)))} />
                </div>
                {diff !== null && (
                  <p className={`w-24 pb-2.5 text-sm font-semibold tabular-nums ${diff < 0 ? "text-red-700" : diff > 0 ? "text-emerald-700" : "text-stone-500"}`}>
                    {diff === 0 ? "Fark yok" : `${diff > 0 ? "+" : ""}${formatQty(Math.round(diff * 1000) / 1000)}`}
                  </p>
                )}
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.v.id !== l.v.id))} className="btn-ghost px-3" aria-label="Satırı kaldır">
                  ✕
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-60 flex-1">
              <label className="label text-xs" htmlFor="adjust-note">{mode === "count" ? "Not" : "Sebep"}</label>
              <input id="adjust-note"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder={mode === "waste" ? "Örn. SKT geçti, paket yırtık" : "Örn. Ay sonu sayımı"}
              />
            </div>
            <button onClick={submit} disabled={!valid || pending} className="btn-primary">
              {pending ? "Kaydediliyor…" : mode === "count" ? "Sayımı kaydet" : "Fireyi kaydet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
