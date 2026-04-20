import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/demo", "/klinik-bul", "/site/", "/portal"],
        disallow: [
          "/dashboard", "/appointments", "/patients", "/doctors", "/finance",
          "/raporlar", "/requests", "/stock", "/assets", "/audit", "/surveys",
          "/takvim", "/tasks", "/website", "/whatsapp", "/ayarlar",
          "/documents", "/klinikler", "/superadmin", "/profil",
        ],
      },
    ],
    sitemap: "https://eclinic.xshield.com.tr/sitemap.xml",
  };
}
