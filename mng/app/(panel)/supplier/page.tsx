import { query } from "@/lib/db";
import type { Metadata } from "next";
import SupplierClient from "./SupplierClient";

export const metadata: Metadata = { title: "Tedarikçi Ürünleri — xShield MNG" };
export const dynamic = "force-dynamic";

type Product = {
  id: number;
  source: string;
  product_code: string;
  title: string;
  category: string | null;
  price_havale: string | null;
  price_kk: string | null;
  price_vadeli: string | null;
  currency: string;
  stock_status: string | null;
  image_url: string | null;
  detail_url: string | null;
  last_synced: string;
};

export default async function SupplierPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string; source?: string; sort?: string; instock?: string }>;
}) {
  const { q, cat, page: pageStr, source, sort = "title", instock: instockStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const limit = 48;
  const offset = (page - 1) * limit;
  const instock = instockStr === "1";

  const conds: string[] = [];
  const params: unknown[] = [];
  if (source) { params.push(source); conds.push(`source=$${params.length}`); }
  if (q) { params.push(`%${q}%`); conds.push(`(product_code ILIKE $${params.length} OR title ILIKE $${params.length})`); }
  if (cat) { params.push(cat); conds.push(`category=$${params.length}`); }
  if (instock) conds.push(`(stock_status IS NOT NULL AND stock_status NOT ILIKE '%yok%' AND stock_status != '0')`);
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";

  const baseWhere = source ? "WHERE source=$1" : "";
  const baseParams = source ? [source] : [];

  const orderBy =
    sort === "price_asc"  ? "ORDER BY price_havale ASC NULLS LAST, title" :
    sort === "price_desc" ? "ORDER BY price_havale DESC NULLS LAST, title" :
                            "ORDER BY category NULLS LAST, title";

  const [countRows, products, cats, syncRow, totalRow, sourceCounts, supplierDefs] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM supplier_products ${where}`, params),
    query<Product>(
      `SELECT id,source,product_code,title,category,price_havale,price_kk,price_vadeli,currency,stock_status,image_url,detail_url,last_synced
       FROM supplier_products ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<{ category: string; cnt: string }>(
      `SELECT category, COUNT(*)::text AS cnt FROM supplier_products ${baseWhere ? baseWhere + " AND" : "WHERE"} category IS NOT NULL GROUP BY category ORDER BY category`,
      baseParams
    ),
    query<{ ts: string }>(`SELECT MAX(last_synced)::text AS ts FROM supplier_products`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM supplier_products ${baseWhere}`, baseParams),
    query<{ source: string; cnt: string }>(
      "SELECT source, COUNT(*)::text AS cnt FROM supplier_products GROUP BY source ORDER BY source"
    ),
    query<{ source: string; label: string }>(
      "SELECT source, label FROM supplier_credentials WHERE enabled=true ORDER BY id"
    ),
  ]);

  const total = parseInt(countRows[0]?.count ?? "0");
  const totalAll = parseInt(totalRow[0]?.count ?? "0");

  return (
    <SupplierClient
      products={products}
      categories={cats.map(c => ({ name: c.category, count: parseInt(c.cnt) }))}
      total={total}
      totalAll={totalAll}
      page={page}
      pages={Math.ceil(total / limit)}
      lastSynced={syncRow[0]?.ts ?? null}
      q={q ?? ""}
      cat={cat ?? ""}
      source={source ?? ""}
      sort={sort}
      instock={instock}
      sourceCounts={Object.fromEntries(sourceCounts.map(r => [r.source, parseInt(r.cnt)]))}
      supplierDefs={supplierDefs}
    />
  );
}
