"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken } from "@/lib/api";

type Props = {
  children: React.ReactNode;
  /** Pass allowed roles. Empty / undefined = any authenticated user. */
  roles?: string[];
  /** Where to redirect if unauthorized (default: "/dashboard") */
  redirectTo?: string;
};

export default function RoleGuard({ children, roles, redirectTo = "/dashboard" }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    apiFetch("/Auth/me")
      .then(r => (r.ok ? r.json() : null))
      .then(me => {
        if (!me) { router.replace("/login"); return; }
        if (!roles || roles.length === 0 || roles.includes(me.role)) {
          setStatus("ok");
        } else {
          setStatus("denied");
          router.replace(redirectTo);
        }
      })
      .catch(() => router.replace("/login"));
  }, []);

  if (status === "loading") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#f6f7fb", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #e2e8f0",
        borderTopColor: "#1d4ed8", borderRadius: "50%",
        animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 13, color: "#64748b" }}>Yükleniyor...</div>
    </div>
  );

  if (status === "denied") return null;

  return <>{children}</>;
}
