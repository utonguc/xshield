"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const isPublic =
      ["/", "/login", "/demo", "/klinikler", "/klinik-bul"].includes(pathname) ||
      pathname.startsWith("/klinikler") ||
      pathname.startsWith("/klinik-bul") ||
      pathname.startsWith("/site/") ||
      pathname.startsWith("/portal");

    if (!isPublic && !token) {
      router.replace("/login");
      return;
    }

    if (pathname === "/login" && token) {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f7fb" }}>
        <div style={{ padding: 20, background: "white", borderRadius: 16, boxShadow: "0 8px 24px rgba(16,24,40,0.08)" }}>
          Yükleniyor...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
