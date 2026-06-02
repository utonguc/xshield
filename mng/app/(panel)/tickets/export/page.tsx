import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ExportForm } from "./_client";

export const metadata: Metadata = { title: "CSV Export/Import — xShield MNG" };
export const dynamic = "force-dynamic";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const norm = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let row: string[] = [];
  let field = "";
  let inQ = false;

  for (let i = 0; i <= norm.length; i++) {
    const c = i < norm.length ? norm[i] : "\n";
    if (inQ) {
      if (c === '"') {
        if (norm[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") {
        row.push(field); field = "";
        if (row.some((f) => f !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  return rows;
}

async function importTickets(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");

  const file = fd.get("file") as File | null;
  if (!file || file.size === 0)
    redirect("/tickets/export?tab=import&err=" + encodeURIComponent("Dosya seçilmedi"));

  const text = await file.text();
  const clean = text.startsWith("﻿") ? text.slice(1) : text;
  const rows = parseCSV(clean);

  if (rows.length < 2)
    redirect("/tickets/export?tab=import&err=" + encodeURIComponent("CSV boş veya geçersiz format"));

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const iSubject = col("subject");
  if (iSubject === -1)
    redirect("/tickets/export?tab=import&err=" + encodeURIComponent("Geçersiz şablon: 'subject' sütunu bulunamadı"));

  const iFromName = col("from_name");
  const iFromEmail = col("from_email");
  const iCompany = col("company");
  const iStatus = col("status");
  const iPriority = col("priority");
  const iCategory = col("category");
  const iSubcat = col("subcategory");
  const iAssigned = col("assigned_to");
  const iBody = col("body");
  const iCreatedAt = col("created_at");
  const iResolvedAt = col("resolved_at");

  const [customers, categories, subcats, users] = await Promise.all([
    query<{ id: number; company_name: string }>("SELECT id,company_name FROM customers"),
    query<{ id: number; name: string }>("SELECT id,name FROM ticket_categories"),
    query<{ id: number; name: string }>("SELECT id,name FROM ticket_subcategories"),
    query<{ id: number; username: string }>("SELECT id,username FROM users"),
  ]);

  const custMap = new Map(customers.map((c) => [c.company_name.toLowerCase(), c.id]));
  const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const subcatMap = new Map(subcats.map((s) => [s.name.toLowerCase(), s.id]));
  const userMap = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));

  const VALID_STATUS = new Set(["open", "in_progress", "waiting_customer", "resolved", "closed"]);
  const VALID_PRIORITY = new Set(["critical", "high", "normal", "low"]);

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const g = (idx: number) => (idx >= 0 && idx < r.length ? r[idx].trim() : "");

    const subject = g(iSubject);
    if (!subject) { skipped++; continue; }

    const fromEmail = g(iFromEmail) || null;
    const fromName = g(iFromName) || fromEmail;
    const company = g(iCompany);
    const statusRaw = g(iStatus);
    const priorityRaw = g(iPriority);
    const categoryName = g(iCategory);
    const subcatName = g(iSubcat);
    const assignedName = g(iAssigned);
    const body = g(iBody);
    const createdRaw = g(iCreatedAt);
    const resolvedRaw = g(iResolvedAt);

    const customerId = company ? (custMap.get(company.toLowerCase()) ?? null) : null;
    const categoryId = categoryName ? (catMap.get(categoryName.toLowerCase()) ?? null) : null;
    const subcatId = subcatName ? (subcatMap.get(subcatName.toLowerCase()) ?? null) : null;
    const assignedTo = assignedName ? (userMap.get(assignedName.toLowerCase()) ?? null) : null;
    const status = VALID_STATUS.has(statusRaw) ? statusRaw : "open";
    const priority = VALID_PRIORITY.has(priorityRaw) ? priorityRaw : "normal";

    const createdDate = createdRaw ? new Date(createdRaw) : null;
    const createdAt = createdDate && !isNaN(createdDate.getTime()) ? createdDate : new Date();
    const resolvedDate = resolvedRaw ? new Date(resolvedRaw) : null;
    const resolvedAt = resolvedDate && !isNaN(resolvedDate.getTime()) ? resolvedDate : null;

    try {
      await query(
        `INSERT INTO tickets
           (subject,body,status,priority,source,from_email,from_name,
            customer_id,category_id,subcategory_id,assigned_to,
            created_at,resolved_at,updated_at)
         VALUES ($1,$2,$3,$4,'csv_import',$5,$6,$7,$8,$9,$10,$11,$12,now())`,
        [subject, body, status, priority, fromEmail, fromName,
          customerId, categoryId, subcatId, assignedTo, createdAt, resolvedAt]
      );
      imported++;
    } catch (e) {
      console.error("[csv-import] row error:", e);
      skipped++;
    }
  }

  redirect(`/tickets/export?tab=import&ok=${imported}&skipped=${skipped}`);
}

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string; skipped?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "import" ? "import" : "export";

  const session = await getSession();
  if (!session) redirect("/login");

  const customers = await query<{ id: number; company_name: string; status: string }>(
    "SELECT id,company_name,status FROM customers ORDER BY company_name"
  );

  const TEMPLATE_COLS = [
    "id","subject","from_name","from_email","company","status","priority",
    "category","subcategory","created_at","first_response_at","resolved_at","assigned_to","body",
  ];

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="page-header">
          <Link href="/tickets" className="back">← Destek Talepleri</Link>
          <h1 className="title">CSV Export / Import</h1>
        </div>

        <div className="tabs">
          <Link href="/tickets/export?tab=export" className={`tab${tab === "export" ? " active" : ""}`}>
            Dışa Aktar
          </Link>
          <Link href="/tickets/export?tab=import" className={`tab${tab === "import" ? " active" : ""}`}>
            İçe Aktar
          </Link>
        </div>

        {tab === "export" ? (
          <ExportForm customers={customers} />
        ) : (
          <div className="card">
            <div className="card-title">CSV Dosyası İçe Aktar</div>

            {sp.err && (
              <div className="alert alert-error">{decodeURIComponent(sp.err)}</div>
            )}
            {sp.ok !== undefined && (
              <div className="alert alert-success">
                {sp.ok} kayıt başarıyla eklendi
                {Number(sp.skipped) > 0 ? `, ${sp.skipped} satır atlandı` : ""}.
              </div>
            )}

            <div className="template-box">
              <div className="template-title">Şablon Sütunları</div>
              <div className="col-pills">
                {TEMPLATE_COLS.map((c) => (
                  <span key={c} className="col-pill">{c}</span>
                ))}
              </div>
              <div className="template-note">
                <strong>id</strong> sütunu yok sayılır. <strong>status</strong>: open · in_progress · waiting_customer · resolved · closed.{" "}
                <strong>priority</strong>: critical · high · normal · low.{" "}
                <strong>company</strong>, <strong>category</strong>, <strong>assigned_to</strong> eşleştirme için tam isim olmalı.
              </div>
              <a href="/api/tickets/export?customers=all" className="btn-template">
                Mevcut Verileri Şablon Olarak İndir
              </a>
            </div>

            <form action={importTickets} encType="multipart/form-data" className="form import-form">
              <div className="field">
                <label>CSV Dosyası Seç</label>
                <input type="file" name="file" accept=".csv,text/csv" required className="file-input" />
                <span className="field-hint">UTF-8 kodlamalı CSV. Excel için &quot;Farklı Kaydet → CSV UTF-8&quot; kullanın.</span>
              </div>
              <div className="actions">
                <button type="submit" className="btn-import">Yükle ve İçe Aktar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

const css = `
.page{padding:28px;max-width:780px}
@media(max-width:640px){.page{padding:16px}}
.page-header{margin-bottom:20px}
.back{font-size:13px;color:var(--text-dimmer);display:block;margin-bottom:10px}
.back:hover{color:var(--text-muted)}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--divider);margin-bottom:24px}
.tab{padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-dim);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;text-decoration:none}
.tab:hover{color:var(--text-muted)}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px}
.card-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:20px}
.form{display:flex;flex-direction:column;gap:18px}
.import-form{margin-top:20px;padding-top:20px;border-top:1px solid var(--divider)}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:480px){.field-row{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input[type=date]{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;transition:border-color 0.15s}
.field input[type=date]:focus{border-color:#3b82f6}
.field-hint{font-size:11px;color:var(--text-ghost)}
/* all-toggle */
.all-toggle{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-muted);cursor:pointer;padding:10px 12px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;margin-top:2px;min-height:44px}
.all-toggle input{width:16px;height:16px;accent-color:#3b82f6;flex-shrink:0}
/* customer section */
.customer-section{margin-top:10px;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.cust-toolbar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--input-bg);border-bottom:1px solid var(--border)}
.link-btn{background:none;border:none;color:#3b82f6;font-size:12px;font-weight:600;cursor:pointer;padding:0}
.link-btn:hover{color:#2563eb}
.sep{color:var(--text-ghost);font-size:12px}
.sel-count{margin-left:auto;font-size:12px;color:var(--text-dimmer)}
.customer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0;max-height:280px;overflow-y:auto;padding:8px}
@media(max-width:480px){.customer-grid{grid-template-columns:1fr 1fr}}
.cust-check{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--text-muted);cursor:pointer;padding:8px 8px;border-radius:6px;transition:background 0.1s;min-height:38px}
.cust-check:hover{background:var(--row-hover)}
.cust-check.checked{color:var(--text)}
.cust-check input{width:15px;height:15px;accent-color:#3b82f6;flex-shrink:0}
.dim{color:var(--text-ghost)}
/* actions */
.actions{display:flex;justify-content:flex-end;padding-top:4px}
.btn-export,.btn-import{padding:11px 26px;border-radius:8px;font-size:13px;font-weight:700;border:none;cursor:pointer;color:#fff;background:#2563eb;min-height:44px;min-width:130px}
.btn-export:hover,.btn-import:hover{background:#1d4ed8}
/* alerts */
.alert{padding:12px 16px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:16px}
.alert-error{background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2)}
.alert-success{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.2)}
/* template box */
.template-box{background:var(--input-bg);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px}
.template-title{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.col-pills{display:flex;flex-wrap:wrap;gap:5px}
.col-pill{font-size:11px;font-weight:600;color:var(--text-muted);background:var(--card2);border:1px solid var(--border2);border-radius:4px;padding:2px 7px;font-family:monospace}
.template-note{font-size:12px;color:var(--text-dim);line-height:1.6}
.btn-template{display:inline-flex;align-items:center;padding:8px 14px;background:transparent;border:1px solid var(--border2);border-radius:7px;font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;text-decoration:none;align-self:flex-start;min-height:38px;transition:all 0.15s}
.btn-template:hover{border-color:#3b82f6;color:#3b82f6}
/* file input */
.file-input{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);cursor:pointer}
.file-input::-webkit-file-upload-button{background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;margin-right:12px}
`;
