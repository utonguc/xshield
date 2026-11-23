import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "xShield Pet — Petshoplar için online mağaza ve stok takibi", template: "%s" },
  description:
    "Petshopunuzu dakikalar içinde internete taşıyın: online mağaza, barkodlu kasa, stok ve son kullanma tarihi takibi, kendi kuryenizle teslimat.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = { themeColor: "#ea580c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
