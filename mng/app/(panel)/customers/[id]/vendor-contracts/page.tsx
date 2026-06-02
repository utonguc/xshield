import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import VendorContractsClient from "./VendorContractsClient";

export const dynamic = "force-dynamic";

export default async function VendorContractsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const customer = await queryOne<{ id: number; company_name: string }>(
    "SELECT id, company_name FROM customers WHERE id=$1",
    [Number(id)]
  );
  if (!customer) notFound();

  const contracts = await query<{
    id: number; vendor_name: string; service_type: string | null;
    contract_no: string | null; start_date: string | null; end_date: string | null;
    monthly_fee: string | null; currency: string; notes: string | null;
    file_stored: string | null; file_original: string | null; file_size: number | null;
    created_at: string;
  }>(
    `SELECT id, vendor_name, service_type, contract_no, start_date, end_date,
            monthly_fee, currency, notes, file_stored, file_original, file_size, created_at
     FROM customer_vendor_contracts WHERE customer_id=$1 ORDER BY
       CASE WHEN end_date IS NULL THEN 1 ELSE 0 END,
       end_date ASC`,
    [Number(id)]
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/customers" style={{ color: "var(--text-dim)", fontSize: 13, textDecoration: "none" }}>Müşteriler</Link>
        <span style={{ color: "var(--text-dim)" }}>›</span>
        <Link href={`/customers/${id}`} style={{ color: "var(--text-dim)", fontSize: 13, textDecoration: "none" }}>{customer.company_name}</Link>
        <span style={{ color: "var(--text-dim)" }}>›</span>
        <span style={{ fontSize: 13, color: "var(--text)" }}>Dış Sözleşmeler</span>
      </div>

      <VendorContractsClient
        customerId={Number(id)}
        customerName={customer.company_name}
        initialContracts={contracts}
      />
    </div>
  );
}
