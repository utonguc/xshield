import { readFile } from "node:fs/promises";
import path from "node:path";
import { isSafeUploadPath, UPLOAD_DIR } from "@/lib/uploads";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_: Request, ctx: RouteContext<"/dosya/[...path]">) {
  const rel = (await ctx.params).path.join("/");
  if (!isSafeUploadPath(rel)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, rel));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[rel.split(".").pop()!] ?? "application/octet-stream",
        // Dosya adları rastgele UUID; içerik asla değişmez.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
