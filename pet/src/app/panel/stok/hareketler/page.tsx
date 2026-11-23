import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { MOVEMENT_TYPES, products, stockMovements, users, variants, type MovementType } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { formatDateTime, formatQty } from "@/lib/format";
import { MOVEMENT_LABELS } from "@/lib/labels";

export default async function MovementsPage({ searchParams }: PageProps<"/panel/stok/hareketler">) {
  const me = await requireMember();
  const sp = await searchParams;
  const type = typeof sp.tur === "string" && (MOVEMENT_TYPES as readonly string[]).includes(sp.tur) ? (sp.tur as MovementType) : null;

  const rows = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      delta: stockMovements.qtyDelta,
      balance: stockMovements.balanceAfter,
      note: stockMovements.note,
      orderId: stockMovements.orderId,
      createdAt: stockMovements.createdAt,
      user: users.name,
      productId: products.id,
      product: products.name,
      variant: variants.name,
      unit: variants.unit,
    })
    .from(stockMovements)
    .innerJoin(variants, eq(variants.id, stockMovements.variantId))
    .innerJoin(products, eq(products.id, variants.productId))
    .leftJoin(users, eq(users.id, stockMovements.userId))
    .where(and(eq(stockMovements.tenantId, me.tenant.id), type ? eq(stockMovements.type, type) : undefined))
    .orderBy(desc(stockMovements.id))
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        <Link href="/panel/stok/hareketler" className={`badge px-3 py-1 ${!type ? "bg-ink text-white ring-ink" : "bg-white ring-stone-300"}`}>
          Tümü
        </Link>
        {MOVEMENT_TYPES.map((k) => (
          <Link key={k} href={`/panel/stok/hareketler?tur=${k}`} className={`badge px-3 py-1 ${type === k ? "bg-ink text-white ring-ink" : "bg-white ring-stone-300"}`}>
            {MOVEMENT_LABELS[k]}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Ürün</th>
              <th>Hareket</th>
              <th className="text-right">Miktar</th>
              <th className="hidden text-right sm:table-cell">Kalan</th>
              <th className="hidden lg:table-cell">Not / Kişi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-500">
                  Hareket yok.
                </td>
              </tr>
            )}
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap text-stone-600">{formatDateTime(m.createdAt)}</td>
                <td>
                  <Link href={`/panel/urunler/${m.productId}`} className="hover:underline">
                    {m.product}
                  </Link>
                  {m.variant && <span className="text-stone-500"> · {m.variant}</span>}
                </td>
                <td className="whitespace-nowrap">
                  {m.orderId ? (
                    <Link href={`/panel/siparisler/${m.orderId}`} className="text-brand-700 hover:underline">
                      {MOVEMENT_LABELS[m.type]}
                    </Link>
                  ) : (
                    MOVEMENT_LABELS[m.type]
                  )}
                </td>
                <td className={`text-right whitespace-nowrap tabular-nums ${Number(m.delta) < 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {Number(m.delta) > 0 ? "+" : ""}
                  {formatQty(m.delta, m.unit)}
                </td>
                <td className="hidden text-right tabular-nums sm:table-cell">{formatQty(m.balance)}</td>
                <td className="hidden text-stone-500 lg:table-cell">{[m.note, m.user].filter(Boolean).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
