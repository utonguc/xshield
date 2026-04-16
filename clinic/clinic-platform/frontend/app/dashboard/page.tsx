"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { fmtDateTimeShort } from "@/lib/tz";

// crypto.randomUUID() requires HTTPS — fallback for HTTP/dev environments
function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

type Widget = {
  id: string;
  widgetType: string;
  label: string;
  sortOrder: number;
  size: string;
};

type AvailableWidget = { widgetType: string; label: string };
type WidgetData = Record<string, unknown>;

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "#1d4ed8", Completed: "#067647",
  Cancelled: "#b42318", NoShow: "#92400e",
};
const STATUS_LABELS: Record<string, string> = {
  Scheduled: "Planlandı", Completed: "Tamamlandı",
  Cancelled: "İptal", NoShow: "Gelmedi",
};
const LEAD_COLORS: Record<string, string> = {
  "Yeni": "#1d4ed8", "Görüşüldü": "#7c3aed",
  "Teklif Verildi": "#d97706", "Randevu Oluştu": "#0891b2",
  "İşlem Yapıldı": "#059669", "İptal": "#dc2626",
};

const KPI_META: Record<string, { color: string; icon: string; bg: string }> = {
  kpi_patients:          { color: "#1d4ed8", icon: "♥",  bg: "#eff8ff" },
  kpi_doctors:           { color: "#059669", icon: "✚",  bg: "#f0fdf4" },
  kpi_appointments:      { color: "#7c3aed", icon: "◷",  bg: "#f5f3ff" },
  kpi_satisfaction:      { color: "#d97706", icon: "★",  bg: "#fffbeb" },
  kpi_pending_requests:  { color: "#b45309", icon: "⏳", bg: "#fffbeb" },
};

const WIDGET_ICONS: Record<string, string> = {
  kpi_patients: "♥", kpi_doctors: "✚", kpi_appointments: "◷", kpi_satisfaction: "★",
  kpi_pending_requests: "⏳",
  calendar_upcoming: "📅", list_latest_appointments: "📋",
  list_pending_requests: "📥",
  chart_doctor_load: "📊", list_leads: "🎯",
  chart_lead_funnel: "🔽", chart_monthly_appointments: "📈",
};

const card: React.CSSProperties = {
  background: "white", border: "1px solid #eaecf0",
  borderRadius: 20, padding: 24,
  boxShadow: "0 1px 4px rgba(16,24,40,0.06)",
};

