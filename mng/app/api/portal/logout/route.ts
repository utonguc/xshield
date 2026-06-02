import { deletePortalSession } from "@/lib/portal-auth";
import { redirect } from "next/navigation";

export async function GET() {
  await deletePortalSession();
  redirect("/portal/login");
}

export async function POST() {
  await deletePortalSession();
  redirect("/portal/login");
}
