import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const fd = await req.formData();
  const id = fd.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });

  // 1. Bu çalışana bağlı portal kullanıcılarının e-postalarını al
  const portalUsers = await query<{ email: string }>(
    "SELECT email FROM portal_users WHERE employee_id=$1", [id]
  );

  // 2. Portal OTP kayıtlarını sil
  for (const pu of portalUsers) {
    await query("DELETE FROM portal_otps WHERE email=$1", [pu.email]);
  }

  // 3. Portal kullanıcılarını sil
  await query("DELETE FROM portal_users WHERE employee_id=$1", [id]);

  // 4. Zimmetli envanteri boşalt — cihazlar kaybolmuyor, yeni zimmet için hazır bekliyor
  await query(
    "UPDATE inventory_items SET employee_id=NULL, assigned_date=NULL WHERE employee_id=$1",
    [id]
  );

  // 5. Çalışanı sil
  await query("DELETE FROM customer_employees WHERE id=$1", [id]);

  return new Response("ok");
}
