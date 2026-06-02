import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_COMMANDS = ["scan_now", "sysinfo_now", "stop", "update", "uninstall", "ad_sync", "ad_test", "deep_scan"];

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });

  let body: { agent_id: number; command: string };
  try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  if (!body.agent_id || !ALLOWED_COMMANDS.includes(body.command)) {
    return new Response("Bad Request", { status: 400 });
  }

  await query(
    "INSERT INTO agent_commands (agent_id, command) VALUES ($1, $2)",
    [body.agent_id, body.command]
  );

  console.log(`[commands/send] agent=${body.agent_id} command=${body.command}`);
  return Response.json({ ok: true });
}
