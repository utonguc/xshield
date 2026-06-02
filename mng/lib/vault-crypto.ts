import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from "crypto";

const secret = () => {
  const s = process.env.VAULT_SECRET;
  if (!s) throw new Error("VAULT_SECRET env is not set");
  return scryptSync(s, "xshield-vault-v1", 32);
};

export function encryptPassword(plaintext: string): { encrypted: string; iv: string; tag: string } {
  const key = secret();
  const iv  = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    encrypted: enc.toString("base64"),
    iv:        iv.toString("base64"),
    tag:       cipher.getAuthTag().toString("base64"),
  };
}

export function decryptPassword(encrypted: string, iv: string, tag: string): string {
  const key = secret();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp + "vault-otp-salt").digest("hex");
}
