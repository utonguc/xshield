"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export type DiscoveredDevice = {
  id: number;
  customer_id: number;
  company_name: string;
  ip_address: string;
  mac_address: string | null;
  hostname: string | null;
  vendor: string | null;
  device_type: string | null;
  os_name: string | null;
  os_version: string | null;
  domain_name: string | null;
  logged_user: string | null;
  connection_type: string | null;
  subnet: string | null;
  serial_number: string | null;
  model: string | null;
  first_seen: string;
  last_seen: string;
  inventory_item_id: number | null;
};

// ── Column registry ───────────────────────────────────────────────────────────

type ColKey = keyof Pick<DiscoveredDevice,
  'ip_address' | 'mac_address' | 'hostname' | 'company_name' | 'device_type' |
  'vendor' | 'model' | 'serial_number' | 'os_name' | 'os_version' |
  'logged_user' | 'domain_name' | 'connection_type' | 'subnet' | 'first_seen' | 'last_seen'
>;

interface ColDef {
  key: ColKey;
  label: string;
  defaultOn: boolean;
}

const ALL_COLS: ColDef[] = [
  { key: 'ip_address',      label: 'IP Adresi',           defaultOn: true  },
  { key: 'mac_address',     label: 'MAC Adresi',          defaultOn: false },
  { key: 'hostname',        label: 'Hostname',            defaultOn: true  },
  { key: 'company_name',    label: 'Firma',               defaultOn: false },
  { key: 'device_type',     label: 'Cihaz Tipi',          defaultOn: true  },
  { key: 'vendor',          label: 'Marka',               defaultOn: true  },
  { key: 'model',           label: 'Model',               defaultOn: false },
  { key: 'serial_number',   label: 'Seri No',             defaultOn: true  },
  { key: 'os_name',         label: 'İşletim Sistemi',     defaultOn: true  },
  { key: 'os_version',      label: 'OS Sürümü',           defaultOn: false },
  { key: 'logged_user',     label: 'Kullanıcı',           defaultOn: true  },
  { key: 'domain_name',     label: 'Domain',              defaultOn: false },
  { key: 'connection_type', label: 'Bağlantı',            defaultOn: true  },
  { key: 'subnet',          label: 'Alt Ağ',              defaultOn: false },
  { key: 'first_seen',      label: 'İlk Görülme',         defaultOn: false },
  { key: 'last_seen',       label: 'Son Görülme',         defaultOn: true  },
];

const DEFAULT_COLS = new Set<ColKey>(ALL_COLS.filter(c => c.defaultOn).map(c => c.key));

// ── Display helpers ───────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  server: "🖥", vm: "☁", desktop: "💻", laptop: "💼",
  printer: "🖨", router: "🔀", switch: "🔗", access_point: "📡", unknown: "❓",
};
const TYPE_LABEL: Record<string, string> = {
  server: "Sunucu", vm: "Sanal Makine", desktop: "Masaüstü", laptop: "Dizüstü",
  printer: "Yazıcı", router: "Router", switch: "Switch", access_point: "Erişim Noktası", unknown: "Bilinmiyor",
};
const CONN_ICON: Record<string, string> = { wifi: "📶", wired: "🔌", virtual: "☁", unknown: "—" };

// ── Comparator ────────────────────────────────────────────────────────────────

function ipToNum(ip: string): number {
  return ip.split('.').reduce((acc, n) => acc * 256 + (parseInt(n, 10) || 0), 0);
}

function compareField(a: DiscoveredDevice, b: DiscoveredDevice, key: ColKey, dir: 'asc' | 'desc'): number {
  const av = a[key] as string | null;
  const bv = b[key] as string | null;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  let r: number;
  if (key === 'ip_address') {
    r = ipToNum(av) - ipToNum(bv);
  } else if (key === 'last_seen' || key === 'first_seen') {
    r = new Date(av).getTime() - new Date(bv).getTime();
  } else {
    r = av.localeCompare(bv, 'tr', { sensitivity: 'base' });
  }
  return dir === 'asc' ? r : -r;
}

// ── Pagination ────────────────────────────────────────────────────────────────

