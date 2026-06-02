import "server-only";
import nodemailer from "nodemailer";
import { queryOne } from "@/lib/db";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

const DEFAULT_SUBJECT = "Re: [Ticket #{{ticket_id}}] {{ticket_subject}}";
const DEFAULT_BODY = "{{body}}\n\n---\nBu mesajı yanıtlayarak talebinize devam edebilirsiniz.\nxShield IT Destek — support@xshield.com.tr";

export async function sendTicketNotification(
  to: string,
  subject: string,
  body: string,
  ticketId: number
): Promise<void> {
  try {
    const tpl = await queryOne<{ subject: string; body_text: string }>(
      "SELECT subject, body_text FROM email_templates WHERE key='ticket_reply'"
    );

    const vars = { body, ticket_id: String(ticketId), ticket_subject: subject };
    const mailSubject = applyVars(tpl?.subject ?? DEFAULT_SUBJECT, vars);
    const mailBodyText = applyVars(tpl?.body_text ?? DEFAULT_BODY, vars);

    await transporter.sendMail({
      from: `"xShield Destek" <${process.env.SMTP_USER}>`,
      to,
      subject: mailSubject,
      text: mailBodyText,
      html: `<p>${mailBodyText.replace(/\n/g, "<br>")}</p>`,
    });
  } catch (err) {
    console.error("[mail] sendTicketNotification failed:", err);
  }
}
