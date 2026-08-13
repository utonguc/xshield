"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveAuth, type AuthUser } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    siteName: "", siteAddress: "", sitePhone: "",
    adminFullName: "", adminEmail: "", adminPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<AuthUser>("/auth/register", form);
      saveAuth(data);
      router.push("/panel/genel-bakis");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, k: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type} value={form[k]} onChange={set(k)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">SY</div>
            <span className="font-semibold text-slate-800">SiteYönet</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Sitenizi Kaydedin</h1>
          <p className="text-slate-500 text-sm mt-1">10 daireye kadar ücretsiz, hemen başlayın</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Site Bilgileri</h2>
              <div className="space-y-3">
                {field("Site / Apartman Adı *", "siteName", "text", "Örn: Gül Apartmanı")}
                {field("Adres", "siteAddress", "text", "Mahalle, Sokak, No...")}
                {field("Telefon", "sitePhone", "tel", "0212 000 00 00")}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Yönetici Hesabı</h2>
              <div className="space-y-3">
                {field("Ad Soyad *", "adminFullName", "text", "Ahmet Yılmaz")}
                {field("E-posta *", "adminEmail", "email", "ahmet@email.com")}
                {field("Şifre *", "adminPassword", "password", "En az 8 karakter")}
              </div>
            </div>

            <button
              type="submit" disabled={loading || !form.siteName || !form.adminEmail || !form.adminPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Kaydediliyor..." : "Ücretsiz Hesap Oluştur"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Giriş yapın</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
