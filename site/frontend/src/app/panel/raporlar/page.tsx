"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, monthName, formatDate } from "@/lib/utils";

type Period = {
  id: number; title: string; amount: number; year: number; month: number;
  totalApartments: number; paidCount: number; pendingCount: number;
  overdueCount: number; collectedAmount: number; createdAt: string;
};

type DuesRow = {
  apartmentId: number; blockName: string; number: string; residentName?: string; phone?: string;
  totalRecords: number; paidCount: number; unpaidMonths: number;
  totalAssessed: number; totalPaid: number; totalDebt: number;
  oldestUnpaidLabel?: string; lastPaymentAt?: string; status: string;
};
type DuesReport = {
  summary: {
    siteName: string; generatedAt: string; totalApartments: number;
    debtorCount: number; currentCount: number;
    totalAssessed: number; totalCollected: number; totalDebt: number;
  };
  rows: DuesRow[];
};

type MatrixReport = {
  siteName: string; generatedAt: string;
  periods: { id: number; title: string; year: number; month: number }[];
  rows: {
    apartmentId: number; blockName: string; number: string; residentName?: string;
    cells: { periodId: number; status: string; amount: number }[];
    unpaidCount: number; totalDebt: number;
  }[];
};

type PaymentEntry = {
  paymentId: number; apartmentId: number; blockName: string; number: string; residentName?: string;
  date: string; amount: number; type: string; source: string; method: string; receiptNo?: string; note?: string;
};
type PaymentHistory = {
  siteName: string; generatedAt: string; totalPaid: number; paymentCount: number; rows: PaymentEntry[];
};

const METHOD_LABELS: Record<string, string> = {
  BankTransfer: "Banka Havalesi", Cash: "Nakit", CreditCard: "Kredi Kartı", EFT: "EFT"
};

const statusColor: Record<string, string> = {
  "Güncel": "bg-green-100 text-green-700",
  "Borçlu": "bg-yellow-100 text-yellow-700",
  "Kritik Borç": "bg-red-100 text-red-700",
};

