"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";

const SOURCE_LABELS: Record<string, string> = {
  erem:   "Erem Online",
  bilsam: "B2B Depo",
  ergen:  "Ergen Elektronik",
};

const SOURCE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  erem:   { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
  bilsam: { bg: "#ede9fe", color: "#6d28d9", border: "#ddd6fe" },
  ergen:  { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
};

function fmtPrice(val: string | null, cur: string): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  const sym: Record<string, string> = { USD: "$", EUR: "€", TRY: "₺", TL: "₺" };
  return `${sym[cur] ?? cur} ${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function stockColor(s: string | null): string {
  if (!s) return "#94a3b8";
  if (/yok/i.test(s) || s === "0") return "#ef4444";
  if (/var|[1-9]/i.test(s)) return "#22c55e";
  return "#f59e0b";
}

type Product = {
  id: number; source: string; product_code: string; title: string;
  category: string | null; price_havale: string | null; price_kk: string | null;
  price_vadeli: string | null; currency: string; stock_status: string | null;
  image_url: string | null; detail_url: string | null; last_synced: string;
};

interface Props {
  products: Product[];
  categories: { name: string; count: number }[];
  total: number; totalAll: number; page: number; pages: number;
  lastSynced: string | null; q: string; cat: string; source: string;
  sort: string; instock: boolean;
  sourceCounts: Record<string, number>;
  supplierDefs: { source: string; label: string }[];
}

type SyncResult = { total: number; inserted: number; errors: number } | null;

export default function SupplierClient({
  products, categories, total, totalAll, page, pages,
  lastSynced, q, cat, source, sort, instock, sourceCounts, supplierDefs,
}: Props) {
  const router = useRouter();
  const [, startT] = useTransition();
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  function nav(params: Record<string, string | undefined>) {
    const base: Record<string, string | undefined> = {
      q: q || undefined, cat: cat || undefined, source: source || undefined,
      sort: sort !== "title" ? sort : undefined, instock: instock ? "1" : undefined,
    };
    const merged = { ...base, ...params };
    if (!("page" in params)) delete merged.page;
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    startT(() => router.push(`/supplier${sp.toString() ? `?${sp}` : ""}`));
  }

  async function handleSync(src?: string) {
    setSyncError(null); setSyncResult(null);
    if (src) setSyncingSource(src); else setSyncingAll(true);
    try {
      const url = src ? `/api/supplier/sync?source=${src}` : "/api/supplier/sync";
      const resp = await fetch(url, { method: "POST" });
      const text = await resp.text();
      if (!resp.ok) {
        let msg = text;
        try { msg = JSON.parse(text).error ?? text; } catch {}
        setSyncError(msg);
        return;
      }
      const data = JSON.parse(text);
      setSyncResult(data.result);
      router.refresh();
    } catch (e) {
      setSyncError(String(e));
    } finally {
      if (src) setSyncingSource(null); else setSyncingAll(false);
    }
  }

  function addToQuote(p: Product) {
    const sp = new URLSearchParams({ pc: p.product_code, desc: p.title, price: p.price_havale ?? p.price_kk ?? "0" });
    router.push(`/quotes/new?${sp}`);
  }

  const isSyncing = syncingAll || !!syncingSource;
  const allCount = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
  const activeFilters = [source && (SOURCE_LABELS[source] ?? source), cat, q && `"${q}"`, instock && "Stokta var"].filter(Boolean) as string[];

  return (
    <>
      <style>{css}</style>
      <div className="sp">
        {/* Header */}
        <div className="sp-header">
          <div>
            <h1 className="sp-title">Tedarikçi Ürünleri</h1>
            <p className="sp-sub">
              {totalAll > 0
                ? <><b>{allCount.toLocaleString("tr-TR")}</b> ürün · Son sync: {fmtDate(lastSynced)}</>
                : "Henüz senkronizasyon yapılmadı"}
            </p>
          </div>
          <button className="btn-sync-all" onClick={() => handleSync()} disabled={isSyncing}>
            {syncingAll ? <><span className="spin">↻</span> Senkronize ediliyor…</> : "↻ Tümünü Senkronize Et"}
          </button>
        </div>

        {/* Alerts */}
        {syncError && <div className="alert err">⚠ {syncError}</div>}
        {syncResult && (
          <div className="alert ok">
            ✓ Tamamlandı — {syncResult.total} ürün, {syncResult.inserted} eklendi/güncellendi
            {syncResult.errors > 0 && `, ${syncResult.errors} hata`}
          </div>
        )}
        {isSyncing && (
          <div className="alert info">
            <span className="spin">↻</span>{" "}
            {syncingSource ? `${SOURCE_LABELS[syncingSource] ?? syncingSource} senkronize ediliyor…` : "Tüm tedarikçiler paralel olarak senkronize ediliyor…"}
            {" "}Bu işlem birkaç dakika sürebilir.
          </div>
        )}

        {/* Content */}
        <div className="sp-layout">
          {/* Sidebar */}
          {filterOpen && <div className="sb-backdrop" onClick={() => setFilterOpen(false)} />}
          <aside className={`sp-sidebar${filterOpen ? " open" : ""}`}>
            <div className="sb-head">
              <span>Filtreler</span>
              <button className="sb-close" onClick={() => setFilterOpen(false)}>✕</button>
            </div>

            {/* Suppliers */}
            <div className="sb-section">
              <div className="sb-label">Tedarikçi</div>
              <button className={`sb-opt${!source ? " active" : ""}`} onClick={() => { nav({ source: undefined, cat: undefined }); setFilterOpen(false); }}>
                <span>Tümü</span><span className="sb-cnt">{allCount.toLocaleString("tr-TR")}</span>
              </button>
              {supplierDefs.map(({ source: src, label }) => {
                const clr = SOURCE_COLORS[src];
                return (
                  <div key={src} className="sb-opt-row">
                    <button
                      className={`sb-opt${source === src ? " active" : ""}`}
                      style={source === src && clr ? { background: clr.bg, color: clr.color, borderColor: clr.border } : {}}
                      onClick={() => { nav({ source: src, cat: undefined }); setFilterOpen(false); }}
                    >
                      <span>{label}</span>
                      <span className="sb-cnt">{(sourceCounts[src] ?? 0).toLocaleString("tr-TR")}</span>
                    </button>
                    <button
                      className={`sb-sync-btn${syncingSource === src ? " spinning" : ""}`}
                      onClick={() => handleSync(src)}
                      disabled={isSyncing}
                      title={`${label} senkronize et`}
                    >
                      {syncingSource === src ? <span className="spin">↻</span> : "↻"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* In-stock */}
            <div className="sb-section">
              <div className="sb-label">Stok</div>
              <label className="sb-toggle">
                <input type="checkbox" checked={instock} onChange={e => nav({ instock: e.target.checked ? "1" : undefined })} />
                <span className="sb-toggle-track"><span className="sb-toggle-thumb" /></span>
                Sadece stokta olanlar
              </label>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="sb-section">
                <div className="sb-label">Kategori</div>
                <div className="sb-cat-list">
                  <button className={`sb-opt${!cat ? " active" : ""}`} onClick={() => { nav({ cat: undefined }); setFilterOpen(false); }}>
                    <span>Tüm Kategoriler</span>
                  </button>
                  {categories.map(c => (
                    <button key={c.name} className={`sb-opt${cat === c.name ? " active" : ""}`}
                      onClick={() => { nav({ cat: cat === c.name ? undefined : c.name }); setFilterOpen(false); }}>
                      <span className="sb-opt-name">{c.name}</span>
                      <span className="sb-cnt">{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main */}
          <div className="sp-main">
            {/* Toolbar */}
            <div className="sp-toolbar">
              <button className="btn-filter" onClick={() => setFilterOpen(true)}>
                ⚙ Filtreler {activeFilters.length > 0 ? `(${activeFilters.length})` : ""}
              </button>
              <form className="search-form" onSubmit={e => { e.preventDefault(); nav({ q: searchRef.current?.value || undefined }); }}>
                <input ref={searchRef} defaultValue={q} placeholder="Ürün kodu veya adı…" className="search-input" />
                <button type="submit" className="search-btn">Ara</button>
                {q && <button type="button" className="clear-x" onClick={() => nav({ q: undefined })}>✕</button>}
              </form>
              <select className="sort-sel" value={sort} onChange={e => nav({ sort: e.target.value !== "title" ? e.target.value : undefined })}>
                <option value="title">Alfabetik</option>
                <option value="price_asc">Fiyat ↑</option>
                <option value="price_desc">Fiyat ↓</option>
              </select>
              <div className="view-btns">
                <button className={`vbtn${view === "grid" ? " on" : ""}`} onClick={() => setView("grid")} title="Kart">⊞</button>
                <button className={`vbtn${view === "list" ? " on" : ""}`} onClick={() => setView("list")} title="Liste">☰</button>
              </div>
              <span className="res-cnt">{total.toLocaleString("tr-TR")} ürün</span>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="chip-row">
                {source && <span className="chip">{SOURCE_LABELS[source] ?? source} <button onClick={() => nav({ source: undefined, cat: undefined })}>✕</button></span>}
                {cat && <span className="chip">{cat} <button onClick={() => nav({ cat: undefined })}>✕</button></span>}
                {q && <span className="chip">"{q}" <button onClick={() => nav({ q: undefined })}>✕</button></span>}
                {instock && <span className="chip">Stokta var <button onClick={() => nav({ instock: undefined })}>✕</button></span>}
                <button className="chip-clear" onClick={() => nav({ q: undefined, cat: undefined, source: undefined, instock: undefined, sort: undefined })}>Temizle</button>
              </div>
            )}

            {/* Products */}
            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                {totalAll === 0
                  ? <><div className="empty-title">Henüz ürün yok</div><div className="empty-sub">Tedarikçileri senkronize edin.</div></>
                  : <><div className="empty-title">Sonuç bulunamadı</div><div className="empty-sub">Filtreleri değiştirmeyi deneyin.</div></>
                }
              </div>
            ) : view === "grid" ? (
              <div className="prod-grid">
                {products.map(p => <ProductCard key={p.id} p={p} onAdd={addToQuote} />)}
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Ürün Kodu</th><th>Açıklama</th>
                      <th className="hs">Kategori</th><th>Fiyat</th>
                      <th className="hs">Stok</th><th className="hs">Kaynak</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const sc = stockColor(p.stock_status);
                      const clr = SOURCE_COLORS[p.source];
                      return (
                        <tr key={p.id}>
                          <td><a href={p.detail_url ?? "#"} target="_blank" rel="noopener" className="code-lnk">{p.product_code}</a></td>
                          <td><span className="tbl-title">{p.title}</span></td>
                          <td className="hs">{p.category ? <span className="tbl-cat">{p.category}</span> : "—"}</td>
                          <td>
                            <div className="tbl-price">{fmtPrice(p.price_havale, p.currency)}</div>
                            {p.price_kk && p.price_kk !== p.price_havale && <div className="tbl-pricekk">KK: {fmtPrice(p.price_kk, p.currency)}</div>}
                          </td>
                          <td className="hs">
                            <span className="stk-badge" style={{ color: sc, background: `${sc}18`, borderColor: `${sc}40` }}>{p.stock_status ?? "—"}</span>
                          </td>
                          <td className="hs">
                            <span className="src-badge" style={clr ? { background: clr.bg, color: clr.color, borderColor: clr.border } : {}}>
                              {SOURCE_LABELS[p.source] ?? p.source}
                            </span>
                          </td>
                          <td><button className="add-btn" onClick={() => addToQuote(p)}>+ Teklif</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="pager">
                <button className="pg-btn" onClick={() => nav({ page: String(page - 1) })} disabled={page <= 1}>← Önceki</button>
                {(() => {
                  const range: number[] = [];
                  const delta = 2;
                  for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) range.push(i);
                  if (range[0] > 1) range.unshift(-1, 1);
                  if (range[range.length - 1] < pages) range.push(-2, pages);
                  return range.map((p2, i) =>
                    p2 < 0 ? <span key={`e${i}`} className="pg-ellipsis">…</span>
                      : <button key={p2} className={`pg-btn${p2 === page ? " on" : ""}`} onClick={() => nav({ page: String(p2) })}>{p2}</button>
                  );
                })()}
                <button className="pg-btn" onClick={() => nav({ page: String(page + 1) })} disabled={page >= pages}>Sonraki →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ProductCard({ p, onAdd }: { p: Product; onAdd: (p: Product) => void }) {
  const sc = stockColor(p.stock_status);
  const clr = SOURCE_COLORS[p.source] ?? { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
  return (
    <div className="pcard">
      <a href={p.detail_url ?? "#"} target="_blank" rel="noopener" className="pcard-img-link">
        <div className="pcard-img">
          {p.image_url
            ? <img src={p.image_url} alt="" loading="lazy" className="pcard-photo" />
            : <span className="pcard-noimg">📦</span>}
        </div>
      </a>
      <div className="pcard-body">
        <div className="pcard-tags">
          <span className="tag-src" style={{ background: clr.bg, color: clr.color, borderColor: clr.border }}>
            {SOURCE_LABELS[p.source] ?? p.source}
          </span>
          {p.category && <span className="tag-cat">{p.category}</span>}
        </div>
        <div className="pcard-code">{p.product_code}</div>
        <div className="pcard-title">{p.title}</div>
        <div className="pcard-prices">
          <span className="pprice-main">{fmtPrice(p.price_havale, p.currency)}</span>
          {p.price_kk && p.price_kk !== p.price_havale && (
            <span className="pprice-kk">KK: {fmtPrice(p.price_kk, p.currency)}</span>
          )}
        </div>
        <div className="pcard-foot">
          <span className="pstock" style={{ color: sc }}>
            <span className="pstock-dot" style={{ background: sc }} />
            {p.stock_status ?? "Bilinmiyor"}
          </span>
          <button className="padd-btn" onClick={() => onAdd(p)}>+ Teklif</button>
        </div>
      </div>
    </div>
  );
}

const css = `
/* ── Layout ───────────────────────────────── */
.sp{padding:24px;min-height:100vh}
@media(max-width:640px){.sp{padding:14px}}
.sp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.sp-title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-.5px;margin-bottom:4px}
.sp-sub{font-size:13px;color:var(--text-dim)}
.sp-sub b{color:var(--text-sub)}
.btn-sync-all{background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:background .15s;flex-shrink:0}
.btn-sync-all:hover:not(:disabled){background:#1d4ed8}
.btn-sync-all:disabled{opacity:.6;cursor:not-allowed}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{display:inline-block;animation:spin .8s linear infinite}

/* ── Alerts ───────────────────────────────── */
.alert{border-radius:8px;padding:11px 16px;margin-bottom:12px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px}
.alert.err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#dc2626}
.alert.ok{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);color:#16a34a}
.alert.info{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);color:#2563eb}

/* ── Content layout ───────────────────────── */
.sp-layout{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start}
@media(max-width:900px){.sp-layout{grid-template-columns:1fr}}

/* ── Sidebar ─────────────────────────────── */
.sp-sidebar{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;position:sticky;top:80px}
@media(max-width:900px){
  .sp-sidebar{position:fixed;top:0;left:0;bottom:0;width:280px;border-radius:0;z-index:200;transform:translateX(-100%);transition:transform .25s;overflow-y:auto}
  .sp-sidebar.open{transform:translateX(0)}
  .sb-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:199}
}
.sb-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--divider);font-size:14px;font-weight:700;color:var(--text)}
.sb-close{background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:16px;padding:2px 6px}
@media(min-width:901px){.sb-close{display:none}}
.sb-section{padding:12px 14px;border-bottom:1px solid var(--divider)}
.sb-section:last-child{border-bottom:none}
.sb-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dimmer);margin-bottom:8px}
.sb-opt{display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 10px;border-radius:7px;font-size:12px;font-weight:500;color:var(--text-sub);background:transparent;border:1px solid transparent;cursor:pointer;text-align:left;transition:all .15s;gap:6px}
.sb-opt:hover{background:var(--row-hover);color:var(--text)}
.sb-opt.active{background:var(--nav-active-bg);color:var(--nav-active-text);border-color:rgba(59,130,246,.2);font-weight:700}
.sb-opt-name{flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-cnt{font-size:10px;background:rgba(0,0,0,.08);padding:1px 6px;border-radius:8px;flex-shrink:0}
.sb-opt-row{display:flex;align-items:center;gap:4px}
.sb-opt-row .sb-opt{flex:1}
.sb-sync-btn{background:transparent;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12px;color:var(--text-dim);cursor:pointer;transition:all .15s;flex-shrink:0}
.sb-sync-btn:hover:not(:disabled){border-color:#2563eb;color:#2563eb}
.sb-sync-btn:disabled{opacity:.4;cursor:not-allowed}
.sb-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:500;color:var(--text-sub);user-select:none}
.sb-toggle input{display:none}
.sb-toggle-track{width:36px;height:20px;background:var(--input-border);border-radius:10px;position:relative;transition:background .2s;flex-shrink:0}
.sb-toggle input:checked~.sb-toggle-track{background:#2563eb}
.sb-toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.sb-toggle input:checked~.sb-toggle-track .sb-toggle-thumb{left:19px}
.sb-cat-list{max-height:320px;overflow-y:auto}

/* ── Toolbar ─────────────────────────────── */
.sp-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.btn-filter{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;color:var(--text-sub);cursor:pointer;white-space:nowrap;display:none}
@media(max-width:900px){.btn-filter{display:flex;align-items:center;gap:6px}}
.search-form{display:flex;gap:5px;flex:1;min-width:180px}
.search-input{flex:1;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);outline:none}
.search-input:focus{border-color:#3b82f6}
.search-btn{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer}
.search-btn:hover{background:#2563eb}
.clear-x{background:transparent;border:1px solid var(--border);border-radius:7px;padding:7px 10px;font-size:12px;color:var(--text-dim);cursor:pointer}
.sort-sel{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--text-sub);outline:none;cursor:pointer}
.view-btns{display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;flex-shrink:0}
.vbtn{background:transparent;border:none;padding:8px 11px;font-size:15px;color:var(--text-dim);cursor:pointer;transition:all .15s}
.vbtn.on{background:var(--nav-active-bg);color:var(--nav-active-text)}
.res-cnt{font-size:12px;color:var(--text-ghost);white-space:nowrap}

/* ── Filter chips ────────────────────────── */
.chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;align-items:center}
.chip{display:flex;align-items:center;gap:4px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;color:var(--text-sub)}
.chip button{background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:12px;padding:0;line-height:1}
.chip-clear{background:transparent;border:none;font-size:11px;color:#3b82f6;cursor:pointer;font-weight:600}

/* ── Product grid ────────────────────────── */
.prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
@media(max-width:500px){.prod-grid{grid-template-columns:repeat(2,1fr);gap:10px}}

/* ── Product card ────────────────────────── */
.pcard{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .2s,border-color .2s}
.pcard:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);border-color:rgba(59,130,246,.35)}
.pcard-img-link{display:block}
.pcard-img{height:130px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;border-bottom:1px solid var(--divider)}
.pcard-photo{max-width:100%;max-height:100%;object-fit:contain;padding:10px}
.pcard-noimg{font-size:36px;opacity:.4}
.pcard-body{padding:11px;display:flex;flex-direction:column;gap:5px;flex:1}
.pcard-tags{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.tag-src{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid transparent;letter-spacing:.03em;white-space:nowrap}
.tag-cat{font-size:9px;font-weight:500;padding:2px 6px;border-radius:4px;background:var(--input-bg);border:1px solid var(--input-border);color:var(--text-dimmer);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pcard-code{font-family:monospace;font-size:9px;color:var(--text-ghost)}
.pcard-title{font-size:11px;font-weight:600;color:var(--text-sub);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1}
.pcard-prices{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.pprice-main{font-size:15px;font-weight:800;color:var(--text)}
.pprice-kk{font-size:10px;color:var(--text-dim)}
.pcard-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:2px}
.pstock{display:flex;align-items:center;gap:4px;font-size:10px;font-weight:600}
.pstock-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.padd-btn{background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s;flex-shrink:0}
.padd-btn:hover{background:#2563eb}

/* ── Table ───────────────────────────────── */
.tbl-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:auto}
.tbl{width:100%;border-collapse:collapse;min-width:540px}
.tbl th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--divider)}
.tbl td{padding:10px 14px;border-bottom:1px solid var(--row-border);font-size:12px;color:var(--text-sub);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:var(--row-hover)}
.code-lnk{font-family:monospace;font-size:11px;color:#3b82f6;font-weight:600}
.code-lnk:hover{text-decoration:underline}
.tbl-title{font-size:12px;line-height:1.4}
.tbl-cat{font-size:10px;background:var(--input-bg);border:1px solid var(--input-border);padding:2px 7px;border-radius:10px;color:var(--text-dim);white-space:nowrap}
.tbl-price{font-weight:700;font-size:13px;color:var(--text-sub);white-space:nowrap}
.tbl-pricekk{font-size:10px;color:var(--text-ghost)}
.stk-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;border:1px solid;white-space:nowrap}
.src-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;border:1px solid;white-space:nowrap}
.add-btn{background:transparent;border:1px solid rgba(59,130,246,.4);color:#3b82f6;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s}
.add-btn:hover{background:#3b82f6;color:#fff}
@media(max-width:700px){.hs{display:none}}

/* ── Empty ───────────────────────────────── */
.empty-state{padding:64px 24px;text-align:center}
.empty-icon{font-size:44px;margin-bottom:14px}
.empty-title{font-size:16px;font-weight:700;color:var(--text-sub);margin-bottom:6px}
.empty-sub{font-size:13px;color:var(--text-ghost)}

/* ── Pagination ──────────────────────────── */
.pager{display:flex;align-items:center;justify-content:center;gap:4px;padding:16px 0;flex-wrap:wrap}
.pg-btn{background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:6px 13px;font-size:12px;color:var(--text-sub);cursor:pointer;transition:all .15s;min-width:40px}
.pg-btn:hover:not(:disabled):not(.on){border-color:#3b82f6;color:#3b82f6}
.pg-btn.on{background:#2563eb;border-color:#2563eb;color:#fff;font-weight:700}
.pg-btn:disabled{opacity:.4;cursor:not-allowed}
.pg-ellipsis{padding:0 4px;color:var(--text-ghost);font-size:13px}
`;
