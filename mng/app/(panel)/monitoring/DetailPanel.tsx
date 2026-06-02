"use client";
import { useState, useMemo } from "react";
import type {
  SysInfoRecord, ProcessItem, ServiceItem, NetIOItem, ActivityEvent,
} from "./types";

type Tab = "activity" | "security" | "users" | "processes" | "services" | "network" | "usb" | "patches" | "software";

type Props = {
  sysinfos: SysInfoRecord[];
  activeAgentId: number | null;
  baseUrl: string;
  activityEvents: ActivityEvent[];
};

export function DetailPanel({ sysinfos, activeAgentId, baseUrl, activityEvents }: Props) {
  const [tab, setTab] = useState<Tab>("activity");
  const [svcSearch, setSvcSearch] = useState("");
  const [swSearch, setSwSearch] = useState("");
  const [svcFilter, setSvcFilter] = useState<"all" | "running" | "stopped">("all");

  const sysinfo = useMemo(
    () => sysinfos.find((s) => s.agent_id === activeAgentId) ?? sysinfos[0] ?? null,
    [sysinfos, activeAgentId]
  );

  if (!sysinfo) return null;

  const filteredSvcs = useMemo(() => {
    let s = sysinfo.services ?? [];
    if (svcSearch) s = s.filter((x) => (x.display || x.name).toLowerCase().includes(svcSearch.toLowerCase()));
    if (svcFilter === "running") s = s.filter((x) => x.status === "Running" || x.status === "active");
    if (svcFilter === "stopped") s = s.filter((x) => x.status !== "Running" && x.status !== "active");
    return s;
  }, [sysinfo.services, svcSearch, svcFilter]);

  const filteredSw = useMemo(() => {
    if (!swSearch) return sysinfo.software ?? [];
    const q = swSearch.toLowerCase();
    return (sysinfo.software ?? []).filter((x) => x.name.toLowerCase().includes(q));
  }, [sysinfo.software, swSearch]);

  const agentEvents = useMemo(
    () => activityEvents.filter((e) => e.agent_id === (activeAgentId ?? sysinfo?.agent_id)),
    [activityEvents, activeAgentId, sysinfo]
  );

  const runningCount = useMemo(
    () => (sysinfo.services ?? []).filter((s) => s.status === "Running" || s.status === "active").length,
    [sysinfo.services]
  );

  const allTabs: { id: Tab; label: string; count: number; red?: boolean }[] = [
    { id: "activity"  as Tab, label: "⏱ Aktivite",     count: agentEvents.length },
    { id: "security"  as Tab, label: "🔐 Güvenlik",    count: sysinfo.security_events?.length ?? 0, red: (sysinfo.security_events?.length ?? 0) > 0 },
    { id: "users"     as Tab, label: "👤 Kullanıcılar", count: sysinfo.active_users?.length ?? 0 },
    { id: "processes" as Tab, label: "⚙ Processler",   count: sysinfo.top_processes?.length ?? 0 },
    { id: "services"  as Tab, label: "🔧 Servisler",    count: sysinfo.services?.length ?? 0 },
    { id: "network"   as Tab, label: "🌐 Ağ",           count: sysinfo.net_io?.length ?? 0 },
    { id: "usb"       as Tab, label: "🔌 USB",          count: sysinfo.usb_devices?.length ?? 0 },
    { id: "patches"   as Tab, label: "🛡 Yamalar",      count: sysinfo.patches?.length ?? 0 },
    { id: "software"  as Tab, label: "📦 Yazılımlar",   count: sysinfo.software?.length ?? 0 },
  ];
  const tabs = allTabs.filter((t) => t.count > 0);

  const validTabs = new Set(tabs.map((t) => t.id));
  const activeTab: Tab = validTabs.has(tab) ? tab : (tabs[0]?.id ?? "security");

  const agentHref = (id: number) =>
    `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}agent=${id}#detail`;

  return (
    <div className="detail-panel" id="detail">
      <div className="detail-header">
        <div className="detail-agent-info">
          {sysinfos.length > 1 ? (
            <select
              className="agent-select"
              value={activeAgentId ?? sysinfo.agent_id}
              onChange={(e) => { window.location.href = agentHref(Number(e.target.value)); }}
            >
              {sysinfos.map((s) => (
                <option key={s.agent_id} value={s.agent_id}>
                  {s.company_name} — {s.hostname ?? `Ajan ${s.agent_id}`}
                </option>
              ))}
            </select>
          ) : (
            <span className="detail-title">
              {sysinfo.company_name} — {sysinfo.hostname ?? "Ajan"}
            </span>
          )}
        </div>
        <span className="detail-time">
          Son veri: {new Date(sysinfo.collected_at).toLocaleString("tr-TR")}
        </span>
      </div>

      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${activeTab === t.id ? " active" : ""}${t.red ? " tab-red" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">

        {activeTab === "activity" && (
          agentEvents.length === 0
            ? <div className="empty-tab">Son 48 saatte aktivite yok</div>
            : <table className="mini-table">
                <thead>
                  <tr><th>Zaman</th><th>Tür</th><th>Detay</th></tr>
                </thead>
                <tbody>
                  {agentEvents.map((e, i) => {
                    const d = new Date(e.time);
                    const timeStr = isNaN(d.getTime())
                      ? e.time
                      : d.toLocaleString("tr-TR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit" });
                    return (
                      <tr key={i}>
                        <td className="mono dim nowrap">{timeStr}</td>
                        <td>
                          <span className={e.type === "metric" ? "badge-blue" : "badge-purple"}>
                            {e.type === "metric" ? "📊 Metrik" : "🖥 Sistem"}
                          </span>
                        </td>
                        <td className="dim">{e.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
        )}

        {activeTab === "security" && (
          (sysinfo.security_events?.length ?? 0) === 0
            ? <div className="empty-tab">Güvenlik olayı yok</div>
            : <table className="mini-table">
                <thead><tr><th>Event</th><th>Zaman</th><th>Mesaj</th></tr></thead>
                <tbody>
                  {sysinfo.security_events!.map((e, i) => (
                    <tr key={i}>
                      <td className="mono bold">#{e.event_id}</td>
                      <td className="dim nowrap">{e.time}</td>
                      <td className="dim ellipsis">{e.message?.slice(0, 200)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {activeTab === "users" && (
          <div className="tag-list">
            {(sysinfo.active_users?.length ?? 0) === 0
              ? <div className="empty-tab">Aktif kullanıcı yok</div>
              : sysinfo.active_users!.map((u, i) => <span key={i} className="tag">{u}</span>)
            }
          </div>
        )}

        {activeTab === "processes" && (
          (sysinfo.top_processes?.length ?? 0) === 0
            ? <div className="empty-tab">Veri yok</div>
            : <table className="mini-table">
                <thead><tr><th>PID</th><th>İsim</th><th>CPU%</th><th>RAM MB</th><th>Durum</th></tr></thead>
                <tbody>
                  {(sysinfo.top_processes as ProcessItem[]).map((p, i) => (
                    <tr key={i}>
                      <td className="mono">{p.pid}</td>
                      <td className="bold">{p.name}</td>
                      <td style={{ color: Number(p.cpu_percent) > 50 ? "#ef4444" : "inherit" }}>
                        {Number(p.cpu_percent).toFixed(1)}%
                      </td>
                      <td>{Number(p.mem_mb).toFixed(0)}</td>
                      <td className="dim">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {activeTab === "services" && (
          <div>
            <div className="tab-toolbar">
              <input
                className="search-input"
                placeholder="Servis ara..."
                value={svcSearch}
                onChange={(e) => setSvcSearch(e.target.value)}
              />
              <select
                className="filter-sm"
                value={svcFilter}
                onChange={(e) => setSvcFilter(e.target.value as typeof svcFilter)}
              >
                <option value="all">Tümü ({sysinfo.services?.length ?? 0})</option>
                <option value="running">Çalışıyor ({runningCount})</option>
                <option value="stopped">Durdu ({(sysinfo.services?.length ?? 0) - runningCount})</option>
              </select>
            </div>
            {filteredSvcs.length === 0
              ? <div className="empty-tab">Sonuç yok</div>
              : <table className="mini-table">
                  <thead><tr><th>Servis</th><th>Durum</th><th>Başlangıç</th></tr></thead>
                  <tbody>
                    {filteredSvcs.slice(0, 150).map((s: ServiceItem, i) => (
                      <tr key={i}>
                        <td className="bold">{s.display || s.name}</td>
                        <td>
                          <span className={s.status === "Running" || s.status === "active" ? "badge-green" : "badge-gray"}>
                            {s.status}
                          </span>
                        </td>
                        <td className="dim">{s.start_type ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        )}

        {activeTab === "network" && (
          (sysinfo.net_io?.length ?? 0) === 0
            ? <div className="empty-tab">Ağ verisi yok</div>
            : <table className="mini-table">
                <thead><tr><th>Arayüz</th><th>Gönderilen MB</th><th>Alınan MB</th><th>Gön. Paket</th><th>Al. Paket</th></tr></thead>
                <tbody>
                  {(sysinfo.net_io as NetIOItem[]).map((n, i) => (
                    <tr key={i}>
                      <td className="mono">{n.interface}</td>
                      <td>{Number(n.sent_mb).toFixed(1)}</td>
                      <td>{Number(n.recv_mb).toFixed(1)}</td>
                      <td className="dim">{n.sent_pkts?.toLocaleString() ?? "—"}</td>
                      <td className="dim">{n.recv_pkts?.toLocaleString() ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {activeTab === "usb" && (
          <div className="tag-list">
            {(sysinfo.usb_devices ?? []).map((u, i) => (
              <span key={i} className="tag">{u.friendly_name}</span>
            ))}
          </div>
        )}

        {activeTab === "patches" && (
          (sysinfo.patches?.length ?? 0) === 0
            ? <div className="empty-tab">Yama verisi yok</div>
            : <table className="mini-table">
                <thead><tr><th>ID</th><th>Açıklama</th><th>Kurulum Tarihi</th></tr></thead>
                <tbody>
                  {sysinfo.patches!.slice(0, 100).map((p, i) => (
                    <tr key={i}>
                      <td className="mono bold">{p.hotfix_id}</td>
                      <td className="dim">{p.description ?? "—"}</td>
                      <td className="dim nowrap">{p.installed_on ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {activeTab === "software" && (
          <div>
            <div className="tab-toolbar">
              <input
                className="search-input"
                placeholder="Yazılım ara..."
                value={swSearch}
                onChange={(e) => setSwSearch(e.target.value)}
              />
              <span className="tab-info">{filteredSw.length} yazılım</span>
            </div>
            {filteredSw.length === 0
              ? <div className="empty-tab">Sonuç yok</div>
              : <table className="mini-table">
                  <thead><tr><th>Yazılım</th><th>Sürüm</th><th>Yayıncı</th><th>Tarih</th></tr></thead>
                  <tbody>
                    {filteredSw.slice(0, 300).map((s, i) => (
                      <tr key={i}>
                        <td className="bold">{s.name}</td>
                        <td className="mono dim">{s.version ?? "—"}</td>
                        <td className="dim">{s.publisher ?? "—"}</td>
                        <td className="dim nowrap">{s.install_date ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        )}

      </div>
    </div>
  );
}
