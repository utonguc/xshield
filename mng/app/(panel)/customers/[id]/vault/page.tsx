import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CustomerModuleNav } from "@/components/CustomerModuleNav";
import VaultClient from "./VaultClient";
export const dynamic = "force-dynamic";

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const customer = await queryOne<{ id: number; company_name: string }>(
    "SELECT id, company_name FROM customers WHERE id=$1", [Number(id)]
  );
  if (!customer) notFound();
  const credentials = await query(
    `SELECT id, label, category, username, url, port, notes, created_by, created_at,
            (encrypted_pass IS NOT NULL) AS has_password
     FROM credential_vaults WHERE customer_id=$1 ORDER BY category, label`,
    [Number(id)]
  );
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Link href="/customers" style={{ color: "var(--text-dim)", fontSize: 13, textDecoration: "none" }}>Müşteriler</Link>
        <span style={{ color: "var(--text-dim)" }}>›</span>
        <Link href={`/customers/${id}`} style={{ color: "var(--text-dim)", fontSize: 13, textDecoration: "none" }}>{customer.company_name}</Link>
        <span style={{ color: "var(--text-dim)" }}>›</span>
        <span style={{ fontSize: 13, color: "var(--text)" }}>🔐 Erişim Bilgileri Kasası</span>
      </div>
      <CustomerModuleNav customerId={id} active="vault" />
      <div style={{ marginTop: 20 }}>
        <VaultClient customerId={Number(id)} customerName={customer.company_name} initialCredentials={credentials as any} />
      </div>
    </div>
  );
}
