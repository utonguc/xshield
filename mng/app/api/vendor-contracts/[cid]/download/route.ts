import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const CONTRACT_DIR = path.join(UPLOAD_DIR, "vendor-contracts");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { cid } = await params;

  const row = await queryOne<{ file_stored: string | null; file_original: string | null }>(
    "SELECT file_stored, file_original FROM customer_vendor_contracts WHERE id=$1",
    [Number(cid)]
  );
  if (!row?.file_stored) return new Response("Not found", { status: 404 });

  try {
    const buf = await readFile(path.join(CONTRACT_DIR, row.file_stored));
    const ext = row.file_stored.split(".").pop()?.toLowerCase() ?? "bin";
    const mime = ext === "pdf" ? "application/pdf"
      : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : ext === "doc" ? "application/msword"
      : "application/octet-stream";
    const filename = encodeURIComponent(row.file_original ?? row.file_stored);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
