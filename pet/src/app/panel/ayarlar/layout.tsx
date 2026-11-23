import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Ayarlar" />
      <nav className="mb-6 flex gap-4 border-b border-stone-200 text-sm font-medium">
        <Link href="/panel/ayarlar" className="-mb-px border-b-2 border-transparent pb-2 text-stone-600 hover:text-ink">
          Mağaza ve ödeme
        </Link>
        <Link href="/panel/ayarlar/yasal" className="-mb-px border-b-2 border-transparent pb-2 text-stone-600 hover:text-ink">
          Yasal metinler
        </Link>
      </nav>
      {children}
    </div>
  );
}
