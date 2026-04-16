/**
 * Istanbul timezone utilities — manual +3h math, no Intl/locale dependency.
 * Turkey is permanently UTC+3 (no DST since 2016).
 */

const OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3

function pad(n: number): string { return String(n).padStart(2, "0"); }

const MONTHS_SHORT = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const MONTHS_LONG  = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAYS_LONG    = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];

/** UTC ISO → Date shifted +3h (so getUTC* methods return Istanbul values) */
export function toIst(utcIso: string): Date {
  return new Date(new Date(utcIso).getTime() + OFFSET_MS);
}

/** UTC ISO → "HH:MM" in Istanbul */
export function fmtTime(utcIso: string): string {
  const d = toIst(utcIso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** UTC ISO → "DD.MM.YYYY HH:MM" in Istanbul (Turkish dd/mm/yyyy) */
export function fmtDateTime(utcIso: string): string {
  const d = toIst(utcIso);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** UTC ISO → "YYYY-MM-DD" in Istanbul (for date column matching) */
export function toIstDate(utcIso: string): string {
  const d = toIst(utcIso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** UTC ISO → total minutes from midnight in Istanbul (0–1439) */
export function toIstMins(utcIso: string): number {
  const d = toIst(utcIso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** UTC ISO → "YYYY-MM-DDTHH:MM" Istanbul local (for datetime-local input value) */
export function utcToLocal(utcIso: string): string {
  const d = toIst(utcIso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "YYYY-MM-DDTHH:MM" (Istanbul, from datetime-local input) → UTC ISO
 *  Uses Date.UTC() to avoid system timezone affecting the parse.
 *  Works correctly regardless of whether the server/browser is UTC+0 or UTC+3. */
export function localToUtc(localStr: string): string {
  const [datePart, timePart = "0:0"] = localStr.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi]    = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - OFFSET_MS).toISOString();
}

/** UTC ISO → "DD.MM.YYYY" in Istanbul */
export function fmtDate(utcIso: string): string {
  const d = toIst(utcIso);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** UTC ISO → "DD Aaa" in Istanbul (e.g. "11 Nis") */
export function fmtDateShort(utcIso: string): string {
  const d = toIst(utcIso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** UTC ISO → "DD Aaa, HH:MM" in Istanbul (e.g. "11 Nis, 09:00") */
export function fmtDateTimeShort(utcIso: string): string {
  const d = toIst(utcIso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** UTC ISO → "Gün, DD Ay YYYY" in Istanbul (e.g. "Cumartesi, 11 Nisan 2026") */
export function fmtDateLong(utcIso: string): string {
  const d = toIst(utcIso);
  return `${DAYS_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** JS Date (local) → "Gün, DD Ay YYYY" — for calendar Date objects */
export function fmtDateObjLong(d: Date): string {
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** JS Date (local) → "DD Aaa" — for calendar Date objects */
export function fmtDateObjShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "YYYY-MM-DDTHH:MM" → "DD.MM.YYYY HH:MM" display (for showing next to inputs) */
export function localToDisplay(localStr: string): string {
  if (!localStr) return "";
  const [date, time] = localStr.split("T");
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}${time ? " " + time : ""}`;
}
