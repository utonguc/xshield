import "server-only";
import { query } from "@/lib/db";
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

  await query(
    `DELETE FROM discovered_devices WHERE id = ANY($1::int[])`,
    [ids]
  );

  console.log(`[devices/delete] deleted ids=${ids.join(",")}`);
  return Response.json({ ok: true });
}
