import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import ComplianceClient from "./ComplianceClient";

export const dynamic = "force-dynamic";

export default async function CompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const [customer, tasks] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [Number(id)]
    ),
    query<{
      id: number; title: string; description: string | null; category: string;
      frequency: string; assigned_to: string | null; next_due_date: string | null;
      is_active: boolean; created_at: string;
      last_completed_at: string | null; last_completed_by: string | null;
      last_status: string | null; completion_count: number;
    }>(
      `SELECT t.*,
         (SELECT completed_at FROM compliance_completions WHERE task_id=t.id ORDER BY completed_at DESC LIMIT 1) AS last_completed_at,
         (SELECT completed_by FROM compliance_completions WHERE task_id=t.id ORDER BY completed_at DESC LIMIT 1) AS last_completed_by,
         (SELECT status FROM compliance_completions WHERE task_id=t.id ORDER BY completed_at DESC LIMIT 1) AS last_status,
         (SELECT COUNT(*)::int FROM compliance_completions WHERE task_id=t.id) AS completion_count
       FROM compliance_tasks t WHERE t.customer_id=$1
       ORDER BY t.next_due_date ASC NULLS LAST, t.created_at DESC`,
      [Number(id)]
    ),
  ]);

  if (!customer) return notFound();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <Link href={`/customers/${id}`} style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
        ← {customer.company_name}
      </Link>
      <ComplianceClient
        customerId={customer.id}
        customerName={customer.company_name}
        initialTasks={tasks}
      />
    </div>
  );
}
