import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  let ids: number[];
  try {
    ids = (await req.json()) as number[];
    if (!Array.isArray(ids) || ids.length === 0) throw new Error();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const CATEGORY_MAP: Record<string, string> = {
    server: "server", vm: "server", desktop: "desktop", laptop: "laptop",
    printer: "printer", router: "network_device", switch: "network_device",
    access_point: "network_device",
  };

  let added = 0;
  for (const id of ids) {
    const d = await queryOne<{
      id: number; customer_id: number; ip_address: string; mac_address: string | null;
      hostname: string | null; vendor: string | null; os_name: string | null;
      os_version: string | null; device_type: string | null; domain_name: string | null;
      subnet: string | null; serial_number: string | null; model: string | null;
      first_seen: string;
    }>(
      `SELECT id, customer_id, ip_address, mac_address, hostname, vendor,
              os_name, os_version, device_type, domain_name, subnet,
              serial_number, model, first_seen
       FROM discovered_devices WHERE id=$1 AND status='pending'`,
      [id]
    );
    if (!d) continue;

    const name     = d.hostname || d.ip_address;
    const category = CATEGORY_MAP[d.device_type ?? ""] ?? "other";

    const noteParts = [
      d.ip_address && `IP: ${d.ip_address}`,
      d.mac_address && `MAC: ${d.mac_address}`,
      d.os_name && `OS: ${d.os_name}`,
      d.domain_name && `Domain: ${d.domain_name}`,
      d.subnet && `Subnet: ${d.subnet}`,
      `Keşfedilme: ${new Date(d.first_seen).toLocaleDateString("tr-TR")}`,
    ].filter(Boolean).join(" | ");

    const item = await queryOne<{ id: number }>(
      `INSERT INTO inventory_items (customer_id, name, category, brand, model, serial_no, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [d.customer_id, name, category, d.vendor ?? null, d.model ?? null, d.serial_number ?? null, noteParts]
    );
    if (!item) continue;

    await query(
      `UPDATE discovered_devices SET status='added', inventory_item_id=$1 WHERE id=$2`,
      [item.id, d.id]
    );
    added++;
  }

  console.log(`[devices/approve] added=${added} ids=${ids.join(",")}`);
  return Response.json({ ok: true, added });
}
