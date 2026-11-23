// Uygulama başlamadan önce bekleyen veritabanı migration'larını uygular.
// Docker'da CMD içinde çalışır; tekrar çalıştırmak güvenlidir.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://pet:pet@localhost:5432/petdb";
const here = path.dirname(fileURLToPath(import.meta.url));

for (let attempt = 1; ; attempt++) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(here, "..", "drizzle") });
    console.log("[migrate] veritabanı güncel");
    await client.end();
    break;
  } catch (err) {
    await client.end({ timeout: 1 }).catch(() => {});
    if (attempt >= 10 || err?.code?.startsWith?.("42")) {
      console.error("[migrate] başarısız:", err);
      process.exit(1);
    }
    console.log(`[migrate] veritabanı hazır değil, tekrar deneniyor (${attempt})…`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
