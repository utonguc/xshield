"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { clearToken, apiFetch, staticUrl } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/hooks/useTheme";
import GlobalSearch, { useGlobalSearch } from "@/components/GlobalSearch";
import { APP_NAME, APP_VERSION, COMPANY_NAME } from "@/lib/version";
import {
  LayoutDashboard, Users, Calendar, Inbox, CalendarRange,
  Stethoscope, Globe, BarChart3, Wallet, CheckSquare,
  FileText, Package, Wrench, ClipboardCheck, MessageCircle,
  Shield, Settings, ShieldCheck, Search, LogOut,
  Sun, Moon, Bell, ChevronLeft, ChevronRight, X, Menu,
  type LucideIcon,
} from "lucide-react";
import { useEffect as _ue, useState as _us } from "react";

function TrialBanner() {
  const [days, setDays] = _us<number | null>(null);
  _ue(() => {
    const v = localStorage.getItem("trialDaysLeft");
    if (v !== null) setDays(Number(v));
  }, []);
  if (days === null) return null;
  const urgent = days <= 5;
  return (
    <div style={{
      background: urgent ? "#fef2f2" : "#fffbeb",
      borderBottom: `1px solid ${urgent ? "#fecaca" : "#fde68a"}`,
      padding: "8px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: urgent ? "#b42318" : "#92400e" }}>
        {urgent ? "⚠" : "ℹ"}{" "}
        {days === 0
          ? "Demo süreniz bugün bitiyor!"
          : `Demo sürenizde ${days} gün kaldı.`}
        {" "}Devam etmek için bir plan seçin.
      </span>
      <a href="/#fiyatlar" style={{
        fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
        background: urgent ? "#b42318" : "#d97706",
        color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
      }}>
        Planları Gör →
      </a>
    </div>
  );
}

/* ── Types ─────────────────────────────────────────────────────────── */
type MeData = {
  fullName: string;
  role?: string;
  clinicName: string;
  activeModules?: string[];
  profilePhotoUrl?: string;
};

type Notif = {
  id: string; title: string; message: string;
  type: string; link?: string; isRead: boolean;
  timeAgo: string; createdAtUtc: string;
};

type NavItem = {
  href: string; label: string; Icon: LucideIcon;
  module: string | null; badge?: string;
};

/* ── Navigation config ──────────────────────────────────────────────── */
const ALL_NAV: NavItem[] = [
  { href: "/dashboard",    label: "Dashboard",         Icon: LayoutDashboard, module: null },
  { href: "/patients",     label: "Hastalar",           Icon: Users,           module: "crm" },
  { href: "/appointments", label: "Randevular",         Icon: Calendar,        module: "appointments" },
  { href: "/requests",     label: "Randevu İstekleri",  Icon: Inbox,           module: "appointments", badge: "pending_requests" },
  { href: "/takvim",       label: "Çalışma Takvimi",   Icon: CalendarRange,   module: "appointments" },
  { href: "/doctors",      label: "Doktorlar",          Icon: Stethoscope,     module: "doctors" },
  { href: "/website",      label: "Web Sitesi",         Icon: Globe,           module: null },
  { href: "/raporlar",     label: "Raporlar",           Icon: BarChart3,       module: "reports" },
  { href: "/finance",      label: "Finans",             Icon: Wallet,          module: "finance" },
  { href: "/tasks",        label: "Görevler",           Icon: CheckSquare,     module: "tasks" },
  { href: "/documents",    label: "Belgeler",           Icon: FileText,        module: "documents" },
  { href: "/stock",        label: "Stok",               Icon: Package,         module: "inventory" },
  { href: "/assets",       label: "Demirbaş",           Icon: Wrench,          module: "assets" },
  { href: "/surveys",      label: "Anketler",           Icon: ClipboardCheck,  module: "surveys" },
  { href: "/whatsapp",     label: "WhatsApp",           Icon: MessageCircle,   module: "whatsapp" },
  { href: "/audit",        label: "Denetim Günlüğü",   Icon: Shield,          module: null },
  { href: "/ayarlar",      label: "Ayarlar",            Icon: Settings,        module: null },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { href: "/superadmin", label: "SA Panel", Icon: ShieldCheck, module: null },
];

/* ── Role & notification colors ─────────────────────────────────────── */
const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: "#7c3aed", KlinikYonetici: "#1d4ed8",
  Doktor: "#065f46", Resepsiyon: "#92400e",
  Asistan: "#0e7490", Teknisyen: "#374151",
};

const NOTIF_META: Record<string, { icon: string; color: string; bg: string }> = {
  info:    { icon: "ℹ",  color: "#1d4ed8", bg: "#eff8ff" },
  success: { icon: "✓",  color: "#059669", bg: "#f0fdf4" },
  warning: { icon: "⚠",  color: "#d97706", bg: "#fffbeb" },
  error:   { icon: "✕",  color: "#b42318", bg: "#fef3f2" },
};

/* ── Bottom tabs (mobile) ───────────────────────────────────────────── */
const BOTTOM_TABS = [
  { href: "/dashboard",    Icon: LayoutDashboard, label: "Ana Sayfa" },
  { href: "/appointments", Icon: Calendar,        label: "Randevular" },
  { href: "/patients",     Icon: Users,           label: "Hastalar" },
  { href: "/requests",     Icon: Inbox,           label: "İstekler", badge: true },
  { href: "/takvim",       Icon: CalendarRange,   label: "Takvim" },
];

/* ══════════════════════════════════════════════════════════════════════
   AppShell
══════════════════════════════════════════════════════════════════════ */
export default function AppShell({
  children, title, description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";

  const [me, setMe]               = useState<MeData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [primaryColor, setPrimaryColor] = useState("#1d4ed8");
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();

  const [notifs,      setNotifs]      = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  /* ── Data loading ── */
  useEffect(() => {
    apiFetch("/Auth/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d) setMe(d);
    }).catch(() => {});

    apiFetch("/Settings/organization").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.primaryColor) {
        setPrimaryColor(d.primaryColor);
        document.documentElement.style.setProperty("--primary", d.primaryColor);
      }
    }).catch(() => {});

    const loadPending = () => {
      apiFetch("/AppointmentRequests/count-pending")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setPendingRequests(d.count ?? 0); })
        .catch(() => {});
    };
    loadPending();
    const timer = setInterval(loadPending, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        apiFetch("/Notifications?limit=15"),
        apiFetch("/Notifications/unread-count"),
      ]);
      if (listRes.ok)  setNotifs(await listRes.json());
      if (countRes.ok) { const d = await countRes.json(); setUnreadCount(d.count ?? 0); }
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [loadNotifs]);

  /* Close notifications on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: string) => {
    await apiFetch(`/Notifications/${id}/read`, { method: "PATCH" });
    loadNotifs();
  };
  const markAllRead = async () => {
    await apiFetch("/Notifications/read-all", { method: "POST" });
    loadNotifs();
  };
  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/Notifications/${id}`, { method: "DELETE" });
    loadNotifs();
  };

  /* Close mobile drawer on nav */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const logout = () => { clearToken(); router.push("/login"); };

  const navLinks: NavItem[] = [
    ...ALL_NAV.filter(n => {
      if (!n.module) return true;
      if (!me?.activeModules?.length) return true;
      return me.activeModules.includes(n.module);
    }),
    ...(me?.role === "SuperAdmin" ? SUPER_ADMIN_NAV : []),
  ];

  const roleColor = ROLE_COLORS[me?.role ?? ""] ?? "#374151";
  const isCollapsed = !isMobile && collapsed;
  const sideW = isMobile ? 260 : (collapsed ? 64 : 220);

  /* ── Sidebar content (shared between desktop & mobile drawer) ── */
  const Sidebar = () => (
    <aside style={{
      width: sideW, minWidth: sideW,
      background: "var(--sidebar-bg, #0f172a)", color: "white",
      display: "flex", flexDirection: "column",
      transition: "width 0.2s",
      position: isMobile ? "fixed" : "sticky",
      top: 0, left: 0,
      height: "100vh", flexShrink: 0,
      zIndex: isMobile ? 50 : 1,
      boxShadow: "2px 0 16px rgba(0,0,0,0.18)",
      transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "none",
    }}>

      {/* ── Logo bar ── */}
      <div style={{
        padding: isCollapsed ? "18px 0" : "16px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center",
        justifyContent: isCollapsed ? "center" : "space-between",
        minHeight: 60, flexShrink: 0,
      }}>
        {!isCollapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {me?.clinicName ?? APP_NAME}
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{COMPANY_NAME} · v{APP_VERSION}</div>
          </div>
        )}
        <button
          onClick={() => isMobile ? setMobileOpen(false) : setCollapsed(!collapsed)}
          style={{
            background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8",
            cursor: "pointer", padding: 6, borderRadius: 8, lineHeight: 0, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        >
          {isMobile ? <X size={16} /> : (collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />)}
        </button>
      </div>

      {/* ── Search bar ── */}
      {!isCollapsed && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748b", cursor: "pointer", fontSize: 12,
              transition: "all 0.15s", textAlign: "left",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)";
              (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
            }}
          >
            <Search size={14} />
            <span style={{ flex: 1 }}>Ara...</span>
            <kbd style={{
              padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#475569",
            }}>⌘K</kbd>
          </button>
        </div>
      )}

      {/* Search icon when collapsed */}
      {isCollapsed && (
        <div style={{ padding: "8px 0", display: "flex", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button onClick={() => setSearchOpen(true)} title="Ara" style={{
            background: "rgba(255,255,255,0.06)", border: "none",
            color: "#64748b", cursor: "pointer", padding: 8, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <Search size={16} />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
        {navLinks.map(({ href, label, Icon, badge }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const badgeCount = badge === "pending_requests" ? pendingRequests : 0;
          return (
            <Link key={href} href={href} title={isCollapsed ? label : undefined} style={{
              display: "flex", alignItems: "center",
              gap: isCollapsed ? 0 : 9,
              padding: isCollapsed ? "9px 0" : "9px 10px",
              justifyContent: isCollapsed ? "center" : "flex-start",
              borderRadius: 8, textDecoration: "none",
              fontWeight: active ? 600 : 400, fontSize: 13,
              background: active ? "rgba(255,255,255,0.1)" : "transparent",
              color: active ? "white" : "#64748b",
              borderLeft: active ? `3px solid ${primaryColor}` : "3px solid transparent",
              transition: "all 0.12s",
              position: "relative",
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.color = "#cbd5e1"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = active ? "rgba(255,255,255,0.1)" : "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = active ? "white" : "#64748b"; }}
            >
              <span style={{ flexShrink: 0, position: "relative", lineHeight: 0 }}>
                <Icon size={16} />
                {badgeCount > 0 && isCollapsed && (
                  <span style={{
                    position: "absolute", top: -5, right: -6,
                    background: "#dc2626", color: "#fff",
                    fontSize: 8, fontWeight: 800, lineHeight: 1,
                    padding: "2px 4px", borderRadius: 999, minWidth: 14, textAlign: "center",
                  }}>{badgeCount > 99 ? "99+" : badgeCount}</span>
                )}
              </span>
              {!isCollapsed && (
                <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden" }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                  {badgeCount > 0 && (
                    <span style={{
                      background: "#dc2626", color: "#fff", borderRadius: 999,
                      fontSize: 9, fontWeight: 800, padding: "1px 5px", minWidth: 16,
                      textAlign: "center", flexShrink: 0, marginLeft: 4,
                    }}>{badgeCount > 99 ? "99+" : badgeCount}</span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User area ── */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        {!isCollapsed && me && (
          <Link href="/profil" style={{ textDecoration: "none", display: "block", marginBottom: 6 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
              cursor: "pointer", transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: roleColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0,
                overflow: "hidden",
              }}>
                {me.profilePhotoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={staticUrl(me.profilePhotoUrl) ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : me.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me.fullName}</div>
                <div style={{ fontSize: 10, color: roleColor, fontWeight: 600, marginTop: 1 }}>{me.role}</div>
              </div>
            </div>
          </Link>
        )}

        <button onClick={logout} title={isCollapsed ? "Çıkış" : undefined} style={{
          width: "100%",
          padding: isCollapsed ? "9px 0" : "9px 10px",
          borderRadius: 8, border: "none",
          background: "transparent", color: "#475569",
          cursor: "pointer", fontSize: 12, fontWeight: 500,
          display: "flex", alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: 8, transition: "all 0.12s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
        >
          <LogOut size={15} />
          {!isCollapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  );

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg, #f6f7fb)" }}>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 40, backdropFilter: "blur(2px)",
        }} />
      )}

      <Sidebar />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top header */}
        <header style={{
          height: 56, background: "var(--surface, #fff)",
          borderBottom: "1px solid var(--border, #eaecf0)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", gap: 8, flexShrink: 0,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          {/* Left: hamburger (mobile) or page title */}
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setMobileOpen(true)} style={{
                width: 40, height: 40, borderRadius: 10, border: "1px solid #e4e7ec",
                background: "var(--surface, #fff)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Menu size={18} color="#344054" />
              </button>
              <button onClick={() => setSearchOpen(true)} style={{
                width: 40, height: 40, borderRadius: 10, border: "1px solid #e4e7ec",
                background: "var(--surface, #fff)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Search size={16} color="#344054" />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2, #344054)" }}>{title}</div>
          )}

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Dark mode */}
            <button onClick={toggleTheme} title={isDark ? "Açık mod" : "Karanlık mod"} style={{
              width: 40, height: 40, borderRadius: 10,
              border: "1px solid #e4e7ec",
              background: isDark ? "#1e293b" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
            }}>
              {isDark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#64748b" />}
            </button>

            {/* Notifications */}
            <div ref={bellRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setShowNotifs(v => !v); if (!showNotifs) loadNotifs(); }}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  border: "1px solid #e4e7ec", background: "var(--surface, #fff)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", position: "relative",
                }}
                title="Bildirimler"
              >
                <Bell size={16} color="#64748b" />
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -3, right: -3,
                    background: "#b42318", color: "#fff",
                    fontSize: 9, fontWeight: 800, lineHeight: 1,
                    padding: "2px 5px", borderRadius: 999,
                    minWidth: 16, textAlign: "center",
                  }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifs && (
                <div style={{
                  position: "absolute", top: 46, right: 0,
                  width: 360, background: "var(--surface, #fff)",
                  border: "1px solid #eaecf0", borderRadius: 16,
                  boxShadow: "0 8px 32px rgba(16,24,40,0.12)",
                  zIndex: 100, overflow: "hidden",
                }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #f2f4f7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Bildirimler
                      {unreadCount > 0 && (
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "#fef3f2", color: "#b42318", padding: "2px 7px", borderRadius: 999 }}>
                          {unreadCount} yeni
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 12, color: "#1d4ed8", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        Tümünü okundu yap
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 380, overflowY: "auto" }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: "32px 16px", textAlign: "center", color: "#98a2b3", fontSize: 13 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                        Bildirim yok
                      </div>
                    ) : notifs.map(n => {
                      const meta = NOTIF_META[n.type] ?? NOTIF_META.info;
                      return (
                        <div key={n.id}
                          onClick={() => { markRead(n.id); if (n.link) { router.push(n.link); setShowNotifs(false); } }}
                          style={{
                            display: "flex", gap: 12, padding: "12px 16px",
                            borderBottom: "1px solid #f8fafc",
                            cursor: n.link ? "pointer" : "default",
                            background: n.isRead ? "#fff" : "#fafcff",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "#fff" : "#fafcff")}
                        >
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: meta.bg, color: meta.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, fontWeight: 700,
                          }}>{meta.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13, color: "var(--text, #101828)" }}>{n.title}</div>
                              <button onClick={e => deleteNotif(n.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d0d5dd", fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 0 }}>×</button>
                            </div>
                            <div style={{ fontSize: 12, color: "#667085", marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                              {!n.isRead && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d4ed8", display: "inline-block" }} />}
                              {n.timeAgo}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User chip */}
            {me && (
              <Link href="/profil" style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 10px 5px 5px", borderRadius: 10,
                  border: "1px solid #e4e7ec", background: "var(--surface-2, #f8fafc)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = primaryColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e4e7ec")}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: roleColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0,
                    overflow: "hidden",
                  }}>
                    {me.profilePhotoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={staticUrl(me.profilePhotoUrl) ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : me.fullName.charAt(0).toUpperCase()}
                  </div>
                  {!isMobile && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2, #344054)" }}>
                      {me.fullName.split(" ")[0]}
                    </span>
                  )}
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* Trial warning banner */}
        <TrialBanner />

        {/* Page content */}
        <main style={{
          flex: 1, padding: isMobile ? 16 : 28, overflowY: "auto",
          paddingBottom: isMobile ? "calc(80px + env(safe-area-inset-bottom))" : 28,
        }}>
          {(title || description) && (
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text, #0f172a)" }}>{title}</h1>
              {description && (
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{description}</p>
              )}
            </div>
          )}
          {children}

          <footer style={{
            marginTop: 40, paddingTop: 16, paddingBottom: 8,
            borderTop: "1px solid var(--border, #eaecf0)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 11, color: "#94a3b8",
          }}>
            <span>© {new Date().getFullYear()} {COMPANY_NAME} · {APP_NAME}</span>
            <span style={{
              background: "#f1f5f9", color: "#64748b",
              padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              border: "1px solid #e2e8f0",
            }}>v{APP_VERSION}</span>
          </footer>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Bottom navigation (mobile) */}
      {isMobile && (
        <nav className="bottom-nav">
          {BOTTOM_TABS.map(({ href, Icon, label, badge }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            const count = badge ? pendingRequests : 0;
            return (
              <Link key={href} href={href} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                textDecoration: "none", padding: "6px 4px",
                color: active ? "#60a5fa" : "#64748b",
                borderTop: active ? "2px solid #60a5fa" : "2px solid transparent",
                transition: "all 0.15s", position: "relative",
              }}>
                <span style={{ lineHeight: 0, position: "relative" }}>
                  <Icon size={20} />
                  {count > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -6,
                      background: "#dc2626", color: "#fff",
                      fontSize: 8, fontWeight: 800, lineHeight: 1,
                      padding: "2px 4px", borderRadius: 999, minWidth: 14, textAlign: "center",
                    }}>{count > 99 ? "99+" : count}</span>
                  )}
                </span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
