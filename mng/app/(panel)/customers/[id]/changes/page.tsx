import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import ChangesClient from "./ChangesClient";

export const dynamic = "force-dynamic";

export default async function ChangesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const [customer, changes] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [Number(id)]
    ),
    query<{
      id: number; rfc_no: string; title: string; description: string | null;
      change_type: string; impact: string; urgency: string;
      requestor: string | null; assigned_to: string | null;
      planned_date: string | null; rollback_plan: string | null;
      implementation_notes: string | null; status: string;
      approved_by: string | null; approved_at: string | null;
      completed_at: string | null; created_by: string | null; created_at: string;
    }>(
      `SELECT id,rfc_no,title,description,change_type,impact,urgency,requestor,assigned_to,
              planned_date,rollback_plan,implementation_notes,status,approved_by,approved_at,
              completed_at,created_by,created_at
       FROM change_requests WHERE customer_id=$1
       ORDER BY created_at DESC`,
      [Number(id)]
    ),
  ]);

  if (!customer) return notFound();

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <Link href={`/customers/${id}`} style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
        ← {customer.company_name}
      </Link>
      <ChangesClient
        customerId={customer.id}
        customerName={customer.company_name}
        initialChanges={changes}
      />
    </div>
  );
}