function buildPageNums(cur: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '...')[] = [1];
  if (cur > 3) out.push('...');
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) out.push(p);
  if (cur < total - 2) out.push('...');
  out.push(total);
  return out;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DiscoveryTable({ devices, status }: { devices: DiscoveredDevice[]; status: "pending" | "added" }) {
  const router = useRouter();

  // Persisted prefs
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(DEFAULT_COLS);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<ColKey>('last_seen');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Hydrate localStorage on mount
  useEffect(() => {
    try {
      const cols = localStorage.getItem('xshield_disc_cols');
      if (cols) setVisibleCols(new Set(JSON.parse(cols) as ColKey[]));
      const ps = Number(localStorage.getItem('xshield_disc_ps') ?? '');
      if ([10, 25, 50, 100, 200].includes(ps)) setPageSize(ps);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('xshield_disc_cols', JSON.stringify([...visibleCols])); } catch {}
  }, [visibleCols]);

  useEffect(() => {
    try { localStorage.setItem('xshield_disc_ps', String(pageSize)); } catch {}
  }, [pageSize]);

  // Reset to page 1 on sort/size changes
  useEffect(() => { setPage(1); }, [sortKey, sortDir, pageSize, devices.length]);

  // Sort
  const sorted = useMemo(() =>
    [...devices].sort((a, b) => compareField(a, b, sortKey, sortDir)),
    [devices, sortKey, sortDir]
  );

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((curPage - 1) * pageSize, curPage * pageSize);

  const handleSort = useCallback((key: ColKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('asc');
      return key;
    });
  }, []);

  const toggleCol = useCallback((key: ColKey) => {
    setVisibleCols(prev => {
      const n = new Set(prev);
      if (n.has(key)) { if (n.size > 1) n.delete(key); }
      else n.add(key);
      return n;
    });
  }, []);

  const toggle = useCallback((id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => prev.size === devices.length ? new Set() : new Set(devices.map(d => d.id)));
  }, [devices]);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleApprove = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/devices/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify([...selected]),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      showMsg(`${data.added} cihaz envantere eklendi`, true);
      setSelected(new Set()); router.refresh();
    } catch { showMsg("Hata oluştu", false); }
    finally { setBusy(false); }
  };

  const handleDelete = async (ids: number[]) => {
    setBusy(true);
    try {
      const r = await fetch("/api/devices/delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids),
      });
      if (!r.ok) throw new Error();
      setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      showMsg(`${ids.length} cihaz silindi`, true); router.refresh();
    } catch { showMsg("Hata oluştu", false); }
    finally { setBusy(false); }
  };

  const visColList = ALL_COLS.filter(c => visibleCols.has(c.key));
  const allChecked = devices.length > 0 && selected.size === devices.length;
  const someChecked = selected.size > 0 && !allChecked;

  return (
    <div>
      {msg && <div className={`inline-msg ${msg.ok ? "inline-ok" : "inline-err"}`}>{msg.text}</div>}

      {/* ── Top toolbar ── */}
      <div className="tbl-topbar">
        <div className="tbl-sel-group">
          {status === "pending" && (
            <>
              <label className="sel-all">
                <input type="checkbox" checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll} />
                {selected.size > 0 ? `${selected.size} seçili` : "Tümünü Seç"}
              </label>
              {selected.size > 0 && (
                <>
                  <button className="btn-approve" onClick={handleApprove} disabled={busy}>
                    ✚ Envantere Ekle ({selected.size})
                  </button>
                  <button className="btn-del-sel" onClick={() => handleDelete([...selected])} disabled={busy}>
                    🗑 Seçilenleri Sil
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <details className="col-picker">
          <summary className="btn-cols">⚙ Sütunlar {visibleCols.size}/{ALL_COLS.length}</summary>
          <div className="col-picker-panel">
            {ALL_COLS.map(col => (
              <label key={col.key} className="col-check">
                <input type="checkbox" checked={visibleCols.has(col.key)}
                  onChange={() => toggleCol(col.key)} />
                {col.label}
              </label>
            ))}
          </div>
        </details>
      </div>

      {devices.length === 0 ? (
        <div className="empty-sm">Henüz bekleyen cihaz yok.</div>
      ) : (
        <>
          <div className="tbl-wrap">
            <table className="table">
              <thead>
                <tr>
                  {status === "pending" && <th style={{ width: 32 }} />}
                  {visColList.map(col => (
                    <th key={col.key} className="th-sort" onClick={() => handleSort(col.key)}>
                      {col.label}
                      <span className="sort-icon">
                        {sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                      </span>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map(d => {
                  const dt = d.device_type ?? "unknown";
                  const ct = d.connection_type ?? "unknown";
                  const isSel = selected.has(d.id);
                  return (
                    <tr key={d.id}
                      className={isSel ? "row-selected" : ""}
                      onClick={status === "pending" ? () => toggle(d.id) : undefined}
                      style={status === "pending" ? { cursor: "pointer" } : undefined}
                    >
                      {status === "pending" && (
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggle(d.id)} />
                        </td>
                      )}

                      {visibleCols.has('ip_address') && (
                        <td><div className="mono bold">{d.ip_address}</div></td>
                      )}
                      {visibleCols.has('mac_address') && (
                        <td><div className="mono dim small">{d.mac_address ?? <span className="dim">—</span>}</div></td>
                      )}
                      {visibleCols.has('hostname') && (
                        <td><div className="bold">{d.hostname ?? <span className="dim">—</span>}</div></td>
                      )}
                      {visibleCols.has('company_name') && (
                        <td className="dim small">{d.company_name}</td>
                      )}
                      {visibleCols.has('device_type') && (
                        <td>
                          <span className="type-badge">
                            {TYPE_ICON[dt] ?? "❓"} {TYPE_LABEL[dt] ?? dt}
                          </span>
                        </td>
                      )}
                      {visibleCols.has('vendor') && (
                        <td className="dim small">{d.vendor ?? <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('model') && (
                        <td className="dim small">{d.model ?? <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('serial_number') && (
                        <td className="mono small">{d.serial_number ?? <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('os_name') && (
                        <td className="dim small">{d.os_name ?? <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('os_version') && (
                        <td className="dim small">{d.os_version ?? <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('logged_user') && (
                        <td className="dim small">{d.logged_user ?? <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('domain_name') && (
                        <td className="dim small">{d.domain_name ? `🏢 ${d.domain_name}` : <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('connection_type') && (
                        <td>
                          <span className="conn-badge">
                            {CONN_ICON[ct] ?? "—"} {ct !== "unknown" ? ct : "—"}
                          </span>
                        </td>
                      )}
                      {visibleCols.has('subnet') && (
                        <td className="mono small">{d.subnet ?? <span className="dim">—</span>}</td>
                      )}
                      {visibleCols.has('first_seen') && (
                        <td className="dim small nowrap">{new Date(d.first_seen).toLocaleString("tr-TR")}</td>
                      )}
                      {visibleCols.has('last_seen') && (
                        <td className="dim small nowrap">{new Date(d.last_seen).toLocaleString("tr-TR")}</td>
                      )}

                      <td>
                        {status === "added" && d.inventory_item_id && (
                          <a href={`/inventory?edit=${d.inventory_item_id}`} className="btn-link">Zimmetle →</a>
                        )}
                        {status === "pending" && (
                          <button className="btn-del-row"
                            onClick={e => { e.stopPropagation(); handleDelete([d.id]); }}
                            disabled={busy} title="Sil">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Bottom bar ── */}
          <div className="tbl-footer">
            <span className="tbl-total">Toplam <strong>{sorted.length}</strong> cihaz</span>

            <div className="pager">
              <button className="pager-btn" onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={curPage === 1}>← Önceki</button>
              {buildPageNums(curPage, totalPages).map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="pager-ellipsis">…</span>
                  : <button key={p}
                      className={`pager-btn${curPage === p ? ' pager-active' : ''}`}
                      onClick={() => setPage(Number(p))}>{p}</button>
              )}
              <button className="pager-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={curPage === totalPages}>Sonraki →</button>
            </div>

            <div className="page-size-group">
              <span className="page-size-label">Sayfa başı:</span>
              {[10, 25, 50, 100, 200].map(n => (
                <button key={n}
                  className={`page-size-btn${pageSize === n ? ' page-size-active' : ''}`}
                  onClick={() => { setPageSize(n); setPage(1); }}>{n}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
