"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type User = {
  id: number; fullName: string; email: string; phone?: string;
  role: string; isActive: boolean; createdAt: string; apartments: string[];
};

const roleLabel: Record<string, string> = { SiteAdmin: "Yönetici", Manager: "Görevli", Resident: "Sakin" };
const roleColor: Record<string, string> = {
  SiteAdmin: "bg-purple-100 text-purple-700", Manager: "bg-blue-100 text-blue-700", Resident: "bg-slate-100 text-slate-600",
};

export default function KullanicilarPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [newForm, setNewForm] = useState({ fullName: "", email: "", password: "", phone: "", role: "Resident" });
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", role: "Resident", isActive: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setUsers(await api.get<User[]>("/users")); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditTarget(null);
    setNewForm({ fullName: "", email: "", password: "", phone: "", role: "Resident" });
    setError("");
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditForm({ fullName: u.fullName, phone: u.phone ?? "", role: u.role, isActive: u.isActive });
    setError("");
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/users", newForm);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setError("");
    try {
      await api.put(`/users/${editTarget.id}`, editForm);
      setShowForm(false);
      setEditTarget(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally { setSaving(false); }
  }

  async function resetPassword(u: User) {
    const newPwd = prompt(`${u.fullName} için yeni şifre girin (en az 6 karakter):`);
    if (!newPwd) return;
    if (newPwd.length < 6) { alert("Şifre en az 6 karakter olmalıdır."); return; }
    try {
      await api.post(`/users/${u.id}/reset-password`, { newPassword: newPwd });
      alert(`${u.fullName} şifresi başarıyla sıfırlandı.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Şifre sıfırlanamadı.");
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`"${u.fullName}" kullanıcısı silinsin mi?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Kullanıcılar</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} kullanıcı</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Kullanıcı Ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editTarget ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

          {editTarget ? (
            <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ad Soyad</label>
                <input required value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Telefon</label>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Rol</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Resident">Sakin</option>
                  <option value="Manager">Görevli</option>
                  <option value="SiteAdmin">Yönetici</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="isActive" checked={editForm.isActive}
                  onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} />
                <label htmlFor="isActive" className="text-sm text-slate-600">Aktif</label>
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                  {saving ? "Kaydediliyor..." : "Güncelle"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }}
                  className="text-slate-500 text-sm px-3">İptal</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ad Soyad</label>
                <input required value={newForm.fullName} onChange={e => setNewForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">E-posta</label>
                <input type="email" required value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Şifre</label>
                <input type="password" required value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Telefon</label>
                <input value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Rol</label>
                <select value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Resident">Sakin</option>
                  <option value="Manager">Görevli</option>
                  <option value="SiteAdmin">Yönetici</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Kullanıcı yok.</div>
            ) : users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{u.fullName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[u.role]}`}>
                      {roleLabel[u.role] ?? u.role}
                    </span>
                    {!u.isActive && <span className="text-xs text-red-500">Pasif</span>}
                  </div>
                  <div className="text-xs text-slate-400">{u.email}{u.phone && ` · ${u.phone}`}</div>
                  {u.apartments.length > 0 && (
                    <div className="text-xs text-slate-400">{u.apartments.join(", ")}</div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(u)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                  <button onClick={() => resetPassword(u)}
                    className="text-amber-500 hover:text-amber-700 text-xs font-medium">Şifre Sıfırla</button>
                  <button onClick={() => handleDelete(u)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium">Sil</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
