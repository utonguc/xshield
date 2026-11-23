const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
const num = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });

export const formatTL = (v: number | string | null | undefined) => tl.format(Number(v ?? 0));
export const formatQty = (v: number | string, unit?: string | null) =>
  `${num.format(Number(v))}${unit === "kg" ? " kg" : unit === "adet" ? " adet" : ""}`;

export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" }).format(
    new Date(d),
  );
export const formatDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(d));

/** Kullanıcının yazdığı "149,90" veya "1.249,90" gibi değerleri sayıya çevirir. */
export function parseDecimal(input: FormDataEntryValue | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).trim().replace(/\s|₺|TL/gi, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };
export function slugify(input: string) {
  return input
    .trim()
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR_MAP[c] ?? TR_MAP[c.toLowerCase()] ?? c)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Türkiye cep telefonunu 5XXXXXXXXX biçimine getirir; geçersizse null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "").replace(/^(90|0)/, "");
  return /^5\d{9}$/.test(digits) ? digits : null;
}
export const displayPhone = (p: string | null | undefined) =>
  p && /^5\d{9}$/.test(p) ? `0${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}` : (p ?? "");
export const whatsappLink = (p: string, text?: string) =>
  `https://wa.me/90${p.replace(/\D/g, "").replace(/^(90|0)/, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
