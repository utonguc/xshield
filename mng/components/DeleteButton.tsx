"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  entityId: number | string;
  label?: string;
  confirmMsg?: string;
  action: string;
  redirectTo?: string;
}

export function DeleteButton({ entityId, label = "Sil", confirmMsg = "Silmek istediğinizden emin misiniz?", action, redirectTo = "/customers" }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#fca5a5" }}>{confirmMsg}</span>
        <button
          onClick={async () => {
            setLoading(true);
            const fd = new FormData();
            fd.append("id", String(entityId));
            await fetch(action, { method: "POST", body: fd });
            router.push(`${redirectTo}?_toast=${encodeURIComponent("Silindi")}&_tt=success`);
          }}
          disabled={loading}
          style={{ padding: "6px 14px", borderRadius: 7, background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
        >
          {loading ? "…" : "Evet, Sil"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ padding: "6px 14px", borderRadius: 7, background: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 12 }}
        >
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", cursor: "pointer" }}
    >
      {label}
    </button>
  );
}
