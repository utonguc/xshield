import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { FilterSelect } from "@/components/FilterSelect";
import { AutoRefresh } from "./AutoRefresh";
import { DetailPanel } from "./DetailPanel";
import { UptimeMonitors } from "./UptimeMonitors";
import type { SysInfoRecord, ActivityEvent } from "./types";

export const metadata: Metadata = { title: "İzleme — xShield MNG" };
export const dynamic = "force-dynamic";

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; agent?: string }>;
}) {
  const { customer, agent: agentParam } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const [customers, latestMetrics, agentStatus, sysinfos, sparklines, activityEvents] = await Promise.all([
    query<{ id: number; company_name: string }>(
      "SELECT id, company_name FROM customers WHERE status='active' ORDER BY company_name"
    ),
    query<{
      agent_id: number; agent_name: string; company_name: string; customer_id: number;
      hostname: string; ip_address: string | null; platform: string | null;
      cpu_percent: number; ram_percent: number; ram_total_gb: number;
      disk_percent: number; disk_total_gb: number; uptime_hours: number;
      collected_at: string;
    }>(
      `SELECT DISTINCT ON (dm.agent_id)
              dm.agent_id, na.name AS agent_name, c.company_name, c.id AS customer_id,
              dm.hostname, dm.ip_address, dm.platform,
              dm.cpu_percent::float AS cpu_percent, dm.ram_percent::float AS ram_percent,
              dm.ram_total_gb::float  AS ram_total_gb,
              dm.disk_percent::float  AS disk_percent, dm.disk_total_gb::float AS disk_total_gb,
              dm.uptime_hours::float  AS uptime_hours, dm.collected_at
       FROM device_metrics dm
       JOIN network_agents na ON na.id = dm.agent_id
       JOIN customers      c  ON c.id  = dm.customer_id
       WHERE dm.collected_at > now() - interval '24 hours'
         ${customer ? "AND dm.customer_id=$1" : ""}
       ORDER BY dm.agent_id, dm.collected_at DESC`,
      customer ? [Number(customer)] : []
    ),
    query<{ id: number; name: string; company_name: string; last_seen: string | null }>(
      `SELECT na.id, na.name, c.company_name, na.last_seen
       FROM network_agents na
       JOIN customers c ON c.id = na.customer_id
       WHERE (na.last_seen IS NULL OR na.last_seen < now() - interval '10 minutes')
         ${customer ? "AND na.customer_id=$1" : ""}
       ORDER BY c.company_name`,
      customer ? [Number(customer)] : []
    ),
    query<SysInfoRecord>(
      `SELECT DISTINCT ON (s.agent_id)
              s.agent_id, c.company_name, s.hostname,
              s.software, s.patches, s.active_users, s.usb_devices,
              s.top_processes, s.services, s.security_events, s.net_io, s.collected_at
       FROM agent_sysinfo s
       JOIN customers c ON c.id = s.customer_id
       ${customer ? "WHERE s.customer_id=$1" : ""}
       ORDER BY s.agent_id, s.collected_at DESC`,
      customer ? [Number(customer)] : []
    ),
    query<{ agent_id: number; cpu_series: number[]; ram_series: number[] }>(
      `SELECT agent_id,
              array_agg(cpu_percent::float ORDER BY collected_at) AS cpu_series,
              array_agg(ram_percent::float ORDER BY collected_at) AS ram_series
       FROM device_metrics
       WHERE collected_at > now() - interval '24 hours'
         ${customer ? "AND customer_id=$1" : ""}
       GROUP BY agent_id`,
      customer ? [Number(customer)] : []
    ),
    query<ActivityEvent>(
      `SELECT type, agent_id, time::text AS time, detail FROM (
         SELECT 'metric'  AS type, agent_id, collected_at AS time,
                ROUND(cpu_percent::numeric,1)::text  || '% CPU  ·  ' ||
                ROUND(ram_percent::numeric,1)::text  || '% RAM  ·  ' ||
                ROUND(disk_percent::numeric,1)::text || '% Disk' AS detail
         FROM device_metrics
         WHERE collected_at > now() - interval '48 hours'
           ${customer ? "AND customer_id=$1" : ""}
         UNION ALL
         SELECT 'sysinfo', agent_id, collected_at,
                jsonb_array_length(COALESCE(software,'[]'::jsonb))::text  || ' yazılım  ·  ' ||
                jsonb_array_length(COALESCE(services,'[]'::jsonb))::text  || ' servis  ·  '  ||
                jsonb_array_length(COALESCE(top_processes,'[]'::jsonb))::text || ' process' AS detail
         FROM agent_sysinfo
         WHERE collected_at > now() - interval '48 hours'
           ${customer ? "AND customer_id=$1" : ""}
       ) t
       ORDER BY time DESC
       LIMIT 300`,
      customer ? [Number(customer)] : []
    ),
  ]);

  const activeAgentId = agentParam ? Number(agentParam) : (sysinfos[0]?.agent_id ?? null);
  const slMap = new Map(sparklines.map((s) => [s.agent_id, s]));

  function gauge(v: number, warn = 70, crit = 90) {
    if (v >= crit) return "#ef4444";
    if (v >= warn) return "#f59e0b";
    return "#22c55e";
  }

  // Fix: use ? when no customer, & when customer already set
  const agentUrl = (id: number) =>
    customer
      ? `/monitoring?customer=${customer}&agent=${id}#detail`
      : `/monitoring?agent=${id}#detail`;

  const baseUrl = customer ? `/monitoring?customer=${customer}` : "/monitoring";

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="title">Sistem İzleme</h1>
            <p className="subtitle">
              {latestMetrics.length} aktif · {agentStatus.length} çevrimdışı · {sysinfos.length} detay verisi
            </p>
          </div>
          <div className="header-right">
            <AutoRefresh />
            <FilterSelect
              basePath="/monitoring"
              options={customers.map((c) => ({ value: c.id, label: c.company_name }))}
              current={customer}
            />
          </div>
        </div>

        <UptimeMonitors customers={customers} currentCustomer={customer} />

        {agentStatus.length > 0 && (
          <div className="offline-banner">
            <span>⚠</span>
            <span>
              <strong>{agentStatus.length} ajan çevrimdışı:</strong>{" "}
              {agentStatus.map((a) => `${a.company_name} / ${a.name}`).join(" · ")}
            </span>
          </div>
        )}

        {latestMetrics.length === 0 ? (
          <div className="section">
            <div className="empty">
              Henüz metrik yok. Ajan kurulup çalışmaya başladıktan sonra veriler burada görünecek.<br />
              <a href="/network-discovery" className="link">Ağ Keşfi →</a>
            </div>
          </div>
        ) : (
          <div className="metrics-grid">
            {latestMetrics.map((m) => {
              const age = Date.now() - new Date(m.collected_at).getTime();
              const isStale = age > 10 * 60 * 1000;
              const hasSysinfo = sysinfos.some((s) => s.agent_id === m.agent_id);
              const sl = slMap.get(m.agent_id);
              return (
                <div key={m.agent_id} className={`metric-card${isStale ? " stale" : ""}`}>
                  <div className="card-header">
                    <div>
                      <div className="card-cust">{m.company_name}</div>
                      <div className="card-host">{m.hostname}</div>
                      {m.ip_address && <div className="card-ip">{m.ip_address}</div>}
                    </div>
                    <div className={`card-status ${isStale ? "offline" : "online"}`}>
                      {isStale ? "● Eski" : "● Canlı"}
                    </div>
                  </div>

                  <div className="gauges">
                    <Gauge label="CPU"  value={m.cpu_percent}  color={gauge(m.cpu_percent)} />
                    <Gauge label="RAM"  value={m.ram_percent}  color={gauge(m.ram_percent)}  sub={`${m.ram_total_gb.toFixed(1)} GB`} />
                    <Gauge label="Disk" value={m.disk_percent} color={gauge(m.disk_percent, 80, 95)} sub={`${m.disk_total_gb.toFixed(0)} GB`} />
                  </div>

                  {sl && sl.cpu_series.length >= 3 && (
                    <div className="sparklines">
                      <div className="spark-row">
                        <span className="spark-lbl">CPU 24s</span>
                        <Sparkline values={sl.cpu_series} color={gauge(m.cpu_percent)} />
                      </div>
                      <div className="spark-row">
                        <span className="spark-lbl">RAM 24s</span>
                        <Sparkline values={sl.ram_series} color={gauge(m.ram_percent)} />
                      </div>
                    </div>
                  )}

                  <div className="card-meta">
                    <span>Uptime: {m.uptime_hours.toFixed(0)} sa</span>
                    {m.platform && <><span className="meta-sep">·</span><span>{m.platform}</span></>}
                  </div>

                  {hasSysinfo && (
                    <a
                      href={agentUrl(m.agent_id)}
                      className={`btn-detail${activeAgentId === m.agent_id ? " active" : ""}`}
                    >
                      {activeAgentId === m.agent_id ? "▼ Detay Seçili" : "▶ Detaylar"}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sysinfos.length > 0 && (
          <DetailPanel
            sysinfos={sysinfos}
            activeAgentId={activeAgentId}
            baseUrl={baseUrl}
            activityEvents={activityEvents}
          />
        )}
      </div>
    </>
  );
}

function Gauge({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="gauge">
      <div className="gauge-label">{label}</div>
      <div className="gauge-track"><div className="gauge-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <div className="gauge-val" style={{ color }}>{pct.toFixed(0)}%</div>
      {sub && <div className="gauge-sub">{sub}</div>}
    </div>
  );
}

function Sparkline({ values, color = "#3b82f6", w = 110, h = 24 }: {
  values: number[]; color?: string; w?: number; h?: number;
}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

const css = `
.page{padding:28px;display:flex;flex-direction:column;gap:20px;max-width:1400px}
.page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.header-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.refresh-badge{font-size:11px;color:var(--text-ghost);background:var(--input-bg);border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-variant-numeric:tabular-nums;white-space:nowrap}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin:0 0 2px}
.subtitle{font-size:13px;color:var(--text-dim);margin:0}
.offline-banner{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px 16px;font-size:13px;color:#92400e;display:flex;align-items:center;gap:10px}
.section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:22px}
.empty{font-size:14px;color:var(--text-ghost);text-align:center;padding:24px 0;line-height:2}
.link{color:#3b82f6;text-decoration:none;font-weight:600}
/* Metric cards */
.metrics-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.metric-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px}
.metric-card.stale{border-color:rgba(245,158,11,0.3);opacity:0.75}
.card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.card-cust{font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.06em}
.card-host{font-size:15px;font-weight:700;color:var(--text);margin-top:2px}
.card-ip{font-size:11px;font-family:monospace;color:var(--text-ghost);margin-top:2px}
.card-status{font-size:11px;font-weight:600;white-space:nowrap}
.card-status.online{color:#22c55e}
.card-status.offline{color:#f59e0b}
.gauges{display:flex;flex-direction:column;gap:7px}
.gauge{display:grid;grid-template-columns:38px 1fr 36px 42px;align-items:center;gap:6px}
.gauge-label{font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase}
.gauge-track{height:5px;background:var(--input-bg);border-radius:3px;overflow:hidden;border:1px solid var(--border)}
.gauge-fill{height:100%;border-radius:3px}
.gauge-val{font-size:11px;font-weight:700;text-align:right}
.gauge-sub{font-size:10px;color:var(--text-ghost)}
/* Sparklines */
.sparklines{display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--divider);padding-top:8px}
.spark-row{display:flex;align-items:center;gap:8px}
.spark-lbl{font-size:9px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;width:42px;flex-shrink:0}
.card-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:11px;color:var(--text-ghost)}
.meta-sep{color:var(--border)}
.btn-detail{display:block;text-align:center;font-size:12px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:7px;padding:6px 0;text-decoration:none}
.btn-detail.active{background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.4)}
/* Detail panel */
.detail-panel{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.detail-header{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-bottom:1px solid var(--divider);background:var(--input-bg);gap:12px;flex-wrap:wrap}
.detail-agent-info{display:flex;align-items:center;gap:8px}
.detail-title{font-size:13px;font-weight:700;color:var(--text)}
.agent-select{font-size:13px;font-weight:700;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer}
.detail-time{font-size:11px;color:var(--text-ghost);white-space:nowrap}
/* Tabs */
.tab-bar{display:flex;gap:2px;padding:10px 14px 0;overflow-x:auto;border-bottom:1px solid var(--divider);scrollbar-width:none}
.tab-bar::-webkit-scrollbar{display:none}
.tab-btn{background:none;border:1px solid transparent;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-dim);padding:7px 12px;border-radius:7px 7px 0 0;white-space:nowrap;display:flex;align-items:center;gap:5px;transition:color 0.15s,background 0.15s}
.tab-btn:hover{background:var(--input-bg);color:var(--text)}
.tab-btn.active{background:var(--card);color:var(--text);border-color:var(--divider);border-bottom-color:var(--card);margin-bottom:-1px}
.tab-btn.tab-red .tab-count{background:rgba(239,68,68,0.15);color:#ef4444;border-color:rgba(239,68,68,0.2)}
.tab-count{background:var(--input-bg);color:var(--text-dim);border:1px solid var(--border);border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700}
.tab-content{padding:14px 18px;max-height:440px;overflow-y:auto}
/* Toolbar */
.tab-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
.search-input{flex:1;min-width:160px;font-size:12px;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;padding:6px 10px;color:var(--text);outline:none}
.search-input:focus{border-color:#3b82f6}
.filter-sm{font-size:12px;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;padding:6px 10px;color:var(--text);cursor:pointer}
.tab-info{font-size:11px;color:var(--text-ghost);white-space:nowrap}
.empty-tab{font-size:13px;color:var(--text-ghost);padding:24px 0;text-align:center}
/* Tables */
.mini-table{width:100%;border-collapse:collapse;font-size:11px}
.mini-table th{padding:5px 8px;text-align:left;font-weight:700;color:var(--text-dimmer);border-bottom:1px solid var(--divider);text-transform:uppercase;font-size:10px;letter-spacing:0.04em;position:sticky;top:0;background:var(--card);z-index:1}
.mini-table td{padding:4px 8px;border-bottom:1px solid var(--row-border);color:var(--text-sub);vertical-align:middle}
.mini-table tr:last-child td{border-bottom:none}
.nowrap{white-space:nowrap}
.ellipsis{max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mono{font-family:monospace}
.bold{font-weight:700;color:var(--text)}
.dim{color:var(--text-dim)}
.tag-list{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0}
.tag{background:var(--input-bg);border:1px solid var(--border);border-radius:5px;padding:3px 10px;font-size:11px;color:var(--text-dim)}
.badge-green{background:rgba(34,197,94,0.1);color:#16a34a;border:1px solid rgba(34,197,94,0.2);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700}
.badge-gray{background:var(--input-bg);color:var(--text-dim);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700}
.badge-blue{background:rgba(59,130,246,0.1);color:#2563eb;border:1px solid rgba(59,130,246,0.2);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;white-space:nowrap}
.badge-purple{background:rgba(139,92,246,0.1);color:#7c3aed;border:1px solid rgba(139,92,246,0.2);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;white-space:nowrap}
/* Uptime monitors section */
.uptime-section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:14px}
.uptime-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.uptime-title{font-size:16px;font-weight:800;color:var(--text);margin:0 0 2px}
.uptime-sub{font-size:12px;color:var(--text-dim);margin:0}
.uptime-down-badge{color:#ef4444;font-weight:700}
.uptime-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.btn-run{font-size:12px;font-weight:600;color:var(--text);background:var(--input-bg);border:1px solid var(--border);border-radius:7px;padding:7px 12px;cursor:pointer;white-space:nowrap}
.btn-run:disabled{opacity:0.5;cursor:not-allowed}
.btn-add-mon{font-size:12px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:7px;padding:7px 12px;cursor:pointer;white-space:nowrap}
/* Add form */
.uptime-form{background:var(--input-bg);border:1px solid var(--border);border-radius:9px;padding:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
.form-field{display:flex;flex-direction:column;gap:4px;min-width:130px}
.form-field label{font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.04em}
.form-field input,.form-field select{font-size:12px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);outline:none}
.form-field input:focus,.form-field select:focus{border-color:#3b82f6}
.btn-save{font-size:12px;font-weight:700;color:#fff;background:#3b82f6;border:none;border-radius:7px;padding:7px 18px;cursor:pointer}
.btn-save:disabled{opacity:0.5;cursor:not-allowed}
.uptime-empty{font-size:13px;color:var(--text-ghost);text-align:center;padding:20px 0;line-height:1.8}
/* Monitor cards grid */
.uptime-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.uptime-card{background:var(--input-bg);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:6px}
.uptime-card.uc-down{border-color:rgba(239,68,68,0.35);background:rgba(239,68,68,0.025)}
.uptime-card.uc-disabled{opacity:0.5}
.uc-top{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.uc-status-dot{font-size:10px;line-height:1}
.uc-status-text{font-size:11px;font-weight:800;letter-spacing:0.04em}
.uc-type-badge{border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700;margin-left:2px}
.type-icmp{background:rgba(99,102,241,0.12);color:#6366f1;border:1px solid rgba(99,102,241,0.25)}
.type-tcp{background:rgba(20,184,166,0.12);color:#0d9488;border:1px solid rgba(20,184,166,0.25)}
.type-http{background:rgba(59,130,246,0.12);color:#2563eb;border:1px solid rgba(59,130,246,0.25)}
.type-https{background:rgba(34,197,94,0.12);color:#16a34a;border:1px solid rgba(34,197,94,0.25)}
.type-ssl{background:rgba(245,158,11,0.12);color:#d97706;border:1px solid rgba(245,158,11,0.25)}
.uc-paused-badge{font-size:9px;font-weight:700;color:var(--text-ghost);background:var(--input-bg);border:1px solid var(--border);border-radius:4px;padding:1px 5px;margin-left:2px}
.uc-name{font-size:14px;font-weight:700;color:var(--text)}
.uc-company{font-size:11px;color:var(--text-dim)}
.uc-target-row{display:flex;align-items:center;gap:6px}
.uc-host{font-family:monospace;font-size:11px;color:var(--text-sub)}
.uc-stats-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.uc-ms{font-size:11px;font-weight:700;color:var(--text-dim)}
.uc-uptime-pct{font-size:11px;font-weight:700}
.uc-period{font-weight:400;font-size:10px;color:var(--text-ghost)}
.uc-detail-text{font-family:monospace;font-size:10px;color:var(--text-ghost)}
.uc-last-time{font-size:10px;color:var(--text-ghost)}
.uc-btn-row{display:flex;gap:5px;margin-top:2px}
.uc-btn-hist{flex:1;font-size:11px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:6px;padding:5px 0;cursor:pointer}
.uc-btn-icon{font-size:12px;background:var(--input-bg);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer}
.uc-btn-del{font-size:12px;color:#ef4444;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:6px;padding:4px 8px;cursor:pointer}
/* History */
.uc-history{border-top:1px solid var(--divider);padding-top:10px;display:flex;flex-direction:column;gap:8px}
.uc-hist-loading{font-size:11px;color:var(--text-ghost);padding:6px 0}
.hist-bar{display:flex;gap:2px;flex-wrap:wrap}
.hist-blk{width:8px;height:14px;border-radius:2px;cursor:default;flex-shrink:0}
.hist-table-wrap{max-height:160px;overflow-y:auto}
.badge-red{background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700}
@media(max-width:640px){
  .page{padding:16px}
  .metrics-grid,.uptime-grid{grid-template-columns:1fr}
  .tab-content{max-height:none}
  .ellipsis{max-width:200px}
  .uptime-form{flex-direction:column}
  .form-field{min-width:unset;width:100%}
}
`;
