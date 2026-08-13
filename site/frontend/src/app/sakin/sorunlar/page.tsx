"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from "@/lib/utils";

type Issue = { id: number; title: string; description: string; status: string; priority: string; category: string; createdAt: string };

export default function SakinSorunlarPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "Medium", category: "Other" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setIssues(await api.get<Issue[]>("/issues")); }
    finally { setLoading(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/issues", { ...form, apartmentId: null });
    setShowForm(false);
    setForm({ title: "", description: "", priority: "Medium", category: "Other" });
    await load();
  }

  const statusColor: Record<string, string> = {
    Open: "bg-blue-100 text-blue-700", InProgress: "bg-purple-100 text-purple-700",
    Resolved: "bg-green-100 text-green-700", Closed: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Sorunlarım</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Sorun Bildir
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <form onSubmit={create} className="space-y-3">
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Sorun başlığı"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detaylı açıklama..." rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-2">
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Low", "Medium", "High"].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Electrical", "Plumbing", "Elevator", "Common", "Security", "Cleaning", "Other"].map(c =>
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg">Gönder</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Bildirdiğiniz sorun yok.
            </div>
          ) : issues.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{i.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(i.createdAt)}</div>
                </div>
                <div className="flex gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[i.status]}`}>
                    {STATUS_LABELS[i.status]}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2">{i.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
