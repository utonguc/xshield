"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/panel/stok", label: "Stok durumu" },
  { href: "/panel/stok/giris", label: "Mal kabul" },
  { href: "/panel/stok/sayim", label: "Sayım" },
  { href: "/panel/stok/fire", label: "Fire" },
  { href: "/panel/stok/hareketler", label: "Hareketler" },
];

export function StockTabs() {
  const path = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              active ? "border-brand-600 text-brand-800" : "border-transparent text-stone-500 hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
