"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/", label: "Kontrol Paneli", icon: "⬛" },
  { href: "/customers", label: "Müşteriler", icon: "◉" },
  { href: "/quotes", label: "Teklifler", icon: "◪" },
  { href: "/supplier", label: "Tedarikçi", icon: "◬" },
  { href: "/inventory", label: "Envanter", icon: "◫" },
  { href: "/employees", label: "Çalışanlar", icon: "◍" },
  { href: "/tickets", label: "Destek Talepleri", icon: "◎", badge: true },
  { href: "/payments", label: "Ödemeler", icon: "◈" },
  { href: "/network-discovery", label: "Ağ Keşfi", icon: "◐" },
  { href: "/monitoring", label: "İzleme", icon: "◑" },
  { href: "/reports", label: "Raporlar", icon: "◧" },
];
const adminItems = [
  { href: "/settings", label: "Ayarlar", icon: "⚙" },
];

interface Props {
  user: SessionUser;
  openTickets: number;
}

export default function Sidebar({ user, openTickets }: Props) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--divider)",
      position: "fixed", left: 0, top: 0, bottom: 0,
      display: "flex", flexDirection: "column", zIndex: 100,
    }}>
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--divider)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--logo-color)", letterSpacing: "-0.5px", marginBottom: 3 }}>
          x<span style={{ color: "#3b82f6" }}>Shield</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-ghost)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Yönetim Paneli
        </div>
      </div>

      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        <div style={{ marginBottom: 4 }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                color: active ? "var(--nav-active-text)" : "var(--text-dim)",
                background: active ? "var(--nav-active-bg)" : "transparent",
                fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && openTickets > 0 && (
                  <span style={{
                    background: "#ef4444", color: "#fff", fontSize: 10,
                    fontWeight: 700, padding: "2px 6px", borderRadius: 10, minWidth: 18, textAlign: "center",
                  }}>{openTickets > 99 ? "99+" : openTickets}</span>
                )}
              </Link>
            );
          })}
        </div>

        {user.role === "admin" && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 12px 4px" }}>
              Yönetim
            </div>
            {adminItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                  color: active ? "var(--nav-active-text)" : "var(--text-dim)",
                  background: active ? "var(--nav-active-bg)" : "transparent",
                  fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div style={{ padding: "10px 8px 12px", borderTop: "1px solid var(--divider)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, background: "#1e3a8a", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#93c5fd", flexShrink: 0,
          }}>
            {user.username[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.username}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{user.role === "admin" ? "Yönetici" : "Destek"}</div>
          </div>
          <ThemeToggle />
        </div>
        <form action="/api/logout" method="POST">
          <button type="submit" style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "7px 12px", background: "transparent",
            border: "none", color: "var(--text-dim)", fontSize: 12, cursor: "pointer",
            borderRadius: 8, transition: "all 0.15s",
          }}>
            <span>⬡</span> Çıkış Yap
          </button>
        </form>
      </div>
    </aside>
  );
}
