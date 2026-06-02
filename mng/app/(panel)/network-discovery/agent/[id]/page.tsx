import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = await queryOne<{ name: string }>("SELECT name FROM network_agents WHERE id=$1", [id]);
  return { title: a ? `${a.name} — Ajan Raporu` : "Ajan Raporu" };
}

type Sysinfo = {
  id: number; collected_at: string; hostname: string | null; ip_address: string | null;
  software: SoftwareItem[]; patches: PatchItem[]; active_users: unknown[];
  usb_devices: UsbItem[]; top_processes: ProcessItem[]; services: ServiceItem[];
  security_events: EventItem[]; net_io: NetIface[];
  local_users: LocalUser[]; open_ports: PortItem[]; shares: ShareItem[];
  arp_table: ArpEntry[]; domain_info: DomainInfo; hardware_info: HardwareInfo;
  antivirus: AvItem[]; bitlocker: BitlockerItem[]; printers: PrinterItem[];
  startup_items: StartupItem[]; scheduled_tasks: TaskItem[]; certificates: CertItem[];
  firewall_profiles: FirewallProfiles; routing_table: RouteEntry[];
};
type SoftwareItem   = { name: string; version?: string; publisher?: string; install_date?: string };
type PatchItem      = { kb: string; title?: string; installed_on?: string };
type UsbItem        = { name: string; type?: string; serial?: string };
type ProcessItem    = { name: string; pid?: number; cpu_percent?: number; ram_mb?: number };
type ServiceItem    = { name: string; display_name?: string; status: string; start_type?: string };
type EventItem      = { time: string; event_id?: number; type?: string; user?: string; source?: string; description?: string };
type NetIface       = { name: string; ip?: string; mac?: string; bytes_sent?: number; bytes_recv?: number };
type LocalUser      = { name: string; full_name?: string; enabled: boolean; last_logon?: string; groups?: string[] };
type PortItem       = { port: number; protocol: string; state: string; process?: string; pid?: number };
type ShareItem      = { name: string; path?: string; description?: string; permissions?: string };
type ArpEntry       = { ip: string; mac: string; type?: string; interface?: string };
type DomainInfo     = { name?: string; dc?: string; ou?: string; site?: string; forest?: string; joined?: boolean };
type HardwareInfo   = { cpu?: string; cpu_cores?: number; ram_gb?: number; bios_version?: string; bios_date?: string; manufacturer?: string; model?: string; serial?: string; disks?: DiskItem[] };
type DiskItem       = { drive: string; label?: string; total_gb?: number; free_gb?: number; fs?: string };
type AvItem         = { name: string; enabled?: boolean; real_time?: boolean; signatures_date?: string; version?: string };
type BitlockerItem  = { drive: string; status: string; protection?: string; method?: string };
type PrinterItem    = { name: string; driver?: string; port?: string; shared?: boolean; default?: boolean };
type StartupItem    = { name: string; command?: string; location?: string; enabled?: boolean };
type TaskItem       = { name: string; status?: string; next_run?: string; last_run?: string; last_result?: string; author?: string };
type CertItem       = { subject: string; issuer?: string; expires?: string; thumbprint?: string; store?: string; valid?: boolean };
type FirewallProfiles = { domain?: FwProfile; private?: FwProfile; public?: FwProfile };
type FwProfile      = { enabled?: boolean; default_inbound?: string; default_outbound?: string };
type RouteEntry     = { destination: string; prefix?: string; gateway?: string; interface?: string; metric?: number };

function fmtBytes(b?: number) {
  if (!b) return "—";
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("tr-TR"); } catch { return d; }
}
function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <details className="sec" open>
      <summary className="sec-sum">
        <span className="sec-title">{title}</span>
        {count !== undefined && <span className="sec-count">{count}</span>}
      </summary>
      <div className="sec-body">{children}</div>
    </details>
  );
}

function Empty() { return <div className="empty-row">Veri yok</div>; }

