import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const fd = await req.formData();
  const id       = fd.get("id") as string;
  const password = fd.get("password") as string;
  if (!id || !password || password.length < 6) {
    return new Response("Bad Request", { status: 400 });
  }

  const hash = hashPassword(password);
  await query("UPDATE portal_users SET password_hash=$1 WHERE id=$2", [hash, id]);
  console.log(`[portal-users/set-password] id=${id} by=${session.username}`);
  return Response.json({ ok: true });
}
