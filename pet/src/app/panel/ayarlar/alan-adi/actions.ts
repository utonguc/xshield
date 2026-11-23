"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { tenantDomains, tenants } from "@/db/schema";
import type { FormState } from "@/components/form";
import { requireMember } from "@/lib/auth";
import { cfDeleteHostname, cfEnsureHostname, checkDns, cloudflareEnabled, newDomainToken, normalizeDomain } from "@/lib/domains";
import { rateLimit } from "@/lib/rate-limit";

const MAX_DOMAINS = 2; // ör. alanadi.com + www.alanadi.com

async function tokenFor(tenantId: string) {
  const [t] = await db.select({ token: tenants.domainToken }).from(tenants).where(eq(tenants.id, tenantId));
  if (t?.token) return t.token;
  const token = newDomainToken();
  await db.update(tenants).set({ domainToken: token }).where(eq(tenants.id, tenantId));
  return token;
}

export async function addDomainAction(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMember(["owner"]);
  const n = normalizeDomain(String(formData.get("domain") ?? ""));
  if ("error" in n) return { error: n.error };
  const [{ c }] = await db.select({ c: count() }).from(tenantDomains).where(eq(tenantDomains.tenantId, me.tenant.id));
  if (c >= MAX_DOMAINS) return { error: `En fazla ${MAX_DOMAINS} alan adı bağlanabilir.` };
  const [taken] = await db.select({ t: tenantDomains.tenantId }).from(tenantDomains).where(eq(tenantDomains.domain, n.domain));
  if (taken) return { error: taken.t === me.tenant.id ? "Bu alan adı zaten ekli." : "Bu alan adı başka bir mağazaya bağlı." };
  await tokenFor(me.tenant.id);
  await db.insert(tenantDomains).values({ tenantId: me.tenant.id, domain: n.domain });
  revalidatePath("/panel/ayarlar/alan-adi");
  return { ok: true, message: `${n.domain} eklendi. Şimdi aşağıdaki DNS kayıtlarını girin.` };
}

export async function verifyDomainAction(domainId: string): Promise<{ ok: boolean; message: string }> {
  const me = await requireMember(["owner"]);
  if (!rateLimit(`domain-verify:${me.tenant.id}`, 20, 10 * 60_000)) return { ok: false, message: "Çok sık deneme yapıldı, birkaç dakika sonra tekrar deneyin." };
  const [d] = await db.select().from(tenantDomains).where(and(eq(tenantDomains.id, domainId), eq(tenantDomains.tenantId, me.tenant.id)));
  if (!d) return { ok: false, message: "Alan adı bulunamadı." };
  const token = await tokenFor(me.tenant.id);

  const dns = await checkDns(d.domain, token);
  const now = new Date();
  if (!dns.txtOk) {
    await db.update(tenantDomains).set({ lastCheckedAt: now, lastError: dns.error ?? null }).where(eq(tenantDomains.id, d.id));
    revalidatePath("/panel/ayarlar/alan-adi");
    return { ok: false, message: `${dns.error ?? "Doğrulanamadı."} DNS değişikliklerinin yayılması birkaç dakika ile birkaç saat sürebilir.` };
  }

  let patch: Partial<typeof tenantDomains.$inferInsert> = {
    status: "verified",
    verifiedAt: d.verifiedAt ?? now,
    lastCheckedAt: now,
    lastError: dns.cnameOk === false ? "CNAME kaydı farklı bir adrese yönlendiriyor." : null,
  };
  if (cloudflareEnabled()) {
    try {
      const h = await cfEnsureHostname(d.domain, d.cfHostnameId);
      const ssl = h.ssl?.status ?? null;
      patch = { ...patch, cfHostnameId: h.id, sslStatus: ssl, status: ssl === "active" && h.status === "active" ? "active" : "verified" };
    } catch (e) {
      patch = { ...patch, lastError: `SSL kurulumu başlatılamadı: ${(e as Error).message}` };
    }
  }
  await db.update(tenantDomains).set(patch).where(eq(tenantDomains.id, d.id));
  revalidatePath("/panel/ayarlar/alan-adi");
  revalidatePath("/panel", "layout");
  return {
    ok: true,
    message:
      patch.status === "active"
        ? "Alan adınız yayında!"
        : "Sahiplik doğrulandı. SSL sertifikası hazırlanıyor; genellikle birkaç dakika içinde mağazanız bu adresten açılır.",
  };
}

export async function removeDomainAction(domainId: string) {
  const me = await requireMember(["owner"]);
  const [d] = await db
    .delete(tenantDomains)
    .where(and(eq(tenantDomains.id, domainId), eq(tenantDomains.tenantId, me.tenant.id)))
    .returning({ cfId: tenantDomains.cfHostnameId });
  if (d?.cfId && cloudflareEnabled()) await cfDeleteHostname(d.cfId);
  revalidatePath("/panel/ayarlar/alan-adi");
  revalidatePath("/panel", "layout");
}
