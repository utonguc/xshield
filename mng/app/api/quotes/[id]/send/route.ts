import "server-only";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import nodemailer from "nodemailer";
import { generateQuotePdf } from "@/lib/quote-pdf";

type Params = { params: Promise<{ id: string }> };

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
});

function sym(cur: string) { return cur === "TRY" ? "₺" : cur === "USD" ? "$" : "€"; }
function fmt(n: number, cur: string) {
  return `${sym(cur)}${Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const to: string = body.to;
  if (!to) return new Response("Missing 'to'", { status: 400 });

  const quote = await queryOne<any>(
    `SELECT q.*, c.company_name, c.contact_email, c.address, c.city
     FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id WHERE q.id=$1`,
    [Number(id)]
  );
  if (!quote) return new Response("Not Found", { status: 404 });
  const items = await query<any>(
    "SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY sort_order",
    [Number(id)]
  );

  const rows = items.map((it: any) => `
<tr>
  <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px;color:#64748b;white-space:nowrap">${it.product_code || "—"}</td>
  <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${it.description}</td>
  <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${Number(it.quantity).toLocaleString("tr-TR")}</td>
  <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;white-space:nowrap">${fmt(it.unit_price, quote.currency)}</td>
  <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;font-size:13px;white-space:nowrap">${fmt(it.total_price, quote.currency)}</td>
</tr>`).join("");

  const qDate = new Date(quote.quote_date).toLocaleDateString("tr-TR");
  const vDate = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("tr-TR") : null;

  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fiyat Teklifi ${quote.quote_no}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b">
<div style="max-width:700px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">

  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:28px 32px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px">x<span style="color:#3b82f6">Shield</span></div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;letter-spacing:0.12em;text-transform:uppercase">IT Güvenlik &amp; Yönetim Hizmetleri</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:0.5px">FİYAT TEKLİFİ</div>
      <div style="font-size:14px;color:#3b82f6;font-weight:700;margin-top:4px">${quote.quote_no}</div>
    </div>
  </div>

  <div style="display:flex;border-bottom:1px solid #e2e8f0">
    <div style="flex:1;padding:20px 24px;border-right:1px solid #e2e8f0">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Teklif Bilgileri</div>
      <div style="font-size:12px;margin-bottom:5px;color:#64748b">Teklif No: <strong style="color:#0f172a">${quote.quote_no}</strong></div>
      <div style="font-size:12px;margin-bottom:5px;color:#64748b">Tarih: <strong style="color:#0f172a">${qDate}</strong></div>
      ${vDate ? `<div style="font-size:12px;color:#64748b">Geçerlilik: <strong style="color:#0f172a">${vDate}</strong></div>` : ""}
      ${quote.prepared_by ? `<div style="font-size:12px;margin-top:8px;color:#64748b">Hazırlayan: <strong style="color:#0f172a">${quote.prepared_by}</strong></div>` : ""}
    </div>
    <div style="flex:1;padding:20px 24px">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Müşteri</div>
      ${quote.company_name ? `<div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:5px">${quote.company_name}</div>` : `<div style="font-size:13px;color:#94a3b8;margin-bottom:5px">—</div>`}
      ${quote.contact_person ? `<div style="font-size:12px;color:#64748b">İlgili Kişi: <strong style="color:#0f172a">${quote.contact_person}</strong></div>` : ""}
      ${quote.contact_email ? `<div style="font-size:12px;color:#64748b;margin-top:4px">${quote.contact_email}</div>` : ""}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:#f8fafc">
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #e2e8f0">Ürün Kodu</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #e2e8f0">Ürün Tanımı</th>
        <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #e2e8f0">Adet</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #e2e8f0">Birim Fiyat</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #e2e8f0">Toplam</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;padding:20px 24px;border-top:2px solid #e2e8f0">
    <div style="min-width:240px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9">
        <span>Ara Toplam</span><span style="font-weight:600;color:#1e293b">${fmt(quote.subtotal, quote.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9">
        <span>KDV %${quote.tax_rate}</span><span style="font-weight:600;color:#1e293b">${fmt(quote.tax_amount, quote.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 14px;margin-top:8px;background:#0f172a;border-radius:10px">
        <span style="font-size:14px;font-weight:700;color:#fff">Genel Toplam</span>
        <span style="font-size:17px;font-weight:900;color:#3b82f6">${fmt(quote.total, quote.currency)}</span>
      </div>
    </div>
  </div>

  ${quote.notes ? `<div style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.7"><strong style="color:#1e293b;display:block;margin-bottom:6px">Notlar</strong>${quote.notes.replace(/\n/g, "<br>")}</div>` : ""}
  ${quote.terms ? `<div style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.7"><strong style="color:#1e293b;display:block;margin-bottom:6px">Satış Koşulları</strong>${quote.terms.replace(/\n/g, "<br>")}</div>` : ""}

  <div style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">x<span style="color:#3b82f6">Shield</span> IT Güvenlik &amp; Yönetim Hizmetleri</div>
    <div style="font-size:12px;color:#64748b">
      <a href="mailto:info@xshield.com.tr" style="color:#3b82f6;text-decoration:none">info@xshield.com.tr</a>
      &nbsp;·&nbsp; mng.xshield.com.tr
    </div>
  </div>
</div>
</body></html>`;

  let pdfBuffer: Buffer | null = null;
  try { pdfBuffer = await generateQuotePdf(quote, items); }
  catch (pdfErr) { console.error("[quotes] PDF generation failed:", pdfErr); }

  try {
    await transporter.sendMail({
      from: `"xShield" <${process.env.SMTP_USER}>`,
      to,
      subject: `Fiyat Teklifi — ${quote.quote_no}${quote.company_name ? ` | ${quote.company_name}` : ""}`,
      html,
      attachments: pdfBuffer ? [{ filename: `${quote.quote_no}.pdf`, content: pdfBuffer, contentType: "application/pdf" }] : [],
    });
    await query(
      "UPDATE quotes SET status='sent', updated_at=now() WHERE id=$1 AND status='draft'",
      [Number(id)]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[quotes] send error:", err);
    return new Response("Mail gönderilemedi", { status: 500 });
  }
}
