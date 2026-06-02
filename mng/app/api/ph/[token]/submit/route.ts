import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/ph/[token]/submit — form gönderimi (test verisi)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const contentType = req.headers.get("content-type") ?? "";
  let data: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    for (const [k, v] of fd.entries()) {
      if (k !== "_token") data[k] = String(v);
    }
  } else {
    try { data = await req.json(); } catch { /**/ }
  }

  // Store as test data — never treat as real credentials
  const row = await queryOne<{ awareness_url: string | null }>(
    `UPDATE phishing_targets
     SET submitted_at=COALESCE(submitted_at,NOW()),
         submitted_data=$1
     WHERE token=$2
     RETURNING (SELECT awareness_url FROM phishing_campaigns WHERE id=campaign_id) AS awareness_url`,
    [JSON.stringify({ _note: "OLTALAMA SİMÜLASYONU — TEST VERİSİ", ...data }), token]
  );

  const redirect = row?.awareness_url || "https://xshield.com.tr/guvenlik-farkindaligi";
  return NextResponse.redirect(redirect, { status: 303 });
}