// Matris hücre stilleri
const MONTHS_SHORT = ["", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const cellStyle: Record<string, string> = {
  Paid: "bg-green-500 text-white",
  Pending: "bg-red-100 text-red-600",
  Overdue: "bg-red-500 text-white",
  Waived: "bg-slate-200 text-slate-500",
  None: "bg-slate-50 text-slate-300",
};
const cellIcon: Record<string, string> = {
  Paid: "✓", Pending: "✗", Overdue: "✗", Waived: "M", None: "–",
};

export default function RaporlarPage() {
  const [tab, setTab] = useState<"matrix" | "status" | "history" | "period">("matrix");

  // Dönem özeti
  const [periods, setPeriods] = useState<Period[]>([]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Borç durumu
  const [report, setReport] = useState<DuesReport | null>(null);
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [loading, setLoading] = useState(true);

  // Matris
  const [matrix, setMatrix] = useState<MatrixReport | null>(null);

  // Ödeme geçmişi
  const [history, setHistory] = useState<PaymentHistory | null>(null);
  const [histApt, setHistApt] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Period[]>("/dues/periods"),
      api.get<DuesReport>("/reports/dues-status"),
      api.get<MatrixReport>("/reports/dues-matrix"),
      api.get<PaymentHistory>("/reports/payment-history"),
    ]).then(([p, r, m, h]) => { setPeriods(p); setReport(r); setMatrix(m); setHistory(h); })
      .finally(() => setLoading(false));
  }, []);

  const years = [...new Set(periods.map(p => p.year))].sort((a, b) => b - a);
  const filtered = periods.filter(p => p.year === filterYear);
  const totalExpected = filtered.reduce((s, p) => s + p.amount * p.totalApartments, 0);
  const totalCollected = filtered.reduce((s, p) => s + p.collectedAmount, 0);
  const totalPaid = filtered.reduce((s, p) => s + p.paidCount, 0);
  const totalRecords = filtered.reduce((s, p) => s + p.totalApartments, 0);

  const rows = report?.rows.filter(r => onlyDebtors ? r.totalDebt > 0 : true) ?? [];

  // ─── PDF (tarayıcı yazdırma — UTF-8/Türkçe tam destekli) ───────────────
  function exportPdf() {
    if (!report) return;
    const s = report.summary;
    const tarih = new Date(s.generatedAt).toLocaleString("tr-TR");
    const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n) + " ₺";

    const bodyRows = rows.map((r, i) => `
      <tr class="${r.totalDebt > 0 ? "debt" : ""}">
        <td>${i + 1}</td>
        <td>${r.blockName} / ${r.number}</td>
        <td>${r.residentName ?? "—"}</td>
        <td class="r">${fmt(r.totalAssessed)}</td>
        <td class="r green">${fmt(r.totalPaid)}</td>
        <td class="r red">${r.totalDebt > 0 ? fmt(r.totalDebt) : "—"}</td>
        <td class="c">${r.unpaidMonths > 0 ? r.unpaidMonths + " ay" : "—"}</td>
        <td>${r.oldestUnpaidLabel ?? "—"}</td>
        <td>${r.lastPaymentAt ? new Date(r.lastPaymentAt).toLocaleDateString("tr-TR") : "—"}</td>
        <td class="c">${r.status}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8">
<title>Aidat Borç Raporu - ${s.siteName}</title>
<style>
  * { font-family: 'Segoe UI', Arial, sans-serif; }
  body { margin: 24px; color: #1e293b; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
  .cards { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; min-width: 140px; }
  .card .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; }
  .card .val { font-size: 16px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid #cbd5e1; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  tr.debt { background: #fef2f2; }
  .r { text-align: right; } .c { text-align: center; }
  .green { color: #16a34a; } .red { color: #dc2626; font-weight: bold; }
  .foot { margin-top: 16px; font-size: 10px; color: #94a3b8; }
  @media print { body { margin: 12px; } }
</style></head>
<body>
  <h1>${s.siteName} — Aidat Borç Durumu Raporu</h1>
  <div class="sub">Oluşturulma: ${tarih}</div>
  <div class="cards">
    <div class="card"><div class="lbl">Toplam Daire</div><div class="val">${s.totalApartments}</div></div>
    <div class="card"><div class="lbl">Borçlu Daire</div><div class="val" style="color:#dc2626">${s.debtorCount}</div></div>
    <div class="card"><div class="lbl">Güncel Daire</div><div class="val" style="color:#16a34a">${s.currentCount}</div></div>
    <div class="card"><div class="lbl">Tahsil Edilen</div><div class="val" style="color:#16a34a">${fmt(s.totalCollected)}</div></div>
    <div class="card"><div class="lbl">Toplam Borç</div><div class="val" style="color:#dc2626">${fmt(s.totalDebt)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Blok / Daire</th><th>Sakin</th>
      <th class="r">Tahakkuk</th><th class="r">Ödenen</th><th class="r">Borç</th>
      <th class="c">Gecikme</th><th>En Eski Borç</th><th>Son Ödeme</th><th class="c">Durum</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="foot">SiteYönet · ${s.siteName} · Bu rapor ${tarih} tarihinde oluşturulmuştur.</div>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) { alert("Açılır pencere engellendi. Lütfen pop-up izni verin."); return; }
    w.document.write(html);
    w.document.close();
  }

  // ─── Matris PDF (yatay/landscape) ──────────────────────────────────────
  function exportMatrixPdf() {
    if (!matrix) return;
    const tarih = new Date(matrix.generatedAt).toLocaleString("tr-TR");
    const cellTxt: Record<string, string> = { Paid: "✓", Pending: "✗", Overdue: "✗", Waived: "M", None: "–" };
    const cellBg: Record<string, string> = {
      Paid: "background:#16a34a;color:#fff", Pending: "background:#fee2e2;color:#dc2626",
      Overdue: "background:#dc2626;color:#fff", Waived: "background:#e2e8f0;color:#64748b", None: "color:#cbd5e1",
    };
    const head = matrix.periods.map(p => `<th class="c">${MONTHS_SHORT[p.month]}<br>${String(p.year).slice(2)}</th>`).join("");
    const body = matrix.rows.map(r => `
      <tr>
        <td class="nm">${r.blockName}/${r.number}</td>
        <td>${r.residentName ?? "—"}</td>
        ${r.cells.map(c => `<td class="c" style="${cellBg[c.status] ?? ""}">${cellTxt[c.status] ?? ""}</td>`).join("")}
        <td class="c red">${r.unpaidCount}</td>
        <td class="r red">${r.totalDebt > 0 ? new Intl.NumberFormat("tr-TR").format(r.totalDebt) + " ₺" : "—"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>Aylık Ödeme Çizelgesi - ${matrix.siteName}</title>
<style>
  @page { size: landscape; }
  * { font-family: 'Segoe UI', Arial, sans-serif; }
  body { margin: 16px; color:#1e293b; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .sub { color:#64748b; font-size:11px; margin-bottom:10px; }
  table { width:100%; border-collapse:collapse; font-size:10px; }
  th { background:#f1f5f9; padding:4px 5px; border:1px solid #cbd5e1; }
  td { padding:3px 5px; border:1px solid #e2e8f0; }
  .nm { font-weight:bold; white-space:nowrap; }
  .c { text-align:center; } .r { text-align:right; } .red { color:#dc2626; font-weight:bold; }
  .legend { margin-top:10px; font-size:10px; color:#64748b; }
  .legend span { display:inline-block; margin-right:14px; }
  .box { display:inline-block; width:12px; height:12px; border-radius:2px; vertical-align:middle; margin-right:3px; }
</style></head>
<body>
  <h1>${matrix.siteName} — Aylık Aidat Ödeme Çizelgesi</h1>
  <div class="sub">Oluşturulma: ${tarih}</div>
  <table>
    <thead><tr><th>Daire</th><th>Sakin</th>${head}<th class="c">Borç Ay</th><th class="r">Borç</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="legend">
    <span><span class="box" style="background:#16a34a"></span>Ödendi (✓)</span>
    <span><span class="box" style="background:#dc2626"></span>Ödenmedi (✗)</span>
    <span><span class="box" style="background:#e2e8f0"></span>Muaf (M)</span>
    <span><span class="box" style="background:#f8fafc;border:1px solid #cbd5e1"></span>Kayıt yok (–)</span>
  </div>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Açılır pencere engellendi. Lütfen pop-up izni verin."); return; }
    w.document.write(html); w.document.close();
  }

  // ─── Ödeme geçmişi PDF ─────────────────────────────────────────────────
  function exportHistoryPdf() {
    if (!history) return;
    const tarih = new Date(history.generatedAt).toLocaleString("tr-TR");
    const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n) + " ₺";
    const list = history.rows.filter(r => histApt ? String(r.apartmentId) === histApt : true);

    // Daireye göre grupla
    const groups = new Map<number, PaymentEntry[]>();
    list.forEach(r => { (groups.get(r.apartmentId) ?? groups.set(r.apartmentId, []).get(r.apartmentId)!).push(r); });

    let body = "";
    for (const [, items] of groups) {
      const first = items[0];
      const sub = items.reduce((s, x) => s + x.amount, 0);
      body += `<tr class="grp"><td colspan="6">${first.blockName} / Daire ${first.number}${first.residentName ? " — " + first.residentName : ""} · Toplam: ${fmt(sub)}</td></tr>`;
      body += items.map(r => `
        <tr>
          <td>${new Date(r.date).toLocaleDateString("tr-TR")}</td>
          <td>${r.type}</td>
          <td>${r.source}</td>
          <td>${METHOD_LABELS[r.method] ?? r.method}</td>
          <td>${r.receiptNo ?? "—"}</td>
          <td class="r">${fmt(r.amount)}</td>
        </tr>`).join("");
    }

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>Ödeme Geçmişi - ${history.siteName}</title><style>
*{font-family:'Segoe UI',Arial,sans-serif}body{margin:24px;color:#1e293b}
h1{font-size:18px;margin:0 0 4px}.sub{color:#64748b;font-size:12px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f1f5f9;text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
tr.grp td{background:#eff6ff;font-weight:bold;color:#1e40af}
.r{text-align:right}.foot{margin-top:16px;font-size:10px;color:#94a3b8}
</style></head><body>
<h1>${history.siteName} — Daire Bazlı Ödeme Geçmişi</h1>
<div class="sub">Oluşturulma: ${tarih} · ${list.length} ödeme · Toplam: ${fmt(list.reduce((s, r) => s + r.amount, 0))}</div>
<table><thead><tr><th>Tarih</th><th>Tür</th><th>Kaynak</th><th>Yöntem</th><th>Makbuz</th><th class="r">Tutar</th></tr></thead>
<tbody>${body}</tbody></table>
<div class="foot">SiteYönet · ${tarih}</div>
<script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Açılır pencere engellendi."); return; }
    w.document.write(html); w.document.close();
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Raporlar</h1>
        {tab === "matrix" && (
          <button onClick={exportMatrixPdf}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg">
            📄 PDF olarak indir
          </button>
        )}
        {tab === "history" && (
          <div className="flex items-center gap-3">
            <select value={histApt} onChange={e => setHistApt(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tüm Daireler</option>
              {[...new Map((history?.rows ?? []).map(r => [r.apartmentId, r])).values()]
                .map(r => <option key={r.apartmentId} value={r.apartmentId}>{r.blockName} · {r.number}</option>)}
            </select>
            <button onClick={exportHistoryPdf}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg">
              📄 PDF olarak indir
            </button>
          </div>
        )}
        {tab === "status" && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={onlyDebtors} onChange={e => setOnlyDebtors(e.target.checked)} />
              Sadece borçlular
            </label>
            <button onClick={exportPdf}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg">
              📄 PDF olarak indir
            </button>
          </div>
        )}
        {tab === "period" && (
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
            {!years.includes(filterYear) && <option value={filterYear}>{filterYear}</option>}
          </select>
        )}
      </div>

      {/* Sekmeler */}
      <div className="flex gap-6 border-b border-slate-200">
        {([["matrix", "Aylık Ödeme Çizelgesi"], ["status", "Daire Bazlı Borç Durumu"], ["history", "Ödeme Geçmişi"], ["period", "Dönem Özeti"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === k ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>{l}</button>
        ))}
      </div>

      {loading ? <div className="text-slate-400 text-sm">Yükleniyor...</div> :
       tab === "matrix" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-green-500 inline-block"></span> Ödendi</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-red-500 inline-block"></span> Ödenmedi</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-slate-200 inline-block"></span> Muaf</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-200 inline-block"></span> Kayıt yok</span>
          </div>
          {!matrix || matrix.periods.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Henüz aidat dönemi yok. Önce Aidat Yönetimi&apos;nden dönem oluşturun.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 sticky left-0 bg-slate-50 z-10">Daire</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Sakin</th>
                      {matrix.periods.map(p => (
                        <th key={p.id} className="px-2 py-2 font-medium text-slate-600 text-center whitespace-nowrap" title={p.title}>
                          {MONTHS_SHORT[p.month]}<br /><span className="text-slate-400 font-normal">{String(p.year).slice(2)}</span>
                        </th>
                      ))}
                      <th className="px-2 py-2 font-medium text-slate-600 text-center">Borç Ay</th>
                      <th className="px-3 py-2 font-medium text-slate-600 text-right">Borç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map(r => (
                      <tr key={r.apartmentId} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-white">{r.blockName} · {r.number}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.residentName ?? "—"}</td>
                        {r.cells.map(c => (
                          <td key={c.periodId} className="px-1 py-1 text-center" title={c.amount > 0 ? formatCurrency(c.amount) : ""}>
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${cellStyle[c.status] ?? ""}`}>
                              {cellIcon[c.status] ?? ""}
                            </span>
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center">
                          {r.unpaidCount > 0
                            ? <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.unpaidCount >= 3 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{r.unpaidCount}</span>
                            : <span className="text-slate-300">0</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600 whitespace-nowrap">
                          {r.totalDebt > 0 ? formatCurrency(r.totalDebt) : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) :
       tab === "history" ? (
        <div className="space-y-3">
          {history && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Toplam Ödeme Girdisi</div>
                <div className="text-lg font-bold">{history.rows.filter(r => histApt ? String(r.apartmentId) === histApt : true).length}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Toplam Tutar</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(history.rows.filter(r => histApt ? String(r.apartmentId) === histApt : true).reduce((s, r) => s + r.amount, 0))}
                </div>
              </div>
            </div>
          )}
          {(() => {
            const list = (history?.rows ?? []).filter(r => histApt ? String(r.apartmentId) === histApt : true);
            if (list.length === 0)
              return <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Ödeme kaydı yok.</div>;
            // Daireye göre grupla
            const order: number[] = [];
            const map = new Map<number, PaymentEntry[]>();
            list.forEach(r => { if (!map.has(r.apartmentId)) { map.set(r.apartmentId, []); order.push(r.apartmentId); } map.get(r.apartmentId)!.push(r); });
            return (
              <div className="space-y-4">
                {order.map(aptId => {
                  const items = map.get(aptId)!;
                  const head = items[0];
                  const sub = items.reduce((s, x) => s + x.amount, 0);
                  return (
                    <div key={aptId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                        <div className="font-medium text-sm text-blue-900">
                          {head.blockName} · Daire {head.number}
                          {head.residentName && <span className="text-blue-500 font-normal"> — {head.residentName}</span>}
                        </div>
                        <div className="text-sm font-semibold text-blue-900">{formatCurrency(sub)} · {items.length} ödeme</div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">Tarih</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">Tür</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">Kaynak</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">Yöntem</th>
                              <th className="text-left px-4 py-2 font-medium text-slate-600">Makbuz</th>
                              <th className="text-right px-4 py-2 font-medium text-slate-600">Tutar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map(r => (
                              <tr key={r.paymentId} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-600">{formatDate(r.date)}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.type === "Aidat" ? "bg-blue-100 text-blue-700" : r.type === "Ek Ödeme" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                                    {r.type}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600">{r.source}</td>
                                <td className="px-4 py-2 text-slate-500">{METHOD_LABELS[r.method] ?? r.method}</td>
                                <td className="px-4 py-2 text-slate-500">{r.receiptNo ?? "—"}</td>
                                <td className="px-4 py-2 text-right font-medium text-green-600">{formatCurrency(r.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) :
       tab === "status" ? (
        <>
          {/* Borç özeti */}
          {report && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Toplam Daire</div>
                <div className="text-lg font-bold">{report.summary.totalApartments}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Borçlu Daire</div>
                <div className="text-lg font-bold text-red-500">{report.summary.debtorCount}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Güncel Daire</div>
                <div className="text-lg font-bold text-green-600">{report.summary.currentCount}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Tahsil Edilen</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(report.summary.totalCollected)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">Toplam Borç</div>
                <div className="text-lg font-bold text-red-500">{formatCurrency(report.summary.totalDebt)}</div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Blok / Daire</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Sakin</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Tahakkuk</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Ödenen</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Borç</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Gecikme</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">En Eski Borç</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Son Ödeme</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-slate-400">Kayıt yok.</td></tr>
                  ) : rows.map(r => (
                    <tr key={r.apartmentId} className={`hover:bg-slate-50 ${r.totalDebt > 0 ? "bg-red-50/40" : ""}`}>
                      <td className="px-4 py-3 font-medium">{r.blockName} · {r.number}</td>
                      <td className="px-4 py-3">{r.residentName ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(r.totalAssessed)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.totalPaid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        {r.totalDebt > 0 ? formatCurrency(r.totalDebt) : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.unpaidMonths > 0
                          ? <span className={`text-xs px-2 py-0.5 rounded-full ${r.unpaidMonths >= 3 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{r.unpaidMonths} ay</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.oldestUnpaidLabel ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-500">{r.lastPaymentAt ? formatDate(r.lastPaymentAt) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Dönem özeti */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500 mb-1">Beklenen Tahsilat</div>
              <div className="text-xl font-bold">{formatCurrency(totalExpected)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500 mb-1">Gerçekleşen Tahsilat</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500 mb-1">Ödeme Oranı</div>
              <div className="text-xl font-bold text-blue-600">
                %{totalRecords > 0 ? Math.round((totalPaid / totalRecords) * 100) : 0}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500 mb-1">Eksik Tahsilat</div>
              <div className="text-xl font-bold text-red-500">{formatCurrency(totalExpected - totalCollected)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-medium">{filterYear} Yılı Aidat Dönemleri</h2>
            </div>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Bu yıl için dönem kaydı yok.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-slate-600">Dönem</th>
                      <th className="text-right px-5 py-3 font-medium text-slate-600">Birim Tutar</th>
                      <th className="text-right px-5 py-3 font-medium text-slate-600">Toplam</th>
                      <th className="text-right px-5 py-3 font-medium text-slate-600">Tahsilat</th>
                      <th className="text-center px-5 py-3 font-medium text-slate-600">Ödeme</th>
                      <th className="text-center px-5 py-3 font-medium text-slate-600">Bekleyen</th>
                      <th className="text-center px-5 py-3 font-medium text-slate-600">Oran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(p => {
                      const rate = p.totalApartments > 0 ? Math.round((p.paidCount / p.totalApartments) * 100) : 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium">{monthName(p.month)}</td>
                          <td className="px-5 py-3 text-right">{formatCurrency(p.amount)}</td>
                          <td className="px-5 py-3 text-right">{formatCurrency(p.amount * p.totalApartments)}</td>
                          <td className="px-5 py-3 text-right text-green-600">{formatCurrency(p.collectedAmount)}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{p.paidCount}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${p.pendingCount > 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"}`}>
                              {p.pendingCount}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs text-slate-500 w-8">%{rate}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
