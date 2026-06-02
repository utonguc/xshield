import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import QuoteActions from "./QuoteActions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const q = await queryOne<{ quote_no: string }>("SELECT quote_no FROM quotes WHERE id=$1", [Number(id)]);
  return { title: q ? `${q.quote_no} — xShield MNG` : "Teklif" };
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak", sent: "Gönderildi", accepted: "Onaylandı",
  rejected: "Reddedildi", expired: "Süresi Doldu",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#64748b", sent: "#3b82f6", accepted: "#22c55e",
  rejected: "#ef4444", expired: "#f59e0b",
};
const CUR_SYM: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function fmt(n: number, cur: string) {
  return `${CUR_SYM[cur] ?? cur}${Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateShort(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function QuoteDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const quote = await queryOne<any>(
    `SELECT q.*, c.company_name, c.contact_email, c.contact_phone, c.address, c.city
     FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id WHERE q.id=$1`,
    [Number(id)]
  );
  if (!quote) notFound();

  const items = await query<any>(
    "SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY sort_order",
    [Number(id)]
  );

  const sc = STATUS_COLOR[quote.status] ?? "#64748b";
  const sym = CUR_SYM[quote.currency] ?? quote.currency;

  return (
    <>
      <style>{css}</style>

      {/* ── Screen UI ── */}
      <div className="page no-print">
        <div className="hdr">
          <div>
            <div className="bc"><Link href="/quotes">Teklifler</Link> / <span style={{ color: "var(--text-muted)" }}>{quote.quote_no}</span></div>
            <h1 className="title">{quote.quote_no}</h1>
          </div>
          <div className="hdr-actions">
            <QuoteActions quoteId={quote.id} quoteNo={quote.quote_no}
              contactEmail={quote.contact_email || ""}
              status={quote.status} />
            <Link href={`/quotes/${quote.id}/edit`} className="btn-edit">Düzenle</Link>
          </div>
        </div>

        {/* Info cards */}
        <div className="info-grid">
          <div className="info-card">
            <div className="info-label">Teklif No</div>
            <div className="info-val mono">{quote.quote_no}</div>
          </div>
          <div className="info-card">
            <div className="info-label">Durum</div>
            <div>
              <span className="status-badge" style={{ color: sc, background: `${sc}15`, borderColor: `${sc}35` }}>
                {STATUS_LABEL[quote.status] ?? quote.status}
              </span>
            </div>
          </div>
          <div className="info-card">
            <div className="info-label">Teklif Tarihi</div>
            <div className="info-val">{fmtDate(quote.quote_date)}</div>
          </div>
          <div className="info-card">
            <div className="info-label">Geçerlilik</div>
            <div className="info-val">{fmtDate(quote.valid_until)}</div>
          </div>
          <div className="info-card">
            <div className="info-label">Müşteri</div>
            <div className="info-val">{quote.company_name || "—"}</div>
            {quote.contact_person && <div className="info-sub">İlgili: {quote.contact_person}</div>}
          </div>
          <div className="info-card">
            <div className="info-label">Hazırlayan</div>
            <div className="info-val">{quote.prepared_by || "—"}</div>
            {quote.contact_email && <div className="info-sub">{quote.contact_email}</div>}
          </div>
        </div>

        {/* Items */}
        <div className="main-card">
          <div className="section-title">Teklif Kalemleri</div>
          <div style={{ overflowX: "auto" }}>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Ürün Kodu</th>
                  <th>Ürün Tanımı</th>
                  <th>Adet</th>
                  <th>Birim Fiyat</th>
                  <th>Toplam</th>
                  <th className="int-col-h" title="Dahili — müşteriye gösterilmez">🔒 Marj %</th>
                  <th className="int-col-h" title="Dahili — müşteriye gösterilmez">🔒 Tedarikçi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>{item.product_code || "—"}</td>
                    <td style={{ fontWeight: 500 }}>{item.description}</td>
                    <td style={{ textAlign: "center" }}>{Number(item.quantity).toLocaleString("tr-TR")}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{fmt(item.unit_price, quote.currency)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(item.total_price, quote.currency)}</td>
                    <td className="int-col-v" style={{ textAlign: "right" }}>
                      {item.margin_pct != null ? `%${Number(item.margin_pct).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "—"}
                    </td>
                    <td className="int-col-v">{item.supplier_note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="totals">
            <div className="total-row"><span>Ara Toplam</span><span>{fmt(quote.subtotal, quote.currency)}</span></div>
            <div className="total-row"><span>KDV %{quote.tax_rate}</span><span>{fmt(quote.tax_amount, quote.currency)}</span></div>
            <div className="total-grand">
              <span>Genel Toplam</span>
              <span>{fmt(quote.total, quote.currency)}</span>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="main-card">
            <div className="section-title">Notlar</div>
            <pre className="notes-text">{quote.notes}</pre>
          </div>
        )}
        {quote.terms && (
          <div className="main-card">
            <div className="section-title">Satış Koşulları</div>
            <pre className="notes-text">{quote.terms}</pre>
          </div>
        )}
      </div>

      {/* ── PRINT VIEW (A4) ── */}
      <div className="print-only" id="print-doc">
        <div className="p-page">
          <div className="p-wm-brand">xSHIELD</div>
          {quote.status === 'draft' && <div className="p-wm-status p-wm-draft">TASLAK</div>}
          {quote.status === 'rejected' && <div className="p-wm-status p-wm-rejected">İPTAL</div>}
          {quote.status === 'expired' && <div className="p-wm-status p-wm-expired">GEÇERSİZ</div>}

          {/* Header */}
          <div className="p-header">
            <div className="p-logo-block">
              <div className="p-logo">x<span>Shield</span></div>
              <div className="p-logo-sub">IT Güvenlik &amp; Yönetim Hizmetleri</div>
            </div>
            <div className="p-title-block">
              <div className="p-doc-title">FİYAT TEKLİFİ</div>
              <div className="p-doc-no">{quote.quote_no}</div>
            </div>
          </div>

          {/* Meta row */}
          <div className="p-meta">
            <div className="p-meta-left">
              <div className="p-meta-row"><span>Teklif Numarası</span><strong>{quote.quote_no}</strong></div>
              <div className="p-meta-row"><span>Teklif Tarihi</span><strong>{fmtDateShort(quote.quote_date)}</strong></div>
              {quote.valid_until && <div className="p-meta-row"><span>Geçerlilik Tarihi</span><strong>{fmtDateShort(quote.valid_until)}</strong></div>}
              {quote.prepared_by && <div className="p-meta-row"><span>Hazırlayan</span><strong>{quote.prepared_by}</strong></div>}
            </div>
            <div className="p-meta-right">
              <div className="p-cust-label">İlgili Firma</div>
              <div className="p-cust-name">{quote.company_name || "—"}</div>
              {quote.contact_person && <div className="p-cust-row"><span>İlgili Kişi</span><strong>{quote.contact_person}</strong></div>}
              {quote.contact_email && <div className="p-cust-row"><span>E-posta</span><strong>{quote.contact_email}</strong></div>}
              {quote.contact_phone && <div className="p-cust-row"><span>Telefon</span><strong>{quote.contact_phone}</strong></div>}
              {quote.address && <div className="p-cust-row"><span>Adres</span><strong>{quote.address}{quote.city ? `, ${quote.city}` : ""}</strong></div>}
            </div>
          </div>

          {/* Items table — no internal columns */}
          <table className="p-table">
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Ürün Kodu</th>
                <th>Ürün Tanımı</th>
                <th style={{ width: "8%", textAlign: "center" }}>Adet</th>
                <th style={{ width: "15%", textAlign: "right" }}>Birim Fiyat</th>
                <th style={{ width: "15%", textAlign: "right" }}>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={item.id} className={idx % 2 === 0 ? "p-tr-even" : ""}>
                  <td className="p-code">{item.product_code || "—"}</td>
                  <td>{item.description}</td>
                  <td style={{ textAlign: "center" }}>{Number(item.quantity).toLocaleString("tr-TR")}</td>
                  <td style={{ textAlign: "right" }}>{fmt(item.unit_price, quote.currency)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(item.total_price, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="p-totals">
            <div className="p-total-row"><span>Ara Toplam</span><span>{sym} {Number(quote.subtotal).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
            <div className="p-total-row"><span>KDV %{Number(quote.tax_rate)}</span><span>{sym} {Number(quote.tax_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
            <div className="p-total-grand"><span>Genel Toplam</span><span>{sym} {Number(quote.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="p-notes">
              <pre className="p-notes-text">{quote.notes}</pre>
            </div>
          )}

          {/* Signature */}
          <div className="p-signature">
            <div className="p-sig-left">
              <div className="p-sig-label">ONAY / İMZA</div>
              <div className="p-sig-line"></div>
              <div className="p-sig-name">{quote.company_name || "Müşteri"}</div>
            </div>
            <div className="p-sig-right">
              <div className="p-sig-label">HAZIRLAYAN / İMZA</div>
              <div className="p-sig-line"></div>
              <div className="p-sig-name">{quote.prepared_by || "xShield"}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-footer">
            <div className="p-footer-logo">x<span>Shield</span> IT Güvenlik &amp; Yönetim Hizmetleri</div>
            <div className="p-footer-contact">info@xshield.com.tr · mng.xshield.com.tr</div>
          </div>
        </div>
      </div>

      {/* ── Terms: separate A4 page ── */}
      {quote.terms && (
        <div className="print-only p-terms-page">
          <div className="p-page">
            <div className="p-wm-brand">xSHIELD</div>
            {quote.status === 'draft' && <div className="p-wm-status p-wm-draft">TASLAK</div>}
            {quote.status === 'rejected' && <div className="p-wm-status p-wm-rejected">İPTAL</div>}
            {quote.status === 'expired' && <div className="p-wm-status p-wm-expired">GEÇERSİZ</div>}
            <div className="p-header">
              <div className="p-logo-block">
                <div className="p-logo">x<span>Shield</span></div>
                <div className="p-logo-sub">IT Güvenlik &amp; Yönetim Hizmetleri</div>
              </div>
              <div className="p-title-block">
                <div className="p-doc-title" style={{ fontSize: "14pt" }}>SATIŞ KOŞULLARI</div>
                <div className="p-doc-no">{quote.quote_no}</div>
              </div>
            </div>
            <div className="p-terms">
              <pre className="p-terms-text">{quote.terms}</pre>
            </div>
            <div className="p-footer">
              <div className="p-footer-logo">x<span>Shield</span> IT Güvenlik &amp; Yönetim Hizmetleri</div>
              <div className="p-footer-contact">info@xshield.com.tr · mng.xshield.com.tr</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
/* ── Screen ── */
.page { padding:28px; display:flex; flex-direction:column; gap:16px; max-width:960px; }
@media(max-width:640px) { .page { padding:16px; gap:12px; } }
.hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.bc { font-size:12px; color:var(--text-ghost); margin-bottom:4px; }
.bc a { color:var(--text-dim); } .bc a:hover { color:#3b82f6; }
.title { font-size:22px; font-weight:800; color:var(--text); letter-spacing:-0.5px; }
.hdr-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.btn-edit { padding:9px 18px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--text-dim); font-size:13px; font-weight:600; white-space:nowrap; }
.btn-edit:hover { color:var(--text); border-color:var(--border2); }
.info-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
@media(max-width:640px) { .info-grid { grid-template-columns:1fr 1fr; } }
.info-card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 16px; }
.info-label { font-size:10px; font-weight:700; color:var(--text-ghost); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:6px; }
.info-val { font-size:14px; font-weight:600; color:var(--text-sub); }
.info-sub { font-size:11px; color:var(--text-dim); margin-top:3px; }
.mono { font-family:monospace; }
.status-badge { font-size:12px; font-weight:700; padding:4px 10px; border-radius:6px; border:1px solid; }
.main-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px; }
.section-title { font-size:11px; font-weight:700; color:var(--text-ghost); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:14px; }
.items-table { width:100%; border-collapse:collapse; min-width:640px; }
.items-table th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; color:var(--text-dimmer); text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--divider); background:var(--card2); white-space:nowrap; }
.items-table td { padding:10px 12px; border-bottom:1px solid var(--row-border); font-size:13px; color:var(--text-sub); }
.items-table tr:last-child td { border-bottom:none; }
.int-col-h { background:rgba(99,102,241,0.08)!important; color:#818cf8!important; font-size:9px!important; }
.int-col-v { background:rgba(99,102,241,0.04); color:var(--text-dim); font-size:12px; }
.totals { display:flex; flex-direction:column; align-items:flex-end; gap:4px; margin-top:16px; padding-top:16px; border-top:1px solid var(--divider); }
.total-row { display:flex; justify-content:space-between; gap:48px; min-width:260px; font-size:13px; color:var(--text-dim); padding:3px 8px; }
.total-grand { display:flex; justify-content:space-between; gap:48px; min-width:260px; background:#1e3a5f; border-radius:8px; padding:10px 14px; margin-top:4px; }
.total-grand span:first-child { font-size:14px; font-weight:700; color:#fff; }
.total-grand span:last-child { font-size:16px; font-weight:900; color:#3b82f6; }
.notes-text { font-family:inherit; font-size:13px; color:var(--text-dim); line-height:1.7; white-space:pre-wrap; margin:0; }

/* ── Print ── */
.no-print {}
.print-only { display:none; }

@media print {
  * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
  .no-print { display:none!important; }
  .print-only { display:block!important; }
  aside { display:none!important; }
  main { margin-left:0!important; }
  body { background:#fff!important; color:#000!important; }
}

.p-page { font-family:'Segoe UI',Arial,sans-serif; font-size:10pt; color:#1e293b; background:#fff; padding:0; width:100%; position:relative; }
.p-wm-brand { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:80pt; font-weight:900; color:rgba(15,23,42,0.07); white-space:nowrap; pointer-events:none; z-index:0; letter-spacing:0.1em; user-select:none; }
.p-wm-status { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-size:60pt; font-weight:900; white-space:nowrap; pointer-events:none; z-index:1; letter-spacing:0.06em; user-select:none; border-width:8px; border-style:solid; padding:8px 20px; border-radius:8px; opacity:0.22; }
.p-wm-draft { color:#64748b; border-color:#64748b; }
.p-wm-rejected { color:#dc2626; border-color:#dc2626; }
.p-wm-expired { color:#ea580c; border-color:#ea580c; }
.p-header { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 24px 16px; background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%); }
.p-logo { font-size:22pt; font-weight:900; color:#fff; }
.p-logo span { color:#3b82f6; }
.p-logo-sub { font-size:7pt; color:#94a3b8; margin-top:3px; letter-spacing:0.12em; text-transform:uppercase; }
.p-title-block { text-align:right; }
.p-doc-title { font-size:16pt; font-weight:900; color:#fff; letter-spacing:1px; }
.p-doc-no { font-size:11pt; color:#3b82f6; font-weight:700; margin-top:4px; }
.p-meta { display:flex; border-bottom:2px solid #e2e8f0; }
.p-meta-left { flex:1; padding:14px 18px; border-right:1px solid #e2e8f0; }
.p-meta-right { flex:1; padding:14px 18px; }
.p-meta-row { display:flex; justify-content:space-between; font-size:9pt; margin-bottom:4px; }
.p-meta-row span { color:#64748b; }
.p-meta-row strong { color:#0f172a; }
.p-cust-label { font-size:7pt; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:5px; }
.p-cust-name { font-size:13pt; font-weight:800; color:#0f172a; margin-bottom:5px; }
.p-cust-row { display:flex; justify-content:space-between; font-size:9pt; margin-bottom:3px; }
.p-cust-row span { color:#64748b; }
.p-cust-row strong { color:#0f172a; }
.p-table { width:100%; border-collapse:collapse; margin-top:0; }
.p-table th { padding:8px 10px; text-align:left; font-size:8pt; font-weight:700; color:#fff; background:#1e3a5f; border:1px solid #2d4a6b; letter-spacing:0.04em; }
.p-table td { padding:7px 10px; font-size:9pt; border-bottom:1px solid #e2e8f0; color:#1e293b; }
.p-tr-even td { background:#f8fafc; }
.p-code { font-family:monospace; font-size:8pt; color:#64748b; }
.p-totals { display:flex; flex-direction:column; align-items:flex-end; padding:12px 18px 8px; gap:3px; }
.p-total-row { display:flex; justify-content:space-between; min-width:240px; font-size:9pt; color:#64748b; padding:3px 8px; }
.p-total-row span:last-child { font-weight:600; color:#0f172a; }
.p-total-grand { display:flex; justify-content:space-between; min-width:240px; background:#0f172a; padding:9px 12px; border-radius:6px; margin-top:4px; }
.p-total-grand span:first-child { font-size:11pt; font-weight:700; color:#fff; }
.p-total-grand span:last-child { font-size:13pt; font-weight:900; color:#3b82f6; }
.p-notes { padding:10px 18px; border-top:1px solid #e2e8f0; margin-top:4px; }
.p-notes-text { font-family:inherit; font-size:8pt; color:#475569; line-height:1.6; white-space:pre-wrap; margin:0; }
.p-terms { padding:16px 24px; margin-top:0; }
.p-terms-title { font-size:7pt; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:5px; }
.p-terms-text { font-family:inherit; font-size:7.5pt; color:#475569; line-height:1.55; white-space:pre-wrap; margin:0; }
.p-signature { display:flex; gap:24px; padding:20px 18px 10px; border-top:1px solid #e2e8f0; margin-top:16px; }
.p-sig-left,.p-sig-right { flex:1; }
.p-sig-label { font-size:7pt; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:28px; }
.p-sig-line { border-bottom:1.5px solid #1e293b; width:80%; margin-bottom:6px; }
.p-sig-name { font-size:9pt; color:#475569; font-weight:600; }
.p-terms-page { page-break-before:always; break-before:page; }
.p-footer { padding:10px 18px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; }
.p-footer-logo { font-size:10pt; font-weight:700; color:#0f172a; }
.p-footer-logo span { color:#3b82f6; }
.p-footer-contact { font-size:8pt; color:#64748b; margin-top:3px; }
`;
