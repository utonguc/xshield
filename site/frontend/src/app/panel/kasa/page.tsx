"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Transaction = {
  id: number; type: "income" | "expense"; title: string; amount: number;
  category: string; date: string; description?: string; receiptNo?: string;
};
type Kasa = {
  totalIncome: number; totalExpense: number; balance: number;
  thisMonthIncome: number; thisMonthExpense: number;
  transactions: Transaction[];
};

const EXPENSE_CAT: Record<string, string> = {
  Cleaning: "Temizlik", Maintenance: "Bakım & Onarım", Electricity: "Elektrik",
  Water: "Su", Gas: "Doğalgaz", Security: "Güvenlik", Elevator: "Asansör",
  Staff: "Personel", Insurance: "Sigorta", Other: "Diğer",
};
const MONTHS = ["","Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

export default function KasaPage() {
  const now = new Date();
  const [kasa, setKasa] = useState<Kasa | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => { load(); }, [filterYear, filterMonth]);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterYear)  q.set("year",  filterYear);
      if (filterMonth) q.set("month", filterMonth);
      const qs = q.toString() ? `?${q}` : "";
      setKasa(await api.get<Kasa>(`/kasa${qs}`));
    } finally { setLoading(false); }
  }

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading && !kasa) return <div className="text-slate-400 text-sm">Yükleniyor...</div>;

  const data = kasa!;
  const filteredIncome  = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const filteredExpense = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const filteredBalance = filteredIncome - filteredExpense;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Kasa</h1>
        <div className="flex gap-2">
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tüm Zamanlar</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tüm Aylar</option>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Genel Bakiye (tüm zamanlar) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Genel Kasa Durumu (Tüm Zamanlar)</div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Toplam Gelir</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(data.totalIncome)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Toplam Gider</div>
            <div className="text-xl font-bold text-red-500">{formatCurrency(data.totalExpense)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Net Bakiye</div>
            <div className={`text-xl font-bold ${data.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatCurrency(data.balance)}
            </div>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
          <div className="bg-green-500 h-2 rounded-full"
            style={{ width: data.totalIncome > 0 ? `${Math.min(100, ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)}%` : "0%" }} />
        </div>
      </div>

      {/* Filtrelenmiş özet */}
      {(filterYear || filterMonth) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: `${filterMonth ? MONTHS[Number(filterMonth)] + " " : ""}${filterYear} Gelir`, value: filteredIncome, color: "text-green-600" },
            { label: `${filterMonth ? MONTHS[Number(filterMonth)] + " " : ""}${filterYear} Gider`, value: filteredExpense, color: "text-red-500" },
            { label: "Dönem Bakiyesi", value: filteredBalance, color: filteredBalance >= 0 ? "text-blue-600" : "text-red-600" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">{c.label}</div>
              <div className={`text-lg font-bold ${c.color}`}>{formatCurrency(c.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hareket listesi */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="font-medium text-sm">Hareketler</span>
          <span className="text-xs text-slate-400">{data.transactions.length} kayıt</span>
        </div>
        {loading ? (
          <div className="p-6 text-slate-400 text-sm">Yükleniyor...</div>
        ) : data.transactions.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Bu dönem için hareket yok.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.transactions.map((t, idx) => (
              <div key={`${t.type}-${t.id}-${idx}`} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    t.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {t.type === "income" ? "↑" : "↓"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-slate-400">
                      {formatDateTime(t.date)} · {t.type === "income" ? t.category : (EXPENSE_CAT[t.category] ?? t.category)}
                      {t.receiptNo && ` · ${t.receiptNo}`}
                    </div>
                    {t.description && <div className="text-xs text-slate-400 truncate">{t.description}</div>}
                  </div>
                </div>
                <div className={`font-semibold text-sm flex-shrink-0 ${
                  t.type === "income" ? "text-green-600" : "text-red-500"
                }`}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
