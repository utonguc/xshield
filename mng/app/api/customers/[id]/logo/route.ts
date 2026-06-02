import "server-only";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const row = await queryOne<{ logo_name: string | null }>(
    "SELECT logo_name FROM customers WHERE id=$1", [id]
  );
  if (!row?.logo_name) return new Response("Not Found", { status: 404 });

  const ext = row.logo_name.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "svg" ? "image/svg+xml"
    : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "webp" ? "image/webp"
    : "image/png";

  try {
    const buf = await readFile(path.join(UPLOAD_DIR, "logos", row.logo_name));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
