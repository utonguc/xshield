"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, monthName, STATUS_LABELS } from "@/lib/utils";

type Due = { duesPeriodId: number; periodTitle: string; year: number; month: number; amount: number; status: string; paidAt?: string; dueDate: string };
type Extra = { id: number; title: string; description?: string; amount: number; status: string; paidAt?: string; dueDate?: string };

const statusColor: Record<string, string> = {
  Paid: "bg-green-100 text-green-700", Pending: "bg-yellow-100 text-yellow-700",
  Overdue: "bg-red-100 text-red-700", Waived: "bg-slate-100 text-slate-500",
};

export default function AidatlarimPage() {
  const [dues, setDues] = useState<Due[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Due[]>("/dues/my"),
      api.get<Extra[]>("/extra-collections/my").catch(() => [] as Extra[]),
    ]).then(([d, e]) => { setDues(d); setExtras(e); }).finally(() => setLoading(false));
  }, []);

  const paid = dues.filter(d => d.status === "Paid");
  const pending = dues.filter(d => d.status !== "Paid" && d.status !== "Waived");
  const totalPaid = paid.reduce((s, d) => s + d.amount, 0);
  const totalPending = pending.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Aidatlarım</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm text-slate-500 mb-1">Ödenen</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
          <div className="text-xs text-slate-400">{paid.length} aidat</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm text-slate-500 mb-1">Bekleyen</div>
          <div className="text-xl font-bold text-orange-600">{formatCurrency(totalPending)}</div>
          <div className="text-xs text-slate-400">{pending.length} aidat</div>
        </div>
      </div>

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {dues.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Aidat kaydı bulunamadı.</div>
            ) : dues.map(d => (
              <div key={d.duesPeriodId} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium text-sm">{monthName(d.month)} {d.year}</div>
                  <div className="text-xs text-slate-400">Son ödeme: {formatDate(d.dueDate)}</div>
                  {d.paidAt && <div className="text-xs text-green-600">Ödendi: {formatDate(d.paidAt)}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(d.amount)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[d.status]}`}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ek Ödemeler */}
      {extras.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Ek Ödemeler</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {extras.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-medium text-sm">{e.title}</div>
                    {e.description && <div className="text-xs text-slate-400">{e.description}</div>}
                    {e.dueDate && <div className="text-xs text-slate-400">Son tarih: {formatDate(e.dueDate)}</div>}
                    {e.paidAt && <div className="text-xs text-green-600">Ödendi: {formatDate(e.paidAt)}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(e.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[e.status]}`}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
