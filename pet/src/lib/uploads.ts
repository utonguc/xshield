import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Çalışma anında belirlenen dizin; derleyicinin tüm projeyi pakete katmaması için izlemeden hariç.
export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
const MAX_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", test: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];

export class UploadError extends Error {}

/** Görseli doğrulayıp kaydeder; "tenantId/uuid.ext" biçiminde göreli yol döner. */
export async function saveImage(file: File | null, tenantId: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new UploadError("Görsel en fazla 5 MB olabilir.");
  const buf = Buffer.from(await file.arrayBuffer());
  // Uzantıya ya da Content-Type'a değil, dosyanın ilk baytlarına bakıyoruz.
  const sig = SIGNATURES.find((s) => s.test(buf));
  if (!sig) throw new UploadError("Yalnızca JPG, PNG veya WEBP görsel yüklenebilir.");
  const dir = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, tenantId);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${sig.ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, name), buf);
  return `${tenantId}/${name}`;
}

const SAFE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const isSafeUploadPath = (p: string) => SAFE_PATH.test(p);

export async function removeImage(rel: string | null | undefined) {
  if (!rel || !isSafeUploadPath(rel)) return;
  await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, rel)).catch(() => {});
}

export const imageUrl = (rel: string | null | undefined) => (rel ? `/dosya/${rel}` : null);
