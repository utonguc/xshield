"use client";

import { useState, useTransition } from "react";
import { courierUpdateAction } from "./actions";

export function CourierButtons({ orderId, status, collect }: { orderId: string; status: string; collect: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (next: "on_the_way" | "delivered") =>
    start(async () => {
      if (next === "delivered" && collect && !confirm(`${collect} tahsil ettiniz mi?`)) return;
      const r = await courierUpdateAction(orderId, next);
      setError(r.error ?? null);
    });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button disabled={pending || status === "on_the_way"} onClick={() => run("on_the_way")} className="btn-ghost py-3">
          {status === "on_the_way" ? "Yolda ✓" : "Yola çıktım"}
        </button>
        <button disabled={pending} onClick={() => run("delivered")} className="btn-primary py-3">
          Teslim ettim
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
