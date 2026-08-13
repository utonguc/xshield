"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, STATUS_LABELS } from "@/lib/utils";

type Meeting = {
  id: number; title: string; description?: string; agenda?: string;
  meetingDate: string; location?: string; status: string; minutes?: string;
  createdById: number; createdAt: string;
};

const statusColor: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-700", Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700", Postponed: "bg-yellow-100 text-yellow-700",
};

const emptyForm = { title: "", description: "", agenda: "", meetingDate: "", location: "", status: "Scheduled", minutes: "" };

export default function ToplantılarPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setMeetings(await api.get<Meeting[]>("/meetings")); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(m: Meeting) {
    setEditTarget(m);
    setForm({
      title: m.title, description: m.description ?? "", agenda: m.agenda ?? "",
      meetingDate: m.meetingDate.slice(0, 16),
      location: m.location ?? "", status: m.status, minutes: m.minutes ?? "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      if (editTarget) {
        await api.put(`/meetings/${editTarget.id}`, {
          title: form.title, description: form.description || null,
          agenda: form.agenda || null, meetingDate: form.meetingDate,
          location: form.location || null, status: form.status,
          minutes: form.minutes || null,
        });
      } else {
        await api.post("/meetings", {
          title: form.title, description: form.description || null,
          agenda: form.agenda || null, meetingDate: form.meetingDate,
          location: form.location || null,
        });
      }
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu toplantı silinsin mi?")) return;
    try {
      await api.delete(`/meetings/${id}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Toplantı Takvimi</h1>
        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Toplantı Ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editTarget ? "Toplantıyı Düzenle" : "Yeni Toplantı"}</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Toplantı başlığı"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tarih & Saat</label>
                <input type="datetime-local" required value={form.meetingDate}
                  onChange={e => setForm(f => ({ ...f, meetingDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Yer</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Toplantı salonu..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {editTarget && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Durum</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {["Scheduled", "Completed", "Cancelled", "Postponed"].map(s =>
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            )}
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Açıklama" rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <textarea value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
              placeholder="Gündem maddeleri" rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            {editTarget && (
              <textarea value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))}
                placeholder="Toplantı tutanağı..." rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            )}
            <div className="flex gap-2">
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
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Planlanmış toplantı yok.</div>
          ) : meetings.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{m.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    📅 {formatDateTime(m.meetingDate)}{m.location && ` · 📍 ${m.location}`}
                  </div>
                  {m.agenda && <div className="text-xs text-slate-500 mt-1 line-clamp-1">Gündem: {m.agenda}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[m.status]}`}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                  <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
