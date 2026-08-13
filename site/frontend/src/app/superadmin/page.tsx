"use client";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Site = {
  id: number; name: string; address?: string; phone?: string; email?: string;
  isActive: boolean; tier: string; apartmentCount: number; userCount: number; createdAt: string;
  admins: { id: number; fullName: string; email: string; phone?: string; isActive: boolean }[];
};

type SiteUser = { id: number; fullName: string; email: string; role: string; isActive: boolean; createdAt: string };

type PlanPayment = {
  id: number; siteId: number; siteName: string; tier: string;
  amount: number; year: number; month: number; isPaid: boolean; paidAt?: string; notes?: string; createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  Free: "Ücretsiz", Starter: "Başlangıç", Professional: "Profesyonel", Enterprise: "Kurumsal"
};
const TIER_PRICE: Record<string, number> = { Starter: 500, Professional: 1500 };
const TIER_COLOR: Record<string, string> = {
  Free: "bg-slate-100 text-slate-600", Starter: "bg-blue-100 text-blue-700",
  Professional: "bg-purple-100 text-purple-700", Enterprise: "bg-amber-100 text-amber-700"
};
const ROLE_LABELS: Record<string, string> = { SiteAdmin: "Yönetici", Manager: "Görevli", Resident: "Sakin" };
const MONTHS = ["","Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<"sites" | "payments">("sites");
  const [sites, setSites] = useState<Site[]>([]);
  const [planPayments, setPlanPayments] = useState<PlanPayment[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteUsers, setSiteUsers] = useState<SiteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Plan ödeme form
  const now = new Date();
  const [ppForm, setPpForm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterUnpaid, setFilterUnpaid] = useState(false);

  // ─── API helper ─────────────────────────────────────────────────────────

  async function saFetch(path: string, method = "GET", body?: unknown) {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return text ? JSON.parse(text) : null;
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true); setLoginError("");
    try {
      const data = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
      });
      const json = await data.json();
      if (!data.ok) throw new Error(json || "Giriş başarısız.");
      setToken(json.token);
      setAuthed(true);
      await loadAll(json.token);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Giriş yapılamadı.");
    } finally { setLoginLoading(false); }
  }

  // ─── Data loading ────────────────────────────────────────────────────────

  async function loadAll(t?: string) {
    const tok = t ?? token;
    setLoading(true);
    try {
      const [s, pp] = await Promise.all([
        fetch("/api/superadmin/sites", { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json()),
        loadPayments(tok),
      ]);
      setSites(s);
    } finally { setLoading(false); }
  }

  async function loadSites() {
    const data = await saFetch("/superadmin/sites");
    setSites(data);
  }

  async function loadPayments(tok?: string) {
    const t = tok ?? token;
    const q = new URLSearchParams();
    if (filterYear) q.set("year", filterYear);
    if (filterUnpaid) q.set("unpaidOnly", "true");
    const res = await fetch(`/api/superadmin/plan-payments?${q}`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setPlanPayments(data);
    return data;
  }

  async function loadUsers(site: Site) {
    setSelectedSite(site);
    setMsg(""); setError("");
    const data = await saFetch(`/superadmin/sites/${site.id}/users`);
    setSiteUsers(data);
  }

  // ─── Site actions ────────────────────────────────────────────────────────

  function flash(message: string, isError = false) {
    if (isError) setError(message); else setMsg(message);
    setTimeout(() => { setMsg(""); setError(""); }, 4000);
  }

  async function changeRole(siteId: number, userId: number, role: string) {
    try {
      const res = await saFetch(`/superadmin/sites/${siteId}/users/${userId}/role`, "PUT", { role });
      flash(res.message);
      if (selectedSite) await loadUsers(selectedSite);
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  async function resetPwd(siteId: number, userId: number, name: string) {
    const newPwd = prompt(`${name} için yeni şifre:`);
    if (!newPwd) return;
    try {
      const res = await saFetch(`/superadmin/sites/${siteId}/users/${userId}/reset-password`, "POST", { newPassword: newPwd });
      flash(res.message);
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  async function toggleSite(site: Site) {
    try {
      const res = await saFetch(`/superadmin/sites/${site.id}/status`, "PUT", { isActive: !site.isActive });
      flash(res.message);
      await loadSites();
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  async function changeTier(site: Site) {
    const tiers = ["Free", "Starter", "Professional", "Enterprise"];
    const choice = prompt(`Yeni plan (mevcut: ${site.tier}):\n0: Free\n1: Starter\n2: Professional\n3: Enterprise`);
    if (choice === null) return;
    const idx = Number(choice);
    if (isNaN(idx) || idx < 0 || idx > 3) return;
    try {
      const res = await saFetch(`/superadmin/sites/${site.id}/tier`, "PUT", { tier: tiers[idx] });
      flash(res.message);
      await loadSites();
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  // ─── Plan payment actions ────────────────────────────────────────────────

  async function generateMonthly() {
    if (!confirm(`${MONTHS[ppForm.month]} ${ppForm.year} için tüm ücretli sitelere ödeme kaydı oluşturulacak. Devam?`)) return;
    try {
      const res = await saFetch("/superadmin/plan-payments/generate-monthly", "POST", ppForm);
      flash(res.message);
      await loadPayments();
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  async function markPaid(pp: PlanPayment) {
    const notes = prompt("Not (opsiyonel):") ?? "";
    try {
      await saFetch(`/superadmin/plan-payments/${pp.id}/mark-paid`, "PUT", { notes: notes || null });
      flash("Ödeme alındı olarak işaretlendi.");
      await loadPayments();
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  async function markUnpaid(pp: PlanPayment) {
    if (!confirm("Ödeme iptal edilsin mi?")) return;
    try {
      await saFetch(`/superadmin/plan-payments/${pp.id}/mark-unpaid`, "PUT");
      flash("Ödeme iptal edildi.");
      await loadPayments();
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  async function deletePP(pp: PlanPayment) {
    if (!confirm("Bu ödeme kaydı silinsin mi?")) return;
    try {
      await saFetch(`/superadmin/plan-payments/${pp.id}`, "DELETE");
      await loadPayments();
    } catch (err: unknown) { flash(err instanceof Error ? err.message : "Hata.", true); }
  }

  // ─── Özet istatistikler ──────────────────────────────────────────────────
  const filteredPP = planPayments.filter(p => filterUnpaid ? !p.isPaid : true);
  const totalExpected = filteredPP.reduce((s, p) => s + p.amount, 0);
  const totalCollected = filteredPP.filter(p => p.isPaid).reduce((s, p) => s + p.amount, 0);
  const unpaidCount = filteredPP.filter(p => !p.isPaid).length;

  // ─── Login screen ────────────────────────────────────────────────────────

  if (!authed) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">🔐</div>
          <h1 className="text-white text-lg font-semibold">Platform Yönetimi</h1>
          <p className="text-slate-400 text-sm mt-1">SiteYönet SuperAdmin</p>
        </div>
        {loginError && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm mb-4">{loginError}</div>
        )}
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="text" required value={loginForm.username}
            onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
            placeholder="Kullanıcı adı"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" required value={loginForm.password}
            onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Şifre"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loginLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
            {loginLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );

  // ─── Main panel ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div>
          <span className="font-semibold">SiteYönet</span>
          <span className="text-slate-400 text-sm ml-2">· Platform Yönetimi</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-slate-400 text-sm">{sites.length} site</span>
          <button onClick={() => { setAuthed(false); setToken(""); }}
            className="text-slate-400 hover:text-white text-sm">Çıkış</button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="border-b border-slate-200 bg-white px-6">
        <div className="flex gap-6">
          {([["sites", "Siteler & Kullanıcılar"], ["payments", "Plan Ödemeleri"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-4">✅ {msg}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">❌ {error}</div>}

        {/* ── Tab: Siteler ── */}
        {tab === "sites" && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Site listesi */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900">Siteler</h2>
                <button onClick={loadSites} className="text-xs text-blue-600 hover:underline">Yenile</button>
              </div>
              {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> : (
                <div className="space-y-2">
                  {sites.map(s => (
                    <div key={s.id} onClick={() => loadUsers(s)}
                      className={`bg-white rounded-xl border cursor-pointer p-4 transition-colors ${
                        selectedSite?.id === s.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                      }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.apartmentCount} daire · {s.userCount} kullanıcı</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLOR[s.tier]}`}>
                            {TIER_LABELS[s.tier] ?? s.tier}
                          </span>
                          {!s.isActive && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Pasif</span>}
                        </div>
                      </div>
                      {s.admins.length > 0 && (
                        <div className="text-xs text-slate-500">
                          👤 {s.admins[0].fullName} · {s.admins[0].email}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => changeTier(s)}
                          className="text-xs text-purple-600 hover:underline">Plan Değiştir</button>
                        <button onClick={() => toggleSite(s)}
                          className={`text-xs ${s.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}`}>
                          {s.isActive ? "Pasif Yap" : "Aktif Et"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kullanıcı yönetimi */}
            <div className="md:col-span-3">
              {!selectedSite ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
                  Sol taraftan bir site seçin
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{selectedSite.name}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {selectedSite.address && `${selectedSite.address} · `}
                          {selectedSite.phone && `📞 ${selectedSite.phone}`}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLOR[selectedSite.tier]}`}>
                        {TIER_LABELS[selectedSite.tier]}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm">
                      Kullanıcılar ({siteUsers.length})
                    </div>
                    {siteUsers.length === 0 ? (
                      <div className="p-6 text-slate-400 text-sm text-center">Kullanıcı yok.</div>
                    ) : siteUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{u.fullName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              u.role === "SiteAdmin" ? "bg-purple-100 text-purple-700" :
                              u.role === "Manager" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                            }`}>{ROLE_LABELS[u.role] ?? u.role}</span>
                            {!u.isActive && <span className="text-xs text-red-500">Pasif</span>}
                          </div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                        <div className="flex gap-2">
                          {u.role !== "SiteAdmin" && (
                            <button onClick={() => changeRole(selectedSite.id, u.id, "SiteAdmin")}
                              className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded">
                              Yönetici Yap
                            </button>
                          )}
                          <button onClick={() => resetPwd(selectedSite.id, u.id, u.fullName)}
                            className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 rounded">
                            Şifre Sıfırla
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
                    <strong>Kilitli senaryo:</strong> Listedeki bir kullanıcıyı "Yönetici Yap" yapın, ardından "Şifre Sıfırla" ile yeni şifre belirleyin.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Plan Ödemeleri ── */}
        {tab === "payments" && (
          <div className="space-y-6">
            {/* Özet */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-400 mb-1">Toplam Beklenen</div>
                <div className="text-xl font-bold">₺{totalExpected.toLocaleString("tr-TR")}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-400 mb-1">Tahsil Edilen</div>
                <div className="text-xl font-bold text-green-600">₺{totalCollected.toLocaleString("tr-TR")}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-400 mb-1">Ödenmemiş</div>
                <div className="text-xl font-bold text-red-500">₺{(totalExpected - totalCollected).toLocaleString("tr-TR")}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-400 mb-1">Bekleyen Site</div>
                <div className="text-xl font-bold text-orange-500">{unpaidCount}</div>
              </div>
            </div>

            {/* Araçlar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Yıl Filtresi</label>
                <select value={filterYear} onChange={e => { setFilterYear(e.target.value); loadPayments(); }}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={filterUnpaid}
                  onChange={e => { setFilterUnpaid(e.target.checked); loadPayments(); }} />
                Sadece ödenmemişler
              </label>
              <button onClick={() => loadPayments()}
                className="text-sm text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                Yenile
              </button>
              <div className="border-l border-slate-200 pl-4 flex items-end gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Dönem</label>
                  <div className="flex gap-2">
                    <select value={ppForm.month} onChange={e => setPpForm(f => ({ ...f, month: Number(e.target.value) }))}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
                      {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <input type="number" value={ppForm.year} onChange={e => setPpForm(f => ({ ...f, year: Number(e.target.value) }))}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                  </div>
                </div>
                <button onClick={generateMonthly}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">
                  Kayıt Oluştur
                </button>
              </div>
            </div>

            {/* Ödeme tablosu */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Site</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Dönem</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Tutar</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600">Durum</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Ödeme Tarihi</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPP.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Kayıt yok.</td></tr>
                    ) : filteredPP.map(pp => (
                      <tr key={pp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{pp.siteName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLOR[pp.tier]}`}>{TIER_LABELS[pp.tier]}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{MONTHS[pp.month]} {pp.year}</td>
                        <td className="px-4 py-3 text-right font-semibold">₺{pp.amount.toLocaleString("tr-TR")}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pp.isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>
                            {pp.isPaid ? "✓ Ödendi" : "⏳ Bekliyor"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {pp.paidAt ? new Date(pp.paidAt).toLocaleDateString("tr-TR") : "—"}
                          {pp.notes && <div className="text-slate-300">{pp.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {!pp.isPaid ? (
                              <button onClick={() => markPaid(pp)}
                                className="text-xs text-green-600 hover:text-green-800 font-medium">Ödendi</button>
                            ) : (
                              <button onClick={() => markUnpaid(pp)}
                                className="text-xs text-slate-400 hover:text-slate-600">İptal</button>
                            )}
                            <button onClick={() => deletePP(pp)}
                              className="text-xs text-red-400 hover:text-red-600">Sil</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
