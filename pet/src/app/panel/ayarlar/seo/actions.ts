"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import type { FormState } from "@/components/form";
import { parseGaId, parseGscToken } from "@/lib/analytics";
import { requireMember } from "@/lib/auth";

export async function saveStoreTagsAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  const ga = parseGaId(String(fd.get("ga") ?? ""));
  if ("error" in ga) return { error: ga.error };
  const gsc = parseGscToken(String(fd.get("gsc") ?? ""));
  if ("error" in gsc) return { error: gsc.error };
  await db.update(tenants).set({ gaMeasurementId: ga.value, gscVerification: gsc.value }).where(eq(tenants.id, me.tenant.id));
  revalidatePath(`/${me.tenant.slug}`, "layout");
  revalidatePath("/panel/ayarlar/seo");
  return { ok: true, message: `Kaydedildi.${ga.value ? ` Analytics: ${ga.value}.` : ""}${gsc.value ? " Search Console etiketi mağazanızda yayında." : ""}` };
}
