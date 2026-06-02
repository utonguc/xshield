import { redirect, notFound } from "next/navigation";
import { getPortalSession, verifyOtp, loadPortalUser, createPortalSession } from "@/lib/portal-auth";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kod Doğrulama" };

async function submitOtp(fd: FormData) {
  "use server";
  const email = (fd.get("email") as string)?.trim().toLowerCase();
  const code  = (fd.get("code")  as string)?.trim();
  if (!email || !code) return;

  const { ok, error } = await verifyOtp(email, code);
  if (!ok) {
    redirect(`/portal/verify?email=${encodeURIComponent(email)}&sent=1&error=${encodeURIComponent(error ?? "Hata")}`);
  }

  const user = await loadPortalUser(email);
  if (!user) {
    redirect(`/portal/login?error=${encodeURIComponent("Kullanıcı bulunamadı.")}`);
  }

  await createPortalSession(user);
  redirect("/portal/dashboard");
}

async function resendOtp(fd: FormData) {
  "use server";
  const email = (fd.get("email") as string)?.trim().toLowerCase();
  redirect(`/portal/login?prefill=${encodeURIComponent(email ?? "")}`);
}

export default async function PortalVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string; error?: string }>;
}) {
  const session = await getPortalSession();
  if (session) redirect("/portal/dashboard");

  const { email, sent, error } = await searchParams;
  if (!email || !sent) redirect("/portal/login");

  const maskedEmail = email.replace(/(.{2}).*(@.*)/, "$1***$2");

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <div className="card">
          <div className="brand">
            <span className="brand-name">xShield</span>
            <span className="brand-sub">Portal</span>
          </div>
          <h1 className="heading">Kodu Girin</h1>
          <p className="sub">
            <strong>{maskedEmail}</strong> adresine 6 haneli bir kod gönderdik.
            10 dakika içinde giriniz.
          </p>

          {error && <div className="alert-error">{decodeURIComponent(error)}</div>}

          <form action={submitOtp} className="form">
            <input type="hidden" name="email" value={email} />
            <div className="field">
              <label htmlFor="code">Giriş Kodu</label>
              <input
                id="code"
                name="code"
                type="text"
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="code-input"
              />
            </div>
            <button type="submit" className="btn-primary">Giriş Yap</button>
          </form>

          <form action={resendOtp} className="resend-form">
            <input type="hidden" name="email" value={email} />
            <button type="submit" className="btn-ghost">Kod gelmedi? Tekrar gönder</button>
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
.code-input{font-size:28px!important;font-weight:800;letter-spacing:8px;text-align:center;font-family:monospace}
.btn-primary{background:#1e293b;color:#fff;border:none;border-radius:9px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;transition:background 0.15s}
.btn-primary:hover{background:#0f172a}
.resend-form{margin-top:12px;text-align:center}
.btn-ghost{background:transparent;border:none;color:#64748b;font-size:13px;cursor:pointer;padding:4px;text-decoration:underline;text-underline-offset:2px}
.btn-ghost:hover{color:#374151}
.footer{font-size:11px;color:#94a3b8;margin-top:20px;text-align:center}
@media(max-width:440px){.card{padding:28px 20px}}
`;
