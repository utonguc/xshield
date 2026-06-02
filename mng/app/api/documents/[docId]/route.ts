import "server-only";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { docId } = await params;
  const doc = await queryOne<{
    stored_name: string; original_name: string; mimetype: string;
  }>("SELECT stored_name,original_name,mimetype FROM customer_documents WHERE id=$1", [docId]);

  if (!doc) return new Response("Not Found", { status: 404 });

  const filePath = path.join(UPLOAD_DIR, "contracts", doc.stored_name);
  let buf: Buffer;
  try {
    buf = await readFile(filePath);
  } catch {
    return new Response("File not found", { status: 404 });
  }

  const encoded = encodeURIComponent(doc.original_name);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimetype,
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Content-Length": String(buf.byteLength),
    },
  });
}
