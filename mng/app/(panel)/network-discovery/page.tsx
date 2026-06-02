import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import crypto from "crypto";
import { FilterSelect } from "@/components/FilterSelect";
import { DiscoveryTable, type DiscoveredDevice } from "./DiscoveryTable";
import { AgentControls } from "./AgentControls";
import Link from "next/link";

export const metadata: Metadata = { title: "Ağ Keşfi — xShield MNG" };
export const dynamic = "force-dynamic";

const LATEST_AGENT_VERSION = "2.0.0";

async function createAgent(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const customer_id = fd.get("customer_id");
  const name = (fd.get("name") as string)?.trim() || "Ajan";
  const subnets = (fd.get("subnets") as string)?.trim() || "";
  if (!customer_id) return;
  const exists = await queryOne<{ id: number }>(
    "SELECT id FROM network_agents WHERE customer_id=$1 LIMIT 1",
    [customer_id]
  );
  if (exists) {
    redirect(`/network-discovery?_toast=${encodeURIComponent("Bu müşterinin zaten bir ajanı var")}&_tt=warn`);
  }
  const token = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO network_agents (customer_id, name, token, subnets) VALUES ($1,$2,$3,$4)",
    [customer_id, name, token, subnets || null]
  );
  redirect(`/network-discovery?_toast=${encodeURIComponent("Ajan oluşturuldu — scripti indirip kurun")}&_tt=success`);
}

async function deleteAgent(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  await query("DELETE FROM network_agents WHERE id=$1", [fd.get("id")]);
  redirect(`/network-discovery?_toast=${encodeURIComponent("Ajan silindi")}&_tt=info`);
}

async function updateSubnets(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = fd.get("id");
  const subnets = (fd.get("subnets") as string)?.trim() || "";
  await query("UPDATE network_agents SET subnets=$1 WHERE id=$2", [subnets || null, id]);
  redirect(`/network-discovery?_toast=${encodeURIComponent("Alt ağlar güncellendi")}&_tt=success`);
}

async function updateCredentials(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = fd.get("id");
  const wmi_user = (fd.get("wmi_user") as string)?.trim() || null;
  const wmi_pass = (fd.get("wmi_pass") as string)?.trim() || null;
  const snmp = (fd.get("snmp_communities") as string)?.trim() || "public";
  await query(
    "UPDATE network_agents SET wmi_user=$1, wmi_pass=$2, snmp_communities=$3 WHERE id=$4",
    [wmi_user, wmi_pass, snmp, id]
  );
  redirect(`/network-discovery?_toast=${encodeURIComponent("Kimlik bilgileri güncellendi")}&_tt=success`);
}

const DEVICE_COLS = `
  dd.id, dd.customer_id, c.company_name, dd.ip_address, dd.mac_address,
  dd.hostname, dd.vendor, dd.device_type, dd.os_name, dd.os_version,
  dd.domain_name, dd.logged_user, dd.connection_type, dd.subnet,
  dd.serial_number, dd.model, dd.first_seen, dd.last_seen, dd.inventory_item_id
`;

