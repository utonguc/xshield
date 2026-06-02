import "server-only";
import { query, queryOne } from "@/lib/db";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  const token = body.token as string;
  if (!token) return new Response("Bad Request", { status: 400 });

  const agent = await queryOne<{ id: number; customer_id: number }>(
    "SELECT id, customer_id FROM network_agents WHERE token=$1", [token]
  );
  if (!agent) return new Response("Unauthorized", { status: 401 });

  await query(
    `DELETE FROM agent_sysinfo WHERE id IN (
       SELECT id FROM agent_sysinfo WHERE agent_id=$1
       ORDER BY collected_at DESC OFFSET 9
     )`,
    [agent.id]
  );

  const j = (k: string, fallback: unknown = []) => JSON.stringify(body[k] ?? fallback);

  await query(
    `INSERT INTO agent_sysinfo (
       customer_id, agent_id, hostname, ip_address,
       software, patches, active_users, usb_devices,
       top_processes, services, security_events, net_io,
       local_users, open_ports, shares, arp_table,
       domain_info, hardware_info, antivirus, bitlocker,
       printers, startup_items, scheduled_tasks, certificates,
       firewall_profiles, routing_table, environment_vars
     ) VALUES (
       $1,$2,$3,$4,
       $5,$6,$7,$8,
       $9,$10,$11,$12,
       $13,$14,$15,$16,
       $17,$18,$19,$20,
       $21,$22,$23,$24,
       $25,$26,$27
     )`,
    [
      agent.customer_id, agent.id,
      body.hostname ?? null, body.ip_address ?? null,
      j("software"), j("patches"), j("active_users"), j("usb_devices"),
      j("top_processes"), j("services"), j("security_events"), j("net_io"),
      j("local_users"), j("open_ports"), j("shares"), j("arp_table"),
      j("domain_info", {}), j("hardware_info", {}), j("antivirus"), j("bitlocker"),
      j("printers"), j("startup_items"), j("scheduled_tasks"), j("certificates"),
      j("firewall_profiles", {}), j("routing_table"), j("environment_vars", {}),
    ]
  );

  await query("UPDATE network_agents SET last_seen=now() WHERE id=$1", [agent.id]);

  console.log(`[agent/sysinfo] agent=${agent.id} sw=${(body.software as unknown[])?.length ?? 0} ports=${(body.open_ports as unknown[])?.length ?? 0} arp=${(body.arp_table as unknown[])?.length ?? 0}`);
  return new Response("OK");
}
