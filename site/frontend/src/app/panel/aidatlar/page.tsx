"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime, monthName, STATUS_LABELS } from "@/lib/utils";

type Period = {
  id: number; title: string; amount: number; dueDate: string;
  year: number; month: number; description?: string;
  totalApartments: number; paidCount: number; pendingCount: number;
  overdueCount: number; collectedAmount: number; createdAt: string;
};
type Record_ = {
  id: number; duesPeriodId: number; periodTitle: string;
  apartmentId: number; apartmentNumber: string; blockName: string;
  amount: number; status: string; paidAt?: string; note?: string;
};
type PeriodPayment = {
  id: number; amount: number; paidAt: string; receiptNo?: string;
  note?: string; method: string; apartmentNumber: string; blockName: string;
};
type ApartmentPayment = {
  id: number; amount: number; paidAt: string; receiptNo?: string;
  note?: string; method: string; periodTitle: string;
};

const statusColor: Record<string, string> = {
  Paid: "bg-green-100 text-green-700", Pending: "bg-yellow-100 text-yellow-700",
  Overdue: "bg-red-100 text-red-700", Waived: "bg-slate-100 text-slate-500",
};
const METHOD_LABELS: Record<string, string> = {
  BankTransfer: "Banka Havalesi", Cash: "Nakit", CreditCard: "Kredi Kartı", EFT: "EFT"
};
const METHODS = ["BankTransfer", "Cash", "EFT", "CreditCard"];

