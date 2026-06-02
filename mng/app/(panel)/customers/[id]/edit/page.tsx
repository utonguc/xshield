import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Müşteri Düzenle — xShield MNG" };

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const DEFAULT_RESPONSIBILITIES = `Zimmetlenen cihazları özenle kullanmak ve her türlü hasara karşı korumak.
Cihazları yalnızca iş amaçlı kullanmak; kişisel veya ticari amaçlarla kullanmamak.
Cihazlara izinsiz yazılım yüklememek, lisanssız içerik bulundurmamak ve mevcut kurumsal yazılımları kaldırmamak.
Cihazları üçüncü şahıslara devretmemek, kullandırmamak ve izinsiz ortamdan çıkarmamak.
Cihazın kaybolması, çalınması veya zarar görmesi durumunda en kısa sürede yetkili birime bildirmek.
Göreve son verilmesi, istifa veya görev değişikliği halinde zimmetli tüm cihazları eksiksiz ve çalışır hâlde iade etmek.
Kurumun bilgi güvenliği politikalarına, veri gizliliği kurallarına ve yazılı talimatlara uymak.
Cihaz üzerinde yetkisiz donanım değişikliği veya fiziksel müdahalede bulunmamak.
Şifre ve erişim bilgilerini başkalarıyla paylaşmamak; güvenlik açıklarını derhal bildirmek.
Bu tutanakta belirtilen kurallara aykırı davranışların hukuki ve idari yaptırıma tabi olduğunu kabul etmek.`;

async function updateCustomer(fd: FormData) {
  "use server";
  const id = fd.get("id");
  const get = (k: string) => (fd.get(k) as string)?.trim() || null;
  const getNum = (k: string) => { const v = fd.get(k); return v && v !== "" ? Number(v) : null; };

  await query(
    `UPDATE customers SET
       company_name=$1,contact_name=$2,contact_email=$3,contact_phone=$4,
       secondary_phone=$5,address=$6,city=$7,country=$8,service_scope=$9,
       monthly_fee=$10,currency=$11,billing_day=$12,contract_start=$13,
       contract_end=$14,status=$15,notes=$16,sla_response_hours=$17,
       sla_resolution_hours=$18,personnel_responsibilities=$19,updated_at=now()
     WHERE id=$20`,
    [
      get("company_name"), get("contact_name"), get("contact_email"),
      get("contact_phone"), get("secondary_phone"), get("address"),
      get("city"), get("country") || "TR", get("service_scope"),
      getNum("monthly_fee"), get("currency") || "USD", getNum("billing_day"),
      get("contract_start"), get("contract_end"), get("status"), get("notes"),
      getNum("sla_response_hours"), getNum("sla_resolution_hours"),
      get("personnel_responsibilities"), id,
    ]
  );
  redirect(`/customers/${id}?_toast=${encodeURIComponent("Müşteri güncellendi")}&_tt=success`);
}

async function uploadLogo(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = fd.get("customer_id") as string;
  const file = fd.get("logo") as File | null;
  if (!file || file.size === 0) {
    redirect(`/customers/${id}/edit?_toast=${encodeURIComponent("Dosya seçilmedi")}&_tt=error`);
  }
  if (file!.size > 5 * 1024 * 1024) {
    redirect(`/customers/${id}/edit?_toast=${encodeURIComponent("Logo 5 MB'dan büyük olamaz")}&_tt=error`);
  }
  const ext = file!.name.split(".").pop()?.toLowerCase() || "png";
  const storedName = `${randomUUID()}.${ext}`;
  const dir = path.join(UPLOAD_DIR, "logos");
  await mkdir(dir, { recursive: true });

  // Delete old logo if exists
  const old = await queryOne<{ logo_name: string | null }>("SELECT logo_name FROM customers WHERE id=$1", [id]);
  if (old?.logo_name) await unlink(path.join(dir, old.logo_name)).catch(() => {});

  await writeFile(path.join(dir, storedName), Buffer.from(await file!.arrayBuffer()));
  await query("UPDATE customers SET logo_name=$1,updated_at=now() WHERE id=$2", [storedName, id]);
  redirect(`/customers/${id}/edit?_toast=${encodeURIComponent("Logo yüklendi")}&_tt=success`);
}

