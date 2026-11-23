"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 1200;

/** Telefon fotoğraflarını yüklemeden önce tarayıcıda küçültür (genelde 3-8 MB → ~200 KB). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 400_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export function ImagePicker({ name, current, label = "Görsel" }: { name: string; current: string | null; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const small = await shrink(f);
    const dt = new DataTransfer();
    dt.items.add(small);
    e.target.files = dt.files;
    setPreview(URL.createObjectURL(small));
    setRemoved(false);
    setBusy(false);
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-stone-400">Görsel yok</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="btn-ghost btn-sm cursor-pointer">
            {busy ? "Hazırlanıyor…" : preview ? "Değiştir" : "Fotoğraf seç / çek"}
            <input ref={input} type="file" name={name} accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" onChange={onChange} />
          </label>
          {preview && (
            <button
              type="button"
              className="text-left text-xs font-medium text-red-700 hover:underline"
              onClick={() => {
                if (input.current) input.current.value = "";
                setPreview(null);
                setRemoved(true);
              }}
            >
              Görseli kaldır
            </button>
          )}
        </div>
      </div>
      <input type="hidden" name={`remove${name[0].toUpperCase()}${name.slice(1)}`} value={removed ? "1" : ""} />
    </div>
  );
}
