import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s?.tenant || (s.role !== "owner" && s.role !== "staff")) return Response.json({ error: "unauthorized" }, { status: 401 });
  const [{ n }] = await db
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.tenantId, s.tenant.id), eq(orders.status, "new")));
  return Response.json({ count: n }, { headers: { "Cache-Control": "no-store" } });
}
