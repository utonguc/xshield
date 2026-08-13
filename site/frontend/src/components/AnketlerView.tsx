"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { getAuth, isManager } from "@/lib/auth";

type Option = { id: number; text: string; voteCount: number; percent: number };
type Survey = {
  id: number; question: string; description?: string; isClosed: boolean; endsAt?: string;
  totalVotes: number; myVoteOptionId?: number | null; options: Option[]; createdAt: string;
};

export default function AnketlerView() {
  const auth = getAuth();
  const canManage = auth ? isManager(auth.role) : false;

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", description: "", endsAt: "", options: ["", ""] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setSurveys(await api.get<Survey[]>("/surveys")); }
    finally { setLoading(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/surveys", {
        question: form.question, description: form.description || null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        options: form.options.filter(o => o.trim()),
      });
      setShowForm(false);
      setForm({ question: "", description: "", endsAt: "", options: ["", ""] });
      await load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Oluşturulamadı."); }
    finally { setSaving(false); }
  }

  async function vote(surveyId: number, optionId: number) {
    try {
      const updated = await api.post<Survey>(`/surveys/${surveyId}/vote`, { optionId });
      setSurveys(prev => prev.map(s => s.id === surveyId ? updated : s));
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Oy kullanılamadı."); }
  }

  async function close(s: Survey) {
    if (!confirm("Anket kapatılsın mı? Yeni oy kabul edilmez.")) return;
    await api.post(`/surveys/${s.id}/close`, {});
    await load();
  }
  async function remove(s: Survey) {
    if (!confirm("Anket silinsin mi?")) return;
    await api.delete(`/surveys/${s.id}`);
    await load();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Anketler</h1>
          <p className="text-sm text-slate-500 mt-0.5">Site sakinlerine yönelik görüş anketleri</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
            + Anket Oluştur
          </button>
        )}
      </div>

      {showForm && canManage && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">Yeni Anket</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={create} className="space-y-3">
            <input required value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="Soru (örn: Cephe boyansın mı?)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Açıklama (opsiyonel)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Seçenekler</label>
              <div className="space-y-2">
                {form.options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={o} onChange={e => setForm(f => ({ ...f, options: f.options.map((x, j) => j === i ? e.target.value : x) }))}
                      placeholder={`Seçenek ${i + 1}`}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                        className="text-red-400 hover:text-red-600 text-sm px-2">×</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, options: [...f.options, ""] }))}
                className="text-blue-600 hover:underline text-xs mt-2">+ Seçenek ekle</button>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Bitiş Tarihi (opsiyonel)</label>
              <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                {saving ? "Oluşturuluyor..." : "Oluştur"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-4">
          {surveys.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Henüz anket yok.</div>
          ) : surveys.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-medium text-slate-900">{s.question}</div>
                {s.isClosed && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">Kapandı</span>}
              </div>
              {s.description && <p className="text-sm text-slate-500 mb-3">{s.description}</p>}

              <div className="space-y-2 mt-3">
                {s.options.map(o => {
                  const mine = s.myVoteOptionId === o.id;
                  const showResults = s.isClosed || s.myVoteOptionId != null;
                  return (
                    <button key={o.id} disabled={s.isClosed} onClick={() => vote(s.id, o.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 relative overflow-hidden transition-colors ${
                        mine ? "border-blue-500" : "border-slate-200 hover:border-slate-300"
                      } ${s.isClosed ? "cursor-default" : "cursor-pointer"}`}>
                      {showResults && (
                        <div className="absolute inset-0 bg-blue-50" style={{ width: `${o.percent}%` }} />
                      )}
                      <div className="relative flex items-center justify-between text-sm">
                        <span className={mine ? "font-medium text-blue-700" : "text-slate-700"}>
                          {mine && "✓ "}{o.text}
                        </span>
                        {showResults && <span className="text-slate-500 text-xs">{o.voteCount} oy · %{o.percent}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-slate-400">
                  {s.totalVotes} oy
                  {s.endsAt && ` · Bitiş: ${formatDateTime(s.endsAt)}`}
                  {s.myVoteOptionId == null && !s.isClosed && " · Oy kullanmak için bir seçeneğe tıklayın"}
                </div>
                {canManage && (
                  <div className="flex gap-3 flex-shrink-0">
                    {!s.isClosed && <button onClick={() => close(s)} className="text-xs text-slate-500 hover:text-slate-700">Kapat</button>}
                    <button onClick={() => remove(s)} className="text-xs text-red-400 hover:text-red-600">Sil</button>
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
