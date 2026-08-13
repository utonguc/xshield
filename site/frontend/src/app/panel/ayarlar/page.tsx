"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TIER_LABELS } from "@/lib/utils";
import { getAuth, clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Site = {
  id: number; name: string; address?: string; phone?: string; email?: string;
  taxNumber?: string; tier: string; monthlyPrice: number; duesBaseAmount: number; apartmentCount: number;
};
type User = { id: number; fullName: string; email: string; role: string; isActive: boolean };

export default function AyarlarPage() {
  const router = useRouter();
  const auth = getAuth();
  const isSiteAdmin = auth?.role === "SiteAdmin";

  const [site, setSite] = useState<Site | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", taxNumber: "", duesBaseAmount: "" });

  // Yönetim devri
  const [transferUserId, setTransferUserId] = useState("");
  const [transferPassword, setTransferPassword] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Site>("/site"),
      isSiteAdmin ? api.get<User[]>("/users") : Promise.resolve([]),
    ]).then(([s, u]) => {
      setSite(s);
      setUsers(u as User[]);
      setForm({ name: s.name, address: s.address ?? "", phone: s.phone ?? "", email: s.email ?? "", taxNumber: s.taxNumber ?? "", duesBaseAmount: s.duesBaseAmount ? String(s.duesBaseAmount) : "" });
    }).finally(() => setLoading(false));
  }, [isSiteAdmin]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/site", { ...form, duesBaseAmount: form.duesBaseAmount ? Number(form.duesBaseAmount) : 0 });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferError(""); setTransferSuccess("");
    if (!transferUserId || !transferPassword) {
      setTransferError("Kullanıcı ve şifre zorunludur.");
      return;
    }
    setTransferring(true);
    try {
      const res = await api.post<{ message: string }>("/site/transfer-admin", {
        newAdminUserId: Number(transferUserId),
        currentPassword: transferPassword,
      });
      setTransferSuccess(res?.message ?? "Yönetim devredildi. Oturumunuz kapatılıyor...");
      setTimeout(() => {
        clearAuth();
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      setTransferError(err instanceof Error ? err.message : "Devir başarısız.");
    } finally { setTransferring(false); }
  }

  if (loading) return <div className="text-slate-400 text-sm">Yükleniyor...</div>;
  if (!site) return null;

  const eligibleUsers = users.filter(u => u.id !== auth?.userId && u.isActive && u.role !== "SiteAdmin");

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Ayarlar</h1>

      {/* Plan bilgisi */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-blue-900">Mevcut Plan</div>
          <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
            {TIER_LABELS[site.tier] ?? site.tier}
          </span>
        </div>
        <div className="text-sm text-blue-700">
          {site.apartmentCount} daire kayıtlı
          {site.monthlyPrice > 0 && ` · Aylık ₺${site.monthlyPrice.toLocaleString("tr-TR")}`}
          {site.monthlyPrice === 0 && " · Ücretsiz plan"}
        </div>
        {site.tier === "Free" && site.apartmentCount > 8 && (
          <div className="mt-2 text-xs text-orange-700 bg-orange-100 rounded-lg px-3 py-2">
            10 daire limitine yaklaşıyorsunuz.
          </div>
        )}
      </div>

      {/* Site bilgileri */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-medium mb-4">Site Bilgileri</h2>
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-4">
            Ayarlar kaydedildi.
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          {[
            { label: "Site / Apartman Adı", key: "name", required: true },
            { label: "Adres", key: "address" },
            { label: "Telefon", key: "phone" },
            { label: "E-posta", key: "email", type: "email" },
            { label: "Vergi No", key: "taxNumber" },
            { label: "Aidat Sabit Tabanı (₺)", key: "duesBaseAmount", type: "number" },
          ].map(({ label, key, required, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input
                type={type ?? "text"} required={required}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <button type="submit" disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>

      {/* Yönetim Devri — sadece SiteAdmin görür */}
      {isSiteAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="font-medium text-slate-900">Yönetim Devri</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Genel Kurul kararıyla yeni yönetici belirlendiyse paneli devredin.
              </p>
            </div>
            <button onClick={() => setShowTransfer(v => !v)}
              className="text-sm text-blue-600 hover:underline flex-shrink-0">
              {showTransfer ? "Gizle" : "Başlat"}
            </button>
          </div>

          {showTransfer && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
                ⚠️ Bu işlem geri alınamaz. Devir sonrasında mevcut yönetici yetkisi <strong>Görevli</strong> seviyesine düşer ve oturumunuz kapatılır.
              </div>

              {transferSuccess ? (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                  ✅ {transferSuccess}
                </div>
              ) : (
                <form onSubmit={handleTransfer} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Yeni Yönetici</label>
                    <select value={transferUserId} onChange={e => setTransferUserId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Kullanıcı seçin —</option>
                      {eligibleUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                      ))}
                    </select>
                    {eligibleUsers.length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Devredebileceğiniz kullanıcı yok. Önce bir kullanıcı ekleyin.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Mevcut Şifreniz (Onay)</label>
                    <input type="password" value={transferPassword}
                      onChange={e => setTransferPassword(e.target.value)}
                      placeholder="Şifrenizi girerek onaylayın"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {transferError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{transferError}</div>
                  )}
                  <button type="submit" disabled={transferring || !transferUserId || !transferPassword}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
                    {transferring ? "Devrediliyor..." : "Yönetimi Devret"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
