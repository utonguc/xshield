import { queryOne } from "@/lib/db";
import Link from "next/link";

type Module =
  | "genel" | "employees" | "inventory" | "contracts"
  | "licenses" | "vault" | "compliance" | "risks" | "rfc" | "cyber";

const MOD_NAV_CSS = `
.mod-nav{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.mod-nav::-webkit-scrollbar{height:3px}
.mod-nav::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.mod-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 14px;border-radius:9px;border:1px solid var(--border2);background:var(--card);text-decoration:none;white-space:nowrap;flex-shrink:0;min-width:60px;transition:background .15s,border-color .15s}
.mod-item:hover{background:var(--row-hover);border-color:var(--border)}
.mod-active{background:rgba(59,130,246,.06)!important;border-color:rgba(59,130,246,.35)!important}
.mod-num{font-size:16px;font-weight:800;color:var(--text);line-height:1}
.mod-icon{font-size:15px;line-height:1;color:#3b82f6}
.mod-lbl{font-size:10px;font-weight:600;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.05em}
@media(max-width:640px){.mod-item{padding:8px 11px;min-width:52px}.mod-num{font-size:14px}}
`;

export async function CustomerModuleNav({
  customerId,
  active,
}: {
  customerId: string;
  active: Module;
}) {
  const [emp, inv, ctr, lic, vlt, cmp, rsk, rfc, pen] = await Promise.all([
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_employees WHERE customer_id=$1", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM inventory_items WHERE customer_id=$1", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_vendor_contracts WHERE customer_id=$1", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_licenses WHERE customer_id=$1", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM credential_vaults WHERE customer_id=$1", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM compliance_tasks WHERE customer_id=$1 AND is_active=true", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_risks WHERE customer_id=$1 AND status='open'", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM change_requests WHERE customer_id=$1", [customerId]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM pentest_projects WHERE customer_id=$1", [customerId]),
  ]);

  const n = (v?: { count: string } | null) => parseInt(v?.count ?? "0", 10);

  const items: { key: Module; label: string; count?: number; href: string }[] = [
    { key: "genel",      label: "Genel",      href: `/customers/${customerId}` },
    { key: "employees",  label: "Çalışanlar", count: n(emp), href: `/customers/${customerId}/employees` },
    { key: "inventory",  label: "Envanter",   count: n(inv), href: `/inventory?customer=${customerId}` },
    { key: "contracts",  label: "Dış Söz.",   count: n(ctr), href: `/customers/${customerId}/contracts` },
    { key: "licenses",   label: "Lisanslar",  count: n(lic), href: `/customers/${customerId}/licenses` },
    { key: "vault",      label: "Kasa",       count: n(vlt), href: `/customers/${customerId}/vault` },
    { key: "compliance", label: "Kontrol",    count: n(cmp), href: `/customers/${customerId}/compliance` },
    { key: "risks",      label: "Risk",       count: n(rsk), href: `/customers/${customerId}/risks` },
    { key: "rfc",        label: "RFC",        count: n(rfc), href: `/customers/${customerId}/rfc` },
    { key: "cyber",      label: "Siber",      count: n(pen), href: `/customers/${customerId}/cyber` },
  ];

  return (
    <>
      <style>{MOD_NAV_CSS}</style>
      <nav className="mod-nav">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`mod-item${active === item.key ? " mod-active" : ""}`}
          >
            {item.count !== undefined ? (
              <span className="mod-num">{item.count}</span>
            ) : (
              <span className="mod-icon">⊙</span>
            )}
            <span className="mod-lbl">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
