"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { STATUS_LABELS, formatCurrency } from "@/lib/utils";

type Apartment = {
  id: number; blockId: number; blockName: string; number: string; floor: number;
  type?: string; squareMeters?: number; landShare?: number; monthlyDues?: number; status: string;
  ownerId?: number; ownerName?: string; residentId?: number; residentName?: string;
};
type Block = { id: number; name: string; floorCount: number; duesCoefficient: number; apartmentCount: number };
type User = { id: number; fullName: string; role: string };

const statusColor: Record<string, string> = {
  Occupied: "bg-green-100 text-green-700", Empty: "bg-slate-100 text-slate-500",
  ForSale: "bg-orange-100 text-orange-700", ForRent: "bg-blue-100 text-blue-700",
};
const STATUS_OPTIONS = ["Occupied", "Empty", "ForSale", "ForRent"];

function DaireContent() {
  const searchParams = useSearchParams();
  const blockIdParam = searchParams.get("blockId");

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Apartment | null>(null);
  const [formError, setFormError] = useState("");
  const [filterBlock, setFilterBlock] = useState(blockIdParam ?? "");
  const [calcMsg, setCalcMsg] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [calcBase, setCalcBase] = useState("");
  const [calcRound, setCalcRound] = useState("50");
  const [calcSaving, setCalcSaving] = useState(false);
  const [form, setForm] = useState({ blockId: blockIdParam ?? "", number: "", floor: "1", type: "", squareMeters: "", landShare: "", monthlyDues: "", status: "Occupied", ownerId: "", residentId: "" });

  useEffect(() => {
    api.get<Block[]>("/blocks").then(setBlocks).catch(() => {});
    api.get<User[]>("/users").then(setUsers).catch(() => {});
    api.get<{ duesBaseAmount: number }>("/site")
      .then(s => setCalcBase(s.duesBaseAmount ? String(s.duesBaseAmount) : ""))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filterBlock]);

  async function load() {
    setLoading(true);
    try {
      const q = filterBlock ? `?blockId=${filterBlock}` : "";
      setApartments(await api.get<Apartment[]>(`/apartments${q}`));
    } finally { setLoading(false); }
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ blockId: filterBlock, number: "", floor: "1", type: "", squareMeters: "", landShare: "", monthlyDues: "", status: "Occupied", ownerId: "", residentId: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(a: Apartment) {
    setEditTarget(a);
    setForm({
      blockId: String(a.blockId), number: a.number, floor: String(a.floor),
      type: a.type ?? "", squareMeters: a.squareMeters ? String(a.squareMeters) : "",
      landShare: a.landShare ? String(a.landShare) : "",
      monthlyDues: a.monthlyDues ? String(a.monthlyDues) : "",
      status: a.status, ownerId: a.ownerId ? String(a.ownerId) : "",
      residentId: a.residentId ? String(a.residentId) : "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function runCalculate() {
    setCalcSaving(true); setCalcMsg("");
    try {
      const res = await api.post<{ updatedCount: number; skippedNoShare: number; baseAmount: number }>(
        "/apartments/calculate-dues",
        { roundTo: Number(calcRound) || 0, overwrite: true, baseAmount: calcBase ? Number(calcBase) : 0 }
      );
      let msg = `${res.updatedCount} dairenin aidatı hesaplandı (taban: ${res.baseAmount.toLocaleString("tr-TR")} ₺).`;
      if (res.skippedNoShare > 0) msg += ` ${res.skippedNoShare} daire arsa payı boş olduğu için atlandı.`;
      msg += " Tutarları gözden geçirip elle düzeltebilirsiniz.";
      setCalcMsg(msg);
      setShowCalc(false);
      await load();
      setTimeout(() => setCalcMsg(""), 8000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Hesaplanamadı.");
    } finally { setCalcSaving(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    try {
      if (editTarget) {
        await api.put(`/apartments/${editTarget.id}`, {
          number: form.number, floor: Number(form.floor), type: form.type || null,
          squareMeters: form.squareMeters ? Number(form.squareMeters) : null,
          landShare: form.landShare ? Number(form.landShare) : null,
          monthlyDues: form.monthlyDues ? Number(form.monthlyDues) : null,
          status: form.status,
          ownerId: form.ownerId ? Number(form.ownerId) : null,
          residentId: form.residentId ? Number(form.residentId) : null,
        });
      } else {
        await api.post("/apartments", {
          blockId: Number(form.blockId), number: form.number, floor: Number(form.floor),
          type: form.type || null, squareMeters: form.squareMeters ? Number(form.squareMeters) : null,
          landShare: form.landShare ? Number(form.landShare) : null,
          monthlyDues: form.monthlyDues ? Number(form.monthlyDues) : null,
          status: form.status,
        });
      }
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "İşlem başarısız.");
    }
  }

  async function handleDelete(a: Apartment) {
    if (!confirm(`"${a.blockName} - Daire ${a.number}" silinsin mi?`)) return;
    try {
      await api.delete(`/apartments/${a.id}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  const residents = users.filter(u => u.role === "Resident" || u.role === "SiteAdmin" || u.role === "Manager");

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Daireler</h1>
          <p className="text-sm text-slate-500">{apartments.length} daire</p>
        </div>
        <div className="flex gap-2">
          <select value={filterBlock} onChange={e => setFilterBlock(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tüm Bloklar</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => setShowCalc(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-lg"
            title="Sabit Taban + Arsa Payı × Blok Çarpanı">
            🧮 Aidat Hesapla
          </button>
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">
            + Daire Ekle
          </button>
        </div>
      </div>

      {calcMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-2 text-sm">{calcMsg}</div>
      )}

      {/* Aidat Hesapla modalı */}
      {showCalc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-1">Aidat Hesapla</h3>
            <p className="text-sm text-slate-500 mb-4">
              Formül: <strong>Sabit Taban + (Arsa Payı × Blok Çarpanı)</strong>
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 mb-4">
              Örnek: Taban 4.400 + (Arsa Payı 4 × Çarpan 128 = 512) = 4.912 → 50&apos;ye yuvarla = <strong>4.900 ₺</strong>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Sabit Taban (₺)</label>
                <input type="number" step="0.01" value={calcBase} onChange={e => setCalcBase(e.target.value)}
                  placeholder="Örn: 4400"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-400 mt-1">Tüm dairelere eklenen ortak taban tutar. (Ayarlar&apos;a da kaydedilir.)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Yuvarlama</label>
                <select value={calcRound} onChange={e => setCalcRound(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="0">Yuvarlama yok</option>
                  <option value="10">En yakın 10&apos;a</option>
                  <option value="50">En yakın 50&apos;ye</option>
                  <option value="100">En yakın 100&apos;e</option>
                </select>
              </div>
            </div>

            {/* Blok çarpan durumu */}
            <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">Blok Çarpanları</div>
              <div className="divide-y divide-slate-100">
                {blocks.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{b.name}</span>
                    {b.duesCoefficient > 0
                      ? <span className="text-slate-600">çarpan: <strong>{b.duesCoefficient}</strong></span>
                      : <span className="text-orange-600 text-xs">⚠ çarpan girilmemiş (Bloklar sayfasından girin)</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mt-4">
              Hesaplama tüm dairelerin <strong>Aylık Aidat</strong> tutarının üzerine yazar. Arsa payı boş daireler atlanır. Sonradan tek tek elle düzeltebilirsiniz.
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={runCalculate} disabled={calcSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
                {calcSaving ? "Hesaplanıyor..." : "Hesapla ve Uygula"}
              </button>
              <button onClick={() => setShowCalc(false)}
                className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm">İptal</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editTarget ? "Daireyi Düzenle" : "Yeni Daire"}</h2>
          {formError && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {!editTarget && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Blok *</label>
                <select required value={form.blockId} onChange={e => setForm(f => ({ ...f, blockId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seçin</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Daire No *</label>
              <input required value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                placeholder="1, 2A, Zemin..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Kat</label>
              <input type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tip</label>
              <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                placeholder="2+1, 3+1..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">m²</label>
              <input type="number" value={form.squareMeters} onChange={e => setForm(f => ({ ...f, squareMeters: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Arsa Payı</label>
              <input type="number" step="0.01" value={form.landShare} onChange={e => setForm(f => ({ ...f, landShare: e.target.value }))}
                placeholder="Örn: 10"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Aylık Aidat (₺)</label>
              <input type="number" step="0.01" value={form.monthlyDues} onChange={e => setForm(f => ({ ...f, monthlyDues: e.target.value }))}
                placeholder="Boş = formülle hesapla"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Durum</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            {editTarget && (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Mal Sahibi</label>
                  <select value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Seçin —</option>
                    {residents.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sakin</label>
                  <select value={form.residentId} onChange={e => setForm(f => ({ ...f, residentId: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Seçin —</option>
                    {residents.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="col-span-2 md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg">
                {editTarget ? "Güncelle" : "Kaydet"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Blok / Daire</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Kat</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Tip / m²</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Arsa Payı</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Aylık Aidat</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Sakin</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Durum</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apartments.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">Daire yok.</td></tr>
                ) : apartments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium">{a.blockName} · {a.number}</td>
                    <td className="px-5 py-3 text-slate-500">{a.floor}. kat</td>
                    <td className="px-5 py-3 text-slate-500">{a.type ?? "—"}{a.squareMeters ? ` · ${a.squareMeters}m²` : ""}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{a.landShare ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-right font-medium">{a.monthlyDues ? formatCurrency(a.monthlyDues) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3">{a.residentName ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[a.status]}`}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(a)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                        <button onClick={() => handleDelete(a)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium">Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DairelerPage() {
  return <Suspense fallback={<div className="text-slate-400 text-sm">Yükleniyor...</div>}><DaireContent /></Suspense>;
}
