import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xShield | Bulut, Ağ, Siber Güvenlik & IT Çözümleri",
  description:
    "xShield; Cloud sunucu, ağ yönetimi, siber güvenlik, altyapı hizmetleri ve yazılım danışmanlığı alanlarında kurumsal çözümler sunan teknoloji firmasıdır. e-Clinic, Signed ve ShieldSpot ürünleriyle işletmenizi dijitale taşıyın.",
  keywords: [
    "xShield",
    "siber güvenlik",
    "cloud sunucu",
    "ağ yönetimi",
    "IT danışmanlığı",
    "altyapı hizmetleri",
    "e-clinic",
    "signed mail imza",
    "shieldspot hotspot",
  ],
  openGraph: {
    title: "xShield | Teknoloji & Güvenlik Çözümleri",
    description:
      "Kurumsal IT altyapınızı güçlendirin. Cloud, Ağ, Siber Güvenlik, Yazılım ve IT danışmanlığında uzman ekip.",
    url: "https://xshield.com.tr",
    siteName: "xShield",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${geistSans.variable} scroll-smooth`}>
      <body>{children}</body>
    </html>
  );
}
