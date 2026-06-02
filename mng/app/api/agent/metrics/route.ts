import "server-only";
import { query, queryOne } from "@/lib/db";

export async function POST(req: Request) {
  let body: {
    token: string;
    hostname: string;
    ip_address?: string;
    cpu_percent: number;
    ram_percent: number;
    ram_total_gb: number;
    disk_percent: number;
    disk_total_gb: number;
    uptime_hours: number;
    platform: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!body.token || !body.hostname) {
    return new Response("Bad Request", { status: 400 });
  }

  const agent = await queryOne<{ id: number; customer_id: number }>(
    "SELECT id, customer_id FROM network_agents WHERE token=$1",
    [body.token]
  );
  if (!agent) return new Response("Unauthorized", { status: 401 });

  await query("UPDATE network_agents SET last_seen=now() WHERE id=$1", [agent.id]);

  await query(
    `INSERT INTO device_metrics
       (customer_id, agent_id, hostname, ip_address, cpu_percent, ram_percent,
        ram_total_gb, disk_percent, disk_total_gb, uptime_hours, platform)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [agent.customer_id, agent.id, body.hostname, body.ip_address ?? null,
     body.cpu_percent, body.ram_percent, body.ram_total_gb,
     body.disk_percent, body.disk_total_gb, body.uptime_hours, body.platform]
  );

  return Response.json({ ok: true });
}
