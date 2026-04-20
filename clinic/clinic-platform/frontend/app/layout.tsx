import GlobalStyles from "./GlobalStyles";
import AuthGuard from "@/components/AuthGuard";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "e-Clinic | Klinik & Muayenehane Yönetim Platformu — xShield",
  description:
    "e-Clinic; klinik ve muayenehane süreçlerini uçtan uca dijitalleştiren bulut tabanlı SaaS platformdur. Randevu yönetimi, hasta takibi, faturalandırma, AI destekli arama ve anket modülleriyle kliniğinizin verimliliğini katlayın.",
  keywords: [
    "klinik yönetim yazılımı", "muayenehane yazılımı", "hasta randevu sistemi",
    "doktor takip programı", "klinik CRM", "e-Clinic xShield",
    "online klinik yönetimi", "klinik fatura programı", "KVKK uyumlu sağlık yazılımı",
  ],
  metadataBase: new URL("https://eclinic.xshield.com.tr"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "e-Clinic | Klinik Yönetim Platformu",
    description: "Randevu, hasta takibi, fatura ve anket modülleriyle kliniğinizi dijitalleştirin.",
    url: "https://eclinic.xshield.com.tr",
    siteName: "e-Clinic by xShield",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "e-Clinic | Klinik & Muayenehane Yönetim Platformu",
    description: "Kliniğinizi bulut tabanlı e-Clinic platformuyla dijitalleştirin.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <GlobalStyles />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
