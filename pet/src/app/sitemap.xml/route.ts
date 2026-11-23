import { appUrl } from "@/lib/seo";
import { platformStores, sitemapXml, storeEntries, type SitemapEntry } from "@/lib/sitemap";

// Veritabanından okunur: derleme anında değil, her istekte üretilir.
export const dynamic = "force-dynamic";

/** pet.xshield.com.tr/sitemap.xml — tanıtım sayfası + kendi alan adı olmayan mağazalar. */
export async function GET() {
  const app = appUrl();
  const entries: SitemapEntry[] = [{ loc: `${app}/`, priority: 1 }];
  for (const s of await platformStores()) entries.push(...(await storeEntries(s.id, `${app}/${s.slug}`)));
  return sitemapXml(entries);
}
