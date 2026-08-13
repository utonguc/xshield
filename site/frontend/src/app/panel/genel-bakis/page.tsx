"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime, STATUS_LABELS, PRIORITY_LABELS, TIER_LABELS, CATEGORY_LABELS } from "@/lib/utils";

const EXPENSE_CAT: Record<string, string> = {
  Cleaning: "Temizlik", Maintenance: "Bakım", Electricity: "Elektrik", Water: "Su",
  Gas: "Doğalgaz", Security: "Güvenlik", Elevator: "Asansör", Staff: "Personel",
  Insurance: "Sigorta", Other: "Diğer",
};
const PIE_COLORS = ["#3b82f6", "#f97316", "#eab308", "#06b6d4", "#ef4444", "#a855f7", "#6366f1", "#22c55e", "#64748b", "#94a3b8"];

type Dashboard = {
  totalApartments: number;
  totalResidents: number;
  pendingDues: number;
  totalDuesThisMonth: number;
  collectedThisMonth: number;
  openIssues: number;
  upcomingMeetings: number;
  tier: string;
  monthlyPrice: number;
  recentPayments: { id: number; apartmentNumber: string; blockName: string; amount: number; paidAt: string }[];
  recentIssues: { id: number; title: string; status: string; priority: string; createdAt: string }[];
  collectionTrend: { label: string; collected: number; expense: number }[];
  expenseBreakdown: { category: string; amount: number }[];
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color ?? "text-slate-900"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function GenelBakisPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Dashboard>("/site/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-sm">Yükleniyor...</div>;
  if (!data) return <div className="text-red-500 text-sm">Veri alınamadı.</div>;

  const collectionRate = data.totalDuesThisMonth > 0
    ? Math.round((data.collectedThisMonth / data.totalDuesThisMonth) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Genel Bakış</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Plan: <span className="font-medium text-blue-600">{TIER_LABELS[data.tier] ?? data.tier}</span>
          {data.monthlyPrice > 0 && ` · ${formatCurrency(data.monthlyPrice)}/ay`}
        </p>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Toplam Daire" value={data.totalApartments} />
        <StatCard label="Toplam Sakin" value={data.totalResidents} />
        <StatCard label="Bekleyen Aidat" value={data.pendingDues} color="text-orange-600" />
        <StatCard label="Açık Sorun" value={data.openIssues} color={data.openIssues > 0 ? "text-red-600" : "text-slate-900"} />
      </div>

      {/* Aidat özeti */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-medium text-slate-900 mb-4">Bu Ay Aidat Durumu</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs text-slate-500">Toplam Aidat</div>
            <div className="font-semibold">{formatCurrency(data.totalDuesThisMonth)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Tahsil Edilen</div>
            <div className="font-semibold text-green-600">{formatCurrency(data.collectedThisMonth)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Tahsilat Oranı</div>
            <div className="font-semibold text-blue-600">%{collectionRate}</div>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${collectionRate}%` }}
          />
        </div>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tahsilat / Gider trendi (son 6 ay) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium text-slate-900 mb-4">Son 6 Ay — Tahsilat & Gider</h2>
          {(() => {
            const max = Math.max(1, ...data.collectionTrend.flatMap(t => [t.collected, t.expense]));
            return (
              <div className="flex items-end justify-between gap-2 h-40">
                {data.collectionTrend.map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-0.5 h-32 w-full justify-center">
                      <div className="w-3 bg-green-500 rounded-t" style={{ height: `${(t.collected / max) * 100}%` }}
                        title={`Tahsilat: ${formatCurrency(t.collected)}`} />
                      <div className="w-3 bg-red-400 rounded-t" style={{ height: `${(t.expense / max) * 100}%` }}
                        title={`Gider: ${formatCurrency(t.expense)}`} />
                    </div>
                    <div className="text-[10px] text-slate-400">{t.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="flex gap-4 text-xs text-slate-500 mt-3">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded inline-block"></span>Tahsilat</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block"></span>Gider</span>
          </div>
        </div>

        {/* Gider dağılımı */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium text-slate-900 mb-4">Gider Dağılımı</h2>
          {data.expenseBreakdown.length === 0 ? (
            <p className="text-slate-400 text-sm">Henüz gider kaydı yok.</p>
          ) : (() => {
            const total = data.expenseBreakdown.reduce((s, e) => s + e.amount, 0);
            return (
              <div className="space-y-2">
                {data.expenseBreakdown.slice(0, 8).map((e, i) => {
                  const pct = total > 0 ? (e.amount / total) * 100 : 0;
                  return (
                    <div key={e.category}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-slate-600">{EXPENSE_CAT[e.category] ?? e.category}</span>
                        <span className="text-slate-500">{formatCurrency(e.amount)} · %{pct.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-medium">
                  <span>Toplam Gider</span><span className="text-red-500">{formatCurrency(total)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Son ödemeler */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium text-slate-900 mb-4">Son Ödemeler</h2>
          {data.recentPayments.length === 0 ? (
            <p className="text-slate-400 text-sm">Henüz ödeme yok.</p>
          ) : (
            <div className="space-y-3">
              {data.recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.blockName} · Daire {p.apartmentNumber}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(p.paidAt)}</div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Son sorunlar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium text-slate-900 mb-4">Son Sorunlar</h2>
          {data.recentIssues.length === 0 ? (
            <p className="text-slate-400 text-sm">Kayıtlı sorun yok.</p>
          ) : (
            <div className="space-y-3">
              {data.recentIssues.map(i => (
                <div key={i.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.title}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(i.createdAt)}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      i.priority === "Critical" ? "bg-red-100 text-red-700" :
                      i.priority === "High" ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{PRIORITY_LABELS[i.priority] ?? i.priority}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {STATUS_LABELS[i.status] ?? i.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Yaklaşan toplantılar */}
      {data.upcomingMeetings > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <div className="font-medium text-blue-900">{data.upcomingMeetings} yaklaşan toplantı</div>
            <div className="text-sm text-blue-700">Toplantılar sayfasından detayları görebilirsiniz.</div>
          </div>
        </div>
      )}
    </div>
  );
}
