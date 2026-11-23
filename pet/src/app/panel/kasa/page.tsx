import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { Pos } from "./pos";

export default async function PosPage() {
  await requireMember();
  return (
    <div>
      <PageHeader
        title="Kasa"
        description="Mağaza satışı stoktan anında düşer; böylece online mağazadaki stok her zaman gerçeği gösterir. USB/Bluetooth barkod okuyucu veya telefon kamerası kullanabilirsiniz."
      />
      <Pos />
    </div>
  );
}
