import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });

  let body: { agent_id: number };
  try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }
  if (!body.agent_id) return new Response("Bad Request", { status: 400 });

  await query("DELETE FROM network_agents WHERE id=$1", [body.agent_id]);
  console.log(`[agents/delete] agent=${body.agent_id}`);
  return Response.json({ ok: true });
}
