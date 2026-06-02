import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const { permissions } = session;

  const navItems = [
    { href: "/portal/dashboard", label: "Ana Sayfa" },
    ...(permissions.inventory ? [{ href: "/portal/inventory", label: "Envanter"   }] : []),
    ...(permissions.tickets   ? [{ href: "/portal/tickets",   label: "Talepler"   }] : []),
    ...(permissions.employees ? [{ href: "/portal/employees", label: "Çalışanlar" }] : []),
    ...(permissions.contract  ? [{ href: "/portal/contract",  label: "Sözleşme"   }] : []),
  ];

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <span className="brand-name">xShield</span>
              <span className="brand-sub">Portal</span>
            </div>
            <nav className="nav">
              {navItems.map((n) => (
                <Link key={n.href} href={n.href} className="nav-link">{n.label}</Link>
              ))}
            </nav>
            <div className="user-area">
              <span className="user-name">{session.full_name}</span>
              <a href="/api/portal/logout" className="logout-btn">Çıkış</a>
            </div>
          </div>
        </header>
        <main className="content">
          {children}
        </main>
        <footer className="footer-bar">
          <span>{session.company_name}</span>
          <span>xShield Müşteri Portalı</span>
        </footer>
      </div>
    </>
  );
}

const css = `
*{box-sizing:border-box}
body{margin:0;background:#f1f5f9;font-family:system-ui,Arial,sans-serif}
.shell{min-height:100vh;display:flex;flex-direction:column}
/* Topbar */
.topbar{background:#1e293b;border-bottom:1px solid rgba(255,255,255,0.06);position:sticky;top:0;z-index:100}
.topbar-inner{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:20px;height:56px}
.brand{display:flex;align-items:baseline;gap:6px;flex-shrink:0}
.brand-name{font-size:15px;font-weight:800;color:#fff;letter-spacing:-0.3px}
.brand-sub{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px}
.nav{display:flex;align-items:center;gap:2px;flex:1;overflow-x:auto}
.nav-link{font-size:13px;font-weight:600;color:#94a3b8;padding:6px 12px;border-radius:7px;text-decoration:none;white-space:nowrap;transition:color 0.1s,background 0.1s}
.nav-link:hover{color:#fff;background:rgba(255,255,255,0.07)}
.user-area{display:flex;align-items:center;gap:10px;flex-shrink:0}
.user-name{font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
.logout-btn{font-size:12px;color:#ef4444;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:4px 10px;text-decoration:none;font-weight:700;transition:background 0.15s}
.logout-btn:hover{background:rgba(239,68,68,0.2)}
/* Content */
.content{flex:1;max-width:1200px;width:100%;margin:0 auto;padding:28px 20px}
@media(max-width:640px){.content{padding:16px}}
/* Footer */
.footer-bar{background:#1e293b;border-top:1px solid rgba(255,255,255,0.06);padding:12px 20px;display:flex;justify-content:space-between;font-size:11px;color:#475569}
/* Mobile nav scroll */
@media(max-width:560px){.user-name{display:none}}
`;
