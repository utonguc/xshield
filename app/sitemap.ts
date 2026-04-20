import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://xshield.com.tr";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/#hizmetler`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/#urunler`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/#hakkimizda`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/#iletisim`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
