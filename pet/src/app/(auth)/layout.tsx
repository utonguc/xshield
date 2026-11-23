import type { Metadata } from "next";
import { Analytics } from "@/components/analytics";
import { Logo } from "@/components/logo";
import { getPlatformAnalytics } from "@/lib/analytics";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { gaId } = await getPlatformAnalytics();
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Analytics gaIds={gaId ? [gaId] : []} />
      <Logo className="text-lg" />
      <main className="mt-8 w-full max-w-md">{children}</main>
    </div>
  );
}
