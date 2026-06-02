import puppeteer from "puppeteer-core";

const CHROMIUM_EXEC = "/usr/bin/chromium";

const CUR_SYM: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function fmt(n: number, cur: string) {
  return `${CUR_SYM[cur] ?? cur}${Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildHtml(quote: any, items: any[]): string {
  const sym = CUR_SYM[quote.currency] ?? quote.currency;

  const itemRows = items.map((it: any, i: number) => `
    <tr class="${i % 2 === 0 ? "e" : ""}">
      <td class="code">${it.product_code || "—"}</td>
      <td>${it.description}</td>
      <td style="text-align:center">${Number(it.quantity).toLocaleString("tr-TR")}</td>
      <td style="text-align:right">${fmt(it.unit_price, quote.currency)}</td>
      <td style="text-align:right;font-weight:700">${fmt(it.total_price, quote.currency)}</td>
    </tr>`).join("");

  const termsPage = quote.terms ? `
  <div class="page brk">
    <div class="hdr">
      <div><div class="logo">x<span>Shield</span></div><div class="lsub">IT Güvenlik &amp; Yönetim Hizmetleri</div></div>
      <div style="text-align:right"><div class="dtitle" style="font-size:14pt">SATIŞ KOŞULLARI</div><div class="dno">${quote.quote_no}</div></div>
    </div>
    <div style="padding:20px 24px"><pre class="ttext">${quote.terms}</pre></div>
    <div class="ftr"><div class="flogo">x<span>Shield</span> IT Güvenlik &amp; Yönetim Hizmetleri</div><div class="fcontact">info@xshield.com.tr · mng.xshield.com.tr</div></div>
  </div>` : "";

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;color:#1e293b;background:#fff}
.page{width:210mm;min-height:297mm;background:#fff;display:flex;flex-direction:column}
.brk{page-break-before:always;break-before:page}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:20px 24px 16px;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)}
.logo{font-size:22pt;font-weight:900;color:#fff}.logo span{color:#3b82f6}
.lsub{font-size:7pt;color:#94a3b8;margin-top:3px;letter-spacing:.12em;text-transform:uppercase}
.dtitle{font-size:16pt;font-weight:900;color:#fff;letter-spacing:1px}
.dno{font-size:11pt;color:#3b82f6;font-weight:700;margin-top:4px}
.meta{display:flex;border-bottom:2px solid #e2e8f0}
.ml{flex:1;padding:14px 18px;border-right:1px solid #e2e8f0}
.mr{flex:1;padding:14px 18px}
.mr2{display:flex;justify-content:space-between;font-size:9pt;margin-bottom:4px}
.mr2 span{color:#64748b}.mr2 strong{color:#0f172a}
.clbl{font-size:7pt;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}
.cname{font-size:13pt;font-weight:800;color:#0f172a;margin-bottom:5px}
.crow{display:flex;justify-content:space-between;font-size:9pt;margin-bottom:3px}
.crow span{color:#64748b}.crow strong{color:#0f172a}
table{width:100%;border-collapse:collapse}
thead th{padding:8px 10px;text-align:left;font-size:8pt;font-weight:700;color:#fff;background:#1e3a5f;border:1px solid #2d4a6b;letter-spacing:.04em}
td{padding:7px 10px;font-size:9pt;border-bottom:1px solid #e2e8f0;color:#1e293b}
.e td{background:#f8fafc}
.code{font-family:monospace;font-size:8pt;color:#64748b}
.tots{display:flex;flex-direction:column;align-items:flex-end;padding:12px 18px 8px;gap:3px}
.tr{display:flex;justify-content:space-between;min-width:240px;font-size:9pt;color:#64748b;padding:3px 8px}
.tr span:last-child{font-weight:600;color:#0f172a}
.tg{display:flex;justify-content:space-between;min-width:240px;background:#0f172a;padding:9px 12px;border-radius:6px;margin-top:4px}
.tg span:first-child{font-size:11pt;font-weight:700;color:#fff}
.tg span:last-child{font-size:13pt;font-weight:900;color:#3b82f6}
.notes{padding:10px 18px;border-top:1px solid #e2e8f0;margin-top:4px}
.ntext{font-family:inherit;font-size:8pt;color:#475569;line-height:1.6;white-space:pre-wrap}
.sig{display:flex;gap:24px;padding:20px 18px 10px;border-top:1px solid #e2e8f0;margin-top:auto}
.sb{flex:1}
.slbl{font-size:7pt;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:28px}
.sline{border-bottom:1.5px solid #1e293b;width:80%;margin-bottom:6px}
.sname{font-size:9pt;color:#475569;font-weight:600}
.ftr{padding:10px 18px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;margin-top:auto}
.flogo{font-size:10pt;font-weight:700;color:#0f172a}.flogo span{color:#3b82f6}
.fcontact{font-size:8pt;color:#64748b;margin-top:3px}
.ttext{font-family:inherit;font-size:8pt;color:#475569;line-height:1.55;white-space:pre-wrap}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div><div class="logo">x<span>Shield</span></div><div class="lsub">IT Güvenlik &amp; Yönetim Hizmetleri</div></div>
    <div style="text-align:right"><div class="dtitle">FİYAT TEKLİFİ</div><div class="dno">${quote.quote_no}</div></div>
  </div>
  <div class="meta">
    <div class="ml">
      <div class="mr2"><span>Teklif Numarası</span><strong>${quote.quote_no}</strong></div>
      <div class="mr2"><span>Teklif Tarihi</span><strong>${fmtShort(quote.quote_date)}</strong></div>
      ${quote.valid_until ? `<div class="mr2"><span>Geçerlilik Tarihi</span><strong>${fmtShort(quote.valid_until)}</strong></div>` : ""}
      ${quote.prepared_by ? `<div class="mr2"><span>Hazırlayan</span><strong>${quote.prepared_by}</strong></div>` : ""}
    </div>
    <div class="mr">
      <div class="clbl">İlgili Firma</div>
      <div class="cname">${quote.company_name || "—"}</div>
      ${quote.contact_person ? `<div class="crow"><span>İlgili Kişi</span><strong>${quote.contact_person}</strong></div>` : ""}
      ${quote.contact_email ? `<div class="crow"><span>E-posta</span><strong>${quote.contact_email}</strong></div>` : ""}
      ${quote.contact_phone ? `<div class="crow"><span>Telefon</span><strong>${quote.contact_phone}</strong></div>` : ""}
    </div>
  </div>
  <table>
    <thead><tr>
      <th style="width:12%">Ürün Kodu</th><th>Ürün Tanımı</th>
      <th style="width:8%;text-align:center">Adet</th>
      <th style="width:15%;text-align:right">Birim Fiyat</th>
      <th style="width:15%;text-align:right">Toplam</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="tots">
    <div class="tr"><span>Ara Toplam</span><span>${sym} ${Number(quote.subtotal).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
    <div class="tr"><span>KDV %${Number(quote.tax_rate)}</span><span>${sym} ${Number(quote.tax_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
    <div class="tg"><span>Genel Toplam</span><span>${sym} ${Number(quote.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
  </div>
  ${quote.notes ? `<div class="notes"><pre class="ntext">${quote.notes}</pre></div>` : ""}
  <div class="sig">
    <div class="sb"><div class="slbl">ONAY / İMZA</div><div class="sline"></div><div class="sname">${quote.company_name || "Müşteri"}</div></div>
    <div class="sb"><div class="slbl">HAZIRLAYAN / İMZA</div><div class="sline"></div><div class="sname">${quote.prepared_by || "xShield"}</div></div>
  </div>
  <div class="ftr">
    <div class="flogo">x<span>Shield</span> IT Güvenlik &amp; Yönetim Hizmetleri</div>
    <div class="fcontact">info@xshield.com.tr · mng.xshield.com.tr</div>
  </div>
</div>
${termsPage}
</body></html>`;
}

export async function generateQuotePdf(quote: any, items: any[]): Promise<Buffer> {
  const html = buildHtml(quote, items);
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_EXEC,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
