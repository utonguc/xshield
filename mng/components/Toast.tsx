"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

const TYPE_STYLE: Record<ToastItem["type"], React.CSSProperties> = {
  success: { borderColor: "#22c55e", color: "#86efac", background: "rgba(20,83,45,0.9)" },
  error:   { borderColor: "#ef4444", color: "#fca5a5", background: "rgba(127,29,29,0.9)" },
  info:    { borderColor: "#3b82f6", color: "#93c5fd", background: "rgba(30,58,138,0.9)" },
  warning: { borderColor: "#f59e0b", color: "#fcd34d", background: "rgba(120,53,15,0.9)" },
};
const TYPE_ICON: Record<ToastItem["type"], string> = {
  success: "✓", error: "✕", info: "ℹ", warning: "⚠",
};

function ToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = (id: number) =>
    setToasts((p) => p.filter((t) => t.id !== id));

  useEffect(() => {
    const msg = searchParams.get("_toast");
    if (!msg) return;
    const type = (searchParams.get("_tt") || "info") as ToastItem["type"];
    const id = Date.now();
    setToasts((p) => [...p, { id, message: decodeURIComponent(msg), type }]);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("_toast");
    params.delete("_tt");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });

    const t = setTimeout(() => dismiss(id), 4500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("_toast")]);

  if (!toasts.length) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            ...TYPE_STYLE[t.type],
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 18px", borderRadius: 10, border: "1px solid",
            backdropFilter: "blur(16px)", cursor: "pointer",
            fontSize: 13, fontWeight: 600, minWidth: 260, maxWidth: 420,
            animation: "toastIn 0.2s ease",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            pointerEvents: "all",
          }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>{TYPE_ICON[t.type]}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <span style={{ opacity: 0.5, fontSize: 11 }}>✕</span>
        </div>
      ))}
    </div>
  );
}

export function ToastRenderer() {
  return (
    <Suspense fallback={null}>
      <ToastInner />
    </Suspense>
  );
}
