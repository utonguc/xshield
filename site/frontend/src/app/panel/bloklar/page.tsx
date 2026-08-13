"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Block = { id: number; name: string; floorCount: number; duesCoefficient: number; apartmentCount: number; createdAt: string };

export default function BloklarPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Block | null>(null);
  const [form, setForm] = useState({ name: "", floorCount: "1", duesCoefficient: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setBlocks(await api.get<Block[]>("/blocks")); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ name: "", floorCount: "1", duesCoefficient: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(b: Block) {
    setEditTarget(b);
    setForm({ name: b.name, floorCount: String(b.floorCount), duesCoefficient: b.duesCoefficient ? String(b.duesCoefficient) : "" });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const payload = { name: form.name, floorCount: Number(form.floorCount), duesCoefficient: form.duesCoefficient ? Number(form.duesCoefficient) : 0 };
      if (editTarget) {
        await api.put(`/blocks/${editTarget.id}`, payload);
      } else {
        await api.post("/blocks", payload);
      }
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu bloğu silmek istediğinize emin misiniz? İçindeki tüm daireler de silinecektir.")) return;
    try {
      await api.delete(`/blocks/${id}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bloklar & Daireler</h1>
          <p className="text-sm text-slate-500 mt-0.5">{blocks.length} blok · {blocks.reduce((s, b) => s + b.apartmentCount, 0)} daire</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          + Blok Ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editTarget ? "Bloğu Düzenle" : "Yeni Blok"}</h2>
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Blok Adı</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Örn: A Blok"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="w-28">
              <label className="text-xs text-slate-500 mb-1 block">Kat Sayısı</label>
              <input type="number" min={1} max={60} required value={form.floorCount}
                onChange={e => setForm(f => ({ ...f, floorCount: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="w-32">
              <label className="text-xs text-slate-500 mb-1 block" title="Aidat = Taban + Arsa Payı × Çarpan">Aidat Çarpanı</label>
              <input type="number" step="0.01" value={form.duesCoefficient}
                onChange={e => setForm(f => ({ ...f, duesCoefficient: e.target.value }))}
                placeholder="Örn: 128"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
              {editTarget ? "Güncelle" : "Kaydet"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-slate-500 hover:text-slate-700 px-3 py-2 text-sm">İptal</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Yükleniyor...</div>
      ) : blocks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <div className="text-4xl mb-3">🏢</div>
          <div className="text-slate-500 text-sm">Henüz blok eklenmemiş.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blocks.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-slate-900">{b.name}</div>
                  <div className="text-xs text-slate-400">
                    {b.floorCount} kat · {b.apartmentCount} daire
                    {b.duesCoefficient > 0 && ` · çarpan ${b.duesCoefficient}`}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(b)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                  <button onClick={() => handleDelete(b.id)}
                    className="text-red-400 hover:text-red-600 text-xs">Sil</button>
                </div>
              </div>
              <Link href={`/panel/daireler?blockId=${b.id}`}
                className="text-sm text-blue-600 hover:underline">
                Daireleri Gör →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
