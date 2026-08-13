"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

type Expense = {
  id: number; title: string; amount: number; category: string;
  description?: string; expenseDate: string; receiptNo?: string;
  createdById: number; createdAt: string;
};

const CATEGORIES: Record<string, string> = {
  Cleaning: "Temizlik", Maintenance: "Bakım & Onarım", Electricity: "Elektrik",
  Water: "Su", Gas: "Doğalgaz", Security: "Güvenlik", Elevator: "Asansör",
  Staff: "Personel", Insurance: "Sigorta", Other: "Diğer",
};
const CAT_KEYS = Object.keys(CATEGORIES);

const categoryColor: Record<string, string> = {
  Cleaning: "bg-blue-100 text-blue-700", Maintenance: "bg-orange-100 text-orange-700",
  Electricity: "bg-yellow-100 text-yellow-700", Water: "bg-cyan-100 text-cyan-700",
  Gas: "bg-red-100 text-red-700", Security: "bg-purple-100 text-purple-700",
  Elevator: "bg-indigo-100 text-indigo-700", Staff: "bg-green-100 text-green-700",
  Insurance: "bg-slate-100 text-slate-600", Other: "bg-slate-100 text-slate-500",
};

const emptyForm = { title: "", amount: "", category: "Other", description: "", expenseDate: "", receiptNo: "" };

export default function GiderlerPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => { load(); }, [filterYear, filterMonth]);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterYear)  q.set("year", filterYear);
      if (filterMonth) q.set("month", filterMonth);
      const qs = q.toString() ? `?${q}` : "";
      setExpenses(await api.get<Expense[]>(`/expenses${qs}`));
    } finally { setLoading(false); }
  }

  function openCreate() {
    setEditTarget(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({ ...emptyForm, expenseDate: today });
    setError(""); setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditTarget(e);
    setForm({
      title: e.title, amount: String(e.amount), category: e.category,
      description: e.description ?? "", expenseDate: e.expenseDate.slice(0, 10),
      receiptNo: e.receiptNo ?? "",
    });
    setError(""); setShowForm(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true); setError("");
    const payload = {
      title: form.title, amount: parseFloat(form.amount), category: form.category,
      description: form.description || null, expenseDate: form.expenseDate,
      receiptNo: form.receiptNo || null,
    };
    try {
      if (editTarget) await api.put(`/expenses/${editTarget.id}`, payload);
      else            await api.post("/expenses", payload);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally { setSaving(false); }
  }

  async function handleDelete(e: Expense) {
    if (!confirm(`"${e.title}" gideri silinsin mi?`)) return;
    try { await api.delete(`/expenses/${e.id}`); await load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Silinemedi."); }
  }

  const totalFiltered = expenses.reduce((s, e) => s + e.amount, 0);

  const years = [...new Set(expenses.map(e => new Date(e.expenseDate).getFullYear()))].sort((a, b) => b - a);
  const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Giderler</h1>
          <p className="text-sm text-slate-500">Toplam: {formatCurrency(totalFiltered)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tüm Yıllar</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
            {!years.includes(new Date().getFullYear()) && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tüm Aylar</option>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">
            + Gider Ekle
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editTarget ? "Gideri Düzenle" : "Yeni Gider"}</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Gider Adı / Açıklama *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Örn: Asansör bakımı, Temizlik firması..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tutar (₺) *</label>
              <input type="number" required min="0.01" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CAT_KEYS.map(k => <option key={k} value={k}>{CATEGORIES[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tarih *</label>
              <input type="date" required value={form.expenseDate}
                onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fiş / Fatura No</label>
              <input value={form.receiptNo} onChange={e => setForm(f => ({ ...f, receiptNo: e.target.value }))}
                placeholder="Opsiyonel"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Not</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Opsiyonel"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                {saving ? "Kaydediliyor..." : editTarget ? "Güncelle" : "Kaydet"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Gider kaydı yok.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map(e => (
                <div key={e.id} className="flex items-start justify-between px-5 py-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{e.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor[e.category]}`}>
                        {CATEGORIES[e.category] ?? e.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatDate(e.expenseDate)}
                      {e.receiptNo && ` · Fiş: ${e.receiptNo}`}
                    </div>
                    {e.description && <div className="text-xs text-slate-400 mt-0.5">{e.description}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-semibold text-red-600">{formatCurrency(e.amount)}</span>
                    <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                    <button onClick={() => handleDelete(e)} className="text-red-400 hover:text-red-600 text-xs font-medium">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
