import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Subdomains matching *.xshield.com.tr (veya *.localhost) → /site/[slug]
// Uygulama kendi hostnamelerinden erişildiğinde normal route'lar çalışır.

const APP_HOSTNAMES = new Set([
  // Local dev
  "localhost",
  // Production
  "xshield.com.tr",
  "www.xshield.com.tr",
  "eclinic.xshield.com.tr",
  // Legacy / geliştirme
  "estetixos.com",
  "app.estetixos.com",
  "www.estetixos.com",
]);

// Uygulama path prefixleri — bunlar asla /site/ rewrite'ına uğramaz
const APP_PATHS = new Set([
  "/site/",
  "/_next",
  "/api",
  "/favicon",
  "/login",
  "/portal",
  "/dashboard",
  "/patients",
  "/appointments",
  "/requests",
  "/takvim",
  "/doctors",
  "/finance",
  "/tasks",
  "/documents",
  "/stock",
  "/assets",
  "/surveys",
  "/whatsapp",
  "/raporlar",
  "/reports",
  "/audit",
  "/ayarlar",
  "/settings",
  "/website",
  "/profil",
  "/superadmin",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") ?? "";
  const hostNoPort = hostname.split(":")[0];

  // Uygulama path'i ise doğrudan geçir
  for (const prefix of APP_PATHS) {
    if (pathname.startsWith(prefix) || pathname === "/") {
      return NextResponse.next();
    }
  }

  // Uygulama hostname'i ise doğrudan geçir
  if (APP_HOSTNAMES.has(hostNoPort)) {
    return NextResponse.next();
  }

  // Subdomain tespiti
  let slug: string | null = null;

  // slug.xshield.com.tr (eclinic hariç — o uygulama kendisi)
  if (hostNoPort.endsWith(".xshield.com.tr")) {
    const sub = hostNoPort.replace(".xshield.com.tr", "");
    if (sub && sub !== "eclinic" && sub !== "www") slug = sub;
  }
  // slug.estetixos.com (legacy)
  else if (hostNoPort.endsWith(".estetixos.com")) {
    const sub = hostNoPort.replace(".estetixos.com", "");
    if (sub && sub !== "app" && sub !== "www") slug = sub;
  }
  // slug.localhost (local dev)
  else if (hostNoPort.endsWith(".localhost")) {
    const sub = hostNoPort.replace(".localhost", "");
    if (sub) slug = sub;
  }
  // Tamamen bilinmeyen domain → custom domain lookup
  else {
    slug = `_domain_${hostNoPort}`;
  }

  if (slug) {
    const url = req.nextUrl.clone();
    url.pathname = `/site/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
