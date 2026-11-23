import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { imageUrl } from "@/lib/uploads";
import { StoreSettingsForm } from "./forms";

export default async function SettingsPage() {
  const me = await requireMember(["owner"]);
  const [t] = await db.select().from(tenants).where(eq(tenants.id, me.tenant.id));
  return <StoreSettingsForm s={{ ...t, logoUrl: imageUrl(t.logoPath) }} />;
}
