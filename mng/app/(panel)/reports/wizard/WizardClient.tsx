"use client";
import { useState } from "react";

type ColDef = { label: string; type: "text" | "number" | "date" | "select" };
type SourceDef = { label: string; icon: string; description: string; columns: Record<string, ColDef> };
type FilterRow = { field: string; op: string; value: string };
type ResultData = {
  cols: string[];
  columnDefs: Record<string, string>;
  rows: Record<string, unknown>[];
  total: number;
};

const SOURCES: Record<string, SourceDef> = {
  customers: {
    label: "Müşteriler", icon: "🏢", description: "Firma, sözleşme, MRR & SLA bilgileri",
    columns: {
      company_name:   { label: "Şirket Adı",           type: "text"   },
      contact_name:   { label: "İletişim Kişisi",       type: "text"   },
      contact_email:  { label: "E-posta",               type: "text"   },
      contact_phone:  { label: "Telefon",               type: "text"   },
      city:           { label: "Şehir",                 type: "text"   },
      country:        { label: "Ülke",                  type: "text"   },
      status:         { label: "Durum",                 type: "select" },
      monthly_fee:    { label: "Aylık Ücret",           type: "number" },
      currency:       { label: "Para Birimi",           type: "text"   },
      contract_start: { label: "Sözleşme Başlangıç",   type: "date"   },
      contract_end:   { label: "Sözleşme Bitiş",       type: "date"   },
      sla_response_hours:   { label: "SLA Yanıt (saat)",   type: "number" },
      sla_resolution_hours: { label: "SLA Çözüm (saat)",   type: "number" },
      created_at:     { label: "Kayıt Tarihi",          type: "date"   },
    },
  },
  tickets: {
    label: "Talepler", icon: "🎫", description: "Destek talepleri, öncelik, SLA & çözüm süreleri",
    columns: {
      company_name:     { label: "Müşteri",             type: "text"   },
      subject:          { label: "Konu",                type: "text"   },
      status:           { label: "Durum",               type: "select" },
      priority:         { label: "Öncelik",             type: "select" },
      category:         { label: "Kategori",            type: "text"   },
      subcategory:      { label: "Alt Kategori",        type: "text"   },
      source:           { label: "Kaynak",              type: "text"   },
      from_email:       { label: "Gönderen E-posta",    type: "text"   },
      created_at:       { label: "Oluşturma Tarihi",    type: "date"   },
      resolved_at:      { label: "Çözüm Tarihi",        type: "date"   },
      hours_to_resolve: { label: "Çözüm Süresi (saat)", type: "number" },
    },
  },
  payments: {
    label: "Ödemeler", icon: "💰", description: "Fatura ve ödeme takibi, vadeler, gecikme analizi",
    columns: {
      company_name: { label: "Müşteri",      type: "text"   },
      amount:       { label: "Tutar",        type: "number" },
      currency:     { label: "Para Birimi",  type: "text"   },
      due_date:     { label: "Vade Tarihi",  type: "date"   },
      paid_date:    { label: "Ödeme Tarihi", type: "date"   },
      status:       { label: "Durum",        type: "select" },
      invoice_no:   { label: "Fatura No",    type: "text"   },
      period:       { label: "Dönem",        type: "text"   },
      created_at:   { label: "Kayıt Tarihi", type: "date"   },
    },
  },
  quotes: {
    label: "Teklifler", icon: "📋", description: "Teklif pipeline'ı, dönüşüm oranları, tutarlar",
    columns: {
      quote_no:       { label: "Teklif No",         type: "text"   },
      company_name:   { label: "Müşteri",           type: "text"   },
      contact_person: { label: "İlgili Kişi",       type: "text"   },
      status:         { label: "Durum",             type: "select" },
      currency:       { label: "Para Birimi",       type: "text"   },
      subtotal:       { label: "Ara Toplam",        type: "number" },
      tax_amount:     { label: "KDV",               type: "number" },
      total:          { label: "Genel Toplam",      type: "number" },
      quote_date:     { label: "Teklif Tarihi",     type: "date"   },
      valid_until:    { label: "Geçerlilik Tarihi", type: "date"   },
      prepared_by:    { label: "Hazırlayan",        type: "text"   },
      created_at:     { label: "Oluşturma Tarihi",  type: "date"   },
    },
  },
  inventory: {
    label: "Envanter", icon: "💻", description: "Zimmet, donanım, garanti bitiş tarihleri",
    columns: {
      company_name:   { label: "Müşteri",            type: "text"   },
      name:           { label: "Cihaz Adı",          type: "text"   },
      category:       { label: "Kategori",           type: "text"   },
      brand:          { label: "Marka",              type: "text"   },
      model:          { label: "Model",              type: "text"   },
      serial_no:      { label: "Seri No",            type: "text"   },
      asset_tag:      { label: "Zimmet No",          type: "text"   },
      status:         { label: "Durum",              type: "select" },
      purchase_date:  { label: "Satın Alma Tarihi",  type: "date"   },
      purchase_price: { label: "Satın Alma Fiyatı",  type: "number" },
      warranty_end:   { label: "Garanti Bitiş",      type: "date"   },
      assigned_date:  { label: "Zimmet Tarihi",      type: "date"   },
    },
  },
  suppliers: {
    label: "Tedarikçi Ürünleri", icon: "📦", description: "Stok, fiyat karşılaştırma, tedarikçi analizi",
    columns: {
      source:       { label: "Kaynak",         type: "text"   },
      product_code: { label: "Ürün Kodu",      type: "text"   },
      title:        { label: "Ürün Adı",       type: "text"   },
      category:     { label: "Kategori",       type: "text"   },
      price_havale: { label: "Havale Fiyatı",  type: "number" },
      price_kk:     { label: "KK Fiyatı",      type: "number" },
      currency:     { label: "Para Birimi",    type: "text"   },
      stock_status: { label: "Stok Durumu",    type: "text"   },
      last_synced:  { label: "Son Güncelleme", type: "date"   },
    },
  },
};