export default async function NetworkDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const customerFilter = customer ? "AND dd.customer_id=$1" : "";
  const customerParam = customer ? [Number(customer)] : [];

  const [customers, agents, pendingDevices, lastCommands] = await Promise.all([
    query<{ id: number; company_name: string }>(
      "SELECT id, company_name FROM customers WHERE status='active' ORDER BY company_name"
    ),
    query<{
      id: number; customer_id: number; company_name: string; name: string;
      token: string; subnets: string | null; last_seen: string | null;
      agent_version: string | null; wmi_user: string | null;
      snmp_communities: string | null; created_at: string;
    }>(
      `SELECT na.*, c.company_name
       FROM network_agents na
       JOIN customers c ON c.id = na.customer_id
       ${customer ? "WHERE na.customer_id=$1" : ""}
       ORDER BY c.company_name`,
      customer ? [Number(customer)] : []
    ),
    query<DiscoveredDevice>(
      `SELECT ${DEVICE_COLS}
       FROM discovered_devices dd
       JOIN customers c ON c.id = dd.customer_id
       WHERE dd.status = 'pending' ${customerFilter}
       ORDER BY dd.last_seen DESC`,
      customerParam
    ),
    query<{ agent_id: number; command: string; status: string; result: string | null; executed_at: string | null; created_at: string }>(
      `SELECT DISTINCT ON (agent_id) agent_id, command, status, result, executed_at, created_at
       FROM agent_commands
       ORDER BY agent_id, created_at DESC`
    ),
  ]);

  const agentCustomerIds = new Set(agents.map((a) => a.customer_id));
  const customersWithoutAgent = customers.filter((c) => !agentCustomerIds.has(c.id));
  const lastCmdByAgent = new Map(lastCommands.map((c) => [c.agent_id, c]));

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="title">Ağ Keşfi</h1>
            <p className="subtitle">
              {agents.length} ajan · {pendingDevices.length} bekleyen cihaz
            </p>
          </div>
          <FilterSelect
            basePath="/network-discovery"
            options={customers.map((c) => ({ value: c.id, label: c.company_name }))}
            current={customer}
          />
        </div>

        {/* ── Ajanlar ── */}
        <div className="section">
          <div className="sec-header">
            <div className="sec-title">Müşteri Ajanları</div>
            {customersWithoutAgent.length > 0 && (
              <details className="add-wrap">
                <summary className="btn-add">+ Ajan Ekle</summary>
                <form action={createAgent} className="add-form">
                  <div className="add-row">
                    <div className="field">
                      <label>Müşteri *</label>
                      <select name="customer_id" required>
                        <option value="">— Seçin —</option>
                        {customersWithoutAgent.map((c) => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Ajan Adı</label>
                      <input name="name" type="text" defaultValue="Ajan" />
                    </div>
                    <div className="field field-wide">
                      <label>Alt Ağlar (virgülle ayırın)</label>
                      <input name="subnets" type="text" placeholder="192.168.1.0/24, 10.0.0.0/24" />
                    </div>
                    <button type="submit" className="btn-save">Oluştur &amp; Token Al</button>
                  </div>
                </form>
              </details>
            )}
          </div>

          {agents.length === 0 ? (
            <div className="empty-sm">Henüz ajan yok — müşteri ekleyin ve scripti kurun.</div>
          ) : (
            <div className="agent-grid">
              {agents.map((a) => {
                const online = !!a.last_seen && (Date.now() - new Date(a.last_seen).getTime()) < 10 * 60 * 1000;
                return (
                  <div key={a.id} className="agent-card">
                    <div className="agent-top">
                      <div>
                        <div className="agent-cust">{a.company_name}</div>
                        <div className="agent-name">{a.name}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <div className={`agent-status ${online ? "online" : "offline"}`}>
                          {online ? "● Çevrimiçi" : a.last_seen
                            ? "● Son: " + new Date(a.last_seen).toLocaleString("tr-TR")
                            : "● Bağlanmadı"}
                        </div>
                        {a.agent_version ? (
                          <div className={`ver-badge ${a.agent_version === LATEST_AGENT_VERSION ? "ver-ok" : "ver-old"}`}>
                            v{a.agent_version}
                            {a.agent_version !== LATEST_AGENT_VERSION && " ↑ Güncelleme var"}
                          </div>
                        ) : (
                          <div className="ver-badge ver-unknown">sürüm bilinmiyor</div>
                        )}
                      </div>
                    </div>

                    <div className="token-box">
                      <span className="token-label">Token</span>
                      <code className="token-val">{a.token.slice(0, 16)}…</code>
                      <a href={`/api/agent/download?id=${a.id}`} className="btn-dl" title="Batch kurulum scripti — Yönetici olarak çalıştır">↓ .bat</a>
                      <a href="/api/agent/msi" className="btn-dl" title="Genel MSI">↓ .msi</a>
                    </div>

                    <form action={updateSubnets} className="subnet-form">
                      <input type="hidden" name="id" value={a.id} />
                      <input
                        name="subnets"
                        type="text"
                        defaultValue={a.subnets ?? ""}
                        placeholder="192.168.1.0/24, 10.0.0.0/24"
                        className="subnet-input"
                      />
                      <button type="submit" className="btn-subnet">Kaydet</button>
                    </form>

                    <details className="cred-wrap">
                      <summary className="cred-summary">🔑 WMI / SNMP Kimlik Bilgileri</summary>
                      <form action={updateCredentials} className="cred-form">
                        <input type="hidden" name="id" value={a.id} />
                        <div className="cred-row">
                          <div className="cred-field">
                            <label>WMI Kullanıcı</label>
                            <input name="wmi_user" type="text" defaultValue={a.wmi_user ?? ""} placeholder="DOMAIN\Admin" />
                          </div>
                          <div className="cred-field">
                            <label>WMI Şifre</label>
                            <input name="wmi_pass" type="password" defaultValue="" placeholder="••••••••" />
                          </div>
                          <div className="cred-field cred-wide">
                            <label>SNMP Community Strings</label>
                            <input name="snmp_communities" type="text" defaultValue={a.snmp_communities ?? "public"} placeholder="public, private" />
                          </div>
                          <button type="submit" className="btn-cred-save">Kaydet</button>
                        </div>
                        {a.wmi_user && <div className="cred-status">✓ WMI: {a.wmi_user}</div>}
                      </form>
                    </details>

                    <AgentControls agentId={a.id} lastCommand={lastCmdByAgent.get(a.id)} />

                    <div className="agent-footer">
                      <Link href={`/network-discovery/agent/${a.id}`} className="btn-report">📊 Ajan Raporu</Link>
                      <form action={deleteAgent} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className="btn-danger-sm">Ajanı Sil</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Bekleyen Cihazlar ── */}
        <div className="section">
          <div className="sec-header">
            <div className="sec-title">Keşfedilen — Bekleyenler</div>
            <span className="hint-text">Seçili cihazları envantere tek seferde ekleyebilirsiniz</span>
          </div>
          <DiscoveryTable devices={pendingDevices} status="pending" />
        </div>


      </div>
    </>
  );
}

const css = `
.page{padding:28px;display:flex;flex-direction:column;gap:20px;max-width:1400px}
.page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin:0 0 2px}
.subtitle{font-size:13px;color:var(--text-dim);margin:0}
.section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:22px}
.sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap}
.sec-title{font-size:12px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.08em}
.hint-text{font-size:12px;color:var(--text-ghost)}
.empty-sm{font-size:13px;color:var(--text-ghost);padding:6px 0}
/* Agent cards */
.agent-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.agent-card{background:var(--input-bg);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px}
.agent-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.agent-cust{font-size:14px;font-weight:700;color:var(--text)}
.agent-name{font-size:12px;color:var(--text-dim);margin-top:2px}
.agent-status{font-size:11px;font-weight:600;white-space:nowrap}
.agent-status.online{color:#22c55e}
.agent-status.offline{color:#94a3b8}
.ver-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap}
.ver-ok{background:rgba(34,197,94,0.1);color:#16a34a}
.ver-old{background:rgba(245,158,11,0.12);color:#d97706}
.ver-unknown{background:rgba(148,163,184,0.1);color:#94a3b8}
.token-box{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:7px;padding:7px 10px}
.token-label{font-size:10px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.06em;flex-shrink:0}
.token-val{font-family:monospace;font-size:11px;color:var(--text-dim);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn-dl{font-size:11px;color:#3b82f6;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600;text-decoration:none;white-space:nowrap;flex-shrink:0}
.subnet-form{display:flex;gap:6px}
.subnet-input{flex:1;background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:7px 10px;color:var(--text);font-size:12px;outline:none;font-family:monospace}
.subnet-input:focus{border-color:#3b82f6}
.btn-subnet{background:var(--card);border:1px solid var(--input-border);border-radius:7px;padding:7px 12px;font-size:12px;font-weight:600;color:var(--text-dim);cursor:pointer}
.agent-footer{display:flex;justify-content:space-between;align-items:center;gap:8px}
.btn-report{font-size:11px;color:#6366f1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);padding:4px 10px;border-radius:6px;font-weight:600;text-decoration:none}
.btn-report:hover{background:rgba(99,102,241,.15)}
/* Add form */
.add-wrap{border:1px solid var(--border);border-radius:8px;overflow:hidden}
summary.btn-add{padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;color:#3b82f6;list-style:none;display:inline-block}
summary.btn-add::-webkit-details-marker{display:none}
.add-form{padding:16px;border-top:1px solid var(--divider);background:var(--input-bg)}
.add-row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select{background:var(--card);border:1px solid var(--input-border);border-radius:8px;padding:8px 10px;color:var(--text);outline:none;font-size:13px}
.field-wide{flex:1;min-width:200px}
.btn-save{align-self:flex-end;background:#2563eb;color:#fff;border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.btn-danger-sm{font-size:11px;color:#ef4444;background:transparent;border:1px solid rgba(239,68,68,0.25);padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600}
/* Credential form */
.cred-wrap{border:1px solid var(--border);border-radius:7px;overflow:hidden}
.cred-summary{padding:6px 10px;cursor:pointer;font-size:11px;font-weight:600;color:var(--text-dim);list-style:none;display:flex;align-items:center;gap:5px}
.cred-summary::-webkit-details-marker{display:none}
.cred-form{padding:10px;border-top:1px solid var(--divider);background:var(--input-bg)}
.cred-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
.cred-field{display:flex;flex-direction:column;gap:3px}
.cred-field label{font-size:10px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:0.06em}
.cred-field input{background:var(--card);border:1px solid var(--input-border);border-radius:6px;padding:5px 8px;color:var(--text);font-size:12px;outline:none;min-width:120px}
.cred-wide{flex:1;min-width:160px}
.btn-cred-save{background:#2563eb;color:#fff;border:none;padding:6px 12px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;align-self:flex-end}
.cred-status{font-size:10px;color:#16a34a;margin-top:6px}
/* Agent controls */
.agent-controls{display:flex;flex-direction:column;gap:7px;padding-top:4px;border-top:1px solid var(--divider)}
.ctrl-btns{display:flex;gap:6px;flex-wrap:wrap}
.btn-ctrl{font-size:11px;font-weight:600;color:var(--text-dim);background:var(--card);border:1px solid var(--input-border);padding:5px 11px;border-radius:7px;cursor:pointer;white-space:nowrap}
.btn-ctrl:hover{border-color:#3b82f6;color:#3b82f6}
.btn-ctrl:disabled{opacity:0.4;cursor:not-allowed}
.btn-ctrl-warn{font-size:11px;font-weight:600;color:#f59e0b;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);padding:5px 11px;border-radius:7px;cursor:pointer;white-space:nowrap}
.btn-ctrl-warn:hover{background:rgba(245,158,11,0.15)}
.btn-ctrl-warn:disabled{opacity:0.4;cursor:not-allowed}
.btn-ctrl-danger{font-size:11px;font-weight:600;color:#ef4444;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);padding:5px 11px;border-radius:7px;cursor:pointer;white-space:nowrap}
.btn-ctrl-danger:hover{background:rgba(239,68,68,0.12)}
.btn-ctrl-danger:disabled{opacity:0.4;cursor:not-allowed}
.ctrl-flash{font-size:11px;color:var(--text-dim);padding:4px 8px;background:var(--input-bg);border-radius:5px}
.ctrl-flash-err{color:#dc2626;background:rgba(239,68,68,0.08)}
.last-cmd{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.cmd-status{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px}
.cs-pending{background:rgba(148,163,184,0.15);color:#94a3b8}
.cs-running{background:rgba(59,130,246,0.12);color:#3b82f6}
.cs-done{background:rgba(34,197,94,0.12);color:#16a34a}
.cs-error{background:rgba(239,68,68,0.1);color:#dc2626}
.cmd-name{font-size:11px;color:var(--text-dim)}
.cmd-time{font-size:10px;color:var(--text-ghost)}
.cmd-result{font-size:10px;color:var(--text-ghost);font-style:italic}
/* Discovery Table */
.tbl-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.tbl-sel-group{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sel-all{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text-dim);cursor:pointer;user-select:none}
.sel-all input{accent-color:#3b82f6}
.btn-approve{background:#2563eb;color:#fff;border:none;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.btn-approve:disabled{opacity:0.5;cursor:not-allowed}
.btn-del-sel{background:transparent;color:#ef4444;border:1px solid rgba(239,68,68,0.3);padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.btn-del-sel:disabled{opacity:0.5;cursor:not-allowed}
/* Column picker */
.col-picker{position:relative}
.col-picker summary{list-style:none;cursor:pointer;background:var(--input-bg);border:1px solid var(--border2);border-radius:7px;padding:6px 12px;font-size:11px;font-weight:700;color:var(--text-dim);white-space:nowrap;display:inline-flex;align-items:center}
.col-picker summary::-webkit-details-marker{display:none}
.col-picker summary:hover{color:var(--text)}
.col-picker-panel{position:absolute;right:0;top:calc(100% + 4px);z-index:100;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;box-shadow:0 8px 24px rgba(0,0,0,0.25);min-width:280px}
.col-check{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer;padding:4px 2px;white-space:nowrap}
.col-check input{accent-color:#3b82f6;cursor:pointer}
/* Sort */
.th-sort{cursor:pointer!important;user-select:none;white-space:nowrap}
.th-sort:hover{color:var(--text)!important;background:rgba(59,130,246,0.05)!important}
.sort-icon{color:var(--text-ghost);font-size:9px;margin-left:3px;opacity:0.7}
/* Table */
.tbl-wrap{overflow-x:auto;border-radius:10px;border:1px solid var(--border)}
.table{width:100%;border-collapse:collapse}
.table th{padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--divider);white-space:nowrap;background:var(--card)}
.table td{padding:10px 12px;border-bottom:1px solid var(--row-border);font-size:13px;color:var(--text-sub);vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:var(--row-hover)}
.table tr.row-selected td{background:rgba(59,130,246,0.07)}
.bold{font-weight:700;color:var(--text)}
.dim{color:var(--text-dim)}
.small{font-size:11px}
.mono{font-family:monospace;font-size:12px}
.nowrap{white-space:nowrap}
.type-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--text-dim)}
.conn-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-dim)}
.btn-link{font-size:11px;color:#3b82f6;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);padding:4px 10px;border-radius:6px;font-weight:600;text-decoration:none;white-space:nowrap}
.btn-del-row{background:transparent;color:#94a3b8;border:none;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:13px;line-height:1}
.btn-del-row:hover{color:#ef4444;background:rgba(239,68,68,0.1)}
.btn-del-row:disabled{opacity:0.4;cursor:not-allowed}
.inline-msg{display:inline-block;padding:6px 14px;border-radius:7px;font-size:12px;font-weight:600;margin-bottom:10px}
.inline-ok{background:rgba(34,197,94,0.12);color:#16a34a;border:1px solid rgba(34,197,94,0.25)}
.inline-err{background:rgba(239,68,68,0.1);color:#dc2626;border:1px solid rgba(239,68,68,0.2)}
/* Footer / pagination */
.tbl-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 4px 4px}
.tbl-total{font-size:12px;color:var(--text-dim);white-space:nowrap}
.tbl-total strong{color:var(--text)}
.pager{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.pager-btn{padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid var(--border2);color:var(--text-dim);background:var(--input-bg);cursor:pointer;min-width:32px;white-space:nowrap}
.pager-btn:hover:not(:disabled){color:var(--text);background:var(--row-hover)}
.pager-btn:disabled{opacity:0.35;cursor:not-allowed}
.pager-active{background:rgba(59,130,246,0.15)!important;color:#3b82f6!important;border-color:rgba(59,130,246,0.4)!important}
.pager-ellipsis{padding:5px 4px;font-size:12px;color:var(--text-ghost)}
.page-size-group{display:flex;align-items:center;gap:4px}
.page-size-label{font-size:11px;color:var(--text-ghost);white-space:nowrap;margin-right:2px}
.page-size-btn{padding:4px 8px;border-radius:5px;font-size:11px;font-weight:600;border:1px solid var(--border2);color:var(--text-dim);background:var(--input-bg);cursor:pointer}
.page-size-btn:hover{color:var(--text)}
.page-size-active{background:rgba(59,130,246,0.12)!important;color:#3b82f6!important;border-color:rgba(59,130,246,0.3)!important}
@media(max-width:640px){.page{padding:16px}.agent-grid{grid-template-columns:1fr}.tbl-footer{flex-direction:column;align-items:flex-start}}
`;
