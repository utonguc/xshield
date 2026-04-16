"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { exportExcel } from "@/lib/export";
import { btn, inp } from "@/lib/ui";
import { fmtDate, fmtDateTime } from "@/lib/tz";

type StockItem = {
  id: string; name: string; category?: string; unit?: string;
  barcode?: string; supplier?: string; unitCost: number;
  quantity: number; minQuantity: number; isLow: boolean;
  expiresAtUtc?: string; isExpired: boolean; expiresSoon: boolean;
  createdAtUtc: string;
};
type Movement = {
  id: string; type: string; quantity: number; note?: string;
  userName?: string; createdAtUtc: string;
};
type Summary = { totalItems: number; lowStock: number; expiredItems: number; expireSoon: number; totalValue: number };

const MOVE_META: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  in:     { label: "Giriş",    color: "#059669", bg: "#f0fdf4", sign: "+" },
  out:    { label: "Çıkış",    color: "#b42318", bg: "#fef3f2", sign: "-" },
  adjust: { label: "Düzeltme", color: "#d97706", bg: "#fffbeb", sign: "=" },
};

const card: React.CSSProperties = {
  background: "var(--surface, #fff)", border: "1px solid #eaecf0",
  borderRadius: 16, boxShadow: "0 1px 4px rgba(16,24,40,0.06)",
};
const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

