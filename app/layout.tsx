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
    "xShield; Cloud sunucu, ağ yönetimi, siber güvenlik, altyapı hizmetleri ve yazılım danışmanlığı alanlarında kurumsal çözümler sunan teknoloji firmasıdır. e-Clinic, Signed, xCut, xSignage SaaS ürünleriyle işletmenizi dijitale taşıyın.",
  keywords: [
    "xShield", "siber güvenlik", "cloud sunucu", "ağ yönetimi", "IT danışmanlığı",
    "altyapı hizmetleri", "e-clinic klinik yönetim", "signed mail imza yönetimi",
    "xcut salon yönetim", "xsignage dijital tabela", "shieldspot hotspot",
    "kurumsal IT Türkiye", "pentest", "SOC hizmetleri", "KVKK danışmanlığı",
  ],
  metadataBase: new URL("https://xshield.com.tr"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "xShield | Teknoloji & Güvenlik Çözümleri",
    description:
      "Kurumsal IT altyapınızı güçlendirin. Cloud, Ağ, Siber Güvenlik, Yazılım ve IT danışmanlığında uzman ekip.",
    url: "https://xshield.com.tr",
    siteName: "xShield",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "xShield | Bulut, Ağ, Siber Güvenlik & IT Çözümleri",
    description: "Kurumsal IT altyapınızı güçlendirin. Cloud, Siber Güvenlik, SaaS ürünler.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
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
