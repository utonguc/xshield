import "server-only";
import { query, queryOne } from "@/lib/db";

export async function POST(req: Request) {
  let body: { token: string; ok: boolean; message?: string; user_count?: number };
  try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  const agent = await queryOne<{ id: number; customer_id: number }>(
    "SELECT id, customer_id FROM network_agents WHERE token=$1", [body.token]
  );
  if (!agent) return new Response("Unauthorized", { status: 401 });

  await query(
    `UPDATE customer_ad_config
     SET last_test_at=now(), last_test_ok=$1, last_test_msg=$2, updated_at=now()
     WHERE customer_id=$3`,
    [body.ok, body.message ?? null, agent.customer_id]
  );

  console.log(`[agent/ad-test-result] agent=${agent.id} ok=${body.ok} msg=${body.message}`);
  return Response.json({ ok: true });
}
