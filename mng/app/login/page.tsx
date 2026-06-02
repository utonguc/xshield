import { redirect } from "next/navigation";
import { loginUser, createSession, getSession } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giriş — xShield MNG" };

async function doLogin(fd: FormData) {
  "use server";
  const username = (fd.get("username") as string)?.trim();
  const password = fd.get("password") as string;
  if (!username || !password) redirect("/login?e=1");
  const user = await loginUser(username, password);
  if (!user) redirect("/login?e=1");
  await createSession(user);
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const session = await getSession();
  if (session) redirect("/");

  return (
    <>
      <style>{css}</style>
      <div className="bg">
        <div className="card">
          <div className="logo-row">
            <div className="logo">x<span>Shield</span></div>
            <div className="mng-badge">MNG</div>
          </div>
          <div className="panel-title">YÖNETİM PANELİ</div>
          <div className="secure">
            <span className="dot" />
            Güvenli SSL Bağlantısı
          </div>
          <div className="divider" />

          <form action={doLogin}>
            <div className="field">
              <label htmlFor="username">Kullanıcı Adı</label>
              <input id="username" name="username" type="text" autoComplete="username" autoFocus required />
            </div>
            <div className="field">
              <label htmlFor="password">Şifre</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>

            {e === "1" && (
              <div className="error">Kullanıcı adı veya şifre hatalı.</div>
            )}

            <button type="submit" className="btn">Giriş Yap</button>
          </form>

          <div className="footer">
            xShield Yönetim Sistemi<br />
            Yetkisiz erişim tespit edilir ve kayıt altına alınır.
          </div>
        </div>
      </div>
    </>
  );
}

const css = `
.bg{
  min-height:100vh;
  background:#07070f;
  background-image:radial-gradient(ellipse 80% 60% at 50% 20%,rgba(59,130,246,0.07) 0%,transparent 70%);
  display:flex;align-items:center;justify-content:center;padding:24px;
}
.card{
  width:100%;max-width:380px;
  background:rgba(9,9,22,0.98);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:18px;
  padding:40px 36px;
  box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(59,130,246,0.06),inset 0 1px 0 rgba(255,255,255,0.04);
}
.logo-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.logo{font-size:22px;font-weight:800;color:#94a3b8;letter-spacing:-0.5px}
.logo span{color:#3b82f6}
.mng-badge{
  font-size:10px;font-weight:700;letter-spacing:0.2em;
  color:#3b82f6;background:rgba(59,130,246,0.1);
  border:1px solid rgba(59,130,246,0.2);
  padding:3px 8px;border-radius:6px;
}
.panel-title{
  font-size:10px;font-weight:700;letter-spacing:0.35em;
  color:#334155;text-transform:uppercase;margin-bottom:16px;
}
.secure{display:flex;align-items:center;gap:7px;font-size:11px;color:#22c55e;margin-bottom:20px}
.dot{width:6px;height:6px;background:#22c55e;border-radius:50%;box-shadow:0 0 7px rgba(34,197,94,0.8);flex-shrink:0}
.divider{height:1px;background:rgba(255,255,255,0.06);margin-bottom:24px}
.field{margin-bottom:14px}
.field label{
  display:block;font-size:10px;font-weight:700;letter-spacing:0.08em;
  text-transform:uppercase;color:#475569;margin-bottom:6px;
}
.field input{
  width:100%;background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.08);border-radius:9px;
  padding:11px 14px;color:#f1f5f9;outline:none;
  transition:border-color 0.15s,box-shadow 0.15s;
}
.field input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.14)}
.error{
  background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
  color:#fca5a5;border-radius:8px;padding:10px 14px;
  font-size:12px;text-align:center;margin-bottom:14px;
}
.btn{
  width:100%;background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:#fff;border:none;border-radius:9px;padding:13px;
  font-size:14px;font-weight:700;cursor:pointer;
  transition:opacity 0.15s,transform 0.1s;margin-top:4px;
  letter-spacing:0.03em;
}
.btn:hover{opacity:0.9}
.btn:active{transform:scale(0.99)}
.footer{text-align:center;font-size:10px;color:#1e293b;margin-top:28px;line-height:1.7}
`;
