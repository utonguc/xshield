import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const fd = await req.formData();
  const customer_id = fd.get("customer_id");
  const name = (fd.get("name") as string)?.trim() || "Ajan";
  const subnets = (fd.get("subnets") as string)?.trim() || "";

  if (!customer_id) return new Response("Bad Request", { status: 400 });

  const token = crypto.randomBytes(32).toString("hex");

  await query(
    "INSERT INTO network_agents (customer_id, name, token, subnets) VALUES ($1,$2,$3,$4)",
    [customer_id, name, token, subnets || null]
  );

  return Response.json({ ok: true, token });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const fd = await req.formData();
  const id = fd.get("id");
  if (!id) return new Response("Bad Request", { status: 400 });

  await query("DELETE FROM network_agents WHERE id=$1", [id]);
  return Response.json({ ok: true });
}
