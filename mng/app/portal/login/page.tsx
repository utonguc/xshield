import { redirect } from "next/navigation";
import { getPortalSession, loadPortalUser, createOtp, hasPortalPassword } from "@/lib/portal-auth";
import { sendOtpEmail } from "@/lib/portal-mail";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Giriş" };

async function requestAccess(fd: FormData) {
  "use server";
  const identifier = (fd.get("identifier") as string)?.trim().toLowerCase();
  if (!identifier) return;

  const user = await loadPortalUser(identifier);
  if (!user) {
    // Don't reveal whether user exists; mimic "code sent" to prevent enumeration
    redirect(`/portal/verify?email=${encodeURIComponent(identifier)}&sent=1`);
  }

  const hasPw = await hasPortalPassword(identifier);
  if (hasPw) {
    // Şifre adımına yönlendir
    redirect(`/portal/auth?u=${encodeURIComponent(identifier)}`);
  }

  // Şifresiz kullanıcı: direkt OTP gönder
  const { code, error } = await createOtp(user.email);
  if (error) {
    redirect(`/portal/login?error=${encodeURIComponent(error)}`);
  }
  await sendOtpEmail(user.email, code, user.company_name);
  redirect(`/portal/verify?email=${encodeURIComponent(user.email)}&sent=1`);
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; prefill?: string }>;
}) {
  const session = await getPortalSession();
  if (session) redirect("/portal/dashboard");

  const { error, prefill } = await searchParams;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="card">
          <div className="brand">
            <span className="brand-name">xShield</span>
            <span className="brand-sub">Portal</span>
          </div>
          <h1 className="heading">Giriş Yapın</h1>
          <p className="sub">E-posta adresinizi veya domain kullanıcı adınızı girin.</p>

          {error && <div className="alert-error">{decodeURIComponent(error)}</div>}

          <form action={requestAccess} className="form">
            <div className="field">
              <label htmlFor="identifier">E-posta / Kullanıcı Adı</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                autoFocus
                autoComplete="username"
                placeholder="ornek@firma.com veya kullaniciadi"
                defaultValue={prefill ?? ""}
              />
            </div>
            <button type="submit" className="btn-primary">Devam Et →</button>
          </form>
        </div>
        <p className="footer">xShield Müşteri Portalı · Yetkisiz erişim yasaktır.</p>
      </div>
    </>
  );
}

const css = `
*{box-sizing:border-box}
.page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;background:#f1f5f9}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:36px 32px;width:100%;max-width:400px;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.brand{display:flex;align-items:baseline;gap:8px;margin-bottom:24px}
.brand-name{font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.5px}
.brand-sub{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;background:#f1f5f9;padding:2px 7px;border-radius:5px}
.heading{font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;letter-spacing:-0.3px}
.sub{font-size:13px;color:#64748b;margin:0 0 24px;line-height:1.6}
.alert-error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;font-weight:500}
.form{display:flex;flex-direction:column;gap:16px}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em}
.field input{border:1.5px solid #e2e8f0;border-radius:8px;padding:11px 14px;font-size:14px;color:#0f172a;outline:none;transition:border-color 0.15s;background:#fff}
.field input:focus{border-color:#3b82f6}
.btn-primary{background:#1e293b;color:#fff;border:none;border-radius:9px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;transition:background 0.15s}
.btn-primary:hover{background:#0f172a}
.footer{font-size:11px;color:#94a3b8;margin-top:20px;text-align:center}
@media(max-width:440px){.card{padding:28px 20px}}
`;
