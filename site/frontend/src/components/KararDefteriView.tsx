"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { getAuth, isManager } from "@/lib/auth";

type Decision = {
  id: number; number: number; title: string; content: string;
  decisionDate: string; result: string; meetingId?: number; createdAt: string;
};

const RESULT: Record<string, { label: string; color: string }> = {
  Accepted: { label: "Kabul Edildi", color: "bg-green-100 text-green-700" },
  Rejected: { label: "Reddedildi", color: "bg-red-100 text-red-700" },
  Postponed: { label: "Ertelendi", color: "bg-yellow-100 text-yellow-700" },
};

export default function KararDefteriView() {
  const auth = getAuth();
  const canEdit = auth ? isManager(auth.role) : false;
  const isAdmin = auth?.role === "SiteAdmin";

  const [items, setItems] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Decision | null>(null);
  const [form, setForm] = useState({ title: "", content: "", decisionDate: "", result: "Accepted" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setItems(await api.get<Decision[]>("/decisions")); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ title: "", content: "", decisionDate: new Date().toISOString().slice(0, 10), result: "Accepted" });
    setError(""); setShowForm(true);
  }
  function openEdit(d: Decision) {
    setEditTarget(d);
    setForm({ title: d.title, content: d.content, decisionDate: d.decisionDate, result: d.result });
    setError(""); setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = { ...form, meetingId: null };
    try {
      if (editTarget) await api.put(`/decisions/${editTarget.id}`, payload);
      else await api.post("/decisions", payload);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally { setSaving(false); }
  }

  async function remove(d: Decision) {
    if (!confirm(`${d.number} no'lu karar silinsin mi?`)) return;
    try { await api.delete(`/decisions/${d.id}`); await load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Silinemedi."); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Karar Defteri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Yönetim kararlarının resmi kaydı</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
            + Karar Ekle
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editTarget ? `Kararı Düzenle (No: ${editTarget.number})` : "Yeni Karar"}</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={submit} className="space-y-3">
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Karar başlığı"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={4} placeholder="Karar metni..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Karar Tarihi</label>
                <input type="date" required value={form.decisionDate} onChange={e => setForm(f => ({ ...f, decisionDate: e.target.value }))}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Sonuç</label>
                <select value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Accepted">Kabul Edildi</option>
                  <option value="Rejected">Reddedildi</option>
                  <option value="Postponed">Ertelendi</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                {saving ? "Kaydediliyor..." : editTarget ? "Güncelle" : "Kaydet"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Henüz karar kaydı yok.</div>
          ) : items.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded">Karar No: {d.number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${RESULT[d.result]?.color}`}>{RESULT[d.result]?.label ?? d.result}</span>
                    <span className="text-xs text-slate-400">{formatDate(d.decisionDate)}</span>
                  </div>
                  <div className="font-medium text-slate-900">{d.title}</div>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{d.content}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                    {isAdmin && <button onClick={() => remove(d)} className="text-red-400 hover:text-red-600 text-xs font-medium">Sil</button>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
