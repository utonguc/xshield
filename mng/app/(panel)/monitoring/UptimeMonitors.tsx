"use client";
import { useState, useEffect, useCallback } from "react";

type MonitorType = "icmp" | "tcp" | "http" | "https" | "ssl";

type Monitor = {
  id: number; customer_id: number; name: string; target: string;
  type: MonitorType; port: number | null; interval_seconds: number; enabled: boolean;
  company_name: string;
  last_checked_at: string | null; last_is_up: boolean | null;
  last_response_ms: number | null; last_detail: string | null;
  uptime_24h: number | null; uptime_7d: number | null; checks_24h: number;
};

type Check = {
  checked_at: string; is_up: boolean; response_ms: number | null; detail: string | null;
};

type Customer = { id: number; company_name: string };

const TYPE_LABEL: Record<MonitorType, string> = {
  icmp: "ICMP Ping", tcp: "TCP Port", http: "HTTP", https: "HTTPS", ssl: "SSL Sertifika",
};
const PORT_DEFAULT: Record<string, string> = {
  tcp: "80", http: "80", https: "443", ssl: "443", icmp: "",
};
const INTERVALS = [
  { v: "5", l: "5 saniye" }, { v: "10", l: "10 saniye" }, { v: "30", l: "30 saniye" },
  { v: "60", l: "1 dakika" }, { v: "180", l: "3 dakika" }, { v: "300", l: "5 dakika" },
  { v: "600", l: "10 dakika" }, { v: "1800", l: "30 dakika" },
];

