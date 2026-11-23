import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş yap — xShield Pet" };

export default async function LoginPage({ searchParams }: PageProps<"/giris">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold">Mağaza paneline giriş</h1>
      <p className="mt-1 text-sm text-stone-600">Mağaza sahibi, personel ve kuryeler buradan giriş yapar.</p>
      {sp.hata === "magaza" && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          Hesabınız bir mağazaya bağlı değil. Mağaza sahibinden sizi ekibe eklemesini isteyin.
        </p>
      )}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-stone-600">
        Henüz mağazanız yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-brand-700 hover:underline">
          Hemen mağaza açın
        </Link>
      </p>
    </div>
  );
}
