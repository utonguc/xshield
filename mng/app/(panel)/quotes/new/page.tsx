import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import QuoteForm from "@/components/QuoteForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Yeni Teklif — xShield MNG" };

export default async function NewQuotePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const customers = await query<{
    id: number; company_name: string; contact_name: string | null;
    contact_email: string | null; contact_phone: string | null;
  }>(
    "SELECT id, company_name, contact_name, contact_email, contact_phone FROM customers WHERE status='active' ORDER BY company_name"
  );

  return (
    <>
      <style>{`.page{padding:28px} .hd{display:flex;align-items:center;gap:12px;margin-bottom:20px} .bc{font-size:12px;color:var(--text-ghost)} .bc a{color:var(--text-dim)} .bc a:hover{color:#3b82f6} .title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}`}</style>
      <div className="page">
        <div className="hd">
          <div>
            <div className="bc"><Link href="/quotes">Teklifler</Link> / Yeni Teklif</div>
            <h1 className="title">Yeni Teklif Oluştur</h1>
          </div>
        </div>
        <QuoteForm customers={customers} defaultPreparedBy={session.username} />
      </div>
    </>
  );
}
