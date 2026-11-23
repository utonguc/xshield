import Link from "next/link";
import { PawIcon } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div>
        <PawIcon className="mx-auto size-16 text-stone-300" />
        <h1 className="mt-4 text-2xl font-bold">Sayfa bulunamadı</h1>
        <p className="mt-2 text-stone-600">Aradığınız mağaza veya ürün yayında değil.</p>
        <Link href="/" className="btn-primary mt-6">
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
