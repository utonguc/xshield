import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://mng.xshield.com.tr";

// GET /api/ph/[token]/land — sahte giriş sayfasını servet et
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const row = await queryOne<{
    name: string; email: string;
    html_content: string;
    awareness_url: string | null;
    company_name: string;
  }>(
    `SELECT t.name, t.email,
            p.html_content,
            c.awareness_url,
            cu.company_name
     FROM phishing_targets t
     JOIN phishing_campaigns c ON c.id = t.campaign_id
     LEFT JOIN phishing_page_templates p ON p.id = c.page_template_id
     JOIN customers cu ON cu.id = c.customer_id
     WHERE t.token=$1 AND c.status='running'`,
    [token]
  );

  if (!row || !row.html_content) {
    return new NextResponse("<html><body><h3>Bu sayfa artık geçerli değil.</h3></body></html>",
      { headers: { "Content-Type": "text/html" } });
  }

  const submitUrl = `${BASE}/api/ph/${token}/submit`;
  const html = row.html_content
    .replace(/__SUBMIT_URL__/g, submitUrl)
    .replace(/__TOKEN__/g, token)
    .replace(/\{\{NAME\}\}/g, row.name)
    .replace(/\{\{EMAIL\}\}/g, row.email)
    .replace(/\{\{COMPANY\}\}/g, row.company_name);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
