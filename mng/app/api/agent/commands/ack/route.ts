import "server-only";
import { query, queryOne } from "@/lib/db";

export async function POST(req: Request) {
  let body: { token: string; command_id: number; status: "done" | "error"; result?: string };
  try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  const agent = await queryOne<{ id: number }>(
    "SELECT id FROM network_agents WHERE token=$1",
    [body.token]
  );
  if (!agent) return new Response("Unauthorized", { status: 401 });

  await query(
    `UPDATE agent_commands SET status=$1, result=$2, executed_at=now()
     WHERE id=$3 AND agent_id=$4`,
    [body.status, body.result ?? null, body.command_id, agent.id]
  );

  console.log(`[commands/ack] agent=${agent.id} cmd_id=${body.command_id} status=${body.status}`);
  return Response.json({ ok: true });
}
