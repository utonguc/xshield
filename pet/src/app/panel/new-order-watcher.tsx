"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {
    // Tarayıcı ses çalmaya izin vermediyse sessiz geç.
  }
}

/** 20 sn'de bir yeni online sipariş var mı diye bakar; varsa ses + bildirim. */
export function NewOrderWatcher({ initial }: { initial: number }) {
  const router = useRouter();
  const last = useRef(initial);
  const [alert, setAlert] = useState(0);

  useEffect(() => {
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/panel/yeni-siparis", { cache: "no-store" });
        if (!r.ok) return;
        const { count } = (await r.json()) as { count: number };
        if (count > last.current) {
          beep();
          setAlert(count - last.current);
          router.refresh();
        }
        last.current = count;
      } catch {
        // ağ hatası — bir sonraki turda tekrar denenir
      }
    }, 20_000);
    return () => clearInterval(id);
  }, [router]);

  if (!alert) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink p-4 text-white shadow-2xl sm:right-6 sm:left-auto">
      <span className="text-2xl" aria-hidden>
        🛎️
      </span>
      <p className="flex-1 text-sm font-medium">{alert} yeni sipariş geldi!</p>
      <Link href="/panel/siparisler" onClick={() => setAlert(0)} className="btn-primary btn-sm">
        Gör
      </Link>
      <button onClick={() => setAlert(0)} className="text-stone-400 hover:text-white" aria-label="Kapat">
        ✕
      </button>
    </div>
  );
}
