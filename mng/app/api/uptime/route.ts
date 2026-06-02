import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");

  const monitors = await query<{
    id: number; customer_id: number; name: string; target: string;
    type: string; port: number | null; interval_seconds: number; enabled: boolean;
    company_name: string;
    last_checked_at: string | null; last_is_up: boolean | null;
    last_response_ms: number | null; last_detail: string | null;
  }>(
    `SELECT m.id, m.customer_id, m.name, m.target, m.type, m.port,
            m.interval_seconds, m.enabled, c.company_name,
            lc.checked_at AS last_checked_at, lc.is_up AS last_is_up,
            lc.response_ms AS last_response_ms, lc.detail AS last_detail
     FROM uptime_monitors m
     JOIN customers c ON c.id = m.customer_id
     LEFT JOIN LATERAL (
       SELECT checked_at, is_up, response_ms, detail
       FROM uptime_checks WHERE monitor_id = m.id
       ORDER BY checked_at DESC LIMIT 1
     ) lc ON true
     ${customerId ? "WHERE m.customer_id=$1" : ""}
     ORDER BY c.company_name, m.name`,
    customerId ? [Number(customerId)] : []
  );

  if (monitors.length === 0) return Response.json([]);

  const ids = monitors.map((m) => m.id);
  const stats = await query<{
    monitor_id: number; uptime_24h: number | null; uptime_7d: number | null; checks_24h: number;
  }>(
    `SELECT monitor_id,
            ROUND(100.0 * COUNT(*) FILTER (WHERE is_up AND checked_at > now()-interval '24 hours')
              / NULLIF(COUNT(*) FILTER (WHERE checked_at > now()-interval '24 hours'),0),1) AS uptime_24h,
            ROUND(100.0 * COUNT(*) FILTER (WHERE is_up AND checked_at > now()-interval '7 days')
              / NULLIF(COUNT(*) FILTER (WHERE checked_at > now()-interval '7 days'),0),1) AS uptime_7d,
            COUNT(*) FILTER (WHERE checked_at > now()-interval '24 hours') AS checks_24h
     FROM uptime_checks WHERE monitor_id = ANY($1::int[])
     GROUP BY monitor_id`,
    [ids]
  );

  const sm = new Map(stats.map((s) => [s.monitor_id, s]));
  const result = monitors.map((m) => ({ ...m, ...(sm.get(m.id) ?? { uptime_24h: null, uptime_7d: null, checks_24h: 0 }) }));
  return Response.json(result);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  const { customer_id, name, target, type, port, interval_seconds } = await req.json();
  if (!customer_id || !name || !target || !type) return new Response("Bad Request", { status: 400 });

  const row = await queryOne<{ id: number }>(
    `INSERT INTO uptime_monitors (customer_id, name, target, type, port, interval_seconds)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [customer_id, name.trim(), target.trim(), type, port || null, interval_seconds || 300]
  );
  return Response.json(row);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });

  await query("DELETE FROM uptime_monitors WHERE id=$1", [id]);
  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });

  const { enabled } = await req.json();
  if (typeof enabled === "boolean") {
    await query("UPDATE uptime_monitors SET enabled=$1 WHERE id=$2", [enabled, id]);
  }
  return Response.json({ ok: true });
}
