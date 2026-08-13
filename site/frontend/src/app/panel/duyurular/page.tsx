"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, CATEGORY_LABELS } from "@/lib/utils";

type Announcement = {
  id: number; title: string; content: string; isPinned: boolean;
  category: string; createdById: number; createdAt: string; expiresAt?: string;
};

const categoryColor: Record<string, string> = {
  General: "bg-slate-100 text-slate-600", Maintenance: "bg-orange-100 text-orange-700",
  Meeting: "bg-blue-100 text-blue-700", Security: "bg-red-100 text-red-700",
  Financial: "bg-green-100 text-green-700", Emergency: "bg-red-600 text-white",
};

export default function DuyurularPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", isPinned: false, category: "General", expiresAt: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setAnnouncements(await api.get<Announcement[]>("/announcements")); }
    finally { setLoading(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/announcements", {
      ...form,
      expiresAt: form.expiresAt || null
    });
    setShowForm(false);
    setForm({ title: "", content: "", isPinned: false, category: "General", expiresAt: "" });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Duyuru silinsin mi?")) return;
    await api.delete(`/announcements/${id}`);
    await load();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Duyurular</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Duyuru Ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">Yeni Duyuru</h2>
          <form onSubmit={create} className="space-y-3">
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Başlık"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Duyuru içeriği..." rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-3 items-center flex-wrap">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["General", "Maintenance", "Meeting", "Security", "Financial", "Emergency"].map(c =>
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.isPinned}
                  onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} />
                Sabitle
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Bitiş tarihi:</label>
                <input type="datetime-local" value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg">Yayınla</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Duyuru yok.</div>
          ) : announcements.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {a.isPinned && <span className="text-xs">📌</span>}
                    <span className="font-medium text-slate-900">{a.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor[a.category]}`}>
                      {CATEGORY_LABELS[a.category] ?? a.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>
                  <div className="text-xs text-slate-400 mt-2">{formatDateTime(a.createdAt)}</div>
                </div>
                <button onClick={() => remove(a.id)}
                  className="text-red-400 hover:text-red-600 text-xs flex-shrink-0">Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
