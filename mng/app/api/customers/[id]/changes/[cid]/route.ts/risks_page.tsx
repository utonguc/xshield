import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import RisksClient from "./RisksClient";

export const dynamic = "force-dynamic";

export default async function RisksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const [customer, risks] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [Number(id)]
    ),
    query<{
      id: number; title: string; description: string | null; category: string;
      impact: number; likelihood: number; owner: string | null;
      mitigation_plan: string | null; status: string; target_date: string | null;
      closed_at: string | null; created_by: string | null; created_at: string;
    }>(
      `SELECT id,title,description,category,impact,likelihood,owner,mitigation_plan,
              status,target_date,closed_at,created_by,created_at
       FROM customer_risks WHERE customer_id=$1
       ORDER BY (impact*likelihood) DESC, created_at DESC`,
      [Number(id)]
    ),
  ]);

  if (!customer) return notFound();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <Link href={`/customers/${id}`} style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
        ← {customer.company_name}
      </Link>
      <RisksClient
        customerId={customer.id}
        customerName={customer.company_name}
        initialRisks={risks}
      />
    </div>
  );
}
