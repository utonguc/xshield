"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from "@/lib/utils";

type Issue = {
  id: number; title: string; description: string; status: string; priority: string; category: string;
  apartmentId?: number; apartmentNumber?: string; blockName?: string;
  createdById: number; createdByName: string; assignedToId?: number; assignedToName?: string;
  resolution?: string; resolvedAt?: string; createdAt: string; updatedAt: string;
};

const priorityColor: Record<string, string> = {
  Critical: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700", Low: "bg-slate-100 text-slate-600",
};
const statusColor: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700", InProgress: "bg-purple-100 text-purple-700",
  Resolved: "bg-green-100 text-green-700", Closed: "bg-slate-100 text-slate-500",
};

export default function SorunlarPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [editTarget, setEditTarget] = useState<Issue | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [newForm, setNewForm] = useState({ title: "", description: "", priority: "Medium", category: "Other" });
  const [editForm, setEditForm] = useState({ title: "", description: "", status: "Open", priority: "Medium", category: "Other", resolution: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [filterStatus]);

  async function load() {
    setLoading(true);
    try {
      const q = filterStatus ? `?status=${filterStatus}` : "";
      setIssues(await api.get<Issue[]>(`/issues${q}`));
    } finally { setLoading(false); }
  }

  async function createIssue(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/issues", { ...newForm, apartmentId: null });
      setShowForm(false);
      setNewForm({ title: "", description: "", priority: "Medium", category: "Other" });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally { setSaving(false); }
  }

  function openEdit(issue: Issue) {
    setEditTarget(issue);
    setSelected(null);
    setEditForm({
      title: issue.title, description: issue.description, status: issue.status,
      priority: issue.priority, category: issue.category, resolution: issue.resolution ?? "",
    });
    setError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setError("");
    try {
      await api.put(`/issues/${editTarget.id}`, {
        title: editForm.title, description: editForm.description,
        status: editForm.status, priority: editForm.priority,
        category: editForm.category, assignedToId: editTarget.assignedToId ?? null,
        resolution: editForm.resolution || null,
      });
      setEditTarget(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally { setSaving(false); }
  }

  async function deleteIssue(id: number) {
    if (!confirm("Bu sorun kaydı silinsin mi?")) return;
    try {
      await api.delete(`/issues/${id}`);
      setSelected(null);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  if (editTarget) return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-600 text-sm">← Geri</button>
        <h1 className="text-xl font-semibold text-slate-900">Sorunu Düzenle</h1>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Başlık</label>
            <input required value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Açıklama</label>
            <textarea required value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Durum</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Open", "InProgress", "Resolved", "Closed"].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Öncelik</label>
              <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Low", "Medium", "High", "Critical"].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Kategori</label>
              <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Electrical", "Plumbing", "Elevator", "Common", "Security", "Cleaning", "Other"].map(c =>
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Çözüm Notu</label>
            <textarea value={editForm.resolution} onChange={e => setEditForm(f => ({ ...f, resolution: e.target.value }))}
              rows={2} placeholder="Yapılan işlem, çözüm detayı..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
              {saving ? "Kaydediliyor..." : "Güncelle"}
            </button>
            <button type="button" onClick={() => setEditTarget(null)} className="text-slate-500 text-sm px-3">İptal</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Sorunlar & Talepler</h1>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tümü</option>
            {["Open", "InProgress", "Resolved", "Closed"].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">
            + Sorun Bildir
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-3">Yeni Sorun</h2>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <form onSubmit={createIssue} className="space-y-3">
            <input required value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Sorun başlığı"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea required value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Açıklama..." rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-3">
              <select value={newForm.priority} onChange={e => setNewForm(f => ({ ...f, priority: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Low", "Medium", "High", "Critical"].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
              <select value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Electrical", "Plumbing", "Elevator", "Common", "Security", "Cleaning", "Other"].map(c =>
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">Kaydet</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-2">
          {issues.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Kayıtlı sorun yok.</div>
          ) : issues.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(i)}>
                  <div className="font-medium text-sm">{i.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {i.createdByName} · {formatDateTime(i.createdAt)}
                    {i.blockName && ` · ${i.blockName} D.${i.apartmentNumber}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor[i.priority]}`}>{PRIORITY_LABELS[i.priority]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[i.status]}`}>{STATUS_LABELS[i.status]}</span>
                  <button onClick={() => openEdit(i)} className="text-blue-600 hover:text-blue-800 text-xs font-medium ml-1">Düzenle</button>
                  <button onClick={() => deleteIssue(i.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-slate-600 mb-4">{selected.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-4">
              <div>Kategori: {CATEGORY_LABELS[selected.category]}</div>
              <div>Öncelik: {PRIORITY_LABELS[selected.priority]}</div>
              <div>Bildiren: {selected.createdByName}</div>
              {selected.assignedToName && <div>Atanan: {selected.assignedToName}</div>}
            </div>
            {selected.resolution && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
                <strong>Çözüm:</strong> {selected.resolution}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => openEdit(selected)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">Düzenle</button>
              <button onClick={() => deleteIssue(selected.id)}
                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg">Sil</button>
              <button onClick={() => setSelected(null)}
                className="border border-slate-300 text-slate-600 text-xs px-3 py-1.5 rounded-lg">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
