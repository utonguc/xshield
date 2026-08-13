"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type Permit = {
  id: number; plateNumber: string; ownerName?: string; apartmentId?: number; apartmentLabel?: string;
  vehicleInfo?: string; permitType: string; validUntil?: string; isActive: boolean; expired: boolean; note?: string;
};
type Apartment = { id: number; blockName: string; number: string };
type CheckResult = { authorized: boolean; plate: string; permit?: Permit; message: string };

const TYPE_LABELS: Record<string, string> = {
  Resident: "Sakin", Guest: "Misafir", Temporary: "Geçici", Other: "Diğer",
};
const typeColor: Record<string, string> = {
  Resident: "bg-green-100 text-green-700", Guest: "bg-blue-100 text-blue-700",
  Temporary: "bg-orange-100 text-orange-700", Other: "bg-slate-100 text-slate-600",
};

export default function OtoparkPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  // Kapı sorgusu
  const [checkPlate, setCheckPlate] = useState("");
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Permit | null>(null);
  const emptyForm = { plateNumber: "", ownerName: "", apartmentId: "", vehicleInfo: "", permitType: "Resident", validUntil: "", note: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.get<Apartment[]>("/apartments").then(setApartments).catch(() => {}); }, []);
  useEffect(() => { load(); }, [filterType]);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterType) q.set("type", filterType);
      if (search) q.set("search", search);
      const qs = q.toString() ? `?${q}` : "";
      setPermits(await api.get<Permit[]>(`/parking${qs}`));
    } finally { setLoading(false); }
  }

  async function runCheck(e?: React.FormEvent) {
    e?.preventDefault();
    if (!checkPlate.trim()) return;
    setChecking(true);
    try {
      setCheckResult(await api.get<CheckResult>(`/parking/check?plate=${encodeURIComponent(checkPlate)}`));
    } finally { setChecking(false); }
  }

  function openCreate() {
    setEditTarget(null); setForm({ ...emptyForm, plateNumber: checkResult && !checkResult.authorized ? checkPlate.toUpperCase() : "" });
    setError(""); setShowForm(true);
  }
  function openEdit(p: Permit) {
    setEditTarget(p);
    setForm({
      plateNumber: p.plateNumber, ownerName: p.ownerName ?? "", apartmentId: p.apartmentId ? String(p.apartmentId) : "",
      vehicleInfo: p.vehicleInfo ?? "", permitType: p.permitType, validUntil: p.validUntil ?? "", note: p.note ?? "",
    });
    setError(""); setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = {
      plateNumber: form.plateNumber, ownerName: form.ownerName || null,
      apartmentId: form.apartmentId ? Number(form.apartmentId) : null,
      vehicleInfo: form.vehicleInfo || null, permitType: form.permitType,
      validUntil: form.validUntil || null, note: form.note || null,
    };
    try {
      if (editTarget) await api.put(`/parking/${editTarget.id}`, payload);
      else await api.post("/parking", payload);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function toggle(p: Permit) {
    await api.post(`/parking/${p.id}/toggle`, {});
    await load();
  }
  async function remove(p: Permit) {
    if (!confirm(`${p.plateNumber} plakası silinsin mi?`)) return;
    await api.delete(`/parking/${p.id}`);
    await load();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Otopark — Plaka İzinleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Giriş izinli araç plakaları</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Plaka Ekle
        </button>
      </div>

      {/* Kapı sorgusu */}
      <div className="bg-slate-900 rounded-xl p-5">
        <div className="text-white font-medium mb-3">🚧 Kapı Sorgusu</div>
        <form onSubmit={runCheck} className="flex gap-2">
          <input value={checkPlate} onChange={e => setCheckPlate(e.target.value.toUpperCase())}
            placeholder="Plaka girin (34 ABC 123)"
            className="flex-1 rounded-lg px-4 py-3 text-lg font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button type="submit" disabled={checking || !checkPlate.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 rounded-lg font-medium">
            {checking ? "..." : "Sorgula"}
          </button>
        </form>
        {checkResult && (
          <div className={`mt-3 rounded-lg p-4 ${checkResult.authorized ? "bg-green-500" : "bg-red-500"} text-white`}>
            <div className="text-lg font-bold">{checkResult.message}</div>
            {checkResult.permit && (
              <div className="text-sm mt-1 opacity-90">
                {checkResult.permit.plateNumber}
                {checkResult.permit.ownerName && ` · ${checkResult.permit.ownerName}`}
                {checkResult.permit.apartmentLabel && ` · ${checkResult.permit.apartmentLabel}`}
                {checkResult.permit.vehicleInfo && ` · ${checkResult.permit.vehicleInfo}`}
                {` · ${TYPE_LABELS[checkResult.permit.permitType] ?? checkResult.permit.permitType}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editTarget ? "Plaka Düzenle" : "Yeni Plaka İzni"}</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Plaka *</label>
              <input required value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value.toUpperCase() }))}
                placeholder="34 ABC 123"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">İzin Türü</label>
              <select value={form.permitType} onChange={e => setForm(f => ({ ...f, permitType: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Araç Sahibi / Sürücü</label>
              <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Daire</label>
              <select value={form.apartmentId} onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Seçin —</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.blockName} · {a.number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Araç (marka/model/renk)</label>
              <input value={form.vehicleInfo} onChange={e => setForm(f => ({ ...f, vehicleInfo: e.target.value }))}
                placeholder="Beyaz Renault Clio"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Geçerlilik Sonu (geçici izinler)</label>
              <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Not</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                {saving ? "Kaydediliyor..." : editTarget ? "Güncelle" : "Kaydet"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtre + arama */}
      <div className="flex gap-2 flex-wrap">
        <form onSubmit={e => { e.preventDefault(); load(); }} className="flex gap-2 flex-1 min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Plaka veya sahip ara..."
            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="border border-slate-300 px-3 py-1.5 rounded-lg text-sm text-slate-600">Ara</button>
        </form>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tüm Türler</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-2">
          {permits.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Kayıtlı plaka yok.</div>
          ) : permits.map(p => (
            <div key={p.id} className={`bg-white rounded-xl border p-4 ${!p.isActive || p.expired ? "border-slate-200 opacity-60" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base tracking-wide">{p.plateNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[p.permitType]}`}>{TYPE_LABELS[p.permitType] ?? p.permitType}</span>
                    {!p.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Pasif</span>}
                    {p.expired && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Süresi Doldu</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {p.ownerName && `${p.ownerName} · `}{p.apartmentLabel && `🏠 ${p.apartmentLabel} · `}{p.vehicleInfo}
                  </div>
                  {p.validUntil && <div className="text-xs text-slate-400">Geçerlilik: {formatDate(p.validUntil)}</div>}
                  {p.note && <div className="text-xs text-slate-500 mt-0.5">{p.note}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggle(p)} className={`text-xs px-2 py-1 rounded-md ${p.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}`}>
                    {p.isActive ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                  <button onClick={() => remove(p)} className="text-red-400 hover:text-red-600 text-xs">Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
