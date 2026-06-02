import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  const fd = await req.formData();
  const id = fd.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });

  const rows = await query<{ id: number; is_active: boolean }>(
    "UPDATE portal_users SET is_active=NOT is_active WHERE id=$1 RETURNING id, is_active", [id]
  );
  console.log(`[portal-users/toggle] id=${id} is_active=${rows[0]?.is_active}`);
  return Response.json({ ok: true, is_active: rows[0]?.is_active });
}