export default function AidatlarPage() {
  const now = new Date();

  // Veriler
  const [periods, setPeriods] = useState<Period[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [periodPayments, setPeriodPayments] = useState<PeriodPayment[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [activeTab, setActiveTab] = useState<"records" | "payments">("records");
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Dönem formu
  const emptyPeriodForm = { title: "", amount: "", dueDate: "", year: now.getFullYear(), month: now.getMonth() + 1, description: "", perApartment: false };
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [editPeriod, setEditPeriod] = useState<Period | null>(null);
  const [periodForm, setPeriodForm] = useState(emptyPeriodForm);
  const [periodError, setPeriodError] = useState("");
  const [periodSaving, setPeriodSaving] = useState(false);

  // Ödeme al modalı
  const [payModal, setPayModal] = useState<Record_ | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "BankTransfer", receiptNo: "", note: "", paidAt: "" });
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);

  // Ödeme düzenle modalı
  const [editPayment, setEditPayment] = useState<PeriodPayment | null>(null);
  const [editPayForm, setEditPayForm] = useState({ amount: "", method: "BankTransfer", receiptNo: "", note: "", paidAt: "" });
  const [editPayError, setEditPayError] = useState("");
  const [editPaySaving, setEditPaySaving] = useState(false);

  // Daire ödeme geçmişi
  const [aptModal, setAptModal] = useState<{ aptId: number; aptLabel: string } | null>(null);
  const [aptPayments, setAptPayments] = useState<ApartmentPayment[]>([]);
  const [aptLoading, setAptLoading] = useState(false);

  useEffect(() => { loadPeriods(); }, []);

  async function loadPeriods() {
    setLoading(true);
    try { setPeriods(await api.get<Period[]>("/dues/periods")); }
    finally { setLoading(false); }
  }

  async function selectPeriod(p: Period) {
    setSelectedPeriod(p);
    setActiveTab("records");
    setRecordsLoading(true);
    try {
      const [recs, pays] = await Promise.all([
        api.get<Record_[]>(`/dues/periods/${p.id}/records`),
        api.get<PeriodPayment[]>(`/dues/periods/${p.id}/payments`),
      ]);
      setRecords(recs);
      setPeriodPayments(pays);
    } finally { setRecordsLoading(false); }
  }

  async function refreshSelected(periodId?: number) {
    const pid = periodId ?? selectedPeriod?.id;
    if (!pid) return;
    const [recs, pays, newPeriods] = await Promise.all([
      api.get<Record_[]>(`/dues/periods/${pid}/records`),
      api.get<PeriodPayment[]>(`/dues/periods/${pid}/payments`),
      api.get<Period[]>("/dues/periods"),
    ]);
    setRecords(recs);
    setPeriodPayments(pays);
    setPeriods(newPeriods);
    const updated = newPeriods.find(p => p.id === pid);
    if (updated) setSelectedPeriod(updated);
  }

  // ─── Dönem oluştur / düzenle ───────────────────────────────────────
  function openCreatePeriod() {
    setEditPeriod(null);
    setPeriodForm(emptyPeriodForm);
    setPeriodError("");
    setShowPeriodForm(true);
  }

  function openEditPeriod(p: Period) {
    setEditPeriod(p);
    setPeriodForm({
      title: p.title, amount: String(p.amount),
      dueDate: p.dueDate, year: p.year, month: p.month,
      description: p.description ?? "", perApartment: false,
    });
    setPeriodError("");
    setShowPeriodForm(true);
  }

  async function submitPeriod(e: React.FormEvent) {
    e.preventDefault();
    setPeriodSaving(true); setPeriodError("");
    const payload = {
      title: periodForm.title, amount: parseFloat(periodForm.amount || "0"),
      dueDate: periodForm.dueDate, year: periodForm.year, month: periodForm.month,
      description: periodForm.description || null, perApartment: periodForm.perApartment,
    };
    try {
      if (editPeriod) {
        await api.put(`/dues/periods/${editPeriod.id}`, payload);
        setShowPeriodForm(false);
        await refreshSelected(editPeriod.id);
      } else {
        await api.post("/dues/periods", payload);
        setShowPeriodForm(false);
        await loadPeriods();
      }
    } catch (err: unknown) {
      setPeriodError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally { setPeriodSaving(false); }
  }

  async function deletePeriod(p: Period) {
    if (!confirm(`"${p.title}" dönemi ve tüm aidat kayıtları silinsin mi?`)) return;
    try {
      await api.delete(`/dues/periods/${p.id}`);
      if (selectedPeriod?.id === p.id) { setSelectedPeriod(null); setRecords([]); setPeriodPayments([]); }
      await loadPeriods();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  // ─── Ödeme al ──────────────────────────────────────────────────────
  function openPayModal(r: Record_) {
    setPayModal(r);
    setPayForm({ amount: String(r.amount), method: "BankTransfer", receiptNo: "", note: "", paidAt: "" });
    setPayError("");
  }

  async function submitPayment() {
    if (!payModal) return;
    setPaying(true); setPayError("");
    try {
      await api.post(`/dues/records/${payModal.id}/pay`, {
        amount: parseFloat(payForm.amount), method: payForm.method,
        receiptNo: payForm.receiptNo || null, note: payForm.note || null,
        paidAt: payForm.paidAt ? new Date(payForm.paidAt).toISOString() : null,
      });
      setPayModal(null);
      await refreshSelected();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Ödeme kaydedilemedi.");
    } finally { setPaying(false); }
  }

  // ─── Ödeme düzenle ─────────────────────────────────────────────────
  function openEditPayment(p: PeriodPayment) {
    setEditPayment(p);
    setEditPayForm({
      amount: String(p.amount), method: p.method,
      receiptNo: p.receiptNo ?? "", note: p.note ?? "",
      paidAt: p.paidAt ? p.paidAt.slice(0, 10) : "",
    });
    setEditPayError("");
  }

  async function submitEditPayment() {
    if (!editPayment) return;
    setEditPaySaving(true); setEditPayError("");
    try {
      await api.put(`/dues/payments/${editPayment.id}`, {
        amount: parseFloat(editPayForm.amount), method: editPayForm.method,
        receiptNo: editPayForm.receiptNo || null, note: editPayForm.note || null,
        paidAt: editPayForm.paidAt ? new Date(editPayForm.paidAt).toISOString() : null,
      });
      setEditPayment(null);
      await refreshSelected();
    } catch (err: unknown) {
      setEditPayError(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally { setEditPaySaving(false); }
  }

  async function deletePayment(p: PeriodPayment) {
    if (!confirm(`${p.blockName} · D.${p.apartmentNumber} ödemesi silinsin mi? Daire Bekliyor durumuna döner.`)) return;
    try {
      await api.delete(`/dues/payments/${p.id}`);
      await refreshSelected();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  }

  // ─── Daire ödeme geçmişi ───────────────────────────────────────────
  async function openAptPayments(aptId: number, aptLabel: string) {
    setAptModal({ aptId, aptLabel });
    setAptLoading(true);
    try { setAptPayments(await api.get<ApartmentPayment[]>(`/dues/apartment/${aptId}/payments`)); }
    finally { setAptLoading(false); }
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Aidat Yönetimi</h1>
        <button onClick={openCreatePeriod}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Aidat Dönemi Oluştur
        </button>
      </div>

      {/* Dönem formu (oluştur / düzenle) */}
      {showPeriodForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">{editPeriod ? "Dönemi Düzenle" : "Yeni Aidat Dönemi"}</h2>
          {periodError && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{periodError}</div>}
          <form onSubmit={submitPeriod} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Dönem Adı</label>
              <input required value={periodForm.title} onChange={e => setPeriodForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Haziran 2026 Aidatı"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                {periodForm.perApartment ? "Varsayılan Tutar (₺)" : "Tutar (₺)"}
              </label>
              <input type="number" required={!periodForm.perApartment} min="0"
                value={periodForm.amount}
                onChange={e => setPeriodForm(f => ({ ...f, amount: e.target.value }))}
                placeholder={periodForm.perApartment ? "Aidatı olmayan daireler için" : ""}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Son Ödeme Tarihi</label>
              <input type="date" required value={periodForm.dueDate}
                onChange={e => setPeriodForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Yıl</label>
              <input type="number" value={periodForm.year} onChange={e => setPeriodForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Ay</label>
              <select value={periodForm.month} onChange={e => setPeriodForm(f => ({ ...f, month: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
                ))}
              </select>
            </div>
            {!editPeriod && (
              <div className="col-span-2 md:col-span-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={periodForm.perApartment}
                      onChange={e => setPeriodForm(f => ({ ...f, perApartment: e.target.checked }))} />
                    <span className="text-sm font-medium text-slate-700">Daire bazlı aidat kullan</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1 ml-6">
                    İşaretlerseniz her dairenin kendi "Aylık Aidat" tutarı uygulanır (arsa payına göre farklı tutarlar).
                    İşaretlemezseniz tüm dairelere yukarıdaki sabit tutar uygulanır.
                  </p>
                </div>
              </div>
            )}
            <div className="col-span-2 md:col-span-3 flex gap-2">
              <button type="submit" disabled={periodSaving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                {periodSaving ? "Kaydediliyor..." : editPeriod ? "Güncelle" : "Oluştur"}
              </button>
              <button type="button" onClick={() => setShowPeriodForm(false)} className="text-slate-500 px-3 py-2 text-sm">İptal</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sol: Dönem listesi */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-600">Dönemler</h2>
          {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> :
            periods.length === 0 ? <div className="text-slate-400 text-sm">Henüz dönem yok.</div> :
            periods.map(p => (
              <div key={p.id}
                onClick={() => selectPeriod(p)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPeriod?.id === p.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="font-medium text-sm">{p.title}</div>
                  <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditPeriod(p)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                    <button onClick={() => deletePeriod(p)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium">Sil</button>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{formatCurrency(p.amount)} · {p.paidCount}/{p.totalApartments} ödendi</div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${p.totalApartments > 0 ? (p.paidCount / p.totalApartments) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
        </div>

        {/* Sağ: Detay */}
        <div className="md:col-span-2">
          {!selectedPeriod ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Detay görmek için sol taraftan bir dönem seçin
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium">{selectedPeriod.title}</div>
                    <div className="text-xs text-slate-400">Son ödeme: {formatDate(selectedPeriod.dueDate)}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold text-green-600">{formatCurrency(selectedPeriod.collectedAmount)}</div>
                    <div className="text-xs text-slate-400">/ {formatCurrency(selectedPeriod.amount * selectedPeriod.totalApartments)} toplam</div>
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{selectedPeriod.paidCount} ödendi</span>
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{selectedPeriod.pendingCount} bekliyor</span>
                  {selectedPeriod.overdueCount > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{selectedPeriod.overdueCount} gecikmiş</span>}
                </div>
              </div>

              <div className="flex border-b border-slate-100">
                <button onClick={() => setActiveTab("records")}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === "records" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                  Daireler
                </button>
                <button onClick={() => setActiveTab("payments")}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === "payments" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                  Ödemeler {periodPayments.length > 0 && `(${periodPayments.length})`}
                </button>
              </div>

              {recordsLoading ? (
                <div className="p-6 text-slate-400 text-sm">Yükleniyor...</div>
              ) : activeTab === "records" ? (
                <div className="divide-y divide-slate-100">
                  {records.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{r.blockName} · Daire {r.apartmentNumber}</div>
                        {r.paidAt && <div className="text-xs text-slate-400">Ödendi: {formatDate(r.paidAt)}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-medium">{formatCurrency(r.amount)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                        <button onClick={() => openAptPayments(r.apartmentId, `${r.blockName} · D.${r.apartmentNumber}`)}
                          className="text-xs text-slate-500 hover:text-slate-700 underline">Geçmiş</button>
                        {r.status !== "Paid" && r.status !== "Waived" && (
                          <button onClick={() => openPayModal(r)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md">
                            Ödeme Al
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {periodPayments.length === 0 ? (
                    <div className="p-6 text-slate-400 text-sm text-center">Bu dönem için ödeme kaydı yok.</div>
                  ) : periodPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{p.blockName} · Daire {p.apartmentNumber}</div>
                        <div className="text-xs text-slate-400">
                          {formatDateTime(p.paidAt)} · {METHOD_LABELS[p.method] ?? p.method}
                          {p.receiptNo && ` · ${p.receiptNo}`}
                        </div>
                        {p.note && <div className="text-xs text-slate-400">{p.note}</div>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-semibold text-green-600 text-sm">{formatCurrency(p.amount)}</span>
                        <button onClick={() => openEditPayment(p)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">Düzenle</button>
                        <button onClick={() => deletePayment(p)}
                          className="text-red-400 hover:text-red-600 text-xs font-medium">Sil</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ödeme al modalı */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-1">Ödeme Al</h3>
            <p className="text-sm text-slate-500 mb-4">
              {payModal.blockName} · Daire {payModal.apartmentNumber} — {selectedPeriod?.title}
            </p>
            {payError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">{payError}</div>}
            <div className="space-y-3">
              {[
                { label: "Tutar (₺)", key: "amount", type: "number" },
                { label: "Makbuz / Dekont No", key: "receiptNo", type: "text", placeholder: "Opsiyonel" },
                { label: "Ödeme Tarihi", key: "paidAt", type: "date" },
                { label: "Not", key: "note", type: "text", placeholder: "Opsiyonel" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={payForm[f.key as keyof typeof payForm]}
                    onChange={e => setPayForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ödeme Yöntemi</label>
                <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitPayment} disabled={paying || !payForm.amount}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
                {paying ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
              </button>
              <button onClick={() => setPayModal(null)}
                className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Ödeme düzenle modalı */}
      {editPayment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-1">Ödemeyi Düzenle</h3>
            <p className="text-sm text-slate-500 mb-4">
              {editPayment.blockName} · Daire {editPayment.apartmentNumber}
            </p>
            {editPayError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">{editPayError}</div>}
            <div className="space-y-3">
              {[
                { label: "Tutar (₺)", key: "amount", type: "number" },
                { label: "Makbuz / Dekont No", key: "receiptNo", type: "text" },
                { label: "Ödeme Tarihi", key: "paidAt", type: "date" },
                { label: "Not", key: "note", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                  <input type={f.type} value={editPayForm[f.key as keyof typeof editPayForm]}
                    onChange={e => setEditPayForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Ödeme Yöntemi</label>
                <select value={editPayForm.method} onChange={e => setEditPayForm(p => ({ ...p, method: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitEditPayment} disabled={editPaySaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
                {editPaySaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
              <button onClick={() => setEditPayment(null)}
                className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Daire ödeme geçmişi modalı */}
      {aptModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{aptModal.aptLabel}</h3>
                <p className="text-xs text-slate-500">Tüm ödeme geçmişi</p>
              </div>
              <button onClick={() => setAptModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            {aptLoading ? (
              <div className="text-slate-400 text-sm">Yükleniyor...</div>
            ) : aptPayments.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-6">Ödeme kaydı bulunamadı.</div>
            ) : (
              <div className="space-y-2">
                {aptPayments.map(p => (
                  <div key={p.id} className="flex items-start justify-between border border-slate-100 rounded-lg px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{p.periodTitle}</div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(p.paidAt)} · {METHOD_LABELS[p.method] ?? p.method}
                        {p.receiptNo && ` · ${p.receiptNo}`}
                      </div>
                      {p.note && <div className="text-xs text-slate-400">{p.note}</div>}
                    </div>
                    <div className="font-semibold text-green-600 text-sm">{formatCurrency(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
