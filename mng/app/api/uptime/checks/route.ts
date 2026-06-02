import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  const monitorId = new URL(req.url).searchParams.get("monitor_id");
  if (!monitorId) return new Response("Bad Request", { status: 400 });

  const checks = await query<{
    checked_at: string; is_up: boolean; response_ms: number | null; detail: string | null;
  }>(
    `SELECT checked_at, is_up, response_ms, detail
     FROM uptime_checks WHERE monitor_id=$1
     ORDER BY checked_at DESC LIMIT 100`,
    [monitorId]
  );

  return Response.json(checks);
}
