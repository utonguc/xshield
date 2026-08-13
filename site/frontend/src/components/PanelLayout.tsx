"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAuth, clearAuth, type AuthUser, isManager } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: string };
type NavSection = { title?: string; items: NavItem[] };

const managerNav: NavSection[] = [
  { items: [
    { href: "/panel/genel-bakis", label: "Genel Bakış", icon: "▦" },
  ]},
  { title: "Finans", items: [
    { href: "/panel/aidatlar", label: "Aidat Yönetimi", icon: "💰" },
    { href: "/panel/ek-odemeler", label: "Ek Ödemeler", icon: "➕" },
    { href: "/panel/giderler", label: "Giderler", icon: "🧾" },
    { href: "/panel/kasa", label: "Kasa", icon: "🏧" },
    { href: "/panel/bankalar", label: "Banka Tanımları", icon: "🏦" },
    { href: "/panel/raporlar", label: "Raporlar", icon: "📈" },
  ]},
  { title: "Yapı & Sakinler", items: [
    { href: "/panel/bloklar", label: "Bloklar & Daireler", icon: "🏢" },
    { href: "/panel/kullanicilar", label: "Kullanıcılar", icon: "👥" },
    { href: "/panel/komsular", label: "Komşular & Mesajlar", icon: "💬" },
    { href: "/panel/ziyaretciler", label: "Ziyaretçi Defteri", icon: "🚪" },
    { href: "/panel/otopark", label: "Otopark / Plakalar", icon: "🅿️" },
  ]},
  { title: "Yönetişim", items: [
    { href: "/panel/toplantilar", label: "Toplantılar", icon: "📅" },
    { href: "/panel/karar-defteri", label: "Karar Defteri", icon: "📒" },
    { href: "/panel/anketler", label: "Anketler", icon: "📊" },
    { href: "/panel/oylama", label: "Yönetici Oylaması", icon: "🗳️" },
  ]},
  { title: "Talepler & İletişim", items: [
    { href: "/panel/sorunlar", label: "Sorunlar", icon: "🔧" },
    { href: "/panel/duyurular", label: "Duyurular", icon: "📢" },
    { href: "/panel/telegram", label: "Telegram", icon: "✈️" },
  ]},
  { title: "Sistem", items: [
    { href: "/panel/ayarlar", label: "Ayarlar", icon: "⚙️" },
  ]},
];

const residentNav: NavSection[] = [
  { items: [
    { href: "/sakin/genel-bakis", label: "Genel Bakış", icon: "▦" },
  ]},
  { title: "Finans", items: [
    { href: "/sakin/aidatlarim", label: "Aidatlarım", icon: "💰" },
  ]},
  { title: "Talepler & İletişim", items: [
    { href: "/sakin/sorunlar", label: "Sorunlar", icon: "🔧" },
    { href: "/sakin/duyurular", label: "Duyurular", icon: "📢" },
    { href: "/sakin/komsular", label: "Komşular & Mesajlar", icon: "💬" },
    { href: "/sakin/ziyaretciler", label: "Ziyaretçilerim", icon: "🚪" },
    { href: "/sakin/otopark", label: "Otopark Plakalarım", icon: "🅿️" },
    { href: "/sakin/telegram", label: "Telegram", icon: "✈️" },
  ]},
  { title: "Yönetişim", items: [
    { href: "/sakin/toplantilar", label: "Toplantılar", icon: "📅" },
    { href: "/sakin/karar-defteri", label: "Karar Defteri", icon: "📒" },
    { href: "/sakin/anketler", label: "Anketler", icon: "📊" },
    { href: "/sakin/oylama", label: "Yönetici Oylaması", icon: "🗳️" },
  ]},
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.push("/login"); return; }
    setUser(auth);
  }, [router]);

  if (!user) return null;

  const nav = isManager(user.role) ? managerNav : residentNav;

  function logout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 text-white flex flex-col transition-transform duration-200",
        "md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center text-xs font-bold">SY</div>
          <span className="font-semibold text-sm">SiteYönet</span>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {nav.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.title && (
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      pathname.startsWith(item.href)
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-xs text-slate-400 mb-1">{user.fullName}</div>
          <div className="text-xs text-slate-500 mb-3">
            {user.role === "SiteAdmin" ? "Site Yöneticisi" : user.role === "Manager" ? "Yönetici" : "Sakin"}
          </div>
          <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            className="md:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="flex-1" />
          <div className="text-sm text-slate-600">{user.fullName}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
