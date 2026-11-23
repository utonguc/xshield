import { eq } from "drizzle-orm";
import { db } from "@/db";
import { legalPages } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { LegalForm } from "../forms";

export default async function LegalSettingsPage() {
  const me = await requireMember(["owner"]);
  const rows = await db.select({ kind: legalPages.kind, body: legalPages.body }).from(legalPages).where(eq(legalPages.tenantId, me.tenant.id));
  return <LegalForm bodies={Object.fromEntries(rows.map((r) => [r.kind, r.body]))} />;
}
