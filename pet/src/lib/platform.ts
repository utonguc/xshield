// Hem proxy.ts hem uygulama tarafından kullanılan, bağımlılıksız yardımcılar.

/** Platformun kendi adresi (APP_URL'den), ör. "pet.xshield.com.tr". */
export const platformHost = () => {
  try {
    return new URL(process.env.APP_URL ?? "http://localhost:3000").hostname.toLowerCase();
  } catch {
    return "localhost";
  }
};

/** Bu host platformun kendisi mi (mağaza alan adı değil)? */
export function isPlatformHost(host: string) {
  const h = host.toLowerCase();
  if (h === platformHost() || h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "[::1]") return true;
  const extra = (process.env.PLATFORM_HOSTS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(h);
}

/** "Host" başlığından port ve sondaki noktayı atar. */
export const cleanHost = (raw: string | null) => (raw ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

/** Mağaza kendi alan adından açıldığında proxy bu başlığı ekler (değer: alan adı). */
export const CUSTOM_DOMAIN_HEADER = "x-pet-custom-domain";

/** Platform tarafında yalnızca panelden erişilebilen yollar; mağaza alan adında platforma yönlendirilir. */
export const PLATFORM_ONLY_PATHS = ["/panel", "/giris", "/kayit", "/kurye", "/yonetim", "/api/panel"];
