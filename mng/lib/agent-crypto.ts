import "server-only";
import crypto from "crypto";

// Derive a 32-byte key from JWT_SECRET for AES-256-CBC
function getKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? "xshield-default-secret-change-me";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptPassword(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptPassword(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
