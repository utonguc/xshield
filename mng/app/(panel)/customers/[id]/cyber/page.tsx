import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import CyberClient from "./CyberClient";

export const dynamic = "force-dynamic";

export default async function CyberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return notFound();

  const [customer, campaigns, emailTemplates, pageTemplates, projects] = await Promise.all([
    queryOne<{ id: number; company_name: string }>(
      "SELECT id,company_name FROM customers WHERE id=$1", [Number(id)]
    ),
    query<{
      id: number; name: string; status: string; authorization_ref: string;
      sender_name: string; sender_email: string; created_at: string;
      started_at: string | null; completed_at: string | null;
      email_template_name: string | null; page_template_name: string | null;
      total: number; sent: number; opened: number; clicked: number; submitted: number;
    }>(
      `SELECT c.id,c.name,c.status,c.authorization_ref,c.sender_name,c.sender_email,
              c.created_at,c.started_at,c.completed_at,
              et.name AS email_template_name, pt.name AS page_template_name,
              (SELECT COUNT(*)::int FROM phishing_targets WHERE campaign_id=c.id) AS total,
              (SELECT COUNT(*)::int FROM phishing_targets WHERE campaign_id=c.id AND sent_at IS NOT NULL) AS sent,
              (SELECT COUNT(*)::int FROM phishing_targets WHERE campaign_id=c.id AND opened_at IS NOT NULL) AS opened,
              (SELECT COUNT(*)::int FROM phishing_targets WHERE campaign_id=c.id AND clicked_at IS NOT NULL) AS clicked,
              (SELECT COUNT(*)::int FROM phishing_targets WHERE campaign_id=c.id AND submitted_at IS NOT NULL) AS submitted
       FROM phishing_campaigns c
       LEFT JOIN phishing_email_templates et ON et.id=c.email_template_id
       LEFT JOIN phishing_page_templates  pt ON pt.id=c.page_template_id
       WHERE c.customer_id=$1 ORDER BY c.created_at DESC`,
      [Number(id)]
    ),
    query<{ id: number; name: string; category: string; subject: string; sender_name: string }>(
      "SELECT id,name,category,subject,sender_name FROM phishing_email_templates ORDER BY is_builtin DESC, name"
    ),
    query<{ id: number; name: string; category: string; description: string | null }>(
      "SELECT id,name,category,description FROM phishing_page_templates ORDER BY is_builtin DESC, name"
    ),
    query<{
      id: number; name: string; type: string; scope: string | null;
      start_date: string | null; end_date: string | null; tester: string | null;
      status: string; authorization_ref: string | null; created_at: string;
      finding_count: number; critical_count: number; high_count: number;
    }>(
      `SELECT p.*,
         (SELECT COUNT(*)::int FROM pentest_findings WHERE project_id=p.id) AS finding_count,
         (SELECT COUNT(*)::int FROM pentest_findings WHERE project_id=p.id AND severity='critical') AS critical_count,
         (SELECT COUNT(*)::int FROM pentest_findings WHERE project_id=p.id AND severity='high') AS high_count
       FROM pentest_projects p WHERE p.customer_id=$1 ORDER BY p.created_at DESC`,
      [Number(id)]
    ),
  ]);

  if (!customer) return notFound();

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <Link href={`/customers/${id}`} style={{ fontSize: 13, color: "var(--text-dim)", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
        ← {customer.company_name}
      </Link>
      <CyberClient
        customerId={customer.id}
        customerName={customer.company_name}
        initialCampaigns={campaigns}
        emailTemplates={emailTemplates}
        pageTemplates={pageTemplates}
        initialProjects={projects}
      />
    </div>
  );
}
