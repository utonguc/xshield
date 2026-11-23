"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/db/schema";

const ITEMS: { href: string; label: string; icon: string; owner?: boolean }[] = [
  { href: "/panel", label: "Özet", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/panel/siparisler", label: "Siparişler", icon: "M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2m6 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" },
  { href: "/panel/kasa", label: "Kasa", icon: "M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14" },
  { href: "/panel/urunler", label: "Ürünler", icon: "M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/panel/stok", label: "Stok", icon: "M4 19h16M4 15h16M7 11V5h10v6" },
  { href: "/panel/musteriler", label: "Müşteriler", icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" },
  { href: "/panel/teslimat", label: "Teslimat", icon: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", owner: true },
  { href: "/panel/ekip", label: "Ekip", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0", owner: true },
  { href: "/panel/ayarlar", label: "Ayarlar", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z", owner: true },
];

export function PanelNav({ role, newOrders }: { role: Role; newOrders: number }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => !i.owner || role === "owner");
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:px-3 lg:pb-0">
      {items.map((i) => {
        const active = i.href === "/panel" ? path === "/panel" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100 hover:text-ink"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0" aria-hidden>
              <path d={i.icon} />
            </svg>
            {i.label}
            {i.href === "/panel/siparisler" && newOrders > 0 && (
              <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">{newOrders}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
