import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import QuoteForm from "@/components/QuoteForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const q = await queryOne<{ quote_no: string }>("SELECT quote_no FROM quotes WHERE id=$1", [Number(id)]);
  return { title: q ? `Düzenle: ${q.quote_no} — xShield MNG` : "Teklif Düzenle" };
}

export default async function EditQuotePage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const [quote, customers, items] = await Promise.all([
    queryOne<any>(
      "SELECT * FROM quotes WHERE id=$1",
      [Number(id)]
    ),
    query<{ id: number; company_name: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null }>(
      "SELECT id, company_name, contact_name, contact_email, contact_phone FROM customers ORDER BY company_name"
    ),
    query<any>(
      "SELECT * FROM quote_items WHERE quote_id=$1 ORDER BY sort_order",
      [Number(id)]
    ),
  ]);

  if (!quote) notFound();

  const initial = { ...quote, items };

  return (
    <>
      <style>{`.page{padding:28px} .hd{margin-bottom:20px} .bc{font-size:12px;color:var(--text-ghost);margin-bottom:4px} .bc a{color:var(--text-dim)} .bc a:hover{color:#3b82f6} .title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}`}</style>
      <div className="page">
        <div className="hd">
          <div className="bc">
            <Link href="/quotes">Teklifler</Link> / <Link href={`/quotes/${id}`}>{quote.quote_no}</Link> / Düzenle
          </div>
          <h1 className="title">Teklif Düzenle — {quote.quote_no}</h1>
        </div>
        <QuoteForm customers={customers} initial={initial} defaultPreparedBy={session.username} />
      </div>
    </>
  );
}
