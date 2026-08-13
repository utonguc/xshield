import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sözleşme XS-2026-047 | xShield",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
