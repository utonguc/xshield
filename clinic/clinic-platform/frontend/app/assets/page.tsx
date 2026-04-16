"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { btn, inp } from "@/lib/ui";
import { fmtDate } from "@/lib/tz";

type Asset = {
  id: string; name: string; category?: string; brand?: string; model?: string;
  serialNo?: string; status: string; location?: string;
  purchasePrice?: number; purchasedAt?: string;
  warrantyUntil?: string; warrantyExpired: boolean;
  nextMaintenanceAt?: string; maintenanceDue: boolean;
  notes?: string; createdAtUtc: string;
};
type Summary = { total: number; active: number; maintenance: number; maintenanceDue: number; warrantyExpired: number; totalValue: number };

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  Active:      { label: "Aktif",      color: "#059669", bg: "#f0fdf4" },
  Maintenance: { label: "Bakımda",    color: "#d97706", bg: "#fffbeb" },
  Broken:      { label: "Arızalı",    color: "#b42318", bg: "#fef3f2" },
  Retired:     { label: "Hizmet Dışı",color: "#667085", bg: "#f2f4f7" },
};
const STATUSES = ["Active","Maintenance","Broken","Retired"];

const card: React.CSSProperties = {
  background: "var(--surface, #fff)", border: "1px solid #eaecf0",
  borderRadius: 16, boxShadow: "0 1px 4px rgba(16,24,40,0.06)",
};
const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

