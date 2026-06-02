import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runEremSync } from "@/lib/erem-scraper";
import { runB2BDepoSync } from "@/lib/b2bdepo-scraper";
import { runErgenSync } from "@/lib/ergen-scraper";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Cred = { source: string; label: string; bayi_kodu: string; kullanici_adi: string; parola: string };
type Result = { total: number; inserted: number; updated: number; errors: number; categories?: string[] };

async function runOne(c: Cred, log: (m: string) => void): Promise<Result> {
  if (c.source === "erem") {
    return runEremSync({ bayiKodu: c.bayi_kodu, kullaniciAdi: c.kullanici_adi, parola: c.parola }, log);
  }
  if (c.source === "bilsam") {
    return runB2BDepoSync(c.bayi_kodu, c.kullanici_adi, c.parola, log);
  }
  if (c.source === "ergen") {
    return runErgenSync(c.bayi_kodu, c.kullanici_adi, c.parola, log);
  }
  throw new Error(`Bilinmeyen tedarikçi: ${c.source}`);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const targetSource = url.searchParams.get("source") ?? undefined;

  const messages: string[] = [];
  const log = (msg: string) => { messages.push(msg); console.log(`[sync] ${msg}`); };

  try {
    const allCreds = await query<Cred>(
      "SELECT source, label, bayi_kodu, kullanici_adi, parola FROM supplier_credentials WHERE enabled=true ORDER BY id"
    );
    const creds = targetSource ? allCreds.filter(c => c.source === targetSource) : allCreds;

    if (creds.length === 0) {
      const msg = targetSource
        ? `Tedarikçi bulunamadı: ${targetSource}`
        : "Aktif tedarikçi yok. Ayarlar'dan kimlik bilgilerini tanımlayın.";
      return NextResponse.json({ ok: false, error: msg }, { status: 503 });
    }

    // Run all scrapers in parallel
    const settled = await Promise.allSettled(
      creds.map(c => {
        log(`=== ${c.label} başlıyor ===`);
        return runOne(c, log).then(r => ({ source: c.source, label: c.label, result: r }));
      })
    );

    const results: Record<string, Result> = {};
    for (const s of settled) {
      if (s.status === "fulfilled") {
        results[s.value.source] = s.value.result;
      } else {
        const label = creds[settled.indexOf(s)]?.label ?? "?";
        log(`[${label}] HATA: ${String(s.reason)}`);
      }
    }

    const combined = Object.values(results).reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        inserted: acc.inserted + r.inserted,
        updated: acc.updated + (r.updated ?? 0),
        errors: acc.errors + r.errors,
      }),
      { total: 0, inserted: 0, updated: 0, errors: 0 }
    );

    return NextResponse.json({ ok: true, result: combined, results, log: messages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[supplier/sync] fatal:", msg);
    return NextResponse.json({ ok: false, error: msg, log: messages }, { status: 500 });
  }
}
