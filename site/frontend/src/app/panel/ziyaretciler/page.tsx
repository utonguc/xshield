"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

type Visitor = {
  id: number; fullName: string; phone?: string; apartmentId?: number; apartmentLabel?: string;
  plateNumber?: string; note?: string; entryTime: string; exitTime?: string; inside: boolean; createdAt: string;
};
type Apartment = { id: number; blockName: string; number: string };

export default function ZiyaretcilerPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"inside" | "all">("inside");
  const [date, setDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", apartmentId: "", plateNumber: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.get<Apartment[]>("/apartments").then(setApartments).catch(() => {}); }, []);
  useEffect(() => { load(); }, [filter, date]);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filter === "inside") q.set("status", "inside");
      if (date) q.set("date", date);
      const qs = q.toString() ? `?${q}` : "";
      setVisitors(await api.get<Visitor[]>(`/visitors${qs}`));
    } finally { setLoading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/visitors", {
        fullName: form.fullName, phone: form.phone || null,
        apartmentId: form.apartmentId ? Number(form.apartmentId) : null,
        plateNumber: form.plateNumber || null, note: form.note || null, entryTime: null,
      });
      setForm({ fullName: "", phone: "", apartmentId: "", plateNumber: "", note: "" });
      setShowForm(false);
      setFilter("inside");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function markExit(v: Visitor) {
    try { await api.post(`/visitors/${v.id}/exit`, {}); await load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Hata"); }
  }
  async function remove(v: Visitor) {
    if (!confirm(`${v.fullName} kaydı silinsin mi?`)) return;
    try { await api.delete(`/visitors/${v.id}`); await load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Hata"); }
  }

  function exportPdf() {
    const tarih = new Date().toLocaleString("tr-TR");
    const rows = visitors.map((v, i) => `
      <tr class="${v.inside ? "in" : ""}">
        <td>${i + 1}</td><td>${v.fullName}</td><td>${v.phone ?? "—"}</td>
        <td>${v.apartmentLabel ?? "—"}</td><td>${v.plateNumber ?? "—"}</td>
        <td>${new Date(v.entryTime).toLocaleString("tr-TR")}</td>
        <td>${v.exitTime ? new Date(v.exitTime).toLocaleString("tr-TR") : "İÇERİDE"}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Ziyaretçi Defteri</title><style>
*{font-family:'Segoe UI',Arial,sans-serif}body{margin:20px;color:#1e293b}h1{font-size:17px;margin:0 0 4px}
.sub{color:#64748b;font-size:11px;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f1f5f9;text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0}tr.in{background:#fffbeb}
</style></head><body>
<h1>Ziyaretçi Defteri</h1><div class="sub">Oluşturulma: ${tarih} · ${visitors.length} kayıt</div>
<table><thead><tr><th>#</th><th>Ad Soyad</th><th>Telefon</th><th>Daire</th><th>Plaka</th><th>Giriş</th><th>Çıkış</th></tr></thead>
<tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Açılır pencere engellendi."); return; }
    w.document.write(html); w.document.close();
  }

  const insideCount = visitors.filter(v => v.inside).length;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ziyaretçi Defteri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Giriş-çıkış kayıtları</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPdf} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg">📄 PDF</button>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">+ Ziyaretçi Girişi</button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">Yeni Ziyaretçi Girişi</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Ad Soyad *</label>
              <input required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Telefon</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Ziyaret Edilen Daire</label>
              <select value={form.apartmentId} onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Seçin —</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.blockName} · {a.number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Araç Plakası</label>
              <input value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value.toUpperCase() }))}
                placeholder="34 ABC 123"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Not</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Kargo, misafir, tadilat..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                {saving ? "Kaydediliyor..." : "Giriş Kaydet"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button onClick={() => setFilter("inside")} className={`px-3 py-1.5 ${filter === "inside" ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>
            İçeridekiler {filter === "inside" && insideCount > 0 ? `(${insideCount})` : ""}
          </button>
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 ${filter === "all" ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>
            Tümü
          </button>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {date && <button onClick={() => setDate("")} className="text-xs text-slate-500 hover:underline">Tarihi temizle</button>}
      </div>

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-2">
          {visitors.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Kayıt yok.</div>
          ) : visitors.map(v => (
            <div key={v.id} className={`bg-white rounded-xl border p-4 ${v.inside ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{v.fullName}</span>
                    {v.inside
                      ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">İçeride</span>
                      : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Çıktı</span>}
                    {v.plateNumber && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{v.plateNumber}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {v.apartmentLabel && `🏠 ${v.apartmentLabel} · `}{v.phone && `📞 ${v.phone}`}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Giriş: {formatDateTime(v.entryTime)}{v.exitTime && ` · Çıkış: ${formatDateTime(v.exitTime)}`}
                  </div>
                  {v.note && <div className="text-xs text-slate-500 mt-0.5">{v.note}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {v.inside && (
                    <button onClick={() => markExit(v)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md">
                      Çıkış Yap
                    </button>
                  )}
                  <button onClick={() => remove(v)} className="text-red-400 hover:text-red-600 text-xs">Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
