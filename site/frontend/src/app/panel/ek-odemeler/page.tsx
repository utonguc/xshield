"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type Collection = {
  id: number; title: string; description?: string; amount: number; dueDate?: string;
  totalApartments: number; paidCount: number; pendingCount: number;
  expectedTotal: number; collectedTotal: number; createdAt: string;
};
type Record_ = {
  id: number; apartmentId: number; apartmentNumber: string; blockName: string;
  residentName?: string; amount: number; status: string; paidAt?: string; note?: string;
};
type Apartment = { id: number; blockId: number; blockName: string; number: string; residentName?: string };

const statusColor: Record<string, string> = {
  Paid: "bg-green-100 text-green-700", Pending: "bg-yellow-100 text-yellow-700",
  Overdue: "bg-red-100 text-red-700", Waived: "bg-slate-100 text-slate-500",
};
const METHODS = ["BankTransfer", "Cash", "EFT", "CreditCard"];
const METHOD_LABELS: Record<string, string> = {
  BankTransfer: "Banka Havalesi", Cash: "Nakit", CreditCard: "Kredi Kartı", EFT: "EFT"
};

export default function EkOdemelerPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);

  // Oluşturma formu
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", amount: "", dueDate: "" });
  const [pickedApts, setPickedApts] = useState<Set<number>>(new Set());
  const [aptFilter, setAptFilter] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Ödeme modalı
  const [payModal, setPayModal] = useState<Record_ | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "BankTransfer", receiptNo: "", note: "", paidAt: "" });
  const [paying, setPaying] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        api.get<Collection[]>("/extra-collections"),
        api.get<Apartment[]>("/apartments"),
      ]);
      setCollections(c);
      setApartments(a);
    } finally { setLoading(false); }
  }

  async function openCollection(c: Collection) {
    setSelected(c);
    setRecLoading(true);
    try { setRecords(await api.get<Record_[]>(`/extra-collections/${c.id}/records`)); }
    finally { setRecLoading(false); }
  }

  async function refreshSelected() {
    if (!selected) return;
    const [recs, cols] = await Promise.all([
      api.get<Record_[]>(`/extra-collections/${selected.id}/records`),
      api.get<Collection[]>("/extra-collections"),
    ]);
    setRecords(recs);
    setCollections(cols);
    setSelected(cols.find(c => c.id === selected.id) ?? null);
  }

  function openCreate() {
    setForm({ title: "", description: "", amount: "", dueDate: "" });
    setPickedApts(new Set(apartments.map(a => a.id))); // varsayılan: hepsi seçili
    setAptFilter("");
    setFormError("");
    setShowForm(true);
  }

  function toggleApt(id: number) {
    setPickedApts(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (pickedApts.size === 0) { setFormError("En az bir daire seçmelisiniz."); return; }
    setSaving(true);
    try {
      await api.post("/extra-collections", {
        title: form.title, description: form.description || null,
        amount: parseFloat(form.amount), dueDate: form.dueDate || null,
        apartmentIds: [...pickedApts],
      });
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Oluşturulamadı.");
    } finally { setSaving(false); }
  }

  async function deleteCollection(c: Collection) {
    if (!confirm(`"${c.title}" kampanyası ve tüm kayıtları silinsin mi?`)) return;
    try {
      await api.delete(`/extra-collections/${c.id}`);
      if (selected?.id === c.id) { setSelected(null); setRecords([]); }
      await load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Silinemedi."); }
  }

  function openPay(r: Record_) {
    setPayModal(r);
    setPayForm({ amount: String(r.amount), method: "BankTransfer", receiptNo: "", note: "", paidAt: "" });
  }

  async function submitPay() {
    if (!payModal) return;
    setPaying(true);
    try {
      await api.post(`/extra-collections/records/${payModal.id}/pay`, {
        amount: parseFloat(payForm.amount), method: payForm.method,
        receiptNo: payForm.receiptNo || null, note: payForm.note || null,
        paidAt: payForm.paidAt ? new Date(payForm.paidAt).toISOString() : null,
      });
      setPayModal(null);
      await refreshSelected();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Ödeme alınamadı."); }
    finally { setPaying(false); }
  }

  async function undoPay(r: Record_) {
    if (!confirm("Ödeme geri alınsın mı?")) return;
    try {
      await api.delete(`/extra-collections/records/${r.id}/pay`);
      await refreshSelected();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "İşlem başarısız."); }
  }

  function exportPdf() {
    if (!selected) return;
    const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n) + " ₺";
    const tarih = new Date().toLocaleString("tr-TR");
    const body = records.map((r, i) => `
      <tr class="${r.status !== "Paid" ? "debt" : ""}">
        <td>${i + 1}</td><td>${r.blockName}/${r.apartmentNumber}</td><td>${r.residentName ?? "—"}</td>
        <td class="r">${fmt(r.amount)}</td>
        <td class="c">${r.status === "Paid" ? "✓ Ödendi" : "✗ Ödenmedi"}</td>
        <td>${r.paidAt ? new Date(r.paidAt).toLocaleDateString("tr-TR") : "—"}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>${selected.title}</title><style>
*{font-family:'Segoe UI',Arial,sans-serif}body{margin:24px;color:#1e293b}
h1{font-size:18px;margin:0 0 4px}.sub{color:#64748b;font-size:12px;margin-bottom:16px}
.cards{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.card{border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;min-width:130px}
.card .lbl{font-size:10px;color:#64748b;text-transform:uppercase}.card .val{font-size:16px;font-weight:bold}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#f1f5f9;text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0}tr.debt{background:#fef2f2}
.r{text-align:right}.c{text-align:center}.foot{margin-top:16px;font-size:10px;color:#94a3b8}
</style></head><body>
<h1>${selected.title} — Ek Ödeme Raporu</h1>
<div class="sub">${selected.description ?? ""}${selected.dueDate ? " · Son tarih: " + new Date(selected.dueDate).toLocaleDateString("tr-TR") : ""} · Oluşturulma: ${tarih}</div>
<div class="cards">
  <div class="card"><div class="lbl">Daire Başı</div><div class="val">${fmt(selected.amount)}</div></div>
  <div class="card"><div class="lbl">Dahil Daire</div><div class="val">${selected.totalApartments}</div></div>
  <div class="card"><div class="lbl">Ödeyen</div><div class="val" style="color:#16a34a">${selected.paidCount}</div></div>
  <div class="card"><div class="lbl">Ödemeyen</div><div class="val" style="color:#dc2626">${selected.pendingCount}</div></div>
  <div class="card"><div class="lbl">Toplanan</div><div class="val" style="color:#16a34a">${fmt(selected.collectedTotal)}</div></div>
  <div class="card"><div class="lbl">Beklenen</div><div class="val">${fmt(selected.expectedTotal)}</div></div>
</div>
<table><thead><tr><th>#</th><th>Blok/Daire</th><th>Sakin</th><th class="r">Tutar</th><th class="c">Durum</th><th>Ödeme Tarihi</th></tr></thead>
<tbody>${body}</tbody></table>
<div class="foot">SiteYönet · ${tarih}</div>
<script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Açılır pencere engellendi."); return; }
    w.document.write(html); w.document.close();
  }

  const filteredApts = apartments.filter(a =>
    `${a.blockName} ${a.number} ${a.residentName ?? ""}`.toLowerCase().includes(aptFilter.toLowerCase()));

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ek Ödemeler</h1>
          <p className="text-sm text-slate-500 mt-0.5">Aidat dışı toplama kampanyaları (tadilat, demirbaş vb.)</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
          + Ek Ödeme Oluştur
        </button>
      </div>

      {/* Oluşturma formu */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-medium mb-4">Yeni Ek Ödeme Kampanyası</h2>
          {formError && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
          <form onSubmit={submitCreate} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Başlık *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: Bahçe Duvarı Tadilatı"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Daire Başı Tutar (₺) *</label>
                <input type="number" required min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="5000"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Son Tarih</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Açıklama</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Detay (opsiyonel)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Daire seçimi */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">
                  Dahil Edilecek Daireler ({pickedApts.size}/{apartments.length})
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPickedApts(new Set(apartments.map(a => a.id)))}
                    className="text-xs text-blue-600 hover:underline">Tümünü Seç</button>
                  <button type="button" onClick={() => setPickedApts(new Set())}
                    className="text-xs text-slate-500 hover:underline">Temizle</button>
                </div>
              </div>
              <input value={aptFilter} onChange={e => setAptFilter(e.target.value)}
                placeholder="Daire/sakin ara..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="border border-slate-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-50">
                {filteredApts.length === 0 ? (
                  <div className="p-3 text-slate-400 text-sm">Daire yok.</div>
                ) : filteredApts.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={pickedApts.has(a.id)} onChange={() => toggleApt(a.id)} />
                    <span className="font-medium">{a.blockName} · {a.number}</span>
                    {a.residentName && <span className="text-slate-400 text-xs">— {a.residentName}</span>}
                  </label>
                ))}
              </div>
              {form.amount && pickedApts.size > 0 && (
                <div className="text-xs text-slate-500 mt-2">
                  Toplam hedef: <strong>{formatCurrency(Number(form.amount) * pickedApts.size)}</strong>
                  ({pickedApts.size} daire × {formatCurrency(Number(form.amount))})
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm rounded-lg">
                {saving ? "Oluşturuluyor..." : "Oluştur"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-sm px-3">İptal</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kampanya listesi */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-600">Kampanyalar</h2>
          {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> :
            collections.length === 0 ? <div className="text-slate-400 text-sm">Henüz ek ödeme yok.</div> :
            collections.map(c => (
              <div key={c.id} onClick={() => openCollection(c)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected?.id === c.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="font-medium text-sm">{c.title}</div>
                  <button onClick={(e) => { e.stopPropagation(); deleteCollection(c); }}
                    className="text-red-400 hover:text-red-600 text-xs flex-shrink-0">Sil</button>
                </div>
                <div className="text-xs text-slate-400">{formatCurrency(c.amount)} · {c.paidCount}/{c.totalApartments} ödedi</div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${c.totalApartments > 0 ? (c.paidCount / c.totalApartments) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
        </div>

        {/* Detay */}
        <div className="md:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Detay için bir kampanya seçin
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{selected.title}</div>
                  {selected.description && <div className="text-xs text-slate-500 mt-0.5">{selected.description}</div>}
                  <div className="text-xs text-slate-400 mt-1">
                    Daire başı {formatCurrency(selected.amount)}
                    {selected.dueDate && ` · Son tarih: ${formatDate(selected.dueDate)}`}
                  </div>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{selected.paidCount} ödedi</span>
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{selected.pendingCount} ödemedi</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {formatCurrency(selected.collectedTotal)} / {formatCurrency(selected.expectedTotal)}
                    </span>
                  </div>
                </div>
                <button onClick={exportPdf}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0">
                  📄 PDF
                </button>
              </div>
              {recLoading ? (
                <div className="p-6 text-slate-400 text-sm">Yükleniyor...</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {records.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{r.blockName} · Daire {r.apartmentNumber}</div>
                        {r.residentName && <div className="text-xs text-slate-400">{r.residentName}</div>}
                        {r.paidAt && <div className="text-xs text-green-600">Ödendi: {formatDateTime(r.paidAt)}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-medium">{formatCurrency(r.amount)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[r.status] ?? "bg-slate-100"}`}>
                          {r.status === "Paid" ? "Ödendi" : "Bekliyor"}
                        </span>
                        {r.status === "Paid"
                          ? <button onClick={() => undoPay(r)} className="text-xs text-slate-400 hover:text-slate-600">Geri Al</button>
                          : <button onClick={() => openPay(r)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md">Ödeme Al</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ödeme modalı */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-1">Ödeme Al</h3>
            <p className="text-sm text-slate-500 mb-4">{payModal.blockName} · Daire {payModal.apartmentNumber}</p>
            <div className="space-y-3">
              {[
                { label: "Tutar (₺)", key: "amount", type: "number" },
                { label: "Makbuz / Dekont No", key: "receiptNo", type: "text", ph: "Opsiyonel" },
                { label: "Ödeme Tarihi", key: "paidAt", type: "date" },
                { label: "Not", key: "note", type: "text", ph: "Opsiyonel" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                  <input type={f.type} placeholder={f.ph} value={payForm[f.key as keyof typeof payForm]}
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
              <button onClick={submitPay} disabled={paying || !payForm.amount}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
                {paying ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
              </button>
              <button onClick={() => setPayModal(null)} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
