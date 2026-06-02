import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Yeni Müşteri — xShield MNG" };

async function createCustomer(fd: FormData) {
  "use server";
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  const getNum = (k: string) => { const v = fd.get(k); return v && v !== "" ? Number(v) : null; };
  await query(
    `INSERT INTO customers
       (company_name,contact_name,contact_email,contact_phone,secondary_phone,
        address,city,country,service_scope,monthly_fee,currency,billing_day,
        contract_start,contract_end,status,notes,sla_response_hours,sla_resolution_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [get("company_name"),get("contact_name"),get("contact_email"),get("contact_phone"),get("secondary_phone"),
     get("address"),get("city"),get("country")||"TR",get("service_scope"),getNum("monthly_fee"),
     get("currency")||"USD",getNum("billing_day"),get("contract_start"),get("contract_end"),
     get("status")||"active",get("notes"),getNum("sla_response_hours"),getNum("sla_resolution_hours")]
  );
  redirect(`/customers?_toast=${encodeURIComponent("Müşteri oluşturuldu")}&_tt=success`);
}

export default function NewCustomerPage() {
  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="header">
          <Link href="/customers" className="back">← Müşteriler</Link>
          <h1 className="title">Yeni Müşteri</h1>
        </div>
        <form action={createCustomer} className="form">
          <div className="section">
            <div className="sec-title">Firma Bilgileri</div>
            <div className="grid2">
              <Field name="company_name" label="Firma Adı *" required />
              <Field name="contact_name" label="Yetkili Kişi" />
              <Field name="contact_email" label="E-posta" type="email" />
              <Field name="contact_phone" label="Telefon" />
              <Field name="secondary_phone" label="2. Telefon" />
              <Field name="city" label="Şehir" />
              <Field name="address" label="Adres" full />
            </div>
          </div>
          <div className="section">
            <div className="sec-title">Hizmet & Sözleşme</div>
            <div className="grid2">
              <Field name="monthly_fee" label="Aylık Ücret" type="number" />
              <SelectField name="currency" label="Para Birimi" options={["USD","TRY","EUR"]} />
              <Field name="billing_day" label="Fatura Günü (1-31)" type="number" />
              <SelectField name="status" label="Durum" options={["active","inactive","prospect","suspended"]} labels={["Aktif","Pasif","Aday","Askıya Alındı"]} />
              <Field name="contract_start" label="Sözleşme Başlangıcı" type="date" />
              <Field name="contract_end" label="Sözleşme Bitişi" type="date" />
              <Field name="sla_response_hours" label="SLA İlk Yanıt (saat)" type="number" />
              <Field name="sla_resolution_hours" label="SLA Çözüm (saat)" type="number" />
            </div>
            <div className="field full">
              <label>Hizmet Kapsamı</label>
              <textarea name="service_scope" rows={5} placeholder="Sağlanan hizmetlerin detayı…" />
            </div>
            <div className="field full">
              <label>Notlar</label>
              <textarea name="notes" rows={3} />
            </div>
          </div>
          <div className="actions">
            <Link href="/customers" className="btn-cancel">İptal</Link>
            <button type="submit" className="btn-save">Kaydet</button>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({ name, label, type = "text", required = false, full = false }: {
  name: string; label: string; type?: string; required?: boolean; full?: boolean;
}) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} required={required || undefined} />
    </div>
  );
}
function SelectField({ name, label, options, labels }: {
  name: string; label: string; options: string[]; labels?: string[];
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name}>
        {options.map((o, i) => <option key={o} value={o}>{labels?.[i] ?? o}</option>)}
      </select>
    </div>
  );
}

const css = `
.page{padding:28px;max-width:900px}
.header{margin-bottom:24px}
.back{font-size:13px;color:var(--text-dim);display:block;margin-bottom:8px}
.back:hover{color:var(--text-muted)}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.form{display:flex;flex-direction:column;gap:24px}
.section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px}
.sec-title{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:18px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.field{display:flex;flex-direction:column;gap:6px}
.field.full{grid-column:1/-1}
.field label{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select,.field textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;transition:border-color 0.15s;resize:vertical}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6}
.field select option{background:var(--card)}
.actions{display:flex;justify-content:flex-end;gap:12px}
.btn-cancel{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent}
.btn-save{padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
`;
