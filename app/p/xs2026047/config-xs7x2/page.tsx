import { getPrices, savePrices, calcTotal, fmt, type ProposalPrices } from "@/lib/proposal-config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function save(fd: FormData) {
  "use server";
  const p: ProposalPrices = {
    gelistirme:    Number(fd.get("gelistirme"))    || 0,
    veri_aktarimi: Number(fd.get("veri_aktarimi")) || 0,
    altyapi:       Number(fd.get("altyapi"))       || 0,
    egitim:        Number(fd.get("egitim"))        || 0,
    garanti:       Number(fd.get("garanti"))       || 0,
    sunucu_min:    Number(fd.get("sunucu_min"))    || 0,
    sunucu_max:    Number(fd.get("sunucu_max"))    || 0,
  };
  savePrices(p);
  revalidatePath("/p/xs2026047");
  revalidatePath("/p/xs2026047/sozlesme");
  redirect("/p/xs2026047/config-xs7x2?ok=1");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const p = getPrices();
  const total = calcTotal(p);

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="header">
          <div className="logo">x<span>Shield</span></div>
          <div className="title">Fiyat Yönetimi — XS-2026-047</div>
        </div>

        {ok === "1" && (
          <div className="banner">✓ Kaydedildi. Sunum ve sözleşme sayfaları güncellendi.</div>
        )}

        <form action={save} className="form">
          <div className="section-label">Proje Kalemleri</div>
          <div className="grid">
            <Field name="gelistirme"    label="Yazılım Geliştirme"          value={p.gelistirme} />
            <Field name="veri_aktarimi" label="Veri Aktarımı (60K+ SKU)"    value={p.veri_aktarimi} />
            <Field name="altyapi"       label="Altyapı Kurulumu & DevOps"   value={p.altyapi} />
            <Field name="egitim"        label="Eğitim & Dokümantasyon"       value={p.egitim} />
            <Field name="garanti"       label="6 Aylık Garanti Desteği"     value={p.garanti} />
          </div>

          <div className="total-row">
            <span>Hesaplanan Toplam</span>
            <span className="total-val">{fmt(total)}</span>
          </div>

          <div className="section-label" style={{marginTop:28}}>Sunucu / Hosting Maliyeti</div>
          <div className="grid">
            <Field name="sunucu_min" label="Minimum (/ay)" value={p.sunucu_min} />
            <Field name="sunucu_max" label="Maksimum (/ay)" value={p.sunucu_max} />
          </div>

          <div className="actions">
            <button type="submit" className="save-btn">Kaydet & Yayınla</button>
            <a href="/p/xs2026047" target="_blank" className="preview-link">Sunumu Gör ↗</a>
            <a href="/p/xs2026047/sozlesme" target="_blank" className="preview-link">Sözleşmeyi Gör ↗</a>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="input-wrap">
        <span className="prefix">$</span>
        <input
          id={name}
          name={name}
          type="number"
          defaultValue={value}
          min={0}
          step={100}
          required
        />
      </div>
    </div>
  );
}

const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;font-size:14px;background:#f1f5f9;color:#334155;min-height:100vh;padding:40px 20px}
.wrap{max-width:640px;margin:0 auto}
.header{display:flex;align-items:center;gap:16px;margin-bottom:28px}
.logo{font-size:20px;font-weight:800;color:#94a3b8;letter-spacing:-0.5px}.logo span{color:#3b82f6}
.title{font-size:14px;font-weight:600;color:#64748b}
.banner{background:#dcfce7;border:1px solid #86efac;color:#166534;padding:12px 16px;border-radius:8px;font-weight:600;margin-bottom:20px;font-size:13px}
.form{background:#fff;border-radius:12px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
.section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;margin-bottom:14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:8px}
.field{display:flex;flex-direction:column;gap:5px}
label{font-size:12px;font-weight:600;color:#475569}
.input-wrap{display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;background:#fff}
.input-wrap:focus-within{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
.prefix{padding:0 10px;color:#94a3b8;font-weight:700;font-size:13px;background:#f8fafc;border-right:1px solid #e2e8f0;height:38px;display:flex;align-items:center}
input[type=number]{border:none;outline:none;padding:0 12px;height:38px;width:100%;font-size:14px;font-weight:600;color:#0f172a;background:transparent}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
.total-row{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-top:8px}
.total-row span:first-child{font-size:12px;color:#64748b;font-weight:600}
.total-val{font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.5px}
.actions{display:flex;align-items:center;gap:12px;margin-top:24px}
.save-btn{background:#2563eb;color:#fff;border:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
.save-btn:hover{background:#1d4ed8}
.preview-link{font-size:13px;color:#2563eb;text-decoration:none;font-weight:600}
.preview-link:hover{text-decoration:underline}
`;