export default function AssetsPage() {
  const [assets,    setAssets]    = useState<Asset[]>([]);
  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterStatus) qs.set("status", filterStatus);
    if (search)       qs.set("search", search);
    const [aRes, sRes] = await Promise.all([
      apiFetch(`/Assets?${qs}`),
      apiFetch("/Assets/summary"),
    ]);
    if (aRes.ok) setAssets(await aRes.json());
    if (sRes.ok) setSummary(await sRes.json());
    setLoading(false);
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  const deleteAsset = async (id: string) => {
    if (!confirm("Demirbaşı silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/Assets/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AppShell title="Demirbaş Takibi" description="Cihaz ve ekipman yönetimi">

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
          <SumCard label="Toplam"           value={String(summary.total)}            color="#1d4ed8" bg="#eff8ff"  icon="🔧" />
          <SumCard label="Aktif"            value={String(summary.active)}           color="#059669" bg="#f0fdf4"  icon="✓" />
          <SumCard label="Bakımda"          value={String(summary.maintenance)}      color="#d97706" bg="#fffbeb"  icon="⚙" />
          <SumCard label="Bakım Yaklaşan"   value={String(summary.maintenanceDue)}   color="#d97706" bg="#fffbeb"  icon="⏱" alert={summary.maintenanceDue > 0} />
          <SumCard label="Garanti Dolmuş"   value={String(summary.warrantyExpired)}  color="#b42318" bg="#fef3f2"  icon="⚠" alert={summary.warrantyExpired > 0} />
          <SumCard label="Toplam Değer"     value={fmt(summary.totalValue)}          color="#7c3aed" bg="#f5f3ff"  icon="₺" />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => { setEditAsset(null); setShowForm(true); }} style={{
          padding: "9px 16px", borderRadius: 10, border: "none",
          background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>+ Demirbaş Ekle</button>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..."
          style={{ ...inp, width: 200 }} />

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inp, width: "auto" }}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
        </select>

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#667085" }}>{assets.length} kayıt</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color: "#98a2b3", textAlign: "center", padding: 48 }}>Yükleniyor...</div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#98a2b3" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#667085", marginBottom: 6 }}>Demirbaş bulunamadı</div>
          <div style={{ fontSize: 13 }}>Yeni demirbaş ekleyerek başlayın.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {assets.map(a => {
            const sm = STATUS_META[a.status] ?? STATUS_META.Active;
            return (
              <div key={a.id} style={{ ...card, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text, #101828)" }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>
                      {[a.brand, a.model].filter(Boolean).join(" · ") || a.category || "—"}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: sm.bg, color: sm.color, flexShrink: 0, marginLeft: 8 }}>
                    {sm.label}
                  </span>
                </div>

                {/* Meta bilgiler */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                  {a.location  && <MetaRow icon="📍" val={a.location} />}
                  {a.serialNo  && <MetaRow icon="🔑" val={a.serialNo} />}
                  {a.purchasePrice && <MetaRow icon="₺" val={fmt(a.purchasePrice)} />}
                  {a.purchasedAt   && <MetaRow icon="🗓" val={fmtDate(a.purchasedAt)} />}
                </div>

                {/* Uyarılar */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {a.warrantyUntil && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: a.warrantyExpired ? "#fef3f2" : "#f0fdf4",
                      color: a.warrantyExpired ? "#b42318" : "#059669" }}>
                      {a.warrantyExpired ? "⚠ Garanti Dolmuş" : `🛡 Garanti: ${fmtDate(a.warrantyUntil)}`}
                    </span>
                  )}
                  {a.nextMaintenanceAt && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: a.maintenanceDue ? "#fffbeb" : "#f8fafc",
                      color: a.maintenanceDue ? "#d97706" : "#667085" }}>
                      {a.maintenanceDue ? "⏱ Bakım Yaklaşıyor" : `🔧 Bakım: ${fmtDate(a.nextMaintenanceAt)}`}
                    </span>
                  )}
                </div>

                {a.notes && <div style={{ fontSize: 12, color: "#667085", background: "var(--surface-2, #f8fafc)", borderRadius: 8, padding: "6px 10px" }}>{a.notes}</div>}

                {/* Aksiyonlar */}
                <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: "1px solid #f2f4f7" }}>
                  <button onClick={() => { setEditAsset(a); setShowForm(true); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #e4e7ec", background: "var(--surface, #fff)", color: "var(--text-2, #344054)", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>✎ Düzenle</button>
                  <button onClick={() => deleteAsset(a.id)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef3f2", color: "#b42318", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <AssetForm
          asset={editAsset}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </AppShell>
  );
}

function MetaRow({ icon, val }: { icon: string; val: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#667085" }}><span>{icon}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</span></div>;
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

function AssetForm({ asset, onClose, onSaved }: {
  asset: Asset | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = asset !== null;
  const [name,    setName]    = useState(asset?.name ?? "");
  const [cat,     setCat]     = useState(asset?.category ?? "");
  const [brand,   setBrand]   = useState(asset?.brand ?? "");
  const [model,   setModel]   = useState(asset?.model ?? "");
  const [serial,  setSerial]  = useState(asset?.serialNo ?? "");
  const [status,  setStatus]  = useState(asset?.status ?? "Active");
  const [loc,     setLoc]     = useState(asset?.location ?? "");
  const [price,   setPrice]   = useState(asset?.purchasePrice ?? 0);
  const [bought,  setBought]  = useState(asset?.purchasedAt?.slice(0,10) ?? "");
  const [warranty,setWarranty]= useState(asset?.warrantyUntil?.slice(0,10) ?? "");
  const [nextMaint,setNextMaint]=useState(asset?.nextMaintenanceAt?.slice(0,10) ?? "");
  const [notes,   setNotes]   = useState(asset?.notes ?? "");
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Demirbaş adı zorunlu."); return; }
    setSaving(true); setError("");
    const body = {
      name, category: cat, brand, model, serialNo: serial, status, location: loc,
      purchasePrice: price ? Number(price) : null,
      purchasedAt: bought ? new Date(bought).toISOString() : null,
      warrantyUntil: warranty ? new Date(warranty).toISOString() : null,
      nextMaintenanceAt: nextMaint ? new Date(nextMaint).toISOString() : null,
      notes,
    };
    const res = await apiFetch(
      isEdit ? `/Assets/${asset!.id}` : "/Assets",
      { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) }
    );
    setSaving(false);
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.message ?? "Hata."); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--surface, #fff)", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{isEdit ? "Demirbaş Düzenle" : "Yeni Demirbaş"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#667085" }}>×</button>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          <F label="Adı *"><input value={name} onChange={e => setName(e.target.value)} style={inp} /></F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Kategori"><input value={cat} onChange={e => setCat(e.target.value)} style={inp} placeholder="Tıbbi Ekipman..." /></F>
            <F label="Durum">
              <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
              </select>
            </F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Marka"><input value={brand} onChange={e => setBrand(e.target.value)} style={inp} /></F>
            <F label="Model"><input value={model} onChange={e => setModel(e.target.value)} style={inp} /></F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Seri No"><input value={serial} onChange={e => setSerial(e.target.value)} style={inp} /></F>
            <F label="Konum"><input value={loc} onChange={e => setLoc(e.target.value)} style={inp} placeholder="Oda, bölüm..." /></F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Alış Fiyatı (₺)"><input type="number" value={price} min={0} onChange={e => setPrice(Number(e.target.value))} style={inp} /></F>
            <F label="Alış Tarihi"><input type="date" value={bought} onChange={e => setBought(e.target.value)} style={inp} /></F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Garanti Bitiş"><input type="date" value={warranty} onChange={e => setWarranty(e.target.value)} style={inp} /></F>
            <F label="Sonraki Bakım"><input type="date" value={nextMaint} onChange={e => setNextMaint(e.target.value)} style={inp} /></F>
          </div>
          <F label="Notlar"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></F>

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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2, #344054)", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
