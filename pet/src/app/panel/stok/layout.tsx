import { PageHeader } from "@/components/page-header";
import { StockTabs } from "./stock-tabs";

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Stok" description="Her giriş ve çıkış kayıt altında: mal kabul, satış, sayım farkı, fire." />
      <StockTabs />
      {children}
    </div>
  );
}
