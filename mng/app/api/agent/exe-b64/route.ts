import "server-only";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

const EXE_PATH = path.join(process.cwd(), "agent", "xshield_agent.exe");

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");

  if (token) {
    const agent = await queryOne<{ id: number }>(
      "SELECT id FROM network_agents WHERE token=$1",
      [token]
    );
    if (!agent) return new Response("Unauthorized", { status: 401 });
  } else {
    const session = await getSession();
    if (!session) return new Response("Unauthorized", { status: 401 });
  }

  if (!fs.existsSync(EXE_PATH)) {
    return new Response("EXE not found", { status: 404 });
  }

  const data = fs.readFileSync(EXE_PATH);
  console.log(`[agent/exe-b64] base64 served (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
  const b64 = data.toString("base64");

  return new Response(b64, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
