"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CopyQuoteBtn({ quoteId }: { quoteId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/copy`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/quotes/${id}/edit`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      className="row-btn"
      title="Bu teklifi kopyala ve yeni taslak oluştur"
    >
      {loading ? "…" : "Kopyala"}
    </button>
  );
}
