import { redirect } from "next/navigation";
import { getPortalSession, loadPortalUser, verifyPortalPassword, createOtp } from "@/lib/portal-auth";
import { sendOtpEmail } from "@/lib/portal-mail";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Şifre — Portal" };

async function submitPassword(fd: FormData) {
  "use server";
  const identifier = (fd.get("identifier") as string)?.trim().toLowerCase();
  const password   = (fd.get("password") as string) ?? "";
  if (!identifier || !password) return;

  const ok = await verifyPortalPassword(identifier, password);
  if (!ok) {
    redirect(`/portal/auth?u=${encodeURIComponent(identifier)}&error=${encodeURIComponent("Şifre hatalı.")}`);
  }

  const user = await loadPortalUser(identifier);
  if (!user) redirect("/portal/login");

  const { code, error } = await createOtp(user.email);
  if (error) {
    redirect(`/portal/auth?u=${encodeURIComponent(identifier)}&error=${encodeURIComponent(error)}`);
  }
  await sendOtpEmail(user.email, code, user.company_name);
  redirect(`/portal/verify?email=${encodeURIComponent(user.email)}&sent=1`);
}

export default async function PortalAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; error?: string }>;
}) {
  const session = await getPortalSession();
  if (session) redirect("/portal/dashboard");

  const { u, error } = await searchParams;
  if (!u) redirect("/portal/login");

  const identifier = decodeURIComponent(u);
  const isEmail = identifier.includes("@");

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="card">
          <div className="brand">
            <span className="brand-name">xShield</span>
            <span className="brand-sub">Portal</span>
          </div>
          <h1 className="heading">Şifrenizi Girin</h1>
          <div className="user-chip">
            <span className="user-icon">{isEmail ? "✉" : "👤"}</span>
            <span className="user-label">{identifier}</span>
          </div>

          {error && <div className="alert-error">{decodeURIComponent(error)}</div>}

          <form action={submitPassword} className="form">
            <input type="hidden" name="identifier" value={identifier} />
            <div className="field">
              <label htmlFor="password">Şifre</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary">Giriş Kodu Gönder</button>
          </form>

          <div className="back-row">
            <a href="/portal/login" className="btn-back">← Farklı hesapla giriş yap</a>
          </div>
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
.heading{font-size:20px;font-weight:800;color:#0f172a;margin:0 0 16px;letter-spacing:-0.3px}
.user-chip{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:20px}
.user-icon{font-size:14px}
.user-label{font-size:13px;font-weight:600;color:#334155;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.alert-error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;font-weight:500}
.form{display:flex;flex-direction:column;gap:16px}
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em}
.field input{border:1.5px solid #e2e8f0;border-radius:8px;padding:11px 14px;font-size:14px;color:#0f172a;outline:none;transition:border-color 0.15s;background:#fff}
.field input:focus{border-color:#3b82f6}
.btn-primary{background:#1e293b;color:#fff;border:none;border-radius:9px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;transition:background 0.15s}
.btn-primary:hover{background:#0f172a}
.back-row{margin-top:16px;text-align:center}
.btn-back{font-size:12px;color:#64748b;text-decoration:none}
.btn-back:hover{color:#374151;text-decoration:underline}
.footer{font-size:11px;color:#94a3b8;margin-top:20px;text-align:center}
@media(max-width:440px){.card{padding:28px 20px}}
`;
