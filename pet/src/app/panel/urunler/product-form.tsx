"use client";

import { useActionState, useCallback, useState } from "react";
import Link from "next/link";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FormMessage, SubmitButton } from "@/components/form";
import { ImagePicker } from "@/components/image-picker";
import { PET_TYPE_LABELS } from "@/lib/labels";
import { lookupBarcodeAction, saveProductAction } from "./actions";
import { blankVariant, type ProductDraft, type VariantDraft } from "./product-draft";

/** "1.249,90" → "1249.90", "149.90" → "149.90", "149,9" → "149.9" */
const toNum = (raw: string) => {
  const s = raw.trim().replace(/\s|₺/g, "");
  if (!s) return "";
  return s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
};

export function ProductForm({ draft, categories }: { draft: ProductDraft; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveProductAction.bind(null, draft.id), undefined);
  const [p, setP] = useState(draft);
  const [newCat, setNewCat] = useState(false);
  const [scanFor, setScanFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<React.ReactNode>(null);

  const setV = (key: string, patch: Partial<VariantDraft>) =>
    setP((x) => ({ ...x, variants: x.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));

  const lookup = useCallback(
    async (key: string, code: string) => {
      if (!code.trim()) return;
      const r = await lookupBarcodeAction(code);
      if (r.kind === "own" && r.productId !== draft.id) {
        setNotice(
          <>
            Bu barkod zaten <Link className="font-semibold underline" href={`/panel/urunler/${r.productId}`}>{r.name}</Link> ürününüzde kayıtlı.
          </>,
        );
      } else if (r.kind === "catalog") {
        setP((x) => ({
          ...x,
          name: x.name || r.name,
          brand: x.brand || r.brand || "",
          petType: x.petType === "genel" && r.petType ? r.petType : x.petType,
          categoryId: x.categoryId || categories.find((c) => c.name === r.categoryName)?.id || "",
          variants: x.variants.map((v) =>
            v.key === key ? { ...v, name: v.name || r.variantName || "", unit: (r.unit as "adet" | "kg") || v.unit } : v,
          ),
        }));
        setNotice("Barkod ortak katalogda bulundu; ürün bilgileri dolduruldu. Fiyat ve stok size özel, lütfen girin.");
      } else setNotice(null);
    },
    [categories, draft.id],
  );

  const payload = JSON.stringify(
    p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      barcode: v.barcode,
      sku: v.sku,
      unit: v.unit,
      price: toNum(v.price),
      compareAtPrice: toNum(v.compareAtPrice),
      costPrice: toNum(v.costPrice),
      lowStockThreshold: toNum(v.lowStockThreshold) || "0",
      initialStock: toNum(v.initialStock) || "0",
      isActive: v.isActive,
    })),
  );

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Ürün bilgileri</h2>
          <div>
            <label className="label" htmlFor="name">
              Ürün adı
            </label>
            <input
              id="name"
              name="name"
              required
              className="input"
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
              placeholder="Örn. Yetişkin Kedi Maması Tavuklu"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="brand">
                Marka
              </label>
              <input id="brand" name="brand" className="input" value={p.brand} onChange={(e) => setP({ ...p, brand: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="petType">
                Hayvan türü
              </label>
              <select id="petType" name="petType" className="input" value={p.petType} onChange={(e) => setP({ ...p, petType: e.target.value })}>
                {Object.entries(PET_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="categoryId">
              Kategori
            </label>
            {newCat ? (
              <div className="flex gap-2">
                <input name="newCategory" className="input" placeholder="Yeni kategori adı" autoFocus />
                <button type="button" className="btn-ghost" onClick={() => setNewCat(false)}>
                  Vazgeç
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  id="categoryId"
                  name="categoryId"
                  className="input"
                  value={p.categoryId}
                  onChange={(e) => setP({ ...p, categoryId: e.target.value })}
                >
                  <option value="">Kategori seçin</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-ghost shrink-0" onClick={() => setNewCat(true)}>
                  + Yeni
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="description">
              Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="input"
              value={p.description}
              onChange={(e) => setP({ ...p, description: e.target.value })}
              placeholder="İçerik, kullanım, yaş grubu vb."
            />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Satış birimleri ve fiyat</h2>
              <p className="text-xs text-stone-500">Aynı ürünün farklı gramajları (1 kg, 3 kg, 15 kg) veya renk/beden seçenekleri.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => setP({ ...p, variants: [...p.variants, blankVariant()] })}>
                + Seçenek ekle
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                title="Açık mama gibi kilo ile satılan ürünler"
                onClick={() => setP({ ...p, variants: [...p.variants, { ...blankVariant("kg"), name: "Açık (kg)" }] })}
              >
                + Kiloyla satış
              </button>
            </div>
          </div>
          {notice && <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 ring-1 ring-sky-200">{notice}</p>}

          <div className="mt-4 space-y-4">
            {p.variants.map((v, i) => (
              <fieldset key={v.key} className={`rounded-xl p-4 ring-1 ${v.isActive ? "ring-stone-200" : "bg-stone-50 ring-stone-200"}`}>
                <div className="mb-3 flex items-center justify-between">
                  <legend className="text-sm font-semibold">
                    {p.variants.length > 1 ? `Seçenek ${i + 1}` : "Fiyat ve stok"}
                    {v.id !== undefined && v.stockQty !== undefined && (
                      <span className="ml-2 font-normal text-stone-500">
                        · Mevcut stok: {v.stockQty} {v.unit}
                      </span>
                    )}
                  </legend>
                  <div className="flex items-center gap-3">
                    {v.id && (
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={v.isActive} onChange={(e) => setV(v.key, { isActive: e.target.checked })} />
                        Satışta
                      </label>
                    )}
                    {p.variants.length > 1 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-red-700 hover:underline"
                        onClick={() => setP({ ...p, variants: p.variants.filter((x) => x.key !== v.key) })}
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`${v.key}-f1`}>Seçenek adı</label>
                    <input id={`${v.key}-f1`} className="input" value={v.name} onChange={(e) => setV(v.key, { name: e.target.value })} placeholder={p.variants.length > 1 ? "Örn. 3 kg" : "İsteğe bağlı"} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label text-xs" htmlFor={`${v.key}-f2`}>Barkod</label>
                    <div className="flex gap-2">
                      <input id={`${v.key}-f2`}
                        className="input font-mono"
                        inputMode="numeric"
                        value={v.barcode}
                        onChange={(e) => setV(v.key, { barcode: e.target.value })}
                        onBlur={(e) => lookup(v.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            lookup(v.key, e.currentTarget.value);
                          }
                        }}
                        placeholder="Okutun veya yazın"
                      />
                      <button type="button" className="btn-ghost shrink-0 px-3" onClick={() => setScanFor(v.key)} aria-label="Kamerayla okut" title="Kamerayla okut">
                        📷
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs" htmlFor={`${v.key}-f3`}>Birim</label>
                    <select id={`${v.key}-f3`} className="input" value={v.unit} onChange={(e) => setV(v.key, { unit: e.target.value as "adet" | "kg" })} disabled={!!v.id}>
                      <option value="adet">Adet</option>
                      <option value="kg">Kg</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`${v.key}-f4`}>Satış fiyatı (₺{v.unit === "kg" ? " / kg" : ""})</label>
                    <input id={`${v.key}-f4`} className="input" inputMode="decimal" required value={v.price} onChange={(e) => setV(v.key, { price: e.target.value })} placeholder="0,00" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`${v.key}-f5`}>İndirim öncesi fiyat</label>
                    <input id={`${v.key}-f5`} className="input" inputMode="decimal" value={v.compareAtPrice} onChange={(e) => setV(v.key, { compareAtPrice: e.target.value })} placeholder="İsteğe bağlı" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`${v.key}-f6`}>Alış fiyatı</label>
                    <input id={`${v.key}-f6`} className="input" inputMode="decimal" value={v.costPrice} onChange={(e) => setV(v.key, { costPrice: e.target.value })} placeholder="Kâr hesabı için" />
                  </div>
                  {!v.id && (
                    <div className="sm:col-span-2">
                      <label className="label text-xs" htmlFor={`${v.key}-f7`}>Açılış stoğu</label>
                      <input id={`${v.key}-f7`} className="input" inputMode="decimal" value={v.initialStock} onChange={(e) => setV(v.key, { initialStock: e.target.value })} placeholder="0" />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`${v.key}-f8`}>Kritik stok uyarısı</label>
                    <input id={`${v.key}-f8`} className="input" inputMode="decimal" value={v.lowStockThreshold} onChange={(e) => setV(v.key, { lowStockThreshold: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`${v.key}-f9`}>Stok kodu (SKU)</label>
                    <input id={`${v.key}-f9`} className="input" value={v.sku} onChange={(e) => setV(v.key, { sku: e.target.value })} placeholder="İsteğe bağlı" />
                  </div>
                </div>
                {v.id && <p className="hint">Stok miktarını değiştirmek için Stok sayfasında mal kabul veya sayım yapın; böylece her hareket kayıt altında kalır.</p>}
              </fieldset>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-4 p-5">
          <ImagePicker name="image" current={p.imageUrl} label="Ürün görseli" />
          <label className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 text-sm">
            <input type="checkbox" name="isPublished" checked={p.isPublished} onChange={(e) => setP({ ...p, isPublished: e.target.checked })} className="mt-0.5" />
            <span>
              <span className="font-medium">Online mağazada göster</span>
              <span className="block text-xs text-stone-500">Kapalıysa ürün yalnızca kasada satılır.</span>
            </span>
          </label>
        </section>
        <input type="hidden" name="variants" value={payload} />
        <div className="space-y-3 lg:sticky lg:top-6">
          <FormMessage state={state} />
          <SubmitButton className="btn-primary w-full">Ürünü kaydet</SubmitButton>
          <Link href="/panel/urunler" className="btn-ghost w-full">
            Vazgeç
          </Link>
        </div>
      </aside>

      {scanFor && (
        <BarcodeScanner
          onClose={() => setScanFor(null)}
          onDetected={(code) => {
            setV(scanFor, { barcode: code });
            lookup(scanFor, code);
            setScanFor(null);
          }}
        />
      )}
    </form>
  );
}
