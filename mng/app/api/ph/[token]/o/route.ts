import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"
);

// GET /api/ph/[token]/o — açılma takibi (pixel)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await queryOne(
    "UPDATE phishing_targets SET opened_at=COALESCE(opened_at,NOW()) WHERE token=$1",
    [token]
  );
  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache",
      "Pragma": "no-cache",
    },
  });
}
