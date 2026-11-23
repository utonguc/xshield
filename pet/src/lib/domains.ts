import "server-only";
import { randomBytes } from "node:crypto";
import { resolveCname, resolveTxt } from "node:dns/promises";
import { domainToASCII } from "node:url";
import { platformHost } from "./platform";

/** Müşterinin CNAME ile yönlendireceği adres (Cloudflare for SaaS'ta "fallback origin"). */
export const cnameTarget = () => process.env.CUSTOM_DOMAIN_TARGET || platformHost();

export const TXT_PREFIX = "_xshield-pet";
export const txtName = (domain: string) => `${TXT_PREFIX}.${domain}`;
export const txtValue = (token: string) => `xshield-pet-dogrulama=${token}`;
export const newDomainToken = () => randomBytes(12).toString("hex");

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/**
 * Kullanıcının yazdığını ("https://www.Patiler.com/", "patilerpetshop.com.tr") sade
 * alan adına çevirir. Türkçe karakterli alan adları punycode'a dönüştürülür.
 */
export function normalizeDomain(input: string): { domain: string } | { error: string } {
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  const ascii = domainToASCII(s);
  if (!ascii) return { error: "Geçerli bir alan adı girin (ör. www.patilerpetshop.com)." };
  const labels = ascii.split(".");
  if (labels.length < 2 || ascii.length > 253 || !labels.every((l) => LABEL.test(l)) || /^\d+$/.test(labels.at(-1)!))
    return { error: "Geçerli bir alan adı girin (ör. www.patilerpetshop.com)." };
  const platform = platformHost();
  const root = platform.split(".").slice(-3).join(".");
  if (ascii === platform || ascii.endsWith("." + platform) || ascii === root || ascii.endsWith(".xshield.com.tr") || ascii === "xshield.com.tr")
    return { error: "Platformun kendi adresleri bağlanamaz." };
  return { domain: ascii };
}

// İki seviyeli uzantılar (.com.tr gibi) — kök alan adını bulmak için yeterli, tam liste değil.
const SECOND_LEVEL = new Set(["com.tr", "net.tr", "org.tr", "gen.tr", "biz.tr", "info.tr", "web.tr", "av.tr", "bel.tr", "co.uk", "org.uk", "com.de"]);

/** Alan adının kayıtlı kökü: www.patiler.com.tr → patiler.com.tr */
export function registrableDomain(domain: string) {
  const l = domain.split(".");
  return SECOND_LEVEL.has(l.slice(-2).join(".")) ? l.slice(-3).join(".") : l.slice(-2).join(".");
}

/** DNS panellerinin "Ad/Host" alanına yazılacak kısa ad ("@" = kökün kendisi). */
export function relativeName(fqdn: string, domain: string) {
  const root = registrableDomain(domain);
  return fqdn === root ? "@" : fqdn.slice(0, -(root.length + 1));
}

export type DnsCheck = { txtOk: boolean; cnameOk: boolean | null; error?: string };

/** Sahiplik: TXT kaydı. Yönlendirme: CNAME (kök alan adlarında CNAME olmayabilir, bu yüzden null olabilir). */
export async function checkDns(domain: string, token: string): Promise<DnsCheck> {
  let txtOk = false;
  let error: string | undefined;
  try {
    const records = await resolveTxt(txtName(domain));
    txtOk = records.some((chunks) => chunks.join("").trim() === txtValue(token));
    if (!txtOk) error = "TXT kaydı bulundu ama değeri eşleşmiyor.";
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    error = code === "ENOTFOUND" || code === "ENODATA" ? "TXT kaydı henüz görünmüyor." : `DNS sorgusu başarısız (${code ?? "bilinmeyen hata"}).`;
  }
  let cnameOk: boolean | null = null;
  try {
    const cn = await resolveCname(domain);
    const target = cnameTarget();
    cnameOk = cn.some((c) => c.toLowerCase().replace(/\.$/, "") === target);
  } catch {
    cnameOk = null;
  }
  return { txtOk, cnameOk, error: txtOk ? undefined : error };
}

// ── Cloudflare for SaaS (isteğe bağlı) ──────────────────────────────────────
// CF_API_TOKEN ve CF_ZONE_ID tanımlıysa doğrulanan alan adı Cloudflare'e "custom hostname"
// olarak eklenir ve SSL sertifikası otomatik üretilir. Tanımlı değilse platform yöneticisi
// alan adını Cloudflare panelinden elle ekler (/yonetim'de listelenir).

export const cloudflareEnabled = () => !!(process.env.CF_API_TOKEN && process.env.CF_ZONE_ID);

type CfHostname = { id: string; hostname: string; status: string; ssl?: { status?: string } };

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { success?: boolean; result?: T; errors?: { message: string }[] } | null;
  if (!res.ok || !body?.success) throw new Error(body?.errors?.map((e) => e.message).join("; ") || `Cloudflare API hatası (${res.status})`);
  return body.result as T;
}

export async function cfEnsureHostname(domain: string, existingId: string | null): Promise<CfHostname> {
  if (existingId) {
    try {
      return await cf<CfHostname>(`/custom_hostnames/${existingId}`);
    } catch {
      // silinmiş olabilir, yeniden oluştur
    }
  }
  const found = await cf<CfHostname[]>(`/custom_hostnames?hostname=${encodeURIComponent(domain)}`);
  if (found[0]) return found[0];
  return cf<CfHostname>("/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({ hostname: domain, ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } } }),
  });
}

export async function cfDeleteHostname(id: string) {
  await cf(`/custom_hostnames/${id}`, { method: "DELETE" }).catch(() => {});
}

export const SSL_LABELS: Record<string, string> = {
  active: "SSL hazır",
  pending_validation: "SSL doğrulanıyor",
  pending_issuance: "SSL hazırlanıyor",
  pending_deployment: "SSL yükleniyor",
  initializing: "SSL başlatılıyor",
};
