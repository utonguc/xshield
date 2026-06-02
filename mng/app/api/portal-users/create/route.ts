import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/portal-mail";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Forbidden", { status: 403 });

  const fd = await req.formData();
  const customer_id  = fd.get("customer_id") as string;
  const full_name    = (fd.get("full_name") as string)?.trim();
  const email        = (fd.get("email") as string)?.trim().toLowerCase();
  const group_id     = fd.get("permission_group_id") as string;
  const password     = (fd.get("password") as string) || null;
  const send_welcome = fd.get("send_welcome") === "1";

  if (!customer_id || !full_name || !email || !group_id) {
    return new Response("Bad Request", { status: 400 });
  }

  const password_hash = password && password.length >= 6 ? hashPassword(password) : null;

  const existing = await queryOne<{ cnt: string }>(
    "SELECT COUNT(*)::text AS cnt FROM portal_users WHERE LOWER(email)=$1",
    [email]
  );

  await query(
    `INSERT INTO portal_users (customer_id, email, full_name, permission_group_id, password_hash, source, is_active, is_verified)
     VALUES ($1,$2,$3,$4,$5,'local',true,true)
     ON CONFLICT (email) DO UPDATE SET
       full_name=EXCLUDED.full_name,
       customer_id=EXCLUDED.customer_id,
       permission_group_id=EXCLUDED.permission_group_id,
       password_hash=COALESCE(EXCLUDED.password_hash, portal_users.password_hash)`,
    [customer_id, email, full_name, group_id, password_hash]
  );

  if (send_welcome && parseInt(existing?.cnt ?? "0") === 0) {
    const cust = await queryOne<{ company_name: string }>(
      "SELECT company_name FROM customers WHERE id=$1", [customer_id]
    );
    await sendWelcomeEmail(email, full_name, cust?.company_name ?? "");
  }

  console.log(`[portal-users/create] customer=${customer_id} email=${email} by=${session.username}`);
  return Response.json({ ok: true });
}
