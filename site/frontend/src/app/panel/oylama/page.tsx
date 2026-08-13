"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { getAuth } from "@/lib/auth";

type Voter = { fullName: string; inFavor: boolean; votedAt: string };
type Vote = {
  id: number; reason: string; status: string;
  startsAt: string; endsAt: string; quorumPercent: number;
  nominee: { id: number; fullName: string; email: string };
  startedBy: { id: number; fullName: string };
  yesCount: number; noCount: number; totalVoters: number; totalEligible: number;
  participationPercent: number; yesPercent: number;
  myVote: boolean | null;
  voters: Voter[];
};
type User = { id: number; fullName: string; email: string; role: string };

const STATUS: Record<string, { label: string; color: string }> = {
  Active:    { label: "Oylama Devam Ediyor", color: "bg-blue-100 text-blue-700" },
  Passed:    { label: "Kabul Edildi ✅", color: "bg-green-100 text-green-700" },
  Failed:    { label: "Reddedildi ❌", color: "bg-red-100 text-red-700" },
  Cancelled: { label: "İptal Edildi", color: "bg-slate-100 text-slate-500" },
};

export default function OylamaPage() {
  const auth = getAuth();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Vote | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [form, setForm] = useState({ nomineeId: "", reason: "", durationHours: "48" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [v, u] = await Promise.all([
        api.get<Vote[]>("/votes"),
        api.get<User[]>("/votes/eligible-users"),
      ]);
      setVotes(v);
      setUsers(u);
    } finally { setLoading(false); }
  }

  async function refreshSelected(id: number) {
    const v = await api.get<Vote>(`/votes/${id}`);
    setSelected(v);
    setVotes(prev => prev.map(x => x.id === id ? v : x));
  }

  async function startVote(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/votes", {
        nomineeId: Number(form.nomineeId),
        reason: form.reason,
        durationHours: Number(form.durationHours),
      });
      setShowStart(false);
      setForm({ nomineeId: "", reason: "", durationHours: "48" });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Oylama başlatılamadı.");
    } finally { setSaving(false); }
  }

  async function castVote(voteId: number, inFavor: boolean) {
    try {
      await api.post(`/votes/${voteId}/cast`, { inFavor });
      await refreshSelected(voteId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Oy kullanılamadı.");
    }
  }

  async function cancelVote(voteId: number) {
    if (!confirm("Oylamayı iptal etmek istiyor musunuz?")) return;
    try {
      await api.post(`/votes/${voteId}/cancel`, {});
      await load();
      setSelected(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "İptal edilemedi.");
    }
  }

  const activeVote = votes.find(v => v.status === "Active");
  const eligibleNominees = users;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Yönetici Oylaması</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sakinlerin oy çokluğuyla yönetici değişikliği</p>
        </div>
        {!activeVote && (
          <button onClick={() => setShowStart(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
            + Oylama Başlat
          </button>
        )}
      </div>

      {/* Nasıl çalışır */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        <div className="font-medium mb-2">Demokratik Yönetim Devri Nasıl Çalışır?</div>
        <ul className="space-y-1 text-slate-500">
          <li>• Herhangi bir sakin, yeni yönetici adayı gösterebilir</li>
          <li>• Tüm sakinler 48 saat içinde Evet veya Hayır oyu kullanır</li>
          <li>• <strong>%30 katılım</strong> sağlanır ve oyların <strong>%51'i Evet</strong> çıkarsa transfer otomatik gerçekleşir</li>
          <li>• Eski yönetici "Görevli" rolüne, yeni yönetici "Site Yöneticisi" rolüne geçer</li>
          <li>• Aynı anda sadece bir oylama aktif olabilir</li>
        </ul>
      </div>

      {/* Oylama başlat formu */}
      {showStart && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">Yeni Yönetici Oylaması Başlat</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={startVote} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Aday Yönetici *</label>
              <select required value={form.nomineeId} onChange={e => setForm(f => ({ ...f, nomineeId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sakin seçin —</option>
                {eligibleNominees.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Gerekçe *</label>
              <textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3} placeholder="Neden yönetici değişikliği talep ediyorsunuz?"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Oylama Süresi</label>
              <select value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="24">24 saat</option>
                <option value="48">48 saat (önerilen)</option>
                <option value="72">72 saat</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
                {saving ? "Başlatılıyor..." : "Oylamayı Başlat"}
              </button>
              <button type="button" onClick={() => setShowStart(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Oylama listesi */}
      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="space-y-3">
          {votes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Henüz oylama yapılmamış.
            </div>
          ) : votes.map(v => (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Oylama başlığı */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[v.status]?.color}`}>
                        {STATUS[v.status]?.label ?? v.status}
                      </span>
                    </div>
                    <div className="font-medium">
                      <span className="text-blue-700">{v.nominee.fullName}</span> aday gösterildi
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {v.startedBy.fullName} tarafından · {formatDateTime(v.startsAt)}
                    </div>
                  </div>
                  {v.status === "Active" && (
                    <div className="text-right text-xs text-slate-400 flex-shrink-0">
                      <div>Bitiş:</div>
                      <div className="font-medium">{formatDateTime(v.endsAt)}</div>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-lg px-3 py-2">{v.reason}</p>

                {/* Oy dağılımı */}
                <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
                  <div className="bg-green-50 rounded-lg py-2">
                    <div className="text-lg font-bold text-green-600">{v.yesCount}</div>
                    <div className="text-xs text-green-700">Evet</div>
                  </div>
                  <div className="bg-red-50 rounded-lg py-2">
                    <div className="text-lg font-bold text-red-500">{v.noCount}</div>
                    <div className="text-xs text-red-600">Hayır</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <div className="text-lg font-bold text-slate-600">{v.totalVoters}/{v.totalEligible}</div>
                    <div className="text-xs text-slate-500">Katılım %{v.participationPercent}</div>
                  </div>
                </div>

                {/* İlerleme çubuğu */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Evet Oranı: %{v.yesPercent}</span>
                    <span>Gerekli: %{v.quorumPercent}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${v.yesPercent >= v.quorumPercent ? "bg-green-500" : "bg-blue-400"}`}
                      style={{ width: `${Math.min(100, v.yesPercent)}%` }} />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    %30 katılım + %51 evet oyu gerekli
                    {v.participationPercent >= 30 && v.yesPercent >= v.quorumPercent && (
                      <span className="text-green-600 ml-2 font-medium">✓ Koşullar sağlandı</span>
                    )}
                  </div>
                </div>

                {/* Oy kullan */}
                {v.status === "Active" && (
                  <div className="flex gap-3">
                    {v.myVote === null ? (
                      <>
                        <button onClick={() => castVote(v.id, true)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium">
                          👍 Evet, Destekliyorum
                        </button>
                        <button onClick={() => castVote(v.id, false)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium">
                          👎 Hayır, Desteklemiyorum
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center gap-3">
                        <div className={`flex-1 text-center py-2 rounded-lg text-sm font-medium ${
                          v.myVote ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {v.myVote ? "✓ Evet oyunuzu kullandınız" : "✓ Hayır oyunuzu kullandınız"}
                        </div>
                        <button onClick={() => castVote(v.id, !v.myVote)}
                          className="text-xs text-slate-500 hover:text-slate-700 underline whitespace-nowrap">
                          Oyumu Değiştir
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {v.status === "Active" && (v.startedBy.id === auth?.userId || auth?.role === "SiteAdmin") && (
                  <button onClick={() => cancelVote(v.id)}
                    className="mt-2 text-xs text-red-400 hover:text-red-600">
                    Oylamayı İptal Et
                  </button>
                )}
              </div>

              {/* Oy verenler listesi */}
              {v.voters.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3">
                  <div className="text-xs text-slate-400 mb-2">Oy Kullananlar</div>
                  <div className="flex flex-wrap gap-2">
                    {v.voters.map((voter, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                        voter.inFavor ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}>
                        {voter.inFavor ? "👍" : "👎"} {voter.fullName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {v.status === "Passed" && (
                <div className="bg-green-50 border-t border-green-200 px-5 py-3 text-sm text-green-800">
                  ✅ Oylama kabul edildi. <strong>{v.nominee.fullName}</strong> yeni site yöneticisi oldu.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
