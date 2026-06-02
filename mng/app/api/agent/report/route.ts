import "server-only";
import { query, queryOne } from "@/lib/db";

type HostPayload = {
  ip: string;
  mac?: string | null;
  hostname?: string | null;
  vendor?: string | null;
  os_name?: string | null;
  os_version?: string | null;
  device_type?: string | null;
  domain?: string | null;
  logged_user?: string | null;
  connection_type?: string | null;
  serial_number?: string | null;
  model?: string | null;
};

export async function POST(req: Request) {
  let body: {
    token: string;
    scan_time: string;
    subnet: string;
    hosts: HostPayload[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  if (!body.token || !Array.isArray(body.hosts)) {
    return new Response("Bad Request", { status: 400 });
  }

  const agent = await queryOne<{ id: number; customer_id: number }>(
    "SELECT id, customer_id FROM network_agents WHERE token=$1",
    [body.token]
  );
  if (!agent) return new Response("Unauthorized", { status: 401 });

  await query("UPDATE network_agents SET last_seen=now() WHERE id=$1", [agent.id]);

  let newCount = 0;
  let updatedCount = 0;

  for (const host of body.hosts) {
    if (!host.ip) continue;
    const mac = host.mac?.toLowerCase() ?? null;

    const deviceType = host.device_type || inferDeviceType(host.hostname, host.vendor, mac);
    const connType   = host.connection_type || inferConnectionType(host.vendor, mac);

    const existing = mac
      ? await queryOne<{ id: number }>(
          "SELECT id FROM discovered_devices WHERE customer_id=$1 AND mac_address=$2",
          [agent.customer_id, mac]
        )
      : await queryOne<{ id: number }>(
          "SELECT id FROM discovered_devices WHERE customer_id=$1 AND ip_address=$2 AND mac_address IS NULL",
          [agent.customer_id, host.ip]
        );

    if (existing) {
      await query(
        `UPDATE discovered_devices
         SET ip_address=$1, hostname=$2, vendor=$3, os_name=$4,
             device_type=$5, domain_name=$6, logged_user=$7, connection_type=$8,
             subnet=$9, agent_id=$10, last_seen=now(),
             serial_number=COALESCE($11, serial_number),
             model=COALESCE($12, model),
             os_version=COALESCE($13, os_version)
         WHERE id=$14`,
        [
          host.ip, host.hostname ?? null, host.vendor ?? null, host.os_name ?? null,
          deviceType, host.domain ?? null, host.logged_user ?? null, connType,
          body.subnet, agent.id,
          host.serial_number ?? null, host.model ?? null, host.os_version ?? null,
          existing.id,
        ]
      );
      updatedCount++;
    } else {
      await query(
        `INSERT INTO discovered_devices
           (customer_id, agent_id, ip_address, mac_address, hostname, vendor,
            os_name, os_version, device_type, domain_name, logged_user, connection_type,
            subnet, serial_number, model, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending')`,
        [
          agent.customer_id, agent.id, host.ip, mac,
          host.hostname ?? null, host.vendor ?? null,
          host.os_name ?? null, host.os_version ?? null, deviceType,
          host.domain ?? null, host.logged_user ?? null, connType,
          body.subnet, host.serial_number ?? null, host.model ?? null,
        ]
      );
      newCount++;
    }
  }

  console.log(`[agent/report] customer=${agent.customer_id} total=${body.hosts.length} new=${newCount} updated=${updatedCount}`);
  return Response.json({ ok: true, new: newCount, updated: updatedCount });
}

function inferDeviceType(hostname: string | null | undefined, vendor: string | null | undefined, mac: string | null | undefined): string {
  const h = (hostname ?? "").toLowerCase();
  const v = (vendor ?? "").toLowerCase();
  const m = (mac ?? "").toLowerCase();

  if (m.startsWith("00:50:56") || m.startsWith("00:0c:29") || m.startsWith("00:05:69")) {
    if (/srv|server|dc|backup|file|rds|nas/.test(h)) return "server";
    return "vm";
  }
  if (/srv|server|-dc|dc-|nas|backup|veam|qlik|rds|filesrv/.test(h) && !/pc-|-pc-|laptop/.test(h)) return "server";
  if (/laptop|nb-|-nb|notebook/.test(h)) return "laptop";
  if (/-pc-|pc-|ws-|-ws-|desktop/.test(h)) return "desktop";
  if (/epson|npi[0-9a-f]|hpa[0-9]|npie|printer|brother|xerox|canon|ricoh/.test(h)) return "printer";
  if (/router|gw-|-gw|gateway|firewall|fw-/.test(h)) return "router";
  if (/sw-|switch|-sw/.test(h)) return "switch";
  if (/epson|hewlett|brother|xerox|canon|ricoh|kyocera|konica/.test(v)) return "printer";
  if (/cisco|juniper|mikrotik|ubiquiti|palo|fortinet|sonicwall/.test(v)) return "router";
  if (/aruba|meraki|ruckus/.test(v)) return "access_point";
  if (/vmware/.test(v)) return "vm";
  return "unknown";
}

function inferConnectionType(vendor: string | null | undefined, mac: string | null | undefined): string {
  const v = (vendor ?? "").toLowerCase();
  if (/wireless|wifi|wi-fi|wlan|atheros|qualcomm atheros|intel wire|realtek wire|broadcom wire/.test(v)) return "wifi";
  if (mac) {
    const b = parseInt(mac.split(":")[0] ?? "0", 16);
    if (!isNaN(b) && (b & 0x02)) return "virtual";
  }
  return "unknown";
}
