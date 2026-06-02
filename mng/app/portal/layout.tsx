import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "xShield Portal", template: "%s — xShield Portal" },
  description: "xShield Müşteri Portalı",
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