async function removeLogo(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = fd.get("customer_id") as string;
  const old = await queryOne<{ logo_name: string | null }>("SELECT logo_name FROM customers WHERE id=$1", [id]);
  if (old?.logo_name) {
    await unlink(path.join(UPLOAD_DIR, "logos", old.logo_name)).catch(() => {});
  }
  await query("UPDATE customers SET logo_name=NULL,updated_at=now() WHERE id=$1", [id]);
  redirect(`/customers/${id}/edit?_toast=${encodeURIComponent("Logo kaldırıldı")}&_tt=success`);
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session?.role !== "admin") redirect(`/customers/${id}`);

  const c = await queryOne<Record<string, string | number | null>>("SELECT * FROM customers WHERE id=$1", [id]);
  if (!c) notFound();

  const val = (k: string) => (c[k] as string) ?? "";
  const dateVal = (k: string) => { const v = c[k]; if (!v) return ""; return new Date(v as string | Date).toISOString().split("T")[0]; };
  const hasLogo = !!c.logo_name;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="header">
          <Link href={`/customers/${id}`} className="back">← {c.company_name}</Link>
          <h1 className="title">Müşteri Düzenle</h1>
        </div>

        {/* Logo section — separate form */}
        <div className="section">
          <div className="sec-title">Firma Logosu</div>
          <div className="logo-area">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/customers/${id}/logo`} alt="Logo" className="logo-preview" />
            ) : (
              <div className="logo-empty">Logo yüklenmemiş</div>
            )}
            <div className="logo-actions">
              <form action={uploadLogo} encType="multipart/form-data" className="logo-upload-form">
                <input type="hidden" name="customer_id" value={id} />
                <label className="file-label">
                  <input type="file" name="logo" accept=".png,.jpg,.jpeg,.svg,.webp" className="file-hidden" />
                  <span className="file-btn">{hasLogo ? "Logoyu Değiştir" : "Logo Yükle"}</span>
                </label>
                <button type="submit" className="btn-upload">Kaydet</button>
                <span className="logo-hint">PNG, JPG, SVG — maks. 5 MB</span>
              </form>
              {hasLogo && (
                <form action={removeLogo}>
                  <input type="hidden" name="customer_id" value={id} />
                  <button type="submit" className="btn-remove-logo">Logoyu Kaldır</button>
                </form>
              )}
            </div>
          </div>
        </div>

        <form action={updateCustomer} className="form">
          <input type="hidden" name="id" value={id} />

          <div className="section">
            <div className="sec-title">Firma Bilgileri</div>
            <div className="grid2">
              <Field name="company_name" label="Firma Adı *" defaultValue={val("company_name")} required />
              <Field name="contact_name" label="Yetkili Kişi" defaultValue={val("contact_name")} />
              <Field name="contact_email" label="E-posta" type="email" defaultValue={val("contact_email")} />
              <Field name="contact_phone" label="Telefon" defaultValue={val("contact_phone")} />
              <Field name="secondary_phone" label="2. Telefon" defaultValue={val("secondary_phone")} />
              <Field name="city" label="Şehir" defaultValue={val("city")} />
              <Field name="address" label="Adres" defaultValue={val("address")} full />
            </div>
          </div>

          <div className="section">
            <div className="sec-title">Hizmet & Sözleşme</div>
            <div className="grid2">
              <Field name="monthly_fee" label="Aylık Ücret" type="number" defaultValue={val("monthly_fee")} />
              <SelectField name="currency" label="Para Birimi" options={["USD","TRY","EUR"]} defaultValue={val("currency")} />
              <Field name="billing_day" label="Fatura Günü" type="number" defaultValue={val("billing_day")} />
              <SelectField name="status" label="Durum" options={["active","inactive","prospect","suspended"]} labels={["Aktif","Pasif","Aday","Askıya Alındı"]} defaultValue={val("status")} />
              <Field name="contract_start" label="Başlangıç" type="date" defaultValue={dateVal("contract_start")} />
              <Field name="contract_end" label="Bitiş" type="date" defaultValue={dateVal("contract_end")} />
              <Field name="sla_response_hours" label="SLA İlk Yanıt (saat)" type="number" defaultValue={val("sla_response_hours")} />
              <Field name="sla_resolution_hours" label="SLA Çözüm (saat)" type="number" defaultValue={val("sla_resolution_hours")} />
            </div>
            <div className="field full">
              <label>Hizmet Kapsamı</label>
              <textarea name="service_scope" rows={5} defaultValue={val("service_scope")} />
            </div>
            <div className="field full">
              <label>Notlar</label>
              <textarea name="notes" rows={3} defaultValue={val("notes")} />
            </div>
          </div>

          <div className="section">
            <div className="sec-title">Personel Sorumlulukları (Zimmet Formu)</div>
            <p className="resp-hint">
              Bu alan zimmet formunda madde madde basılır. Her satır ayrı bir madde olarak gösterilir.
              Boş bırakırsanız zimmet formunda sorumluluk bölümü görünmez.
            </p>
            <div className="field full">
              <textarea
                name="personnel_responsibilities"
                rows={10}
                placeholder={DEFAULT_RESPONSIBILITIES}
                defaultValue={val("personnel_responsibilities")}
              />
            </div>
          </div>

          <div className="actions">
            <Link href={`/customers/${id}`} className="btn-cancel">İptal</Link>
            <button type="submit" className="btn-save">Güncelle</button>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({ name, label, type = "text", defaultValue = "", required = false, full = false }: {
  name: string; label: string; type?: string; defaultValue?: string; required?: boolean; full?: boolean;
}) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label>{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} required={required || undefined} />
    </div>
  );
}

function SelectField({ name, label, options, labels, defaultValue = "" }: {
  name: string; label: string; options: string[]; labels?: string[]; defaultValue?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select name={name} defaultValue={defaultValue}>
        {options.map((o, i) => <option key={o} value={o}>{labels?.[i] ?? o}</option>)}
      </select>
    </div>
  );
}

const css = `
.page{padding:28px;max-width:900px;display:flex;flex-direction:column;gap:24px}
@media(max-width:640px){.page{padding:16px;gap:16px}}
.header{margin-bottom:0}
.back{font-size:13px;color:var(--text-dimmer);display:block;margin-bottom:8px}
.back:hover{color:var(--text-muted)}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
.form{display:contents}
.section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px}
.sec-title{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:18px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
@media(max-width:600px){.grid2{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:6px}
.field.full{grid-column:1/-1}
.field label{font-size:11px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:0.06em}
.field input,.field select,.field textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;transition:border-color 0.15s;resize:vertical;font-family:inherit}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6}
/* Logo */
.logo-area{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.logo-preview{max-height:70px;max-width:200px;object-fit:contain;border:1px solid var(--border2);border-radius:8px;padding:6px;background:var(--input-bg)}
.logo-empty{font-size:12px;color:var(--text-ghost);padding:20px;border:1px dashed var(--border2);border-radius:8px;background:var(--input-bg)}
.logo-actions{display:flex;flex-direction:column;gap:8px}
.logo-upload-form{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.file-hidden{display:none}
.file-label{cursor:pointer}
.file-btn{font-size:12px;font-weight:600;padding:7px 14px;border-radius:7px;border:1px solid var(--input-border);background:var(--input-bg);color:var(--text-muted);cursor:pointer;white-space:nowrap}
.logo-hint{font-size:11px;color:var(--text-ghost)}
.btn-upload{padding:7px 16px;border-radius:7px;font-size:12px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-upload:hover{background:#1d4ed8}
.btn-remove-logo{font-size:11px;color:#ef4444;background:transparent;border:1px solid rgba(239,68,68,0.3);padding:5px 10px;border-radius:6px;cursor:pointer}
.btn-remove-logo:hover{background:rgba(239,68,68,0.08)}
.resp-hint{font-size:12px;color:var(--text-ghost);margin:0 0 12px;line-height:1.6}
/* Actions */
.actions{display:flex;justify-content:flex-end;gap:12px}
.btn-cancel{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-dim);border:1px solid var(--border2);background:transparent}
.btn-save{padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
`;
