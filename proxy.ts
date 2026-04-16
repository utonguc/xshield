import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // signed.xshield.com.tr → /signed/* olarak rewrite
  if (hostname.startsWith("signed.") && !pathname.startsWith("/signed")) {
    const url = request.nextUrl.clone();
    url.pathname = "/signed" + (pathname === "/" ? "" : pathname);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
