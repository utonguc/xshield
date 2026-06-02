import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import LicensesClient from "./LicensesClient";
export const dynamic = "force-dynamic";

export default async function LicensesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const customer = await queryOne<{ id: number; company_name: string }>(
    "SELECT id, company_name FROM customers WHERE id=$1", [Number(id)]
  );
  if (!customer) notFound();
  const licenses = await query(
    `SELECT id, name, category, vendor, license_key, quantity, start_date, end_date,
            cost, currency, auto_renew, notes, created_at
     FROM customer_licenses WHERE customer_id=$1
     ORDER BY CASE WHEN end_date IS NULL THEN 1 ELSE 0 END, end_date ASC`,
    [Number(id)]
  );
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/customers" style={{ color: "var(--text-dim)", fontSize: 13, textDecoration: "none" }}>Müşteriler</Link>
        <span style={{ color: "var(--text-dim)" }}>›</span>
        <Link href={`/customers/${id}`} style={{ color: "var(--text-dim)", fontSize: 13, textDecoration: "none" }}>{customer.company_name}</Link>
        <span style={{ color: "var(--text-dim)" }}>›</span>
        <span style={{ fontSize: 13, color: "var(--text)" }}>Lisanslar</span>
      </div>
      <LicensesClient customerId={Number(id)} customerName={customer.company_name} initialLicenses={licenses as any} />
    </div>
  );
}
