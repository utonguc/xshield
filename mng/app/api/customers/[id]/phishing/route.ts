import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rows = await query<{
    id: number; name: string; status: string; authorization_ref: string;
    sender_name: string; sender_email: string; created_at: string;
    started_at: string | null; completed_at: string | null;
    email_template_name: string | null; page_template_name: string | null;
    total: number; sent: number; opened: number; clicked: number; submitted: number;
  }>(
    `SELECT c.id, c.name, c.status, c.authorization_ref, c.sender_name, c.sender_email,
            c.created_at, c.started_at, c.completed_at,
            et.name AS email_template_name, pt.name AS page_template_name,
            (SELECT COUNT(*) FROM phishing_targets WHERE campaign_id=c.id)::int AS total,
            (SELECT COUNT(*) FROM phishing_targets WHERE campaign_id=c.id AND sent_at IS NOT NULL)::int AS sent,
            (SELECT COUNT(*) FROM phishing_targets WHERE campaign_id=c.id AND opened_at IS NOT NULL)::int AS opened,
            (SELECT COUNT(*) FROM phishing_targets WHERE campaign_id=c.id AND clicked_at IS NOT NULL)::int AS clicked,
            (SELECT COUNT(*) FROM phishing_targets WHERE campaign_id=c.id AND submitted_at IS NOT NULL)::int AS submitted
     FROM phishing_campaigns c
     LEFT JOIN phishing_email_templates et ON et.id=c.email_template_id
     LEFT JOIN phishing_page_templates  pt ON pt.id=c.page_template_id
     WHERE c.customer_id=$1
     ORDER BY c.created_at DESC`,
    [Number(id)]
  );
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "Kampanya adı zorunlu" }, { status: 400 });
  if (!b.authorization_ref?.trim()) return NextResponse.json({ error: "Onay belgesi referansı zorunlu" }, { status: 400 });

  const row = await queryOne<{ id: number }>(
    `INSERT INTO phishing_campaigns
       (customer_id,name,email_template_id,page_template_id,sender_name,sender_email,
        reply_to,awareness_url,authorization_ref,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [Number(id), b.name.trim(), b.email_template_id||null, b.page_template_id||null,
     b.sender_name||"IT Destek", b.sender_email||"", b.reply_to||null,
     b.awareness_url||null, b.authorization_ref.trim(), session.username]
  );
  return NextResponse.json({ id: row!.id });
}
