"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Bank = {
  id: number; bankName: string; accountName: string; iban: string;
  branch?: string; accountNo?: string; isDefault: boolean; createdAt: string;
};

export default function BankalarPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bankName: "", accountName: "", iban: "", branch: "", accountNo: "", isDefault: false });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setBanks(await api.get<Bank[]>("/banks")); }
    finally { setLoading(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/banks", form);
    setShowForm(false);
    setForm({ bankName: "", accountName: "", iban: "", branch: "", accountNo: "", isDefault: false });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Bu banka kaydı silinsin mi?")) return;
    await api.delete(`/banks/${id}`);
    await load();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Banka Tanımları</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Banka Ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">Yeni Banka</h2>
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Banka Adı</label>
                <input required value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                  placeholder="Ziraat Bankası"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hesap Adı</label>
                <input required value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                  placeholder="Gül Apartmanı Yönetimi"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">IBAN</label>
              <input required value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Şube (isteğe bağlı)</label>
                <input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hesap No (isteğe bağlı)</label>
                <input value={form.accountNo} onChange={e => setForm(f => ({ ...f, accountNo: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
              Varsayılan hesap olarak işaretle
            </label>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg">Kaydet</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-3">
          {banks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Henüz banka tanımı yok. Sakinlerin ödeme yapabilmesi için IBAN ekleyin.
            </div>
          ) : banks.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{b.bankName}</span>
                    {b.isDefault && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Varsayılan</span>}
                  </div>
                  <div className="text-sm text-slate-600">{b.accountName}</div>
                  <div className="font-mono text-sm text-slate-700 mt-1">{b.iban}</div>
                  {(b.branch || b.accountNo) && (
                    <div className="text-xs text-slate-400 mt-1">
                      {b.branch && `Şube: ${b.branch}`}{b.branch && b.accountNo && " · "}{b.accountNo && `Hesap: ${b.accountNo}`}
                    </div>
                  )}
                </div>
                <button onClick={() => remove(b.id)} className="text-red-400 hover:text-red-600 text-xs">Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
