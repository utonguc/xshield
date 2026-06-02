import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });
  const fd = await req.formData();
  const id = fd.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });
  await query("DELETE FROM canned_responses WHERE id=$1", [id]);
  return new Response("ok");
}
