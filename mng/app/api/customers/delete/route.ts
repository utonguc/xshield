import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  const fd = await req.formData();
  const id = fd.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  await query("DELETE FROM customers WHERE id=$1", [id]);
  return Response.json({ ok: true });
}
