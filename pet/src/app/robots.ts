import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/seo";

// pet.xshield.com.tr/robots.txt (mağazaların kendi alan adlarında [store]/robots.txt kullanılır)
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/kurye", "/yonetim", "/api", "/giris", "/*/sepet", "/*/siparis/"] },
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
