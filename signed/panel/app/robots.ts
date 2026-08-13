import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/portal"],
        disallow: ["/tenants", "/dashboard", "/superadmin", "/api"],
      },
    ],
    sitemap: "https://signed.xshield.com.tr/sitemap.xml",
  };
}
