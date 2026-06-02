import "server-only";
import { getSession } from "@/lib/auth";
import { runUptimeChecks } from "@/lib/uptime-runner";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.UPTIME_CHECK_SECRET) {
    const session = await getSession();
    if (!session) return new Response("Forbidden", { status: 403 });
  }

  const result = await runUptimeChecks();
  return Response.json(result);
}