export default async function AgentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [agent, sysinfo, lastCmds, adSyncLogs] = await Promise.all([
    queryOne<{
      id: number; name: string; customer_id: number; company_name: string;
      last_seen: string | null; agent_version: string | null;
      wmi_user: string | null; snmp_communities: string | null;
      ad_sync_enabled: boolean;
    }>(
      `SELECT na.id, na.name, na.customer_id, c.company_name,
              na.last_seen, na.agent_version, na.wmi_user, na.snmp_communities, na.ad_sync_enabled
       FROM network_agents na JOIN customers c ON c.id=na.customer_id WHERE na.id=$1`, [id]
    ),
    queryOne<Sysinfo>(
      `SELECT id, collected_at, hostname, ip_address,
              software, patches, active_users, usb_devices, top_processes,
              services, security_events, net_io,
              local_users, open_ports, shares, arp_table,
              domain_info, hardware_info, antivirus, bitlocker,
              printers, startup_items, scheduled_tasks, certificates,
              firewall_profiles, routing_table
       FROM agent_sysinfo WHERE agent_id=$1 ORDER BY collected_at DESC LIMIT 1`, [id]
    ),
    query<{ command: string; status: string; result: string | null; executed_at: string | null; created_at: string }>(
      `SELECT command, status, result, executed_at, created_at
       FROM agent_commands WHERE agent_id=$1 ORDER BY created_at DESC LIMIT 10`, [id]
    ),
    query<{ synced_at: string; users_total: number; users_created: number; users_updated: number; status: string; message: string | null }>(
      `SELECT synced_at, users_total, users_created, users_updated, status, message
       FROM ad_sync_logs WHERE agent_id=$1 ORDER BY synced_at DESC LIMIT 5`, [id]
    ),
  ]);

  if (!agent) notFound();

  const online = !!agent.last_seen && (Date.now() - new Date(agent.last_seen).getTime()) < 10 * 60 * 1000;
  const hw = sysinfo?.hardware_info ?? {} as HardwareInfo;
  const dom = sysinfo?.domain_info ?? {} as DomainInfo;
  const fw = sysinfo?.firewall_profiles ?? {} as FirewallProfiles;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <Link href="/network-discovery" className="back">← Ağ Keşfi</Link>

        {/* Header */}
        <div className="header">
          <div>
            <div className="cust-name">{agent.company_name}</div>
            <h1 className="title">{agent.name}</h1>
            {sysinfo?.hostname && <div className="hostname">{sysinfo.hostname} {sysinfo.ip_address ? `· ${sysinfo.ip_address}` : ""}</div>}
          </div>
          <div className="header-right">
            <span className={`status-dot${online ? " on" : ""}`}>{online ? "● Çevrimiçi" : "● Çevrimdışı"}</span>
            {agent.last_seen && <span className="last-seen">Son görülme: {fmtDateTime(agent.last_seen)}</span>}
            {sysinfo && <span className="collected">Rapor: {fmtDateTime(sysinfo.collected_at)}</span>}
            {agent.agent_version && <span className="ver-chip">v{agent.agent_version}</span>}
          </div>
        </div>

        {!sysinfo ? (
          <div className="no-data">Bu ajan için henüz veri yok. <code>sysinfo_now</code> veya <code>deep_scan</code> komutu gönderin.</div>
        ) : (
          <>
            {/* Hardware + Domain overview */}
            <div className="overview-grid">
              {/* Hardware */}
              <div className="ov-card">
                <div className="ov-title">Donanım</div>
                {hw.manufacturer && <div className="ov-row"><span>Model</span><span>{hw.manufacturer} {hw.model}</span></div>}
                {hw.serial && <div className="ov-row"><span>Seri No</span><code>{hw.serial}</code></div>}
                {hw.cpu && <div className="ov-row"><span>CPU</span><span>{hw.cpu}{hw.cpu_cores ? ` (${hw.cpu_cores} çekirdek)` : ""}</span></div>}
                {hw.ram_gb && <div className="ov-row"><span>RAM</span><span>{hw.ram_gb} GB</span></div>}
                {hw.bios_version && <div className="ov-row"><span>BIOS</span><span>{hw.bios_version} {hw.bios_date ? `(${fmtDate(hw.bios_date)})` : ""}</span></div>}
                {hw.disks && hw.disks.length > 0 && hw.disks.map((d, i) => (
                  <div key={i} className="ov-row">
                    <span>Disk {d.drive}</span>
                    <span>
                      {d.total_gb ? `${d.total_gb} GB` : ""}
                      {d.free_gb != null ? ` · ${d.free_gb} GB boş` : ""}
                      {d.fs ? ` · ${d.fs}` : ""}
                      {d.label ? ` · ${d.label}` : ""}
                    </span>
                  </div>
                ))}
              </div>

              {/* Domain */}
              <div className="ov-card">
                <div className="ov-title">Domain / Ağ</div>
                <div className="ov-row"><span>Domain Üyesi</span><span className={dom.joined ? "c-green" : "c-dim"}>{dom.joined ? "Evet" : "Hayır"}</span></div>
                {dom.name && <div className="ov-row"><span>Domain</span><code>{dom.name}</code></div>}
                {dom.dc && <div className="ov-row"><span>DC</span><code>{dom.dc}</code></div>}
                {dom.forest && <div className="ov-row"><span>Forest</span><code>{dom.forest}</code></div>}
                {dom.site && <div className="ov-row"><span>Site</span><span>{dom.site}</span></div>}
                {dom.ou && <div className="ov-row"><span>OU</span><code className="text-xs">{dom.ou}</code></div>}
                <div className="ov-row"><span>AD Sync</span><span className={agent.ad_sync_enabled ? "c-green" : "c-dim"}>{agent.ad_sync_enabled ? "Aktif" : "Pasif"}</span></div>
              </div>

              {/* Security */}
              <div className="ov-card">
                <div className="ov-title">Güvenlik</div>
                {(sysinfo.antivirus ?? []).length > 0 ? sysinfo.antivirus.map((av, i) => (
                  <div key={i} className="ov-row">
                    <span>{av.name}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span className={av.enabled ? "chip-green" : "chip-red"}>{av.enabled ? "Aktif" : "Pasif"}</span>
                      {av.real_time && <span className="chip-green">RT</span>}
                    </div>
                  </div>
                )) : <div className="ov-row"><span>Antivirüs</span><span className="c-dim">Bulunamadı</span></div>}
                {(sysinfo.bitlocker ?? []).length > 0 && sysinfo.bitlocker.map((bl, i) => (
                  <div key={i} className="ov-row">
                    <span>BitLocker {bl.drive}</span>
                    <span className={bl.status === "FullyEncrypted" ? "c-green" : "c-warn"}>{bl.status}</span>
                  </div>
                ))}
                {fw.domain && <div className="ov-row"><span>FW Domain</span><span className={fw.domain.enabled ? "c-green" : "c-red"}>{fw.domain.enabled ? "Açık" : "Kapalı"}</span></div>}
                {fw.private && <div className="ov-row"><span>FW Private</span><span className={fw.private.enabled ? "c-green" : "c-red"}>{fw.private.enabled ? "Açık" : "Kapalı"}</span></div>}
                {fw.public && <div className="ov-row"><span>FW Public</span><span className={fw.public.enabled ? "c-green" : "c-red"}>{fw.public.enabled ? "Açık" : "Kapalı"}</span></div>}
              </div>

              {/* Active users */}
              <div className="ov-card">
                <div className="ov-title">Aktif Oturum</div>
                {(sysinfo.active_users ?? []).length === 0 ? <div className="c-dim text-sm">Oturum yok</div> :
                  (sysinfo.active_users as string[]).map((u, i) => (
                    <div key={i} className="ov-row"><span>Kullanıcı</span><code>{u}</code></div>
                  ))
                }
              </div>
            </div>

            {/* Network Interfaces */}
            <Section title="Ağ Arayüzleri" count={(sysinfo.net_io ?? []).length}>
              {(sysinfo.net_io ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>Arayüz</th><th>IP</th><th>MAC</th><th>Gönderildi</th><th>Alındı</th></tr></thead>
                  <tbody>
                    {sysinfo.net_io.map((n, i) => (
                      <tr key={i}>
                        <td>{n.name}</td><td><code>{n.ip ?? "—"}</code></td><td><code>{n.mac ?? "—"}</code></td>
                        <td>{fmtBytes(n.bytes_sent)}</td><td>{fmtBytes(n.bytes_recv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* ARP Table */}
            <Section title="ARP Tablosu" count={(sysinfo.arp_table ?? []).length}>
              {(sysinfo.arp_table ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>IP</th><th>MAC</th><th>Tür</th><th>Arayüz</th></tr></thead>
                  <tbody>
                    {sysinfo.arp_table.map((e, i) => (
                      <tr key={i}><td><code>{e.ip}</code></td><td><code>{e.mac}</code></td><td>{e.type ?? "—"}</td><td>{e.interface ?? "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Open Ports */}
            <Section title="Açık Portlar (Listening)" count={(sysinfo.open_ports ?? []).filter(p => p.state === "LISTEN" || p.state === "LISTENING").length}>
              {(sysinfo.open_ports ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>Port</th><th>Protokol</th><th>Durum</th><th>Süreç</th><th>PID</th></tr></thead>
                  <tbody>
                    {sysinfo.open_ports.filter(p => p.state?.toUpperCase().includes("LISTEN")).map((p, i) => (
                      <tr key={i}>
                        <td><strong>{p.port}</strong></td><td>{p.protocol}</td><td><span className="badge-listen">{p.state}</span></td>
                        <td>{p.process ?? "—"}</td><td className="c-dim">{p.pid ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Routing Table */}
            <Section title="Yönlendirme Tablosu" count={(sysinfo.routing_table ?? []).length}>
              {(sysinfo.routing_table ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>Hedef</th><th>Gateway</th><th>Arayüz</th><th>Metrik</th></tr></thead>
                  <tbody>
                    {sysinfo.routing_table.map((r, i) => (
                      <tr key={i}><td><code>{r.destination}{r.prefix ? `/${r.prefix}` : ""}</code></td><td><code>{r.gateway ?? "—"}</code></td><td>{r.interface ?? "—"}</td><td>{r.metric ?? "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Local Users */}
            <Section title="Yerel Kullanıcılar" count={(sysinfo.local_users ?? []).length}>
              {(sysinfo.local_users ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>Kullanıcı</th><th>Ad Soyad</th><th>Durum</th><th>Son Giriş</th><th>Gruplar</th></tr></thead>
                  <tbody>
                    {sysinfo.local_users.map((u, i) => (
                      <tr key={i}>
                        <td><code>{u.name}</code></td><td>{u.full_name ?? "—"}</td>
                        <td><span className={u.enabled ? "badge-ok" : "badge-off"}>{u.enabled ? "Aktif" : "Pasif"}</span></td>
                        <td>{fmtDate(u.last_logon)}</td>
                        <td className="c-dim text-xs">{u.groups?.join(", ") ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Services */}
            <Section title="Servisler" count={(sysinfo.services ?? []).length}>
              {(sysinfo.services ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>Servis Adı</th><th>Görünen Ad</th><th>Durum</th><th>Başlangıç</th></tr></thead>
                  <tbody>
                    {sysinfo.services.map((s, i) => (
                      <tr key={i}>
                        <td><code>{s.name}</code></td><td>{s.display_name ?? s.name}</td>
                        <td><span className={s.status === "Running" ? "badge-ok" : "badge-off"}>{s.status}</span></td>
                        <td className="c-dim">{s.start_type ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Top Processes */}
            <Section title="Süreçler (Top)" count={(sysinfo.top_processes ?? []).length}>
              {(sysinfo.top_processes ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>Süreç</th><th>PID</th><th>CPU %</th><th>RAM (MB)</th></tr></thead>
                  <tbody>
                    {sysinfo.top_processes.map((p, i) => (
                      <tr key={i}>
                        <td>{p.name}</td><td className="c-dim">{p.pid ?? "—"}</td>
                        <td>{p.cpu_percent != null ? `${p.cpu_percent.toFixed(1)}%` : "—"}</td>
                        <td>{p.ram_mb != null ? p.ram_mb.toFixed(0) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Software */}
            <Section title="Kurulu Yazılımlar" count={(sysinfo.software ?? []).length}>
              {(sysinfo.software ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>Uygulama</th><th>Sürüm</th><th>Yayıncı</th><th>Kurulum</th></tr></thead>
                  <tbody>
                    {sysinfo.software.map((s, i) => (
                      <tr key={i}><td>{s.name}</td><td className="c-dim">{s.version ?? "—"}</td><td className="c-dim">{s.publisher ?? "—"}</td><td className="c-dim">{fmtDate(s.install_date)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Patches */}
            <Section title="Windows Güncellemeleri" count={(sysinfo.patches ?? []).length}>
              {(sysinfo.patches ?? []).length === 0 ? <Empty /> : (
                <table className="tbl">
                  <thead><tr><th>KB</th><th>Başlık</th><th>Kurulum Tarihi</th></tr></thead>
                  <tbody>
                    {sysinfo.patches.map((p, i) => (
                      <tr key={i}><td><code>{p.kb}</code></td><td>{p.title ?? "—"}</td><td>{fmtDate(p.installed_on)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Shares */}
            {(sysinfo.shares ?? []).length > 0 && (
              <Section title="Ağ Paylaşımları" count={sysinfo.shares.length}>
                <table className="tbl">
                  <thead><tr><th>Paylaşım Adı</th><th>Yol</th><th>Açıklama</th><th>İzinler</th></tr></thead>
                  <tbody>
                    {sysinfo.shares.map((s, i) => (
                      <tr key={i}><td><strong>{s.name}</strong></td><td><code>{s.path ?? "—"}</code></td><td className="c-dim">{s.description ?? "—"}</td><td className="c-dim">{s.permissions ?? "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Startup Items */}
            {(sysinfo.startup_items ?? []).length > 0 && (
              <Section title="Başlangıç Öğeleri" count={sysinfo.startup_items.length}>
                <table className="tbl">
                  <thead><tr><th>Ad</th><th>Komut</th><th>Konum</th><th>Durum</th></tr></thead>
                  <tbody>
                    {sysinfo.startup_items.map((s, i) => (
                      <tr key={i}><td>{s.name}</td><td><code className="text-xs">{s.command ?? "—"}</code></td><td className="c-dim">{s.location ?? "—"}</td><td><span className={s.enabled !== false ? "badge-ok" : "badge-off"}>{s.enabled !== false ? "Aktif" : "Pasif"}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Scheduled Tasks */}
            {(sysinfo.scheduled_tasks ?? []).length > 0 && (
              <Section title="Zamanlanmış Görevler" count={sysinfo.scheduled_tasks.length}>
                <table className="tbl">
                  <thead><tr><th>Görev</th><th>Durum</th><th>Son Çalışma</th><th>Sonuç</th><th>Sonraki</th></tr></thead>
                  <tbody>
                    {sysinfo.scheduled_tasks.map((t, i) => (
                      <tr key={i}><td>{t.name}</td><td>{t.status ?? "—"}</td><td>{fmtDateTime(t.last_run)}</td><td className="c-dim">{t.last_result ?? "—"}</td><td>{fmtDateTime(t.next_run)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Printers */}
            {(sysinfo.printers ?? []).length > 0 && (
              <Section title="Yazıcılar" count={sysinfo.printers.length}>
                <table className="tbl">
                  <thead><tr><th>Yazıcı</th><th>Sürücü</th><th>Port</th><th>Paylaşımlı</th><th>Varsayılan</th></tr></thead>
                  <tbody>
                    {sysinfo.printers.map((p, i) => (
                      <tr key={i}><td>{p.name}</td><td className="c-dim">{p.driver ?? "—"}</td><td className="c-dim">{p.port ?? "—"}</td><td>{p.shared ? "✓" : "—"}</td><td>{p.default ? "✓" : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* USB */}
            {(sysinfo.usb_devices ?? []).length > 0 && (
              <Section title="USB Cihazlar" count={sysinfo.usb_devices.length}>
                <table className="tbl">
                  <thead><tr><th>Ad</th><th>Tür</th><th>Seri No</th></tr></thead>
                  <tbody>
                    {sysinfo.usb_devices.map((u, i) => (
                      <tr key={i}><td>{u.name}</td><td className="c-dim">{u.type ?? "—"}</td><td><code>{u.serial ?? "—"}</code></td></tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Certificates */}
            {(sysinfo.certificates ?? []).length > 0 && (
              <Section title="Sertifikalar" count={sysinfo.certificates.length}>
                <table className="tbl">
                  <thead><tr><th>Konu</th><th>Veren</th><th>Son.Tarihi</th><th>Depo</th><th>Durum</th></tr></thead>
                  <tbody>
                    {sysinfo.certificates.map((c, i) => (
                      <tr key={i}>
                        <td className="text-xs">{c.subject}</td><td className="c-dim text-xs">{c.issuer ?? "—"}</td>
                        <td className={c.expires && new Date(c.expires) < new Date() ? "c-red" : ""}>{fmtDate(c.expires)}</td>
                        <td className="c-dim">{c.store ?? "—"}</td>
                        <td><span className={c.valid !== false ? "badge-ok" : "badge-off"}>{c.valid !== false ? "Geçerli" : "Geçersiz"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Security Events */}
            {(sysinfo.security_events ?? []).length > 0 && (
              <Section title="Güvenlik Olayları" count={sysinfo.security_events.length}>
                <table className="tbl">
                  <thead><tr><th>Zaman</th><th>Olay ID</th><th>Tür</th><th>Kullanıcı</th><th>Kaynak</th><th>Açıklama</th></tr></thead>
                  <tbody>
                    {sysinfo.security_events.map((e, i) => (
                      <tr key={i}>
                        <td className="c-dim">{fmtDateTime(e.time)}</td>
                        <td><code>{e.event_id ?? "—"}</code></td><td>{e.type ?? "—"}</td>
                        <td>{e.user ?? "—"}</td><td className="c-dim">{e.source ?? "—"}</td>
                        <td className="c-dim text-xs">{e.description?.slice(0, 60) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}
          </>
        )}

        {/* AD Sync Logs */}
        {adSyncLogs.length > 0 && (
          <Section title="AD Sync Geçmişi" count={adSyncLogs.length}>
            <table className="tbl">
              <thead><tr><th>Tarih</th><th>Durum</th><th>Toplam</th><th>Yeni</th><th>Güncellendi</th><th>Not</th></tr></thead>
              <tbody>
                {adSyncLogs.map((l, i) => (
                  <tr key={i}>
                    <td>{fmtDateTime(l.synced_at)}</td>
                    <td><span className={l.status === "ok" ? "badge-ok" : "badge-off"}>{l.status}</span></td>
                    <td>{l.users_total}</td><td>{l.users_created}</td><td>{l.users_updated}</td>
                    <td className="c-dim text-xs">{l.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Recent Commands */}
        {lastCmds.length > 0 && (
          <Section title="Son Komutlar">
            <table className="tbl">
              <thead><tr><th>Komut</th><th>Durum</th><th>Gönderildi</th><th>Çalıştırıldı</th><th>Sonuç</th></tr></thead>
              <tbody>
                {lastCmds.map((c, i) => (
                  <tr key={i}>
                    <td><code>{c.command}</code></td>
                    <td><span className={`cmd-${c.status}`}>{c.status}</span></td>
                    <td className="c-dim">{fmtDateTime(c.created_at)}</td>
                    <td className="c-dim">{fmtDateTime(c.executed_at)}</td>
                    <td className="c-dim text-xs">{c.result?.slice(0, 60) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}
      </div>
    </>
  );
}

const css = `
.page{padding:28px;display:flex;flex-direction:column;gap:16px;max-width:1200px}
@media(max-width:640px){.page{padding:16px;gap:12px}}
.back{font-size:13px;color:var(--text-dim)}
.back:hover{color:var(--text-muted)}
.header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:4px}
.cust-name{font-size:12px;font-weight:700;color:var(--text-ghost);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin:0 0 4px}
.hostname{font-size:13px;color:var(--text-dim);font-family:monospace}
.header-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.status-dot{font-size:12px;font-weight:700;color:#94a3b8}
.status-dot.on{color:#22c55e}
.last-seen,.collected{font-size:11px;color:var(--text-ghost)}
.ver-chip{font-size:10px;font-weight:700;color:#3b82f6;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);padding:2px 7px;border-radius:4px}
.no-data{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:40px;text-align:center;color:var(--text-ghost);font-size:14px}
.no-data code{background:var(--input-bg);padding:2px 6px;border-radius:4px;font-size:13px}
/* Overview grid */
.overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.ov-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}
.ov-title{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px}
.ov-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:4px 0;border-bottom:1px solid var(--row-border);font-size:12px}
.ov-row:last-child{border-bottom:none}
.ov-row>span:first-child{color:var(--text-ghost);flex-shrink:0}
.ov-row>span:last-child,.ov-row>code{color:var(--text-sub);font-size:11px;text-align:right;word-break:break-all}
/* Sections */
.sec{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.sec-sum{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--card);user-select:none}
.sec-sum::-webkit-details-marker{display:none}
.sec-sum:hover{background:var(--row-hover)}
.sec-title{font-size:12px;font-weight:700;color:var(--text-sub);flex:1}
.sec-count{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:var(--input-bg);border:1px solid var(--border2);color:var(--text-dim)}
.sec-body{border-top:1px solid var(--divider);overflow-x:auto}
.empty-row{padding:16px;font-size:13px;color:var(--text-ghost);text-align:center}
/* Table */
.tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:500px}
.tbl th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--divider);white-space:nowrap;background:var(--input-bg)}
.tbl td{padding:8px 12px;border-bottom:1px solid var(--row-border);vertical-align:middle;color:var(--text-sub)}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:var(--row-hover)}
/* Badges & colors */
.badge-ok{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;color:#22c55e;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25)}
.badge-off{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;color:#64748b;background:rgba(100,116,139,.1);border:1px solid rgba(100,116,139,.2)}
.badge-listen{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;color:#f59e0b;background:rgba(245,158,11,.1)}
.chip-green{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;color:#22c55e;background:rgba(34,197,94,.1)}
.chip-red{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;color:#ef4444;background:rgba(239,68,68,.1)}
.c-green{color:#22c55e;font-weight:600}
.c-red{color:#ef4444;font-weight:600}
.c-warn{color:#f59e0b;font-weight:600}
.c-dim{color:var(--text-ghost)}
.text-xs{font-size:11px}
code{font-family:monospace;font-size:11px}
.cmd-pending{font-size:10px;font-weight:700;color:#94a3b8;background:rgba(148,163,184,.1);padding:2px 6px;border-radius:4px}
.cmd-running{font-size:10px;font-weight:700;color:#3b82f6;background:rgba(59,130,246,.1);padding:2px 6px;border-radius:4px}
.cmd-done{font-size:10px;font-weight:700;color:#22c55e;background:rgba(34,197,94,.1);padding:2px 6px;border-radius:4px}
.cmd-error{font-size:10px;font-weight:700;color:#ef4444;background:rgba(239,68,68,.1);padding:2px 6px;border-radius:4px}
`;