const OPS: { value: string; label: string; types: string[] }[] = [
  { value: "eq",         label: "=  (eşit)",         types: ["text","number","date","select"] },
  { value: "neq",        label: "≠  (eşit değil)",   types: ["text","number","date","select"] },
  { value: "like",       label: "içerir",             types: ["text"] },
  { value: "nlike",      label: "içermez",            types: ["text"] },
  { value: "lt",         label: "<  (küçüktür)",      types: ["number","date"] },
  { value: "lte",        label: "≤  (küçük eşit)",   types: ["number","date"] },
  { value: "gt",         label: ">  (büyüktür)",      types: ["number","date"] },
  { value: "gte",        label: "≥  (büyük eşit)",   types: ["number","date"] },
  { value: "is_null",    label: "boş (NULL)",         types: ["text","number","date","select"] },
  { value: "is_not_null",label: "dolu (NOT NULL)",    types: ["text","number","date","select"] },
];

function formatCell(val: unknown, col: string): string {
  if (val === null || val === undefined) return "—";
  const s = String(val);
  if (
    col.endsWith("_at") || col.endsWith("_date") || col.endsWith("_start") ||
    col.endsWith("_end") || col.endsWith("_synced")
  ) {
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch { return s; }
  }
  if (
    !isNaN(Number(s)) && s !== "" &&
    (col.includes("price") || col.includes("fee") || col.includes("amount") ||
     col.includes("total") || col.includes("subtotal") || col.includes("hours"))
  ) {
    return Number(s).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return s;
}

export default function WizardClient() {
  const [step, setStep]               = useState(1);
  const [source, setSource]           = useState("");
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [filters, setFilters]         = useState<FilterRow[]>([]);
  const [sortField, setSortField]     = useState("");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");
  const [limit, setLimit]             = useState(200);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<ResultData | null>(null);
  const [error, setError]             = useState("");

  const sourceDef = source ? SOURCES[source] : null;
  const colKeys   = sourceDef ? Object.keys(sourceDef.columns) : [];

  function selectSource(s: string) {
    setSource(s);
    setSelectedCols(Object.keys(SOURCES[s].columns));
    setFilters([]);
    setSortField("");
    setResult(null);
    setError("");
    setStep(2);
  }

  function toggleCol(col: string) {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function addFilter() {
    if (!sourceDef) return;
    setFilters((prev) => [...prev, { field: colKeys[0], op: "eq", value: "" }]);
  }

  function updateFilter(i: number, patch: Partial<FilterRow>) {
    setFilters((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function removeFilter(i: number) {
    setFilters((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function runQuery() {
    if (!source) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        source,
        sort: sortField,
        dir: sortDir,
        limit: String(limit),
      });
      selectedCols.forEach((c) => params.append("col", c));
      filters.forEach((f) => {
        if (f.op === "is_null" || f.op === "is_not_null") {
          params.append("filter", `${f.field}|${f.op}|`);
        } else if (f.value.trim()) {
          params.append("filter", `${f.field}|${f.op}|${f.value}`);
        }
      });
      const res = await fetch(`/api/reports/query?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Sunucu hatası" }));
        throw new Error(body.error ?? "Sorgu başarısız");
      }
      const data: ResultData = await res.json();
      setResult(data);
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sorgu başarısız");
    } finally {
      setLoading(false);
    }
  }

  function handleCSV() {
    if (!result) return;
    const header = result.cols.map((c) => `"${result.columnDefs[c] ?? c}"`).join(",");
    const rows = result.rows.map((r) =>
      result.cols
        .map((c) => {
          const v = formatCell(r[c], c);
          return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `rapor_${source}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const STEP_LABELS = ["Kaynak", "Kolonlar", "Filtreler", "Sonuçlar"];

  return (
    <>
      <style>{css}</style>
      <div className="wiz-wrap">
        {/* Steps */}
        <div className="wiz-stepper">
          {STEP_LABELS.map((lbl, i) => {
            const n = i + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={n} className="wiz-step-item">
                <div
                  className={`wiz-step-bubble ${done ? "done" : active ? "active" : ""}`}
                  onClick={() => {
                    if (done || (active && step > 1)) {
                      if (n < step) setStep(n);
                    }
                  }}
                >
                  {done ? "✓" : n}
                </div>
                <div className={`wiz-step-label ${active ? "active" : ""}`}>{lbl}</div>
                {i < 3 && <div className="wiz-step-connector" />}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Source */}
        {step === 1 && (
          <div className="wiz-body">
            <div className="wiz-head">
              <h2 className="wiz-title">Veri Kaynağı Seçin</h2>
              <p className="wiz-sub">Raporlamak istediğiniz veri setini seçin</p>
            </div>
            <div className="src-grid">
              {Object.entries(SOURCES).map(([key, def]) => (
                <button key={key} className="src-card" onClick={() => selectSource(key)}>
                  <div className="src-icon">{def.icon}</div>
                  <div className="src-name">{def.label}</div>
                  <div className="src-desc">{def.description}</div>
                  <div className="src-meta">{Object.keys(def.columns).length} kolon mevcut</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Columns */}
        {step === 2 && sourceDef && (
          <div className="wiz-body">
            <div className="wiz-head">
              <h2 className="wiz-title">{sourceDef.icon} {sourceDef.label} — Kolon Seçimi</h2>
              <p className="wiz-sub">Raporda görmek istediğiniz kolonları işaretleyin</p>
            </div>
            <div className="col-actions-top">
              <button className="btn-sel-all" onClick={() => setSelectedCols(colKeys)}>Tümünü Seç</button>
              <button className="btn-sel-none" onClick={() => setSelectedCols([])}>Temizle</button>
              <span className="sel-count">{selectedCols.length} / {colKeys.length} seçili</span>
            </div>
            <div className="col-grid">
              {colKeys.map((col) => {
                const checked = selectedCols.includes(col);
                const def = sourceDef.columns[col];
                return (
                  <label key={col} className={`col-item ${checked ? "checked" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCol(col)} />
                    <div className="col-item-content">
                      <span className="col-item-name">{def.label}</span>
                      <span className={`col-type-badge type-${def.type}`}>{def.type}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="wiz-nav">
              <button className="btn-back" onClick={() => setStep(1)}>← Geri</button>
              <button className="btn-next" onClick={() => setStep(3)} disabled={selectedCols.length === 0}>
                İleri → ({selectedCols.length} kolon seçili)
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Filters */}
        {step === 3 && sourceDef && (
          <div className="wiz-body">
            <div className="wiz-head">
              <h2 className="wiz-title">Filtreler &amp; Sıralama</h2>
              <p className="wiz-sub">Koşullar ekleyerek veriyi daraltın, sıralayın</p>
            </div>

            <div className="filter-block">
              <div className="filter-block-header">
                <span className="filter-block-title">Filtre Koşulları</span>
                <button className="btn-add-filter" onClick={addFilter}>+ Filtre Ekle</button>
              </div>
              {filters.length === 0 && (
                <div className="no-filters">Filtre yok — tüm kayıtlar getirilecek</div>
              )}
              {filters.map((f, i) => {
                const colType = sourceDef.columns[f.field]?.type ?? "text";
                const ops = OPS.filter((o) => o.types.includes(colType));
                const noValue = f.op === "is_null" || f.op === "is_not_null";
                return (
                  <div key={i} className="filter-row">
                    <div className="filter-row-num">{i + 1}</div>
                    <select
                      className="f-sel"
                      value={f.field}
                      onChange={(e) => updateFilter(i, { field: e.target.value, op: "eq", value: "" })}
                    >
                      {colKeys.map((c) => (
                        <option key={c} value={c}>{sourceDef.columns[c].label}</option>
                      ))}
                    </select>
                    <select className="f-op" value={f.op} onChange={(e) => updateFilter(i, { op: e.target.value })}>
                      {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {!noValue && (
                      <input
                        className="f-val"
                        type={colType === "date" ? "date" : colType === "number" ? "number" : "text"}
                        value={f.value}
                        placeholder="Değer girin…"
                        onChange={(e) => updateFilter(i, { value: e.target.value })}
                      />
                    )}
                    <button className="f-del" onClick={() => removeFilter(i)} title="Filtreyi kaldır">×</button>
                  </div>
                );
              })}
            </div>

            <div className="sort-block">
              <div className="filter-block-title">Sıralama &amp; Limit</div>
              <div className="sort-row">
                <select className="f-sel" value={sortField} onChange={(e) => setSortField(e.target.value)}>
                  <option value="">— Sıralama yok —</option>
                  {selectedCols.map((c) => (
                    <option key={c} value={c}>{sourceDef.columns[c]?.label ?? c}</option>
                  ))}
                </select>
                <select className="f-op" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}>
                  <option value="asc">Artan (A→Z, küçük→büyük) ↑</option>
                  <option value="desc">Azalan (Z→A, büyük→küçük) ↓</option>
                </select>
                <label className="limit-wrap">
                  <span className="limit-label">Maks. satır</span>
                  <input
                    className="limit-input"
                    type="number"
                    min={1}
                    max={1000}
                    value={limit}
                    onChange={(e) => setLimit(Math.min(1000, Math.max(1, parseInt(e.target.value) || 200)))}
                  />
                </label>
              </div>
            </div>

            {error && <div className="wiz-error">{error}</div>}
            <div className="wiz-nav">
              <button className="btn-back" onClick={() => setStep(2)}>← Geri</button>
              <button className="btn-run" onClick={runQuery} disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? "Sorgulanıyor…" : "Raporu Oluştur →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Results */}
        {step === 4 && result && (
          <div className="wiz-body wiz-results">
            <div className="res-header">
              <div>
                <h2 className="wiz-title">Rapor Sonuçları</h2>
                <div className="res-meta">
                  <span className="res-source">{SOURCES[source]?.icon} {SOURCES[source]?.label}</span>
                  <span className="res-count">{result.total} kayıt</span>
                  <span className="res-cols">{result.cols.length} kolon</span>
                </div>
              </div>
              <div className="res-actions">
                <button className="btn-edit" onClick={() => setStep(3)}>← Düzenle</button>
                <button className="btn-csv" onClick={handleCSV}>⬇ CSV İndir</button>
                <button className="btn-print" onClick={() => window.print()}>🖨 Yazdır</button>
              </div>
            </div>

            {result.total === 0 ? (
              <div className="no-results">Sonuç bulunamadı. Filtrelerinizi gevşetin.</div>
            ) : (
              <div className="res-table-wrap">
                <table className="res-table">
                  <thead>
                    <tr>
                      {result.cols.map((c) => (
                        <th key={c}>{result.columnDefs[c] ?? c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "even" : ""}>
                        {result.cols.map((c) => (
                          <td key={c}>{formatCell(row[c], c)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const css = `
.wiz-wrap{padding:28px;display:flex;flex-direction:column;gap:24px;max-width:1100px}

/* Stepper */
.wiz-stepper{display:flex;align-items:center;gap:0;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 28px}
.wiz-step-item{display:flex;align-items:center;gap:0;position:relative}
.wiz-step-bubble{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:var(--input-bg);color:var(--text-muted);border:2px solid var(--border);cursor:default;flex-shrink:0}
.wiz-step-bubble.active{background:#2563eb;color:#fff;border-color:#2563eb}
.wiz-step-bubble.done{background:#22c55e;color:#fff;border-color:#22c55e;cursor:pointer}
.wiz-step-label{font-size:12px;color:var(--text-muted);margin-left:8px;margin-right:4px;white-space:nowrap}
.wiz-step-label.active{color:var(--text);font-weight:700}
.wiz-step-connector{width:48px;height:2px;background:var(--border);margin:0 8px;flex-shrink:0}

/* Body */
.wiz-body{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:28px}
.wiz-head{margin-bottom:24px}
.wiz-title{font-size:18px;font-weight:800;color:var(--text);margin-bottom:4px}
.wiz-sub{font-size:13px;color:var(--text-muted)}

/* Source grid */
.src-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.src-card{background:var(--bg);border:2px solid var(--border);border-radius:10px;padding:20px 16px;text-align:left;cursor:pointer;transition:border-color 0.15s,transform 0.1s;display:flex;flex-direction:column;gap:6px}
.src-card:hover{border-color:#3b82f6;transform:translateY(-2px)}
.src-icon{font-size:28px}
.src-name{font-size:15px;font-weight:800;color:var(--text)}
.src-desc{font-size:11px;color:var(--text-muted);line-height:1.45}
.src-meta{font-size:10px;color:var(--text-dimmer);margin-top:2px;font-weight:600}

/* Column grid */
.col-actions-top{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.btn-sel-all,.btn-sel-none{font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:var(--input-bg);color:var(--text-sub);cursor:pointer}
.btn-sel-all:hover{border-color:#3b82f6;color:#3b82f6}
.sel-count{font-size:12px;color:var(--text-muted);margin-left:auto}
.col-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:24px}
.col-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);cursor:pointer;transition:border-color 0.15s}
.col-item.checked{border-color:#3b82f6;background:#eff6ff}
.col-item input{width:15px;height:15px;accent-color:#3b82f6;flex-shrink:0}
.col-item-content{display:flex;flex-direction:column;gap:2px;min-width:0}
.col-item-name{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.col-type-badge{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;text-transform:uppercase;letter-spacing:0.04em;width:fit-content}
.type-text{background:#eff6ff;color:#2563eb}
.type-number{background:#f0fdf4;color:#16a34a}
.type-date{background:#fef3c7;color:#d97706}
.type-select{background:#faf5ff;color:#7c3aed}

/* Filters */
.filter-block{margin-bottom:20px}
.filter-block-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.filter-block-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)}
.btn-add-filter{font-size:12px;font-weight:700;padding:5px 12px;border-radius:6px;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-add-filter:hover{background:#1d4ed8}
.no-filters{padding:16px;border:1px dashed var(--border);border-radius:8px;text-align:center;font-size:12px;color:var(--text-dimmer)}
.filter-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px}
.filter-row-num{font-size:10px;font-weight:700;color:var(--text-dimmer);width:16px;text-align:center;flex-shrink:0}
.f-sel,.f-op,.f-val{padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text);font-size:12px;outline:none}
.f-sel{flex:1 1 160px;max-width:220px}
.f-op{flex:0 0 auto;min-width:140px}
.f-val{flex:1 1 160px}
.f-del{background:none;border:1px solid var(--border);color:var(--text-muted);width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:16px;line-height:1;flex-shrink:0}
.f-del:hover{background:#fee2e2;border-color:#ef4444;color:#ef4444}

/* Sort */
.sort-block{margin-bottom:24px}
.sort-row{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
.limit-wrap{display:flex;align-items:center;gap:6px;margin-left:auto}
.limit-label{font-size:12px;color:var(--text-muted);white-space:nowrap}
.limit-input{width:70px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text);font-size:12px;text-align:center}

/* Nav */
.wiz-nav{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid var(--divider);margin-top:8px}
.btn-back{padding:8px 18px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-sub);font-size:13px;font-weight:600;cursor:pointer}
.btn-back:hover{background:var(--input-bg)}
.btn-next{padding:9px 22px;border-radius:8px;border:none;background:#2563eb;color:#fff;font-size:13px;font-weight:700;cursor:pointer}
.btn-next:hover:not(:disabled){background:#1d4ed8}
.btn-next:disabled{opacity:0.4;cursor:not-allowed}
.btn-run{padding:9px 24px;border-radius:8px;border:none;background:#059669;color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px}
.btn-run:hover:not(:disabled){background:#047857}
.btn-run:disabled{opacity:0.6;cursor:not-allowed}
.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
.wiz-error{background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:8px}

/* Results */
.wiz-results{padding:24px}
.res-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:16px;flex-wrap:wrap}
.res-meta{display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap}
.res-source{font-size:13px;font-weight:700;color:var(--text)}
.res-count,.res-cols{font-size:12px;padding:2px 8px;border-radius:12px;background:var(--input-bg);color:var(--text-muted);font-weight:600}
.res-actions{display:flex;gap:8px;flex-wrap:wrap}
.btn-edit{padding:7px 14px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text-sub);font-size:12px;font-weight:600;cursor:pointer}
.btn-csv{padding:7px 14px;border-radius:7px;border:none;background:#2563eb;color:#fff;font-size:12px;font-weight:700;cursor:pointer}
.btn-csv:hover{background:#1d4ed8}
.btn-print{padding:7px 14px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text-sub);font-size:12px;font-weight:600;cursor:pointer}
.btn-print:hover{background:var(--input-bg)}
.no-results{padding:40px;text-align:center;font-size:14px;color:var(--text-muted);background:var(--bg);border-radius:8px}
.res-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:8px}
.res-table{width:100%;border-collapse:collapse;min-width:600px}
.res-table th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dimmer);background:var(--bg);border-bottom:2px solid var(--divider);white-space:nowrap}
.res-table td{padding:9px 12px;font-size:12px;color:var(--text-sub);border-bottom:1px solid var(--row-border);white-space:nowrap}
.res-table tr.even td{background:var(--row-alt)}
.res-table tbody tr:hover td{background:var(--row-hover)}
.res-table tr:last-child td{border-bottom:none}

@media print{
  .wiz-stepper,.wiz-head,.wiz-nav,.res-actions,.btn-edit,.btn-csv,.btn-print{display:none!important}
  .res-table-wrap{overflow:visible;border:1px solid #ccc}
  .res-table td,.res-table th{font-size:9pt;padding:6px 8px}
}

@media(max-width:768px){
  .wiz-wrap{padding:16px}
  .src-grid{grid-template-columns:1fr 1fr}
  .wiz-stepper{padding:12px 16px}
  .wiz-step-connector{width:24px}
  .filter-row{flex-wrap:wrap}
}
`;
