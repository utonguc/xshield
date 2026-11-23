"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => Detector;
  }
}

export const cameraScanSupported = () => typeof window !== "undefined" && "BarcodeDetector" in window;

/**
 * Telefon kamerasıyla barkod okur (Chrome/Android'in yerleşik BarcodeDetector'ı).
 * Desteklemeyen cihazlarda USB/Bluetooth barkod okuyucu veya elle giriş kullanılır —
 * bu okuyucular klavye gibi çalıştığından ek bir şey gerekmez.
 */
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Üst bileşen her render'da yeni fonksiyon verse de kamera yeniden başlamasın.
  const cb = useRef(onDetected);
  useEffect(() => {
    cb.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let lastCode = "";
    (async () => {
      if (!window.BarcodeDetector) {
        setError("Bu cihaz kamerayla barkod okumayı desteklemiyor. Barkodu elle yazabilir veya barkod okuyucu kullanabilirsiniz.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setError("Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin.");
        return;
      }
      if (stopped || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });
      const tick = async () => {
        if (stopped || !video.current) return;
        try {
          const found = await detector.detect(video.current);
          const code = found[0]?.rawValue;
          if (code && code !== lastCode) {
            lastCode = code;
            navigator.vibrate?.(60);
            cb.current(code);
            setTimeout(() => (lastCode = ""), 1500);
          }
        } catch {
          // kare okunamadı, devam
        }
        setTimeout(tick, 250);
      };
      tick();
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" role="dialog" aria-label="Barkod okut">
      <div className="flex items-center justify-between text-white">
        <p className="font-semibold">Barkodu kameraya gösterin</p>
        <button onClick={onClose} className="btn-ghost btn-sm">
          Kapat
        </button>
      </div>
      <div className="relative mx-auto mt-4 w-full max-w-lg flex-1 overflow-hidden rounded-2xl">
        {error ? (
          <p className="grid h-full place-items-center p-6 text-center text-sm text-white">{error}</p>
        ) : (
          <>
            <video ref={video} playsInline muted className="size-full object-cover" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 border-brand-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </>
        )}
      </div>
    </div>
  );
}
