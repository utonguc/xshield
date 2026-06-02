import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://mng.xshield.com.tr";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: Number(process.env.SMTP_PORT ?? 465) === 465,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
});

// GET — campaign detail + targets
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;

  const [campaign, targets] = await Promise.all([
    queryOne<{
      id: number; name: string; status: string; authorization_ref: string;
      sender_name: string; sender_email: string; reply_to: string | null;
      awareness_url: string | null; email_template_id: number | null;
      page_template_id: number | null; started_at: string | null;
      completed_at: string | null; created_at: string;
    }>(
      "SELECT * FROM phishing_campaigns WHERE id=$1 AND customer_id=$2",
      [Number(cid), Number(id)]
    ),
    query<{
      id: number; name: string; email: string; department: string | null;
      sent_at: string | null; opened_at: string | null;
      clicked_at: string | null; submitted_at: string | null; token: string;
    }>(
      `SELECT id,name,email,department,sent_at,opened_at,clicked_at,submitted_at,token
       FROM phishing_targets WHERE campaign_id=$1 ORDER BY name`,
      [Number(cid)]
    ),
  ]);

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign, targets });
}

// PUT — update campaign (draft only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;
  const b = await req.json();

  // Only update targets list if provided
  if (b.targets) {
    await queryOne("DELETE FROM phishing_targets WHERE campaign_id=$1", [Number(cid)]);
    for (const t of b.targets as Array<{ name: string; email: string; department?: string }>) {
      if (!t.email?.trim()) continue;
      await queryOne(
        "INSERT INTO phishing_targets (campaign_id,name,email,department,token) VALUES ($1,$2,$3,$4,$5)",
        [Number(cid), t.name||t.email, t.email.trim(), t.department||null, randomUUID()]
      );
    }
  }

  await queryOne(
    `UPDATE phishing_campaigns
     SET name=$1, email_template_id=$2, page_template_id=$3,
         sender_name=$4, sender_email=$5, reply_to=$6, awareness_url=$7, authorization_ref=$8
     WHERE id=$9 AND customer_id=$10 AND status='draft'`,
    [b.name, b.email_template_id||null, b.page_template_id||null,
     b.sender_name, b.sender_email, b.reply_to||null, b.awareness_url||null,
     b.authorization_ref, Number(cid), Number(id)]
  );
  return NextResponse.json({ ok: true });
}

// DELETE
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;
  await queryOne("DELETE FROM phishing_campaigns WHERE id=$1 AND customer_id=$2", [Number(cid), Number(id)]);
  return NextResponse.json({ ok: true });
}

// POST with ?action=launch — e-postaları gönder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;
  const { action } = await req.json();

  if (action === "launch") {
    const camp = await queryOne<{
      id: number; name: string; sender_name: string; sender_email: string;
      reply_to: string | null; status: string; email_template_id: number | null;
      authorization_ref: string;
    }>(
      "SELECT * FROM phishing_campaigns WHERE id=$1 AND customer_id=$2 AND status='draft'",
      [Number(cid), Number(id)]
    );
    if (!camp) return NextResponse.json({ error: "Kampanya bulunamadı veya gönderilmez durumda" }, { status: 400 });

    const tpl = camp.email_template_id
      ? await queryOne<{ subject: string; html_body: string }>(
          "SELECT subject,html_body FROM phishing_email_templates WHERE id=$1", [camp.email_template_id])
      : null;
    if (!tpl) return NextResponse.json({ error: "E-posta şablonu seçilmemiş" }, { status: 400 });

    const targets = await query<{ id: number; name: string; email: string; token: string }>(
      "SELECT id,name,email,token FROM phishing_targets WHERE campaign_id=$1 AND sent_at IS NULL",
      [Number(cid)]
    );
    if (targets.length === 0) return NextResponse.json({ error: "Hedef listesi boş" }, { status: 400 });

    await queryOne("UPDATE phishing_campaigns SET status='running', started_at=NOW() WHERE id=$1", [Number(cid)]);

    const customer = await queryOne<{ company_name: string }>(
      "SELECT company_name FROM customers WHERE id=$1", [Number(id)]
    );

    let sent = 0;
    for (const target of targets) {
      const phishLink = `${BASE}/api/ph/${target.token}/c`;
      const pixel = `<img src="${BASE}/api/ph/${target.token}/o" width="1" height="1" style="display:none">`;
      const now = new Date();
      const dateStr = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

      const html = tpl.html_body
        .replace(/\{\{NAME\}\}/g, target.name)
        .replace(/\{\{EMAIL\}\}/g, target.email)
        .replace(/\{\{COMPANY\}\}/g, customer?.company_name ?? "")
        .replace(/\{\{DATE\}\}/g, dateStr)
        .replace(/\{\{RANDOM_NO\}\}/g, Math.floor(Math.random() * 900000 + 100000).toString())
        .replace(/\{\{CEO_NAME\}\}/g, "Genel Müdür")
        .replace(/\{\{TRACKING_PIXEL\}\}/g, pixel)
        .replace(/\{\{PHISH_LINK\}\}/g, phishLink);

      const subject = tpl.subject
        .replace(/\{\{NAME\}\}/g, target.name)
        .replace(/\{\{COMPANY\}\}/g, customer?.company_name ?? "");

      try {
        await transporter.sendMail({
          from: `"${camp.sender_name}" <${process.env.SMTP_USER}>`,
          replyTo: camp.reply_to || undefined,
          to: target.email,
          subject,
          html,
        });
        await queryOne("UPDATE phishing_targets SET sent_at=NOW() WHERE id=$1", [target.id]);
        sent++;
      } catch (err) {
        console.error(`Phishing mail failed for ${target.email}:`, err);
      }
    }

    return NextResponse.json({ ok: true, sent });
  }

  if (action === "complete") {
    await queryOne(
      "UPDATE phishing_campaigns SET status='completed', completed_at=NOW() WHERE id=$1 AND customer_id=$2",
      [Number(cid), Number(id)]
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