export default function DashboardPage() {
  const [widgets, setWidgets]     = useState<Widget[]>([]);
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [available, setAvailable] = useState<AvailableWidget[]>([]);
  const [editing, setEditing]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [message, setMessage]     = useState("");

  const loadWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch("/Dashboard/widgets");
      const data = await res.json();
      const list: Widget[] = Array.isArray(data) ? data : [];
      setWidgets(list);
      const dataMap: Record<string, WidgetData> = {};
      await Promise.all(list.map(async (w) => {
        try {
          const r = await apiFetch(`/Dashboard/data/${w.widgetType}`);
          if (r.ok) dataMap[w.widgetType] = await r.json();
        } catch {}
      }));
      setWidgetData(dataMap);
    } catch { setMessage("Dashboard yüklenemedi."); }
    finally   { setLoading(false); }
  }, []);

  const loadAvailable = useCallback(async () => {
    const res  = await apiFetch("/Dashboard/available-widgets");
    const data = await res.json();
    setAvailable(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { loadWidgets(); loadAvailable(); }, [loadWidgets, loadAvailable]);

  const addWidget = async (widgetType: string) => {
    if (widgets.find(w => w.widgetType === widgetType)) { setMessage("Bu widget zaten ekli."); return; }
    const newList = [...widgets, {
      id: randomId(), widgetType,
      label: available.find(a => a.widgetType === widgetType)?.label ?? widgetType,
      sortOrder: widgets.length,
      size: widgetType.startsWith("chart") || widgetType.startsWith("list") || widgetType.startsWith("calendar") ? "large" : "medium",
    }];
    await saveWidgets(newList);
  };

  const removeWidget = async (widgetType: string) => {
    const newList = widgets.filter(w => w.widgetType !== widgetType).map((w, i) => ({ ...w, sortOrder: i }));
    await saveWidgets(newList);
  };

  const saveWidgets = async (list: Widget[]) => {
    setWidgets(list);
    await apiFetch("/Dashboard/widgets", {
      method: "POST",
      body: JSON.stringify({ widgets: list.map(w => ({ widgetType: w.widgetType, sortOrder: w.sortOrder, size: w.size })) }),
    });
    await loadWidgets();
  };

  const resetDashboard = async () => {
    await apiFetch("/Dashboard/reset", { method: "POST" });
    setEditing(false);
    setMessage("Dashboard sıfırlandı.");
    await loadWidgets();
  };

  if (loading) return (
    <AppShell title="Dashboard">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ ...card, animation: "pulse 1.5s ease-in-out infinite" }}>
            <div style={{ height: 12, background: "#f1f5f9", borderRadius: 6, width: "40%", marginBottom: 16 }} />
            <div style={{ height: 40, background: "#f1f5f9", borderRadius: 6, width: "60%", marginBottom: 8 }} />
            <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "30%" }} />
          </div>
        ))}
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Dashboard" description="Klinik genel bakış">

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => setEditing(!editing)} style={{
          padding: "8px 16px", borderRadius: 10,
          border: editing ? "none" : "1px solid #d0d5dd",
          background: editing ? "#1d4ed8" : "white",
          color: editing ? "white" : "#344054",
          fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>
          {editing ? "✓ Düzenlemeyi Bitir" : "⚙ Düzenle"}
        </button>
        {editing && (
          <button onClick={resetDashboard} style={{
            padding: "8px 16px", borderRadius: 10, border: "1px solid #fecdca",
            background: "#fef3f2", color: "#b42318", fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}>
            ↺ Varsayılana Sıfırla
          </button>
        )}
        {message && <span style={{ color: "#667085", fontSize: 13 }}>{message}</span>}
      </div>

      {/* Widget Kütüphanesi */}
      {editing && (
        <div style={{ ...card, marginBottom: 20, background: "var(--surface-2, #f8fafc)", border: "1px dashed #d0d5dd" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13, color: "var(--text-2, #344054)" }}>Widget Ekle</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {available.filter(a => !widgets.find(w => w.widgetType === a.widgetType)).map(a => (
              <button key={a.widgetType} onClick={() => addWidget(a.widgetType)} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #b2ddff",
                background: "#eff8ff", color: "#175cd3", fontWeight: 600, cursor: "pointer", fontSize: 13,
              }}>
                {WIDGET_ICONS[a.widgetType] ?? "+"} {a.label}
              </button>
            ))}
            {available.filter(a => !widgets.find(w => w.widgetType === a.widgetType)).length === 0 && (
              <span style={{ color: "#98a2b3", fontSize: 13 }}>Tüm widgetlar eklendi.</span>
            )}
          </div>
        </div>
      )}

      {/* Widget Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {widgets.map(w => (
          <div key={w.widgetType} style={{
            ...card,
            gridColumn: w.size === "large" || w.size === "full" ? "span 2" : "span 1",
            position: "relative",
          }}>
            {editing && (
              <button onClick={() => removeWidget(w.widgetType)} style={{
                position: "absolute", top: 12, right: 12,
                width: 24, height: 24, borderRadius: "50%",
                border: "1px solid #fecdca", background: "#fef3f2",
                color: "#b42318", fontWeight: 700, cursor: "pointer",
                fontSize: 14, lineHeight: 1, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>×</button>
            )}
            <WidgetContent type={w.widgetType} label={w.label} data={widgetData[w.widgetType]} />
          </div>
        ))}
      </div>

      {widgets.length === 0 && !editing && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#98a2b3" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#667085", marginBottom: 8 }}>Dashboard boş</div>
          <div style={{ fontSize: 13 }}>Düzenle butonuna tıklayarak widget ekleyin.</div>
        </div>
      )}
    </AppShell>
  );
}

function WidgetContent({ type, label, data }: { type: string; label: string; data?: WidgetData }) {
  const icon = WIDGET_ICONS[type] ?? "◈";

  if (!data) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: "#667085", fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 32, background: "#f1f5f9", borderRadius: 8, width: "50%", animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  );

  // KPI widget
  if (type.startsWith("kpi_")) {
    const meta  = KPI_META[type] ?? { color: "#667085", icon: "◈", bg: "#f8fafc" };
    const value = String(data.value ?? "—");
    const thisMonth = Number(data.thisMonth ?? 0);
    const trendPct  = Number(data.trendPct ?? 0);
    const note      = data.note ? String(data.note) : null;

    const trendColor = trendPct > 0 ? "#059669" : trendPct < 0 ? "#b42318" : "#667085";
    const trendArrow = trendPct > 0 ? "↑" : trendPct < 0 ? "↓" : "—";
    const showTrend  = type !== "kpi_satisfaction" && type !== "kpi_doctors" && type !== "kpi_pending_requests";

    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#667085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {label}
            </div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "var(--text, #101828)", lineHeight: 1 }}>
              {value}
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: meta.bg, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 20, color: meta.color, flexShrink: 0,
          }}>
            {meta.icon}
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f2f4f7", display: "flex", alignItems: "center", gap: 8 }}>
          {showTrend && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: trendColor,
              background: `${trendColor}15`, padding: "2px 8px", borderRadius: 999,
            }}>
              {trendArrow} {Math.abs(trendPct)}%
            </span>
          )}
          <span style={{ fontSize: 12, color: "#98a2b3" }}>
            {note ?? (showTrend ? `Bu ay: ${thisMonth}` : "Sabit değer")}
          </span>
        </div>
      </div>
    );
  }

  // Doktor yoğunluğu
  if (type === "chart_doctor_load") {
    const rows = Array.isArray(data) ? data as { doctor: string; count: number }[] : [];
    const max  = Math.max(...rows.map(r => r.count), 1);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        </div>
        {rows.length === 0
          ? <EmptyState />
          : rows.map((r, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "var(--text-2, #344054)" }}>{r.doctor}</span>
                <strong style={{ color: "#1d4ed8" }}>{r.count} randevu</strong>
              </div>
              <div style={{ height: 6, background: "#f2f4f7", borderRadius: 3 }}>
                <div style={{ height: 6, borderRadius: 3, background: "linear-gradient(90deg, #1d4ed8, #60a5fa)", width: `${(r.count / max) * 100}%`, transition: "width 0.4s" }} />
              </div>
            </div>
          ))}
      </div>
    );
  }

  // Lead hunisi
  if (type === "chart_lead_funnel") {
    const rows = Array.isArray(data) ? data as { status: string; count: number }[] : [];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {rows.map((r, i) => {
            const color = LEAD_COLORS[r.status] ?? "#667085";
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 12px", borderRadius: 8, fontSize: 13,
                background: `${color}12`, border: `1px solid ${color}20`,
              }}>
                <span style={{ color: "var(--text-2, #344054)" }}>{r.status}</span>
                <strong style={{ color }}>{r.count}</strong>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Aylık randevu trendi
  if (type === "chart_monthly_appointments") {
    const rows   = Array.isArray(data) ? data as { year: number; month: number; count: number }[] : [];
    const max    = Math.max(...rows.map(r => r.count), 1);
    const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: "100%", borderRadius: "4px 4px 0 0",
                background: i === rows.length - 1 ? "#1d4ed8" : "#93c5fd",
                height: `${Math.max((r.count / max) * 64, 4)}px`,
                transition: "height 0.3s",
              }} />
              <div style={{ fontSize: 10, color: "#98a2b3" }}>{months[r.month - 1]}</div>
            </div>
          ))}
          {rows.length === 0 && <EmptyState />}
        </div>
      </div>
    );
  }

  // Liste widgetları
  const rows = Array.isArray(data) ? data as Record<string, unknown>[] : [];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        {rows.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#98a2b3", background: "#f2f4f7", padding: "1px 8px", borderRadius: 999 }}>
            {rows.length}
          </span>
        )}
      </div>
      {rows.length === 0
        ? <EmptyState />
        : <div style={{ display: "grid", gap: 6 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ padding: "10px 12px", background: "var(--surface-2, #f8fafc)", borderRadius: 10, border: "1px solid #f2f4f7" }}>
                {type === "list_leads" ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text, #101828)" }}>
                      {String(r.firstName ?? "")} {String(r.lastName ?? "")}
                    </div>
                    <div style={{ fontSize: 12, color: "#667085", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{String(r.interestedProcedure ?? "—")}</span>
                      <LeadBadge status={String(r.leadStatus ?? "")} />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text, #101828)" }}>
                      {String(r.procedureName ?? r.title ?? "")}
                    </div>
                    <div style={{ fontSize: 12, color: "#667085", marginTop: 3, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{String(r.patient ?? r.doctor ?? "")}</span>
                      {!!r.status && <StatusBadge status={String(r.status)} />}
                    </div>
                    {r.startAtUtc && (
                      <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 3 }}>
                        {fmtDateTimeShort(String(r.startAtUtc))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
      }
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#667085";
  return (
    <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function LeadBadge({ status }: { status: string }) {
  const color = LEAD_COLORS[status] ?? "#667085";
  return (
    <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {status}
    </span>
  );
}

function EmptyState() {
  return <div style={{ color: "#98a2b3", fontSize: 13, padding: "8px 0" }}>Kayıt bulunamadı.</div>;
}
