import { NextResponse, type NextRequest } from "next/server";
import { resolveDomain } from "@/lib/domain-resolver";
import { cleanHost, CUSTOM_DOMAIN_HEADER, isPlatformHost, PLATFORM_ONLY_PATHS } from "@/lib/platform";

/*
 * Mağazaya özel alan adları:
 *   www.patilerpetshop.com/urun/123  →  (içeride) /patiler/urun/123
 * Platform adresinde (pet.xshield.com.tr) hiçbir şey değişmez.
 */
export async function proxy(request: NextRequest) {
  const host = cleanHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  // Yeniden yazılmış istek proxy'den ikinci kez geçerse (standalone sunucu böyle yapıyor) dokunma.
  // Bu başlığı dışarıdan taklit etmek bir şey kazandırmaz: yol öneksiz kalır ve sayfa bulunamaz.
  if (host && request.headers.get(CUSTOM_DOMAIN_HEADER) === host && !isPlatformHost(host)) return NextResponse.next();
  const headers = new Headers(request.headers);
  // Dışarıdan gelen sahte başlığa güvenme; yalnızca proxy koyar.
  headers.delete(CUSTOM_DOMAIN_HEADER);

  if (!host || isPlatformHost(host)) return NextResponse.next({ request: { headers } });

  const slug = await resolveDomain(host);
  if (!slug) {
    return new NextResponse("Bu alan adı henüz bir mağazaya bağlı değil.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const { pathname, search } = request.nextUrl;

  // Panel, giriş vb. her zaman platform adresinde çalışır (oturum çerezi orada).
  if (PLATFORM_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const app = process.env.APP_URL ?? "https://pet.xshield.com.tr";
    return NextResponse.redirect(new URL(pathname + search, app), 307);
  }

  // Eski/paylaşılmış /<slug>/... bağlantılarını temiz adrese taşı.
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    // İç adres (localhost:3000) yerine müşterinin geldiği alan adını kullan.
    const proto = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
    const rawHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? host).split(",")[0].trim();
    const target = new URL(`${proto === "http" ? "http" : "https"}://${rawHost}`);
    target.pathname = pathname.slice(slug.length + 1) || "/";
    target.search = search;
    return NextResponse.redirect(target, 308);
  }

  headers.set(CUSTOM_DOMAIN_HEADER, host);
  const url = request.nextUrl.clone();
  url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
  // nginx "X-Forwarded-Proto: https" gönderdiğinde nextUrl https olur; Next bu durumda yeniden yazmayı
  // dış adres sanıp TLS ile bağlanmaya çalışır. Uygulama sunucusu içeride http konuşuyor.
  url.protocol = "http:";
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Statik dosyalar ve ürün görselleri her iki adreste de aynen servis edilir.
  // robots.txt ve sitemap.xml hariç tutulmaz: kendi alan adında mağazanınkine yönlendirilir.
  matcher: ["/((?!_next/static|_next/image|dosya/|icon.svg|favicon.ico).*)"],
};
