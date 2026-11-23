"use client";

import { useActionState } from "react";
import type { OrderStatus } from "@/db/schema";
import { SubmitButton } from "@/components/form";
import { setOrderStatusAction } from "../actions";

const LABELS: Partial<Record<OrderStatus, string>> = {
  preparing: "Hazırlamaya başla",
  ready: "Teslime hazır",
  on_the_way: "Yola çıktı",
  delivered: "Teslim edildi",
  cancelled: "İptal et",
};

function StatusButton({ orderId, status, primary }: { orderId: string; status: OrderStatus; primary: boolean }) {
  const [state, action] = useActionState(setOrderStatusAction.bind(null, orderId, status), undefined);
  const cancel = status === "cancelled";
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (cancel && !confirm("Sipariş iptal edilsin mi? Ürünler stoğa geri eklenir.")) e.preventDefault();
      }}
    >
      <SubmitButton className={cancel ? "btn-danger" : primary ? "btn-primary" : "btn-ghost"} pendingText="…">
        {LABELS[status]}
      </SubmitButton>
      {state?.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
    </form>
  );
}

export function StatusButtons({ orderId, next, fulfillment }: { orderId: string; next: OrderStatus[]; fulfillment: string }) {
  // Gel-al siparişlerde "yola çıktı" anlamsız; adrese teslimde "teslime hazır" ara adım gereksiz.
  const visible = next.filter((s) => (fulfillment === "pickup" ? s !== "on_the_way" : s !== "ready") && LABELS[s]);
  const primary = visible.find((s) => s !== "cancelled");
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((s) => (
        <StatusButton key={s} orderId={orderId} status={s} primary={s === primary} />
      ))}
    </div>
  );
}
