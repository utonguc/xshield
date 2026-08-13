"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth, isManager } from "@/lib/auth";

type Status = { enabled: boolean; botUsername?: string; linked: boolean };
type Site = {
  name: string; address?: string; phone?: string; email?: string;
  taxNumber?: string; duesBaseAmount: number; telegramGroupChatId?: string;
};

export default function TelegramView() {
  const auth = getAuth();
  const canManage = auth ? isManager(auth.role) : false;

  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<{ code: string; deepLink?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Manager
  const [site, setSite] = useState<Site | null>(null);
  const [groupId, setGroupId] = useState("");
  const [broadcast, setBroadcast] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true); setLoadError(false);
    try {
      const s = await api.get<Status>("/telegram/status");
      setStatus(s);
      if (canManage) {
        const site = await api.get<Site>("/site");
        setSite(site);
        setGroupId(site.telegramGroupChatId ?? "");
      }
    } catch {
      setLoadError(true);
    } finally { setLoading(false); }
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 5000); }

  async function genCode() {
    setBusy(true);
    try { setCode(await api.post<{ code: string; deepLink?: string }>("/telegram/link-code", {})); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Hata"); }
    finally { setBusy(false); }
  }
  async function unlink() {
    if (!confirm("Telegram bağlantısı kaldırılsın mı?")) return;
    await api.post("/telegram/unlink", {});
    setCode(null);
    await load();
  }
  async function saveGroup() {
    if (!site) return;
    setBusy(true);
    try {
      await api.put("/site", {
        name: site.name, address: site.address ?? null, phone: site.phone ?? null,
        email: site.email ?? null, taxNumber: site.taxNumber ?? null,
        duesBaseAmount: site.duesBaseAmount, telegramGroupChatId: groupId || null,
      });
      flash("Grup ayarı kaydedildi.");
    } finally { setBusy(false); }
  }
  async function remind() {
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>("/telegram/remind-debtors", {});
      flash(r.message);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Hata"); }
    finally { setBusy(false); }
  }
  async function sendBroadcast() {
    if (!broadcast.trim()) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>("/telegram/broadcast", { message: broadcast });
      flash(r.message); setBroadcast("");
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Hata"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400 text-sm">Yükleniyor...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Telegram Bildirimleri</h1>
        <p className="text-sm text-slate-500 mt-0.5">Aidat, duyuru ve hatırlatmaları Telegram'dan alın</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">✅ {msg}</div>}

      {loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
          Bilgiler yüklenemedi. Oturumunuz sona ermiş olabilir.
          <div className="mt-3 flex gap-3">
            <button onClick={load} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs">Tekrar Dene</button>
            <a href="/login" className="border border-red-300 text-red-700 px-3 py-1.5 rounded-lg text-xs">Yeniden Giriş</a>
          </div>
        </div>
      ) : !status?.enabled ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          ⚠️ Telegram entegrasyonu henüz yapılandırılmamış. Sistem yöneticisinin bot token'ını tanımlaması gerekiyor.
        </div>
      ) : (
        <>
          {/* Kişisel bağlantı */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-medium mb-1">Hesabımı Bağla</h2>
            {status.linked ? (
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-green-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                  Telegram hesabınız bağlı — bildirim alıyorsunuz
                </span>
                <button onClick={unlink} className="text-xs text-red-500 hover:text-red-700">Bağlantıyı Kaldır</button>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-slate-500 mb-3">
                  Bildirim almak için Telegram hesabınızı bağlayın. Komutlar: <code>/borc</code>, <code>/duyurular</code>
                </p>
                {!code ? (
                  <button onClick={genCode} disabled={busy}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg">
                    Bağlantı Kodu Oluştur
                  </button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                    <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                      <li>Aşağıdaki butonla botu açın</li>
                      <li>Telegram'da <b>Başlat / Start</b> butonuna basın</li>
                      <li>Hesabınız otomatik bağlanacak</li>
                    </ol>
                    {code.deepLink && (
                      <a href={code.deepLink} target="_blank" rel="noreferrer"
                        className="inline-block bg-[#229ED9] hover:bg-[#1d8cc2] text-white text-sm px-4 py-2 rounded-lg">
                        📲 Telegram&apos;da Aç
                      </a>
                    )}
                    <div className="text-xs text-slate-500">
                      Buton çalışmazsa botu açıp şunu yazın: <code className="bg-white border px-1.5 py-0.5 rounded">/start {code.code}</code>
                    </div>
                    <button onClick={load} className="text-xs text-blue-600 hover:underline">Bağlandıktan sonra yenile</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Yönetici araçları */}
          {canManage && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
              <h2 className="font-medium">Yönetici Araçları</h2>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Site Telegram Grubu (opsiyonel)</label>
                <div className="flex gap-2">
                  <input value={groupId} onChange={e => setGroupId(e.target.value)}
                    placeholder="Grup chat ID (örn: -1001234567890)"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={saveGroup} disabled={busy}
                    className="bg-slate-700 hover:bg-slate-800 text-white text-sm px-4 py-2 rounded-lg">Kaydet</button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <b>@SiteYonet_bot</b>'u sitenin Telegram grubuna ekleyin, ardından grupta <code className="bg-slate-100 px-1 rounded">/id</code> yazın — bot grup ID'sini cevaplayacak. O ID'yi buraya yapıştırıp kaydedin; duyurular gruba da düşer.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button onClick={remind} disabled={busy}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg">
                  💰 Borçlulara Hatırlatma Gönder
                </button>
                <p className="text-xs text-slate-400 mt-1">Telegram'ı bağlı ve borcu olan tüm sakinlere borç tutarını bildirir.</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Toplu Mesaj</label>
                <textarea value={broadcast} onChange={e => setBroadcast(e.target.value)} rows={3}
                  placeholder="Bağlı tüm sakinlere ve gruba gönderilecek mesaj..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <button onClick={sendBroadcast} disabled={busy || !broadcast.trim()}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg">
                  Gönder
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