export function UptimeMonitors({ customers, currentCustomer }: { customers: Customer[]; currentCustomer?: string }) {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [checksMap, setChecksMap] = useState<Record<number, Check[]>>({});
  const [checksLoading, setChecksLoading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: currentCustomer ?? String(customers[0]?.id ?? ""),
    name: "", target: "", type: "tcp" as MonitorType, port: "80", interval_seconds: "300",
  });

  const load = useCallback(async () => {
    const url = currentCustomer ? `/api/uptime?customer_id=${currentCustomer}` : "/api/uptime";
    const r = await fetch(url);
    if (r.ok) setMonitors(await r.json());
    setLoading(false);
  }, [currentCustomer]);

  useEffect(() => { load(); }, [load]);

  async function runChecks() {
    setRunning(true);
    await fetch("/api/uptime/run");
    await load();
    setRunning(false);
  }

  async function save() {
    if (!form.name.trim() || !form.target.trim()) return;
    setSaving(true);
    const r = await fetch("/api/uptime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: Number(form.customer_id),
        name: form.name.trim(),
        target: form.target.trim(),
        type: form.type,
        port: form.port ? Number(form.port) : null,
        interval_seconds: Number(form.interval_seconds),
      }),
    });
    if (r.ok) {
      setShowForm(false);
      setForm({ ...form, name: "", target: "", port: PORT_DEFAULT[form.type] ?? "" });
      await load();
    }
    setSaving(false);
  }

  async function del(id: number) {
    await fetch(`/api/uptime?id=${id}`, { method: "DELETE" });
    setMonitors((p) => p.filter((m) => m.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function toggle(id: number, enabled: boolean) {
    await fetch(`/api/uptime?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setMonitors((p) => p.map((m) => m.id === id ? { ...m, enabled } : m));
  }

  async function expand(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (checksMap[id]) return;
    setChecksLoading(id);
    const r = await fetch(`/api/uptime/checks?monitor_id=${id}`);
    if (r.ok) { const data: Check[] = await r.json(); setChecksMap((p) => ({ ...p, [id]: data })); }
    setChecksLoading(null);
  }

  const downCount = monitors.filter((m) => m.last_is_up === false && m.enabled).length;

  if (loading) return null;

  return (
    <div className="uptime-section">
      <div className="uptime-header">
        <div>
          <h2 className="uptime-title">Dış İzleme</h2>
          <p className="uptime-sub">
            {monitors.length} monitor
            {downCount > 0 && <span className="uptime-down-badge"> · {downCount} DOWN</span>}
          </p>
        </div>
        <div className="uptime-actions">
          <button className="btn-run" onClick={runChecks} disabled={running}>
            {running ? "⏳ Kontrol ediliyor…" : "▶ Şimdi Kontrol Et"}
          </button>
          <button className="btn-add-mon" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "✕ İptal" : "+ Monitor Ekle"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="uptime-form">
          <div className="form-field">
            <label>Müşteri</label>
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Adı</label>
            <input
              placeholder="Firewall, Web Sitesi…"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Hedef</label>
            <input
              placeholder={form.type === "http" || form.type === "https" ? "https://site.com" : "1.2.3.4 veya host.com"}
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Tür</label>
            <select
              value={form.type}
              onChange={(e) => {
                const t = e.target.value as MonitorType;
                setForm({ ...form, type: t, port: PORT_DEFAULT[t] ?? "" });
              }}
            >
              {(Object.keys(TYPE_LABEL) as MonitorType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          {(form.type === "tcp" || form.type === "http" || form.type === "https") && (
            <div className="form-field" style={{ maxWidth: 90 }}>
              <label>Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
              />
            </div>
          )}
          <div className="form-field">
            <label>Aralık</label>
            <select value={form.interval_seconds} onChange={(e) => setForm({ ...form, interval_seconds: e.target.value })}>
              {INTERVALS.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ justifyContent: "flex-end" }}>
            <label style={{ visibility: "hidden" }}>.</label>
            <button className="btn-save" onClick={save} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {monitors.length === 0 ? (
        <div className="uptime-empty">
          Henüz monitor yok. Müşterilerin dış IP'lerini, web sitelerini veya portlarını izlemek için "+ Monitor Ekle" ile başlayın.
        </div>
      ) : (
        <div className="uptime-grid">
          {monitors.map((m) => {
            const isDown    = m.last_is_up === false;
            const isUnknown = m.last_is_up === null;
            const statusColor = isUnknown ? "#6b7280" : isDown ? "#ef4444" : "#22c55e";
            const statusText  = isUnknown ? "?" : isDown ? "DOWN" : "UP";
            const lastTime = m.last_checked_at
              ? new Date(m.last_checked_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
              : "Henüz kontrol edilmedi";
            const isExpanded = expandedId === m.id;
            const histChecks = checksMap[m.id] ?? [];

            return (
              <div key={m.id} className={`uptime-card${isDown && m.enabled ? " uc-down" : ""}${!m.enabled ? " uc-disabled" : ""}`}>
                <div className="uc-top">
                  <span className="uc-status-dot" style={{ color: statusColor }}>●</span>
                  <span className="uc-status-text" style={{ color: statusColor }}>{statusText}</span>
                  <span className={`uc-type-badge type-${m.type}`}>{m.type.toUpperCase()}</span>
                  {!m.enabled && <span className="uc-paused-badge">DURAKLATILDI</span>}
                </div>
                <div className="uc-name">{m.name}</div>
                <div className="uc-company">{m.company_name}</div>
                <div className="uc-target-row">
                  <span className="uc-host">{m.target}{m.port ? `:${m.port}` : ""}</span>
                </div>

                <div className="uc-stats-row">
                  {m.last_response_ms != null && (
                    <span className="uc-ms">{m.last_response_ms}ms</span>
                  )}
                  {m.uptime_24h != null && (
                    <span
                      className="uc-uptime-pct"
                      style={{ color: m.uptime_24h >= 99 ? "#22c55e" : m.uptime_24h >= 95 ? "#f59e0b" : "#ef4444" }}
                    >
                      {m.uptime_24h}% <span className="uc-period">24s</span>
                    </span>
                  )}
                  {m.uptime_7d != null && (
                    <span className="uc-uptime-pct dim">
                      {m.uptime_7d}% <span className="uc-period">7g</span>
                    </span>
                  )}
                </div>

                {m.last_detail && <div className="uc-detail-text">{m.last_detail}</div>}
                <div className="uc-last-time">{lastTime}</div>

                <div className="uc-btn-row">
                  <button className="uc-btn-hist" onClick={() => expand(m.id)}>
                    {isExpanded ? "▲ Gizle" : "▼ Geçmiş"}
                  </button>
                  <button
                    className="uc-btn-icon"
                    title={m.enabled ? "Duraklat" : "Başlat"}
                    onClick={() => toggle(m.id, !m.enabled)}
                  >
                    {m.enabled ? "⏸" : "▶"}
                  </button>
                  <button className="uc-btn-del" title="Sil" onClick={() => del(m.id)}>✕</button>
                </div>

                {isExpanded && (
                  <div className="uc-history">
                    {checksLoading === m.id ? (
                      <div className="uc-hist-loading">Yükleniyor…</div>
                    ) : histChecks.length === 0 ? (
                      <div className="uc-hist-loading">Henüz geçmiş yok</div>
                    ) : (
                      <>
                        <div className="hist-bar">
                          {[...histChecks].reverse().slice(-60).map((c, i) => (
                            <div
                              key={i}
                              className="hist-blk"
                              style={{ background: c.is_up ? "#22c55e" : "#ef4444" }}
                              title={
                                new Date(c.checked_at).toLocaleString("tr-TR") +
                                (c.response_ms ? ` · ${c.response_ms}ms` : "") +
                                (c.detail ? ` · ${c.detail}` : "")
                              }
                            />
                          ))}
                        </div>
                        <div className="hist-table-wrap">
                          <table className="mini-table">
                            <thead>
                              <tr><th>Zaman</th><th>Durum</th><th>Yanıt</th><th>Detay</th></tr>
                            </thead>
                            <tbody>
                              {histChecks.slice(0, 20).map((c, i) => (
                                <tr key={i}>
                                  <td className="mono dim nowrap">
                                    {new Date(c.checked_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </td>
                                  <td>
                                    <span className={c.is_up ? "badge-green" : "badge-red"}>
                                      {c.is_up ? "UP" : "DOWN"}
                                    </span>
                                  </td>
                                  <td className="dim">{c.response_ms != null ? `${c.response_ms}ms` : "—"}</td>
                                  <td className="dim ellipsis">{c.detail ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
