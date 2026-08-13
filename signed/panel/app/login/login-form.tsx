"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/footer";
import LanguageSwitcher from "@/components/language-switcher";
import { useLang } from "@/lib/i18n/context";

export default function LoginForm() {
  const router = useRouter();
  const { T } = useLang();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setError(T.login.oauth_error);
  }, [T.login.oauth_error]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:    form.get("email"),
        password: form.get("password"),
      }),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/tenants");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? T.login.invalid);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-bold text-brand">✦</span>
              <span className="text-2xl font-bold text-gray-900 tracking-tight">Signed</span>
            </Link>
            <p className="text-xs text-gray-400 mt-1">{T.common.by_xshield}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{T.login.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{T.login.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T.login.email}</label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T.login.password}</label>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {loading ? T.login.submitting : T.login.submit}
              </button>
            </form>

            {/* SSO divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{T.login.or_continue}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* SSO buttons */}
            <div className="space-y-2">
              <a
                href="/api/auth/oauth/google"
                className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                  <path d="M43.611 20.083H42V20H24v8h11.303C33.942 32.657 29.418 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L37.618 9.373C34.001 6.012 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                  <path d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c3.059 0 5.842 1.154 7.961 3.039L37.618 9.373C34.001 6.012 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                  <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.402 0-9.923-3.335-11.299-7.96l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                  <path d="M43.611 20.083H42V20H24v8h11.303c-.693 1.926-1.955 3.566-3.577 4.73l6.19 5.238C42.012 35.329 44 30 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                </svg>
                {T.login.sign_in_google}
              </a>

              <a
                href="/api/auth/oauth/microsoft"
                className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                  <path d="M22.5 6H6v16.5h16.5V6z" fill="#F25022"/>
                  <path d="M42 6H25.5v16.5H42V6z" fill="#7FBA00"/>
                  <path d="M22.5 25.5H6V42h16.5V25.5z" fill="#00A4EF"/>
                  <path d="M42 25.5H25.5V42H42V25.5z" fill="#FFB900"/>
                </svg>
                {T.login.sign_in_microsoft}
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-gray-400">
              <Link href="/" className="hover:text-gray-600 transition-colors">{T.login.back_home}</Link>
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
