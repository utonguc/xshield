import Link from "next/link";
import { and, asc, eq, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { Stat } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { formatQty, formatTL } from "@/lib/format";

const FILTERS = { tumu: "Tümü", azalan: "Azalan", tukenen: "Tükenen" } as const;

export default async function StockPage({ searchParams }: PageProps<"/panel/stok">) {
  const me = await requireMember();
  const t = me.tenant.id;
  const sp = await searchParams;
  const filter = (typeof sp.filtre === "string" && sp.filtre in FILTERS ? sp.filtre : "tumu") as keyof typeof FILTERS;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const term = `%${q.replace(/[%_]/g, "")}%`;

  const [[totals], rows] = await Promise.all([
    db
      .select({
        value: sql<string>`coalesce(sum(greatest(${variants.stockQty}, 0) * coalesce(${variants.costPrice}, 0)), 0)`,
        retail: sql<string>`coalesce(sum(greatest(${variants.stockQty}, 0) * ${variants.price}), 0)`,
        low: sql<number>`count(*) filter (where ${variants.stockQty} <= ${variants.lowStockThreshold} and ${variants.stockQty} > 0)::int`,
        out: sql<number>`count(*) filter (where ${variants.stockQty} <= 0)::int`,
      })
      .from(variants)
      .where(and(eq(variants.tenantId, t), eq(variants.isActive, true))),
    db
      .select({
        id: variants.id,
        productId: products.id,
        name: products.name,
        variant: variants.name,
        barcode: variants.barcode,
        qty: variants.stockQty,
        threshold: variants.lowStockThreshold,
        unit: variants.unit,
        price: variants.price,
        cost: variants.costPrice,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(
        and(
          eq(variants.tenantId, t),
          eq(variants.isActive, true),
          filter === "azalan" ? lte(variants.stockQty, variants.lowStockThreshold) : undefined,
          filter === "tukenen" ? lte(variants.stockQty, 0) : undefined,
          q ? or(ilike(products.name, term), eq(variants.barcode, q), ilike(products.brand, term)) : undefined,
        ),
      )
      .orderBy(filter === "tumu" ? asc(products.name) : asc(variants.stockQty), asc(variants.sort))
      .limit(500),
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Stok değeri (alış)" value={formatTL(totals.value)} hint="Alış fiyatı girilen ürünler" />
        <Stat label="Stok değeri (satış)" value={formatTL(totals.retail)} />
        <Stat label="Azalan" value={totals.low} />
        <Stat label="Tükenen" value={totals.out} />
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} className="input max-w-xs" placeholder="Ürün adı veya barkod" />
        <input type="hidden" name="filtre" value={filter} />
        <button className="btn-ghost">Ara</button>
        <div className="ml-auto flex gap-1 rounded-xl bg-stone-100 p-1">
          {Object.entries(FILTERS).map(([k, v]) => (
            <Link
              key={k}
              href={`/panel/stok?filtre=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === k ? "bg-white shadow-sm" : "text-stone-600"}`}
            >
              {v}
            </Link>
          ))}
        </div>
      </form>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Ürün</th>
              <th className="hidden sm:table-cell">Barkod</th>
              <th className="text-right">Stok</th>
              <th className="hidden text-right md:table-cell">Alış</th>
              <th className="text-right">Satış</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500">
                  Kayıt yok.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const qn = Number(r.qty);
              return (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td>
                    <Link href={`/panel/urunler/${r.productId}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    {r.variant && <span className="text-stone-500"> · {r.variant}</span>}
                  </td>
                  <td className="hidden font-mono text-xs text-stone-500 sm:table-cell">{r.barcode ?? "—"}</td>
                  <td
                    className={`text-right font-semibold whitespace-nowrap tabular-nums ${
                      qn <= 0 ? "text-red-700" : qn <= Number(r.threshold) ? "text-amber-700" : ""
                    }`}
                  >
                    {formatQty(r.qty, r.unit)}
                  </td>
                  <td className="hidden text-right text-stone-500 tabular-nums md:table-cell">{r.cost == null ? "—" : formatTL(r.cost)}</td>
                  <td className="text-right tabular-nums">{formatTL(r.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
