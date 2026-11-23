"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/form";
import { parseGaId, parseGscToken, PLATFORM_KEYS, setPlatformSetting } from "@/lib/analytics";
import { getSession, isPlatformAdmin } from "@/lib/auth";

export async function savePlatformTagsAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s || !isPlatformAdmin(s.user.email)) return { error: "Bu işlem için yetkiniz yok." };
  const ga = parseGaId(String(fd.get("ga") ?? ""));
  if ("error" in ga) return { error: ga.error };
  const gsc = parseGscToken(String(fd.get("gsc") ?? ""));
  if ("error" in gsc) return { error: gsc.error };
  await setPlatformSetting(PLATFORM_KEYS.ga, ga.value);
  await setPlatformSetting(PLATFORM_KEYS.gsc, gsc.value);
  revalidatePath("/", "layout");
  return { ok: true, message: `Kaydedildi.${ga.value ? ` Analytics: ${ga.value}.` : ""}${gsc.value ? " Search Console etiketi yayında." : ""}` };
}
