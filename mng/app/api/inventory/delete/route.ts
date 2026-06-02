import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const ct = req.headers.get("content-type") ?? "";

  let ids: number[];

  if (ct.includes("application/json")) {
    // Bulk delete: body is [id1, id2, ...]
    const body = await req.json();
    if (!Array.isArray(body) || body.length === 0) return new Response("Bad Request", { status: 400 });
    ids = body.map(Number).filter((n) => !isNaN(n) && n > 0);
  } else {
    // Single delete: FormData from DeleteButton
    const fd = await req.formData();
    const id = Number(fd.get("id"));
    if (!id) return new Response("Bad Request", { status: 400 });
    ids = [id];
  }

  if (ids.length === 0) return new Response("Bad Request", { status: 400 });

  for (const id of ids) {
    await query("DELETE FROM inventory_items WHERE id=$1", [id]);
    await query(
      "UPDATE discovered_devices SET status='pending', inventory_item_id=NULL WHERE inventory_item_id=$1",
      [id]
    );
  }

  console.log(`[inventory/delete] deleted ids=${ids.join(",")}`);

  const ct2 = req.headers.get("content-type") ?? "";
  if (ct2.includes("application/json")) {
    return Response.json({ ok: true, deleted: ids.length });
  }
  return new Response("ok");
}
