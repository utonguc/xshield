import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Mağaza aç — xShield Pet" };

export default async function RegisterPage() {
  await connection(); // APP_URL derleme anında değil, çalışma anında okunsun
  const host = (process.env.APP_URL ?? "https://pet.xshield.com.tr").replace(/^https?:\/\//, "");
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold">Petshopunuzu internete taşıyın</h1>
      <p className="mt-1 text-sm text-stone-600">Birkaç dakikada mağazanız açılır, ürünlerinizi hemen eklemeye başlarsınız.</p>
      <RegisterForm host={host} />
      <p className="mt-6 text-center text-sm text-stone-600">
        Zaten hesabınız var mı?{" "}
        <Link href="/giris" className="font-semibold text-brand-700 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
