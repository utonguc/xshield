import type { Metadata } from "next";
import Link from "next/link";
import WizardClient from "./WizardClient";

export const metadata: Metadata = { title: "Rapor Sihirbazı — xShield MNG" };

export default function ReportWizardPage() {
  return (
    <div>
      <div style={{ padding: "20px 28px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href="/reports"
          style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none", fontWeight: 600 }}
        >
          ← Raporlar
        </Link>
        <span style={{ color: "var(--text-dimmer)", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 700 }}>Rapor Sihirbazı</span>
      </div>
      <WizardClient />
    </div>
  );
}
