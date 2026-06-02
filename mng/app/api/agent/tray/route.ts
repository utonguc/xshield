import "server-only";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

const TRAY_PATH = path.join(process.cwd(), "agent", "xshield_tray.exe");

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

  if (!fs.existsSync(TRAY_PATH)) {
    return new Response("Tray EXE not found", { status: 404 });
  }

  const data = fs.readFileSync(TRAY_PATH);
  console.log(`[agent/tray] Tray EXE served (${(data.length / 1024 / 1024).toFixed(1)} MB)`);

  return new Response(data as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="xshield_tray.exe"',
      "Content-Length": String(data.length),
      "Cache-Control": "no-store",
    },
  });
}
