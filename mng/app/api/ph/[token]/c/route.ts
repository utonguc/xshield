import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://mng.xshield.com.tr";

// GET /api/ph/[token]/c — tıklama takibi → landing page'e yönlendir
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await queryOne(
    "UPDATE phishing_targets SET clicked_at=COALESCE(clicked_at,NOW()) WHERE token=$1",
    [token]
  );
  return NextResponse.redirect(`${BASE}/api/ph/${token}/land`, { status: 302 });
}
