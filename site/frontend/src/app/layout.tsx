import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteYönet — Konut Sitesi Yönetim Platformu",
  description: "Apartman ve site yönetimini kolaylaştıran SaaS platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