export default function StockPage() {
  const [items,    setItems]    = useState<StockItem[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [cats,     setCats]     = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [lowOnly,  setLowOnly]  = useState(false);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [moves,    setMoves]    = useState<Movement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterCat) qs.set("category", filterCat);
    if (search)    qs.set("search", search);
    if (lowOnly)   qs.set("lowOnly", "true");
    const [itemsRes, sumRes, catRes] = await Promise.all([
      apiFetch(`/Stock?${qs}`),
      apiFetch("/Stock/summary"),
      apiFetch("/Stock/categories"),
    ]);
    if (itemsRes.ok) setItems(await itemsRes.json());
    if (sumRes.ok)   setSummary(await sumRes.json());
    if (catRes.ok)   setCats(await catRes.json());
    setLoading(false);
  }, [filterCat, search, lowOnly]);

  useEffect(() => { load(); }, [load]);

  const loadMoves = async (item: StockItem) => {
    setSelected(item);
    const res = await apiFetch(`/Stock/${item.id}/movements`);
    if (res.ok) setMoves(await res.json());
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Ürünü silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/Stock/${id}`, { method: "DELETE" });
    setSelected(null); load();
  };

  return (
    <AppShell title="Stok Yönetimi" description="Malzeme ve sarf takibi">

      {/* Özet kartlar */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 14, marginBottom: 24 }}>
          <SumCard label="Toplam Ürün"     value={String(summary.totalItems)}   color="#1d4ed8" bg="#eff8ff"  icon="📦" />
          <SumCard label="Kritik Stok"     value={String(summary.lowStock)}     color="#b42318" bg="#fef3f2"  icon="⚠" alert={summary.lowStock > 0} />
          <SumCard label="Süresi Dolan"    value={String(summary.expiredItems)} color="#b42318" bg="#fef3f2"  icon="⛔" alert={summary.expiredItems > 0} />
          <SumCard label="Yakında Dolacak" value={String(summary.expireSoon)}   color="#d97706" bg="#fffbeb"  icon="⏱" alert={summary.expireSoon > 0} />
          <SumCard label="Toplam Değer"    value={fmt(summary.totalValue)}      color="#059669" bg="#f0fdf4"  icon="₺" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16, alignItems: "start" }}>

        {/* Sol: Liste */}
        <div>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => { setEditItem(null); setShowForm(true); }} style={{
              padding: "9px 16px", borderRadius: 10, border: "none",
              background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
            }}>+ Ürün Ekle</button>
            <button onClick={() => exportExcel(items.map(i => ({
              name: i.name, category: i.category ?? "—", unit: i.unit ?? "—",
              quantity: i.quantity, minQuantity: i.minQuantity, unitCost: i.unitCost,
              status: i.isLow ? "Düşük Stok" : (i.isExpired ? "Süresi Doldu" : "Normal"),
            })), [
              { key: "name", label: "Ürün Adı" }, { key: "category", label: "Kategori" },
              { key: "unit", label: "Birim" }, { key: "quantity", label: "Miktar" },
              { key: "minQuantity", label: "Min. Miktar" }, { key: "unitCost", label: "Birim Maliyet" },
              { key: "status", label: "Durum" },
            ], "stok")} style={{
              padding: "9px 14px", borderRadius: 10, border: "1px solid #e4e7ec",
              background: "var(--surface-2, #f8fafc)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13,
            }}>⬇ Excel</button>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..."
              style={{ ...inp, width: 200 }} />

            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ ...inp, width: "auto" }}>
              <option value="">Tüm Kategoriler</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button onClick={() => setLowOnly(v => !v)} style={{
              padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${lowOnly ? "#fecaca" : "#e4e7ec"}`,
              background: lowOnly ? "#fef3f2" : "#fff",
              color: lowOnly ? "#b42318" : "#667085",
            }}>
              {lowOnly ? "⚠ Kritik Stok" : "⚠ Kritik Stok"}
            </button>

            <span style={{ marginLeft: "auto", fontSize: 13, color: "#667085" }}>{items.length} ürün</span>
          </div>

          {/* Tablo */}
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)", borderBottom: "1px solid #eaecf0" }}>
                  {["Ürün", "Kategori", "Miktar", "Birim Fiyat", "SKT", "Durum", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#667085", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#98a2b3" }}>Yükleniyor...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: "#98a2b3" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>Ürün bulunamadı.
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item.id}
                    style={{ borderBottom: "1px solid #f2f4f7", cursor: "pointer", background: selected?.id === item.id ? "#f5f3ff" : "" }}
                    onClick={() => loadMoves(item)}
                    onMouseEnter={e => { if (selected?.id !== item.id) e.currentTarget.style.background = "#fafafa"; }}
                    onMouseLeave={e => { if (selected?.id !== item.id) e.currentTarget.style.background = ""; }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text, #101828)" }}>{item.name}</div>
                      {item.supplier && <div style={{ fontSize: 11, color: "#98a2b3" }}>{item.supplier}</div>}
                    </td>
                    <td style={{ padding: "11px 14px", color: "#667085" }}>{item.category ?? "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontWeight: 700, color: item.isLow ? "#b42318" : "#101828" }}>
                        {item.quantity}
                      </span>
                      <span style={{ color: "#98a2b3", fontSize: 11 }}> / min {item.minQuantity} {item.unit}</span>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#667085" }}>{fmt(item.unitCost)}</td>
                    <td style={{ padding: "11px 14px", color: item.isExpired ? "#b42318" : item.expiresSoon ? "#d97706" : "#667085", fontSize: 12 }}>
                      {item.expiresAtUtc ? fmtDate(item.expiresAtUtc) : "—"}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {item.isLow     && <Badge label="Kritik"  color="#b42318" bg="#fef3f2" />}
                        {item.isExpired && <Badge label="SKT Dolmuş" color="#b42318" bg="#fef3f2" />}
                        {item.expiresSoon && !item.isExpired && <Badge label="SKT Yakın" color="#d97706" bg="#fffbeb" />}
                        {!item.isLow && !item.isExpired && !item.expiresSoon && <Badge label="Normal" color="#059669" bg="#f0fdf4" />}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn label="✎" color="#1d4ed8" onClick={() => { setEditItem(item); setShowForm(true); }} />
                        <Btn label="✕" color="#b42318" onClick={() => deleteItem(item.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sağ: Detay + Hareket */}
        {selected && (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>{selected.category} · {selected.unit}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#667085" }}>✕</button>
            </div>

            {/* Hızlı hareket */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f2f4f7" }}>
              <QuickMovement itemId={selected.id} onDone={() => { load(); loadMoves(selected); }} />
            </div>

            {/* Hareket geçmişi */}
            <div style={{ padding: "14px 18px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Hareket Geçmişi</div>
              {moves.length === 0 ? (
                <div style={{ color: "#98a2b3", fontSize: 13 }}>Hareket yok.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {moves.map(mv => {
                    const mm = MOVE_META[mv.type] ?? MOVE_META.adjust;
                    return (
                      <div key={mv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--surface-2, #f8fafc)", borderRadius: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: mm.color, background: mm.bg, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {mm.sign}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{mm.label}: {mv.quantity}</div>
                          {mv.note && <div style={{ fontSize: 11, color: "#667085" }}>{mv.note}</div>}
                        </div>
                        <div style={{ fontSize: 11, color: "#98a2b3", textAlign: "right" }}>
                          <div>{fmtDate(mv.createdAtUtc)}</div>
                          {mv.userName && <div>{mv.userName.split(" ")[0]}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <StockForm
          item={editItem}
          categories={cats}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </AppShell>
  );
}

// ── Quick Movement ────────────────────────────────────────────────────────────
function QuickMovement({ itemId, onDone }: { itemId: string; onDone: () => void }) {
  const [type, setType]   = useState("in");
  const [qty,  setQty]    = useState(1);
  const [note, setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const save = async () => {
    if (qty <= 0) { setError("Miktar 0'dan büyük olmalı."); return; }
    setSaving(true); setError("");
    const res = await apiFetch(`/Stock/${itemId}/movement`, {
      method: "POST",
      body: JSON.stringify({ type, quantity: qty, note }),
    });
    setSaving(false);
    if (res.ok) { setQty(1); setNote(""); onDone(); }
    else { const d = await res.json().catch(() => ({})); setError(d.message ?? "Hata."); }
  };

  const mm = MOVE_META[type];
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Stok Hareketi</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {["in","out","adjust"].map(t => {
          const m = MOVE_META[t];
          return (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${type === t ? m.color : "#e4e7ec"}`,
              background: type === t ? m.bg : "#fff", color: type === t ? m.color : "#667085",
              fontWeight: 700, cursor: "pointer", fontSize: 12,
            }}>{m.label}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input type="number" value={qty} min={1} onChange={e => setQty(Number(e.target.value))}
          style={{ width: 80, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e4e7ec", fontSize: 13 }} />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Not (opsiyonel)"
          style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e4e7ec", fontSize: 13 }} />
      </div>
      {error && <div style={{ fontSize: 12, color: "#b42318", marginBottom: 6 }}>⚠ {error}</div>}
      <button onClick={save} disabled={saving} style={{
        width: "100%", padding: "8px 0", borderRadius: 8, border: "none",
        background: saving ? "#93c5fd" : mm.color, color: "#fff",
        fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 13,
      }}>
        {saving ? "Kaydediliyor..." : `${mm.sign} ${mm.label} Kaydet`}
      </button>
    </div>
  );
}

// ── Stock Form ────────────────────────────────────────────────────────────────
function StockForm({ item, categories, onClose, onSaved }: {
  item: StockItem | null; categories: string[];
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = item !== null;
  const [name,     setName]     = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [unit,     setUnit]     = useState(item?.unit ?? "adet");
  const [barcode,  setBarcode]  = useState(item?.barcode ?? "");
  const [supplier, setSupplier] = useState(item?.supplier ?? "");
  const [unitCost, setUnitCost] = useState(item?.unitCost ?? 0);
  const [quantity, setQuantity] = useState(item?.quantity ?? 0);
  const [minQty,   setMinQty]   = useState(item?.minQuantity ?? 5);
  const [expires,  setExpires]  = useState(item?.expiresAtUtc?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Ürün adı zorunlu."); return; }
    setSaving(true); setError("");
    const body = {
      name, category, unit, barcode, supplier,
      unitCost: Number(unitCost), quantity: Number(quantity),
      minQuantity: Number(minQty),
      expiresAtUtc: expires ? new Date(expires).toISOString() : null,
    };
    const res = await apiFetch(
      isEdit ? `/Stock/${item!.id}` : "/Stock",
      { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) }
    );
    setSaving(false);
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.message ?? "Hata."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface, #fff)", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{isEdit ? "Ürün Düzenle" : "Yeni Ürün"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#667085" }}>×</button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <Field label="Ürün Adı *"><input value={name} onChange={e => setName(e.target.value)} style={inp} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Kategori">
              <input list="cats" value={category} onChange={e => setCategory(e.target.value)} style={inp} placeholder="Kategori..." />
              <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Birim"><input value={unit} onChange={e => setUnit(e.target.value)} style={inp} placeholder="adet, kutu, ml..." /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Barkod"><input value={barcode} onChange={e => setBarcode(e.target.value)} style={inp} /></Field>
            <Field label="Tedarikçi"><input value={supplier} onChange={e => setSupplier(e.target.value)} style={inp} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Birim Fiyat">
              <input type="number" value={unitCost} min={0} step={0.01} onChange={e => setUnitCost(Number(e.target.value))} style={inp} />
            </Field>
            {!isEdit && <Field label="Başlangıç Miktarı">
              <input type="number" value={quantity} min={0} onChange={e => setQuantity(Number(e.target.value))} style={inp} />
            </Field>}
            <Field label="Min. Miktar">
              <input type="number" value={minQty} min={0} onChange={e => setMinQty(Number(e.target.value))} style={inp} />
            </Field>
          </div>
          <Field label="Son Kullanma Tarihi">
            <input type="date" value={expires} onChange={e => setExpires(e.target.value)} style={inp} />
          </Field>

          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef3f2", color: "#b42318", fontSize: 13, border: "1px solid #fecdca" }}>⚠ {error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #d0d5dd", background: "var(--surface, #fff)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>İptal</button>
            <button onClick={save} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: saving ? "#93c5fd" : "#1d4ed8", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 13 }}>
              {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: bg, color }}>{label}</span>;
}
function Btn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${color}30`, background: `${color}10`, color, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>{label}</button>;
}
function SumCard({ label, value, color, bg, icon, alert }: { label: string; value: string; color: string; bg: string; icon: string; alert?: boolean }) {
  return (
    <div style={{ background: "var(--surface, #fff)", border: `1px solid ${alert ? color + "40" : "#eaecf0"}`, borderRadius: 16, padding: 18, boxShadow: "0 1px 4px rgba(16,24,40,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: alert ? color : "#101828" }}>{value}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color, flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}
