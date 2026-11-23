import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, stockBatches, stockMovements, users, variants } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { formatDate, formatDateTime, formatQty } from "@/lib/format";
import { MOVEMENT_LABELS } from "@/lib/labels";
import { imageUrl } from "@/lib/uploads";
import { deleteProductAction } from "../actions";
import { ProductForm } from "../product-form";

const str = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

export default async function EditProductPage({ params, searchParams }: PageProps<"/panel/urunler/[id]">) {
  const me = await requireMember();
  const { id } = await params;
  const saved = (await searchParams).kaydedildi === "1";
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = me.tenant.id;

  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.tenantId, t)));
  if (!p) notFound();
  const [vs, cats] = await Promise.all([
    db.select().from(variants).where(eq(variants.productId, id)).orderBy(asc(variants.sort)),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.tenantId, t)).orderBy(asc(categories.sort), asc(categories.name)),
  ]);
  const vIds = vs.map((v) => v.id);
  const [moves, batches] = vIds.length
    ? await Promise.all([
        db
          .select({
            id: stockMovements.id,
            variantId: stockMovements.variantId,
            type: stockMovements.type,
            delta: stockMovements.qtyDelta,
            balance: stockMovements.balanceAfter,
            note: stockMovements.note,
            createdAt: stockMovements.createdAt,
            user: users.name,
            orderId: stockMovements.orderId,
          })
          .from(stockMovements)
          .leftJoin(users, eq(users.id, stockMovements.userId))
          .where(inArray(stockMovements.variantId, vIds))
          .orderBy(desc(stockMovements.id))
          .limit(30),
        db
          .select()
          .from(stockBatches)
          .where(and(inArray(stockBatches.variantId, vIds), gt(stockBatches.qtyRemaining, 0)))
          .orderBy(asc(stockBatches.expiryDate)),
      ])
    : [[], []];
  const vName = new Map(vs.map((v) => [v.id, v.name]));
  const vUnit = new Map(vs.map((v) => [v.id, v.unit]));

  return (
    <div className="space-y-8">
      <PageHeader
        title={p.name}
        actions={
          <>
            <Link href={`/panel/stok/giris?urun=${p.id}`} className="btn-ghost">
              Mal kabul
            </Link>
            {p.isPublished && (
              <Link href={`/${me.tenant.slug}/urun/${p.id}`} target="_blank" className="btn-ghost">
                Mağazada gör ↗
              </Link>
            )}
          </>
        }
      />
      {saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">Ürün kaydedildi.</p>}

      <ProductForm
        key={p.updatedAt.getTime()}
        categories={cats}
        draft={{
          id: p.id,
          name: p.name,
          brand: p.brand ?? "",
          categoryId: p.categoryId ?? "",
          petType: p.petType,
          description: p.description ?? "",
          isPublished: p.isPublished,
          imageUrl: imageUrl(p.imagePath),
          variants: vs.map((v) => ({
            key: v.id,
            id: v.id,
            name: v.name,
            barcode: v.barcode ?? "",
            sku: v.sku ?? "",
            unit: v.unit,
            price: str(v.price),
            compareAtPrice: str(v.compareAtPrice),
            costPrice: str(v.costPrice),
            lowStockThreshold: str(v.lowStockThreshold),
            initialStock: "",
            isActive: v.isActive,
            stockQty: Number(v.stockQty),
          })),
        }}
      />

      {batches.length > 0 && (
        <section className="card overflow-x-auto">
          <h2 className="px-5 pt-4 pb-3 font-semibold">Son kullanma tarihli partiler</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Seçenek</th>
                <th>Parti / Lot</th>
                <th>SKT</th>
                <th className="text-right">Kalan</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>{vName.get(b.variantId) || "—"}</td>
                  <td>{b.lotNo || "—"}</td>
                  <td>{b.expiryDate ? formatDate(b.expiryDate) : "—"}</td>
                  <td className="text-right tabular-nums">{formatQty(b.qtyRemaining, vUnit.get(b.variantId))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card overflow-x-auto">
        <h2 className="px-5 pt-4 pb-3 font-semibold">Stok hareketleri</h2>
        {moves.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-stone-500">Henüz hareket yok.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Hareket</th>
                {vs.length > 1 && <th>Seçenek</th>}
                <th className="text-right">Miktar</th>
                <th className="text-right">Kalan</th>
                <th className="hidden md:table-cell">Not</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-stone-600">{formatDateTime(m.createdAt)}</td>
                  <td>
                    {m.orderId ? (
                      <Link className="text-brand-700 hover:underline" href={`/panel/siparisler/${m.orderId}`}>
                        {MOVEMENT_LABELS[m.type]}
                      </Link>
                    ) : (
                      MOVEMENT_LABELS[m.type]
                    )}
                  </td>
                  {vs.length > 1 && <td>{vName.get(m.variantId) || "—"}</td>}
                  <td className={`text-right tabular-nums ${Number(m.delta) < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {Number(m.delta) > 0 ? "+" : ""}
                    {formatQty(m.delta)}
                  </td>
                  <td className="text-right tabular-nums">{formatQty(m.balance)}</td>
                  <td className="hidden text-stone-500 md:table-cell">{[m.note, m.user].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <form action={deleteProductAction.bind(null, p.id)} className="border-t border-stone-200 pt-6">
        <button className="btn-danger">Ürünü sil</button>
        <p className="hint">Daha önce satılmış ürünler silinmez, raporlar bozulmasın diye arşivlenir (satıştan kalkar).</p>
      </form>
    </div>
  );
}
