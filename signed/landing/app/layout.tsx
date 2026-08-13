import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signed | Kurumsal Mail İmza Yönetim Platformu — xShield",
  description:
    "Tüm çalışanlarınızın e-posta imzalarını tek panelden yönetin. Marka tutarlılığı, kampanya imzaları, Exchange ve Google Workspace entegrasyonu.",
  keywords: [
    "mail imza yönetimi",
    "kurumsal e-posta imzası",
    "Exchange entegrasyon",
    "Google Workspace imza",
    "xShield Signed",
  ],
  openGraph: {
    title: "Signed | Kurumsal Mail İmza Yönetim Platformu",
    description: "Tüm çalışanlarınızın e-posta imzalarını merkezi olarak kontrol edin.",
    url: "https://signed.xshield.com.tr",
    siteName: "Signed by xShield",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
