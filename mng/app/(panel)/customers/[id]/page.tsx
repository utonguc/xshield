import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";
import type { Metadata } from "next";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await queryOne<{ company_name: string }>("SELECT company_name FROM customers WHERE id=$1", [id]);
  return { title: c ? `${c.company_name} — xShield MNG` : "Müşteri" };
}

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e", inactive: "#64748b", prospect: "#f59e0b", suspended: "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Aktif", inactive: "Pasif", prospect: "Aday", suspended: "Askıya Alındı",
};
const TYPE_COLOR: Record<string, string> = {
  icmp: "#6366f1", tcp: "#3b82f6", http: "#22c55e", https: "#10b981", ssl: "#f59e0b",
};
const CUR: Record<string, string> = { USD: "$", TRY: "₺", EUR: "€" };

/* ── Server Actions ────────────────────────── */

async function deleteCustomerAction(fd: FormData) {
  "use server";
  const id = fd.get("id");
  await query("DELETE FROM customers WHERE id=$1", [id]);
  redirect(`/customers?_toast=${encodeURIComponent("Müşteri silindi")}&_tt=success`);
}

async function uploadDocument(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const customerId = fd.get("customer_id") as string;
  const file = fd.get("file") as File | null;
  if (!file || file.size === 0)
    redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Dosya seçilmedi")}&_tt=error`);
  if (file!.size > MAX_SIZE)
    redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Dosya 20 MB'dan büyük olamaz")}&_tt=error`);

  const ext = file!.name.split(".").pop()?.toLowerCase() || "bin";
  const storedName = `${randomUUID()}.${ext}`;
  const dir = path.join(UPLOAD_DIR, "contracts");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), Buffer.from(await file!.arrayBuffer()));
  await query(
    "INSERT INTO customer_documents (customer_id,original_name,stored_name,mimetype,size,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6)",
    [customerId, file!.name, storedName, file!.type || "application/octet-stream", file!.size, session.username]
  );
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Belge yüklendi")}&_tt=success`);
}

async function deleteDocument(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const docId      = fd.get("doc_id") as string;
  const customerId = fd.get("customer_id") as string;
  const doc = await queryOne<{ stored_name: string }>(
    "SELECT stored_name FROM customer_documents WHERE id=$1", [docId]
  );
  if (doc) await unlink(path.join(UPLOAD_DIR, "contracts", doc.stored_name)).catch(() => {});
  await query("DELETE FROM customer_documents WHERE id=$1", [docId]);
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Belge silindi")}&_tt=success`);
}

async function addNote(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const customerId = fd.get("customer_id") as string;
  const body = (fd.get("body") as string)?.trim();
  if (!body) redirect(`/customers/${customerId}`);
  await query(
    "INSERT INTO customer_notes (customer_id, body, created_by) VALUES ($1,$2,$3)",
    [customerId, body, session.username]
  );
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Not eklendi")}&_tt=success`);
}

async function deleteNote(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const noteId     = fd.get("note_id") as string;
  const customerId = fd.get("customer_id") as string;
  await query("DELETE FROM customer_notes WHERE id=$1", [noteId]);
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Not silindi")}&_tt=success`);
}

async function createLocalPortalUser(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const customerId = fd.get("customer_id") as string;
  const full_name  = (fd.get("full_name") as string)?.trim();
  const email      = (fd.get("email") as string)?.trim().toLowerCase();
  const group_id   = fd.get("permission_group_id") as string;
  const password   = (fd.get("password") as string) || null;
  if (!full_name || !email || !group_id) return;

  const { hashPassword } = await import("@/lib/auth");
  const { sendWelcomeEmail } = await import("@/lib/portal-mail");
  const password_hash = password && password.length >= 6 ? hashPassword(password) : null;

  const isNew = await queryOne<{ cnt: string }>(
    "SELECT COUNT(*)::text AS cnt FROM portal_users WHERE LOWER(email)=$1", [email]
  );
  await query(
    `INSERT INTO portal_users (customer_id,email,full_name,permission_group_id,password_hash,source,is_active,is_verified)
     VALUES ($1,$2,$3,$4,$5,'local',true,true)
     ON CONFLICT (email) DO UPDATE SET
       full_name=EXCLUDED.full_name, customer_id=EXCLUDED.customer_id,
       permission_group_id=EXCLUDED.permission_group_id,
       password_hash=COALESCE(EXCLUDED.password_hash, portal_users.password_hash)`,
    [customerId, email, full_name, group_id, password_hash]
  );
  if (parseInt(isNew?.cnt ?? "0") === 0) {
    const cust = await queryOne<{ company_name: string }>("SELECT company_name FROM customers WHERE id=$1", [customerId]);
    await sendWelcomeEmail(email, full_name, cust?.company_name ?? "");
  }
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Portal kullanıcısı oluşturuldu")}&_tt=success`);
}

async function togglePortalUserActive(fd: FormData) {
  "use server";
  const session = await getSession();
  if (!session) return;
  const userId     = fd.get("user_id") as string;
  const customerId = fd.get("customer_id") as string;
  await query("UPDATE portal_users SET is_active=NOT is_active WHERE id=$1 AND customer_id=$2", [userId, customerId]);
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Kullanıcı durumu güncellendi")}&_tt=info`);
}

async function setAdSyncConfig(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const agentId  = fd.get("agent_id") as string;
  const customerId = fd.get("customer_id") as string;
  const enabled  = fd.get("ad_sync_enabled") === "1";
  const groupId  = fd.get("ad_sync_default_group_id") || null;
  await query(
    "UPDATE network_agents SET ad_sync_enabled=$1, ad_sync_default_group_id=$2 WHERE id=$3 AND customer_id=$4",
    [enabled, groupId, agentId, customerId]
  );
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("AD sync ayarları güncellendi")}&_tt=success`);
}

async function saveAdConfig(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const customerId = fd.get("customer_id") as string;
  const enabled    = fd.get("enabled") === "1";
  const dc_host    = (fd.get("dc_host") as string)?.trim() || null;
  const domain     = (fd.get("domain_name") as string)?.trim() || null;
  const base_dn    = (fd.get("base_dn") as string)?.trim() || null;
  const bind_user  = (fd.get("bind_username") as string)?.trim() || null;
  const bind_pass  = (fd.get("bind_password") as string) || null;
  const interval   = parseInt(fd.get("sync_interval_hours") as string) || 6;

  const { encryptPassword } = await import("@/lib/agent-crypto");
  const { queryOne: qo } = await import("@/lib/db");

  let enc: string | null = null;
  if (bind_pass && bind_pass !== "••••••••") {
    enc = encryptPassword(bind_pass);
  } else {
    // keep existing password if placeholder was submitted
    const existing = await qo<{ bind_password_enc: string | null }>(
      "SELECT bind_password_enc FROM customer_ad_config WHERE customer_id=$1", [customerId]
    );
    enc = existing?.bind_password_enc ?? null;
  }

  // Credentials değiştiyse eski test sonucunu sıfırla
  const credChanged = !!(bind_pass && bind_pass !== "••••••••");

  await query(
    `INSERT INTO customer_ad_config
       (customer_id, enabled, dc_host, domain_name, base_dn, bind_username, bind_password_enc, sync_interval_hours, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
     ON CONFLICT (customer_id) DO UPDATE SET
       enabled=$2, dc_host=$3, domain_name=$4, base_dn=$5,
       bind_username=$6, bind_password_enc=COALESCE($7, customer_ad_config.bind_password_enc),
       sync_interval_hours=$8, updated_at=now(),
       last_test_ok=CASE WHEN $9 THEN NULL ELSE customer_ad_config.last_test_ok END,
       last_test_at=CASE WHEN $9 THEN NULL ELSE customer_ad_config.last_test_at END,
       last_test_msg=CASE WHEN $9 THEN NULL ELSE customer_ad_config.last_test_msg END`,
    [customerId, enabled, dc_host, domain, base_dn, bind_user, enc, interval, credChanged]
  );
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("AD yapılandırması kaydedildi")}&_tt=success`);
}

async function sendAgentCommand(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const agentId    = fd.get("agent_id") as string;
  const customerId = fd.get("customer_id") as string;
  const command    = fd.get("command") as string;
  const allowed    = ["ad_sync", "ad_test", "deep_scan", "scan_now", "sysinfo_now"];
  if (!allowed.includes(command)) return;
  await query(
    "INSERT INTO agent_commands (agent_id, command) VALUES ($1,$2)", [agentId, command]
  );
  redirect(`/customers/${customerId}?_toast=${encodeURIComponent("Komut gönderildi")}&_tt=success`);
}

/* ── Helpers ────────────────────────────────── */

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || "—"}</span>
    </div>
  );
}

/* ── Page ───────────────────────────────────── */

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  await searchParams; // consumed below via _refresh detection
  const session = await getSession();

  const [
    customer, tickets, payments, documents, empCount, invCount, vcCount, licCount, vaultCount,
    complianceCount, riskCount, changeCount, cyberCount,
    financials, monitors, agentStats, notes, openCount,
    portalUsers, permissionGroups, agentsWithAdSync,
    adConfig, lastAdSync,
  ] = await Promise.all([
    queryOne<{
      id: number; company_name: string; contact_name: string; contact_email: string;
      contact_phone: string; secondary_phone: string; address: string; city: string;
      country: string; service_scope: string; monthly_fee: number; currency: string;
      billing_day: number; contract_start: string; contract_end: string;
      status: string; notes: string; created_at: string; logo_name: string | null;
      sla_response_hours: number | null; sla_resolution_hours: number | null;
    }>("SELECT * FROM customers WHERE id=$1", [id]),

    query<{ id: number; subject: string; status: string; priority: string; created_at: string }>(
      "SELECT id,subject,status,priority,created_at FROM tickets WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 10", [id]
    ),

    query<{ id: number; amount: number; currency: string; due_date: string; paid_date: string; status: string; period: string }>(
      `SELECT id,amount,currency,period,due_date,paid_date,
              CASE WHEN status='pending' AND due_date<CURRENT_DATE THEN 'overdue' ELSE status END AS status
       FROM payments WHERE customer_id=$1 ORDER BY due_date DESC LIMIT 12`, [id]
    ),

    query<{ id: number; original_name: string; size: number; mimetype: string; uploaded_by: string; uploaded_at: string }>(
      "SELECT id,original_name,size,mimetype,uploaded_by,uploaded_at FROM customer_documents WHERE customer_id=$1 ORDER BY uploaded_at DESC", [id]
    ),

    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_employees WHERE customer_id=$1", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM inventory_items WHERE customer_id=$1", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_vendor_contracts WHERE customer_id=$1", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_licenses WHERE customer_id=$1", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM credential_vaults WHERE customer_id=$1", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM compliance_tasks WHERE customer_id=$1 AND is_active=true", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM customer_risks WHERE customer_id=$1 AND status NOT IN ('closed','accepted')", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM change_requests WHERE customer_id=$1 AND status NOT IN ('completed','cancelled','rejected')", [id]),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM phishing_campaigns WHERE customer_id=$1", [id]),

    // Finansal özet
    queryOne<{ paid_ytd: string; overdue_total: string; overdue_count: string }>(
      `SELECT
         COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=$1 AND status='paid'
                   AND paid_date >= date_trunc('year', now())), 0)::text AS paid_ytd,
         COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=$1 AND status='pending'
                   AND due_date < CURRENT_DATE), 0)::text AS overdue_total,
         (SELECT COUNT(*) FROM payments WHERE customer_id=$1 AND status='pending'
          AND due_date < CURRENT_DATE)::text AS overdue_count`,
      [id]
    ),

    // Uptime monitörler (son durum)
    query<{
      id: number; name: string; target: string; type: string; port: number | null;
      enabled: boolean; last_is_up: boolean | null; last_ms: number | null; last_detail: string | null;
    }>(
      `SELECT m.id, m.name, m.target, m.type, m.port, m.enabled,
              lc.is_up AS last_is_up, lc.response_ms AS last_ms, lc.detail AS last_detail
       FROM uptime_monitors m
       LEFT JOIN LATERAL (
         SELECT is_up, response_ms, detail
         FROM uptime_checks WHERE monitor_id = m.id
         ORDER BY checked_at DESC LIMIT 1
       ) lc ON true
       WHERE m.customer_id = $1
       ORDER BY m.name`, [id]
    ),

    // Ajan istatistikleri
    queryOne<{ total: string; online: string }>(
      `SELECT COUNT(*)::text AS total,
              SUM(CASE WHEN last_seen > now() - INTERVAL '5 minutes' THEN 1 ELSE 0 END)::text AS online
       FROM network_agents WHERE customer_id=$1`, [id]
    ),

    // Müşteri notları
    query<{ id: number; body: string; pinned: boolean; created_by: string; created_at: string }>(
      `SELECT id, body, pinned, created_by, created_at
       FROM customer_notes WHERE customer_id=$1
       ORDER BY pinned DESC, created_at DESC LIMIT 30`, [id]
    ),

    // Açık talep sayısı
    queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM tickets WHERE customer_id=$1 AND status NOT IN ('resolved','closed')", [id]
    ),

    // Portal kullanıcıları
    query<{
      id: number; full_name: string; email: string; source: string;
      ad_username: string | null; ad_domain: string | null; ad_synced_at: string | null;
      is_active: boolean; group_name: string; permission_group_id: number;
      password_hash: string | null;
    }>(
      `SELECT pu.id, pu.full_name, pu.email, pu.source,
              pu.ad_username, pu.ad_domain, pu.ad_synced_at,
              pu.is_active, pg.name AS group_name, pu.permission_group_id,
              pu.password_hash
       FROM portal_users pu
       JOIN portal_permission_groups pg ON pg.id=pu.permission_group_id
       WHERE pu.customer_id=$1
       ORDER BY pu.source DESC, pu.full_name`, [id]
    ),

    // İzin grupları (local user oluşturma formu için)
    query<{ id: number; name: string }>(
      "SELECT id, name FROM portal_permission_groups ORDER BY name"
    ),

    // AD sync yapılandırması olan ajanlar
    query<{ id: number; name: string; ad_sync_enabled: boolean; ad_sync_default_group_id: number | null; last_seen: string | null }>(
      "SELECT id, name, ad_sync_enabled, ad_sync_default_group_id, last_seen FROM network_agents WHERE customer_id=$1 ORDER BY name", [id]
    ),

    // AD/LDAP yapılandırması
    queryOne<{
      enabled: boolean; dc_host: string | null; domain_name: string | null;
      base_dn: string | null; bind_username: string | null;
      sync_interval_hours: number; last_test_at: string | null;
      last_test_ok: boolean | null; last_test_msg: string | null;
    }>(
      "SELECT enabled, dc_host, domain_name, base_dn, bind_username, sync_interval_hours, last_test_at, last_test_ok, last_test_msg FROM customer_ad_config WHERE customer_id=$1",
      [id]
    ),

    // Son AD sync log
    queryOne<{ synced_at: string; users_total: number; users_created: number; users_updated: number; users_deactivated: number; status: string; message: string | null }>(
      "SELECT synced_at, users_total, users_created, users_updated, users_deactivated, status, message FROM ad_sync_logs WHERE customer_id=$1 ORDER BY synced_at DESC LIMIT 1",
      [id]
    ),
  ]);

  if (!customer) notFound();

  // Son agent komutları (ad_test / ad_sync / deep_scan) — her tip için en son kayıt
  type CmdRow = { command: string; status: string; result: string | null; created_at: string; executed_at: string | null };
  const lastCmds: Record<string, CmdRow> = {};
  if (agentsWithAdSync.length > 0) {
    const rows = await query<CmdRow>(
      `SELECT DISTINCT ON (command) command, status, result, created_at, executed_at
       FROM agent_commands
       WHERE agent_id=$1 AND command IN ('ad_test','ad_sync','deep_scan')
       ORDER BY command, created_at DESC`,
      [agentsWithAdSync[0].id]
    );
    for (const r of rows) lastCmds[r.command] = r;
  }
  const hasPendingCmd = Object.values(lastCmds).some(c => c.status === "pending" || c.status === "running");

  const isAdmin       = session?.role === "admin";
  const numEmployees  = parseInt(empCount?.count  ?? "0", 10);
  const numInventory  = parseInt(invCount?.count  ?? "0", 10);
  const numVendorContracts = parseInt(vcCount?.count ?? "0", 10);
  const numLicenses = parseInt(licCount?.count ?? "0", 10);
  const numVault    = parseInt(vaultCount?.count ?? "0", 10);
  const numCompliance = parseInt(complianceCount?.count ?? "0", 10);
  const numRisks    = parseInt(riskCount?.count ?? "0", 10);
  const numChanges  = parseInt(changeCount?.count ?? "0", 10);
  const numCyber    = parseInt(cyberCount?.count ?? "0", 10);
  const numOpenTickets = parseInt(openCount?.count ?? "0", 10);
  const paidYtd       = Number(financials?.paid_ytd    ?? 0);
  const overdueTotal  = Number(financials?.overdue_total ?? 0);
  const overdueCount  = Number(financials?.overdue_count ?? 0);
  const totalAgents   = parseInt(agentStats?.total  ?? "0", 10);
  const onlineAgents  = parseInt(agentStats?.online ?? "0", 10);
  const statusColor   = STATUS_COLOR[customer.status] ?? "#64748b";
  const cur           = CUR[customer.currency] ?? customer.currency;

  const monitorsDown = monitors.filter(m => m.last_is_up === false && m.enabled).length;
  const monitorsUp   = monitors.filter(m => m.last_is_up === true  && m.enabled).length;

  return (
    <>
      <style>{css}</style>
      <div className="page">
        <Link href="/customers" className="back">← Müşteriler</Link>

        {/* ── Başlık ── */}
        <div className="header-row">
          <div className="header-left">
            {customer.logo_name && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/customers/${id}/logo`} alt={customer.company_name} className="cust-logo" />
            )}
            <div>
              <h1 className="title">{customer.company_name}</h1>
              <span className="status-badge" style={{ color: statusColor, background: `${statusColor}18`, borderColor: `${statusColor}30` }}>
                {STATUS_LABEL[customer.status] ?? customer.status}
              </span>
            </div>
          </div>
          <div className="actions">
            <Link href={`/customers/${id}/employees`} className="btn-stat">
              <span className="stat-num">{numEmployees}</span>
              <span className="stat-lbl">Çalışan</span>
            </Link>
            <Link href={`/inventory?customer=${id}`} className="btn-stat">
              <span className="stat-num">{numInventory}</span>
              <span className="stat-lbl">Envanter</span>
            </Link>
            <Link href={`/customers/${id}/vendor-contracts`} className="btn-stat">
              <span className="stat-num">{numVendorContracts}</span>
              <span className="stat-lbl">Dış Söz.</span>
            </Link>
            <Link href={`/customers/${id}/licenses`} className="btn-stat">
              <span className="stat-num">{numLicenses}</span>
              <span className="stat-lbl">Lisanslar</span>
            </Link>
            <Link href={`/customers/${id}/vault`} className="btn-stat">
              <span className="stat-num">{numVault}</span>
              <span className="stat-lbl">Kasa</span>
            </Link>
            <Link href={`/customers/${id}/compliance`} className="btn-stat">
              <span className="stat-num">{numCompliance}</span>
              <span className="stat-lbl">Kontrol</span>
            </Link>
            <Link href={`/customers/${id}/risks`} className="btn-stat">
              <span className="stat-num">{numRisks}</span>
              <span className="stat-lbl">Risk</span>
            </Link>
            <Link href={`/customers/${id}/changes`} className="btn-stat">
              <span className="stat-num">{numChanges}</span>
              <span className="stat-lbl">RFC</span>
            </Link>
            <Link href={`/customers/${id}/cyber`} className="btn-stat">
              <span className="stat-num">{numCyber}</span>
              <span className="stat-lbl">Siber</span>
            </Link>
            <Link href={`/tickets/new?customer=${id}`} className="btn-quick">+ Talep</Link>
            {isAdmin && (
              <>
                <Link href={`/customers/${id}/edit`} className="btn-edit">Düzenle</Link>
                <DeleteButton
                  entityId={id}
                  confirmMsg="Bu müşteriyi silmek istiyor musunuz?"
                  action="/api/customers/delete"
                  redirectTo="/customers"
                />
              </>
            )}
          </div>
        </div>

        {/* ── KPI Kartları ── */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">Aylık Ücret</div>
            <div className="kpi-val">
              {customer.monthly_fee ? `${cur}${Number(customer.monthly_fee).toLocaleString("tr-TR")}` : "—"}
            </div>
            <div className="kpi-sub">{customer.currency} sözleşme</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Bu Yıl Tahsilat</div>
            <div className="kpi-val">{paidYtd > 0 ? `${cur}${paidYtd.toLocaleString("tr-TR")}` : "—"}</div>
            <div className="kpi-sub">{new Date().getFullYear()} yılı</div>
          </div>
          <div className={`kpi${overdueTotal > 0 ? " kpi-danger" : ""}`}>
            <div className="kpi-label">Gecikmiş Bakiye</div>
            <div className="kpi-val" style={overdueTotal > 0 ? { color: "#ef4444" } : {}}>
              {overdueTotal > 0 ? `${cur}${overdueTotal.toLocaleString("tr-TR")}` : "—"}
            </div>
            <div className="kpi-sub">{overdueCount > 0 ? `${overdueCount} ödeme gecikmiş` : "Temiz"}</div>
          </div>
          <div className={`kpi${numOpenTickets > 0 ? " kpi-warn" : ""}`}>
            <div className="kpi-label">Açık Talep</div>
            <div className="kpi-val" style={numOpenTickets > 0 ? { color: "#f59e0b" } : {}}>
              {numOpenTickets || "—"}
            </div>
            <div className="kpi-sub">
              {numOpenTickets > 0
                ? <Link href={`/tickets?customer=${id}`} className="kpi-link">Talepleri gör →</Link>
                : "Destek talebi yok"}
            </div>
          </div>
        </div>

        {/* ── İletişim + Sözleşme ── */}
        <div className="grid3">
          <div className="card col2">
            <div className="card-title">İletişim Bilgileri</div>
            <div className="info-grid">
              <InfoRow label="Yetkili"    value={customer.contact_name} />
              <InfoRow label="E-posta"    value={customer.contact_email} />
              <InfoRow label="Telefon"    value={customer.contact_phone} />
              <InfoRow label="2. Telefon" value={customer.secondary_phone} />
              <InfoRow label="Adres"      value={customer.address} />
              <InfoRow label="Şehir"      value={`${customer.city ?? ""} ${customer.country ?? ""}`.trim()} />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Sözleşme</div>
            <div className="info-grid">
              <InfoRow label="Aylık Ücret" value={customer.monthly_fee ? `${customer.currency} ${Number(customer.monthly_fee).toLocaleString()}` : "—"} />
              <InfoRow label="Fatura Günü" value={customer.billing_day ? `Her ayın ${customer.billing_day}i` : "—"} />
              <InfoRow label="Başlangıç"   value={customer.contract_start ? new Date(customer.contract_start).toLocaleDateString("tr-TR") : "—"} />
              <InfoRow label="Bitiş"       value={customer.contract_end  ? new Date(customer.contract_end).toLocaleDateString("tr-TR")  : "—"} />
              {(customer.sla_response_hours || customer.sla_resolution_hours) && (
                <InfoRow label="SLA" value={[
                  customer.sla_response_hours  && `Yanıt: ${customer.sla_response_hours}s`,
                  customer.sla_resolution_hours && `Çözüm: ${customer.sla_resolution_hours}s`,
                ].filter(Boolean).join(" · ")} />
              )}
              <InfoRow label="Kayıt" value={new Date(customer.created_at).toLocaleDateString("tr-TR")} />
            </div>
          </div>
        </div>

        {customer.service_scope && (
          <div className="card">
            <div className="card-title">Hizmet Kapsamı</div>
            <div className="scope-text">{customer.service_scope}</div>
          </div>
        )}
        {customer.notes && (
          <div className="card">
            <div className="card-title">Notlar</div>
            <div className="scope-text">{customer.notes}</div>
          </div>
        )}

        {/* ── Dış İzleme ── */}
        {monitors.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Dış İzleme</span>
              <div className="mon-summary-row">
                {monitorsUp > 0   && <span className="mon-sum up">{monitorsUp} UP</span>}
                {monitorsDown > 0 && <span className="mon-sum dn">{monitorsDown} DOWN</span>}
                <Link href={`/monitoring?customer=${id}`} className="card-link">Yönet →</Link>
              </div>
            </div>
            <div className="mon-list">
              {monitors.map((m) => {
                const up    = m.last_is_up;
                const dot   = up === null ? "#6b7280" : up ? "#22c55e" : "#ef4444";
                const tCol  = TYPE_COLOR[m.type] ?? "#64748b";
                return (
                  <div key={m.id} className={`mon-row${!m.enabled ? " mon-dis" : ""}`}>
                    <span className="mon-dot" style={{ color: dot }}>●</span>
                    <div className="mon-info">
                      <span className="mon-name">{m.name}</span>
                      <span className="mon-target">{m.target}{m.port ? `:${m.port}` : ""}</span>
                    </div>
                    <div className="mon-right">
                      {m.last_ms != null && <span className="mon-ms">{m.last_ms}ms</span>}
                      {m.last_detail && <span className="mon-detail" title={m.last_detail}>{m.last_detail.slice(0, 20)}</span>}
                      <span className="mon-type" style={{ color: tCol, borderColor: `${tCol}30`, background: `${tCol}10` }}>
                        {m.type.toUpperCase()}
                      </span>
                      {!m.enabled && <span className="mon-paused">DURAKLATILDI</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Ağ Ajanları ── */}
        {totalAgents > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Ağ Ajanları</span>
              <Link href={`/network-discovery?customer=${id}`} className="card-link">Ağ Keşfi →</Link>
            </div>
            <div className="agent-row">
              <div className="agent-stat">
                <span className="agent-num" style={{ color: onlineAgents > 0 ? "#22c55e" : "var(--text-ghost)" }}>{onlineAgents}</span>
                <span className="agent-lbl">Çevrimiçi</span>
              </div>
              <div className="agent-sep" />
              <div className="agent-stat">
                <span className="agent-num" style={totalAgents - onlineAgents > 0 ? { color: "#ef4444" } : {}}>{totalAgents - onlineAgents}</span>
                <span className="agent-lbl">Çevrimdışı</span>
              </div>
              <div className="agent-sep" />
              <div className="agent-stat">
                <span className="agent-num">{totalAgents}</span>
                <span className="agent-lbl">Toplam Ajan</span>
              </div>
            </div>
          </div>
        )}

        {/* ── İmzalı Sözleşmeler ── */}
        <div className="card">
          <div className="card-title">İmzalı Sözleşmeler</div>
          {documents.length === 0 ? (
            <div className="doc-empty">Henüz belge yüklenmemiş.</div>
          ) : (
            <div className="doc-list">
              {documents.map((doc) => {
                const isPdf = doc.mimetype === "application/pdf";
                const isImg = doc.mimetype.startsWith("image/");
                const icon  = isPdf ? "PDF" : isImg ? "IMG" : "DOC";
                const ic    = isPdf ? "#ef4444" : isImg ? "#3b82f6" : "#6366f1";
                return (
                  <div key={doc.id} className="doc-row">
                    <span className="doc-icon" style={{ color: ic, borderColor: `${ic}30`, background: `${ic}10` }}>{icon}</span>
                    <div className="doc-info">
                      <a href={`/api/documents/${doc.id}`} className="doc-name" target="_blank" rel="noreferrer">{doc.original_name}</a>
                      <span className="doc-meta">
                        {fmtSize(doc.size)}{doc.uploaded_by && ` · ${doc.uploaded_by}`}
                        {" · "}{new Date(doc.uploaded_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    {isAdmin && (
                      <details className="del-wrap">
                        <summary className="doc-del">Sil</summary>
                        <div className="del-popup">
                          <span>Belge silinsin mi?</span>
                          <form action={deleteDocument}>
                            <input type="hidden" name="doc_id"      value={doc.id} />
                            <input type="hidden" name="customer_id" value={customer.id} />
                            <button type="submit" className="del-confirm">Evet, Sil</button>
                          </form>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <form action={uploadDocument} encType="multipart/form-data" className="upload-form">
            <input type="hidden" name="customer_id" value={customer.id} />
            <label className="file-label">
              <input type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required className="file-input" />
              <span className="file-btn">Dosya Seç</span>
              <span className="file-hint">PDF, DOC, DOCX, JPG, PNG — maks. 20 MB</span>
            </label>
            <button type="submit" className="btn-upload">Yükle</button>
          </form>
        </div>

        {/* ── Talepler + Ödemeler ── */}
        <div className="grid2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Destek Talepleri</span>
              <Link href={`/tickets?customer=${id}`} className="card-link">Tümü →</Link>
            </div>
            {tickets.length === 0 ? <div className="empty">Talep yok.</div> : tickets.map((t) => (
              <Link key={t.id} href={`/tickets/${t.id}`} className="list-row">
                <span className="list-title">{t.subject}</span>
                <span className="list-meta">{new Date(t.created_at).toLocaleDateString("tr-TR")}</span>
              </Link>
            ))}
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Ödeme Geçmişi</span>
              <Link href={`/payments?customer=${id}`} className="card-link">Tümü →</Link>
            </div>
            {payments.length === 0 ? <div className="empty">Ödeme yok.</div> : payments.map((p) => {
              const c = p.status === "paid" ? "#22c55e" : p.status === "overdue" ? "#ef4444" : "#f59e0b";
              return (
                <div key={p.id} className="list-row">
                  <span className="list-title">{p.period ?? new Date(p.due_date).toLocaleDateString("tr-TR")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="fee">{p.currency} {Number(p.amount).toLocaleString()}</span>
                    <span className="badge" style={{ color: c, background: `${c}18`, borderColor: `${c}30` }}>
                      {p.status === "paid" ? "Ödendi" : p.status === "overdue" ? "Gecikmiş" : "Bekliyor"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Dahili Notlar ── */}
        <div className="card">
          <div className="card-title">Dahili Notlar</div>
          <form action={addNote} className="note-form">
            <input type="hidden" name="customer_id" value={id} />
            <textarea
              name="body"
              placeholder="Not ekle… toplantı özeti, takip, hatırlatma"
              required
              className="note-textarea"
              rows={3}
            />
            <div className="note-actions">
              <button type="submit" className="btn-note-add">Ekle</button>
            </div>
          </form>
          {notes.length === 0 ? (
            <div className="note-empty">Henüz not eklenmemiş.</div>
          ) : (
            <div className="notes-list">
              {notes.map((n) => (
                <div key={n.id} className={`note-item${n.pinned ? " pinned" : ""}`}>
                  <div className="note-body">{n.body}</div>
                  <div className="note-meta">
                    <span className="note-author">{n.created_by}</span>
                    <span className="note-dot">·</span>
                    <span>{new Date(n.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {n.pinned && <span className="note-pin">📌</span>}
                    {isAdmin && (
                      <form action={deleteNote} style={{ display: "inline" }}>
                        <input type="hidden" name="note_id"     value={n.id} />
                        <input type="hidden" name="customer_id" value={id}   />
                        <button type="submit" className="note-del" title="Sil">✕</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── AD / LDAP Entegrasyonu ── */}
        {isAdmin && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">AD / LDAP Entegrasyonu</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {adConfig?.last_test_at && (
                  <span className={`ad-test-badge${adConfig.last_test_ok ? " ok" : " fail"}`}>
                    {adConfig.last_test_ok ? "✓ Bağlantı OK" : "✗ Bağlantı Hatası"}
                  </span>
                )}
                {adConfig?.enabled && <span className="ad-enabled-badge">Aktif</span>}
              </div>
            </div>

            {/* Last sync summary */}
            {lastAdSync && (
              <div className="ad-sync-summary-bar">
                <span className={`ad-sync-status${lastAdSync.status === "ok" ? " ok" : " err"}`}>
                  {lastAdSync.status === "ok" ? "✓" : "✗"}
                </span>
                <span className="ad-sync-info">
                  Son sync: {new Date(lastAdSync.synced_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" · "}{lastAdSync.users_total} kullanıcı
                  {lastAdSync.users_created > 0 && ` · +${lastAdSync.users_created} yeni`}
                  {lastAdSync.users_updated > 0 && ` · ${lastAdSync.users_updated} güncellendi`}
                  {lastAdSync.users_deactivated > 0 && ` · ${lastAdSync.users_deactivated} pasife alındı`}
                </span>
                {lastAdSync.message && <span className="ad-sync-errmsg" title={lastAdSync.message}>{lastAdSync.message.slice(0, 60)}</span>}
              </div>
            )}

            <form action={saveAdConfig} className="ad-config-form">
              <input type="hidden" name="customer_id" value={id} />
              {agentsWithAdSync.length > 0 && (
                <input type="hidden" name="agent_id" value={agentsWithAdSync[0].id} />
              )}
              <div className="ad-config-grid">
                <div className="ad-field full">
                  <label className="ad-toggle-label">
                    <input type="checkbox" name="enabled" value="1" defaultChecked={adConfig?.enabled ?? false} />
                    <span>AD Entegrasyonunu Etkinleştir</span>
                  </label>
                </div>
                <div className="ad-field">
                  <label>DC Host / IP *</label>
                  <input name="dc_host" placeholder="192.168.1.1 veya dc.company.local" defaultValue={adConfig?.dc_host ?? ""} />
                  <span className="ad-hint">Domain Controller adresi</span>
                </div>
                <div className="ad-field">
                  <label>Domain Adı</label>
                  <input name="domain_name" placeholder="company.local" defaultValue={adConfig?.domain_name ?? ""} />
                </div>
                <div className="ad-field">
                  <label>Base DN</label>
                  <input name="base_dn" placeholder="DC=company,DC=local" defaultValue={adConfig?.base_dn ?? ""} />
                  <span className="ad-hint">Kullanıcı aramasının başlayacağı OU</span>
                </div>
                <div className="ad-field">
                  <label>Sync Aralığı</label>
                  <select name="sync_interval_hours" defaultValue={String(adConfig?.sync_interval_hours ?? 6)}>
                    <option value="1">Her 1 saat</option>
                    <option value="3">Her 3 saat</option>
                    <option value="6">Her 6 saat</option>
                    <option value="12">Her 12 saat</option>
                    <option value="24">Günlük</option>
                  </select>
                </div>
                <div className="ad-field">
                  <label>Bind Kullanıcı (Servis Hesabı)</label>
                  <input name="bind_username" placeholder="svc_xshield veya DOMAIN\svc_xshield" defaultValue={adConfig?.bind_username ?? ""} />
                  <span className="ad-hint">Read-only servis hesabı önerilir</span>
                </div>
                <div className="ad-field">
                  <label>Bind Şifresi</label>
                  <input name="bind_password" type="password"
                    placeholder={adConfig?.bind_username ? "••••••••  (değiştirmek için girin)" : "Şifre"}
                    autoComplete="new-password" />
                </div>
              </div>
              <div className="ad-form-actions">
                <button type="submit" className="btn-ad-save">Kaydet</button>
                {agentsWithAdSync.length === 0 && (
                  <span className="ad-no-agent">⚠ Test/Sync için ajan gerekli</span>
                )}
              </div>
            </form>

            {agentsWithAdSync.length > 0 && (
              <>
                <div className="ad-form-actions ad-form-actions-commands">
                  <form action={sendAgentCommand} style={{ display: "contents" }}>
                    <input type="hidden" name="customer_id" value={id} />
                    <input type="hidden" name="agent_id"    value={agentsWithAdSync[0].id} />
                    <input type="hidden" name="command"     value="ad_test" />
                    <button type="submit" className="btn-ad-test">Bağlantıyı Test Et</button>
                  </form>
                  <form action={sendAgentCommand} style={{ display: "contents" }}>
                    <input type="hidden" name="customer_id" value={id} />
                    <input type="hidden" name="agent_id"    value={agentsWithAdSync[0].id} />
                    <input type="hidden" name="command"     value="ad_sync" />
                    <button type="submit" className="btn-ad-sync">Şimdi Sync Et</button>
                  </form>
                  <form action={sendAgentCommand} style={{ display: "contents" }}>
                    <input type="hidden" name="customer_id" value={id} />
                    <input type="hidden" name="agent_id"    value={agentsWithAdSync[0].id} />
                    <input type="hidden" name="command"     value="deep_scan" />
                    <button type="submit" className="btn-deep-scan">Derin Tarama</button>
                  </form>
                </div>

                {/* Komut durumu tablosu */}
                {Object.keys(lastCmds).length > 0 && (
                  <div className="cmd-status-table">
                    {(["ad_test","ad_sync","deep_scan"] as const).map(cmd => {
                      const c = lastCmds[cmd];
                      if (!c) return null;
                      const label = cmd === "ad_test" ? "Bağlantı Testi" : cmd === "ad_sync" ? "AD Sync" : "Derin Tarama";
                      const statusClass = c.status === "done" ? "cmd-done" : c.status === "error" ? "cmd-error" : "cmd-pending";
                      const statusLabel = c.status === "done" ? "✓ Tamamlandı" : c.status === "error" ? "✗ Hata" : c.status === "running" ? "⟳ Çalışıyor…" : "⏳ Bekliyor…";
                      const ts = c.executed_at ?? c.created_at;
                      return (
                        <div key={cmd} className="cmd-status-row">
                          <span className="cmd-label">{label}</span>
                          <span className={`cmd-badge ${statusClass}`}>{statusLabel}</span>
                          <span className="cmd-time">{new Date(ts).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                          {c.result && <span className="cmd-result" title={c.result}>{c.result.slice(0, 80)}</span>}
                        </div>
                      );
                    })}
                    {hasPendingCmd && (
                      <div className="cmd-refreshing">Sonuç bekleniyor, sayfa 5 saniyede yenilenir…</div>
                    )}
                  </div>
                )}

                {hasPendingCmd && (
                  // eslint-disable-next-line @next/next/no-sync-scripts
                  <script dangerouslySetInnerHTML={{ __html: "setTimeout(()=>location.reload(),5000)" }} />
                )}
              </>
            )}

            {adConfig?.last_test_at && !adConfig.last_test_ok && adConfig.last_test_msg && (
              <div className="ad-error-box">
                <strong>Hata:</strong> {adConfig.last_test_msg}
              </div>
            )}
          </div>
        )}

        {/* ── Portal Kullanıcıları ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Portal Kullanıcıları</span>
            <span className="pu-count">{portalUsers.length} kullanıcı</span>
          </div>

          {/* AD Sync config (her ajan için) */}
          {agentsWithAdSync.length > 0 && isAdmin && (
            <div className="ad-sync-wrap">
              {agentsWithAdSync.map((ag) => {
                const isOnline = ag.last_seen && new Date(ag.last_seen) > new Date(Date.now() - 5 * 60_000);
                return (
                  <details key={ag.id} className="ad-sync-agent">
                    <summary className="ad-sync-summary">
                      <span className="ad-sync-dot" style={{ color: isOnline ? "#22c55e" : "#64748b" }}>●</span>
                      <span className="ad-sync-agname">{ag.name}</span>
                      <span className={`ad-sync-badge${ag.ad_sync_enabled ? " enabled" : ""}`}>
                        {ag.ad_sync_enabled ? "AD Sync: Açık" : "AD Sync: Kapalı"}
                      </span>
                    </summary>
                    <form action={setAdSyncConfig} className="ad-sync-form">
                      <input type="hidden" name="agent_id"    value={ag.id} />
                      <input type="hidden" name="customer_id" value={id} />
                      <div className="ad-sync-fields">
                        <label className="ad-toggle">
                          <input type="checkbox" name="ad_sync_enabled" value="1" defaultChecked={ag.ad_sync_enabled} />
                          <span>AD Sync Aktif</span>
                        </label>
                        <div className="ad-group-field">
                          <label className="ad-group-lbl">Varsayılan Yetki Grubu</label>
                          <select name="ad_sync_default_group_id" defaultValue={ag.ad_sync_default_group_id ?? ""}>
                            <option value="">— Seçiniz (sync pasif kalır) —</option>
                            {permissionGroups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="btn-ad-save">Kaydet</button>
                    </form>
                  </details>
                );
              })}
            </div>
          )}

          {/* Kullanıcı listesi */}
          {portalUsers.length === 0 ? (
            <div className="pu-empty">Bu müşteri için portal kullanıcısı yok.</div>
          ) : (
            <div className="pu-list">
              {portalUsers.map((u) => (
                <div key={u.id} className={`pu-row${!u.is_active ? " pu-inactive" : ""}`}>
                  <div className="pu-info">
                    <div className="pu-name-row">
                      <span className="pu-name">{u.full_name}</span>
                      <span className={`pu-src-badge${u.source === "ad" ? " ad" : " local"}`}>
                        {u.source === "ad" ? "AD" : "Yerel"}
                      </span>
                      {!u.is_active && <span className="pu-pasif">Pasif</span>}
                      {!u.password_hash && <span className="pu-nopw">Şifresiz</span>}
                    </div>
                    <div className="pu-sub">
                      <span className="pu-email">{u.email}</span>
                      {u.ad_username && (
                        <span className="pu-aduser">{u.ad_username}{u.ad_domain ? `@${u.ad_domain}` : ""}</span>
                      )}
                      <span className="pu-group-tag">{u.group_name}</span>
                    </div>
                  </div>
                  <div className="pu-actions">
                    <form action={togglePortalUserActive}>
                      <input type="hidden" name="user_id"     value={u.id} />
                      <input type="hidden" name="customer_id" value={id} />
                      <button type="submit" className={`pu-toggle${u.is_active ? "" : " inactive"}`}>
                        {u.is_active ? "Pasife Al" : "Aktifleştir"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Yeni yerel kullanıcı oluştur */}
          <details className="add-pu-wrap">
            <summary className="add-pu-summary">+ Yerel Kullanıcı Ekle</summary>
            <form action={createLocalPortalUser} className="add-pu-form">
              <input type="hidden" name="customer_id" value={id} />
              <div className="pu-form-grid">
                <div className="pu-field">
                  <label>Ad Soyad *</label>
                  <input name="full_name" required placeholder="Ahmet Yılmaz" />
                </div>
                <div className="pu-field">
                  <label>E-posta *</label>
                  <input name="email" type="email" required placeholder="ahmet@firma.com" />
                </div>
                <div className="pu-field">
                  <label>Yetki Grubu *</label>
                  <select name="permission_group_id" required defaultValue="">
                    <option value="" disabled>— Seçiniz —</option>
                    {permissionGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pu-field">
                  <label>Şifre (opsiyonel)</label>
                  <input name="password" type="password" placeholder="En az 6 karakter" />
                </div>
              </div>
              <div className="pu-form-actions">
                <span className="pu-form-hint">Şifre girilmezse kullanıcı OTP ile giriş yapar. Davet e-postası otomatik gönderilir.</span>
                <button type="submit" className="btn-pu-create">Kullanıcı Oluştur</button>
              </div>
            </form>
          </details>
        </div>

      </div>
    </>
  );
}

const css = `
.page{padding:28px;display:flex;flex-direction:column;gap:20px;max-width:1100px}
@media(max-width:640px){.page{padding:16px;gap:14px}}
.back{font-size:13px;color:var(--text-dim);display:block;margin-bottom:2px}
.back:hover{color:var(--text-muted)}

/* Header */
.header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.header-left{display:flex;align-items:center;gap:14px}
.cust-logo{max-height:52px;max-width:140px;object-fit:contain;border:1px solid var(--border2);border-radius:8px;padding:5px;background:var(--input-bg);flex-shrink:0}
.title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:6px}
.status-badge{display:inline-block;font-size:11px;font-weight:700;padding:4px 10px;border-radius:7px;border:1px solid}
.actions{display:flex;gap:8px;flex-shrink:0;align-items:center;flex-wrap:wrap}
.btn-stat{display:flex;flex-direction:column;align-items:center;padding:8px 14px;border-radius:8px;border:1px solid var(--border2);background:var(--card);text-decoration:none;min-width:56px;gap:1px}
.btn-stat:hover{background:var(--row-hover)}
.stat-num{font-size:17px;font-weight:800;color:var(--text);line-height:1}
.stat-lbl{font-size:10px;font-weight:600;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.06em}
.btn-quick{padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;color:#22c55e;border:1px solid rgba(34,197,94,.3);background:rgba(34,197,94,.08);white-space:nowrap}
.btn-quick:hover{background:rgba(34,197,94,.15)}
.btn-edit{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;color:#3b82f6;border:1px solid rgba(59,130,246,.3);background:rgba(59,130,246,.08)}

/* KPI row */
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media(max-width:700px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
@media(max-width:400px){.kpi-row{grid-template-columns:1fr}}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}
.kpi-danger{border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.03)}
.kpi-warn{border-color:rgba(245,158,11,.25)}
.kpi-label{font-size:10px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
.kpi-val{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.3px;margin-bottom:4px;line-height:1.2}
.kpi-sub{font-size:11px;color:var(--text-ghost)}
.kpi-link{color:#3b82f6;font-weight:600}

/* Layout */
.grid3{display:grid;grid-template-columns:2fr 1fr;gap:16px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:700px){.grid3,.grid2{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.card-title{font-size:12px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px}
.card-link{font-size:12px;color:#3b82f6;font-weight:600;white-space:nowrap}
.info-grid{display:flex;flex-direction:column;gap:10px}
.info-row{display:flex;gap:12px}
.info-label{font-size:12px;color:var(--text-dimmer);font-weight:600;width:100px;flex-shrink:0}
.info-value{font-size:13px;color:var(--text-sub)}
.scope-text{font-size:13px;color:var(--text-muted);line-height:1.7;white-space:pre-wrap}

/* Monitoring */
.mon-summary-row{display:flex;align-items:center;gap:8px}
.mon-sum{font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px}
.mon-sum.up{color:#22c55e;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25)}
.mon-sum.dn{color:#ef4444;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25)}
.mon-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.mon-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--row-border)}
.mon-row:last-child{border-bottom:none}
.mon-row.mon-dis{opacity:.5}
.mon-dot{font-size:10px;flex-shrink:0}
.mon-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.mon-name{font-size:13px;font-weight:600;color:var(--text-sub)}
.mon-target{font-size:11px;color:var(--text-ghost);font-family:monospace}
.mon-right{display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap}
.mon-ms{font-size:11px;color:var(--text-dim)}
.mon-detail{font-size:11px;color:var(--text-ghost);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mon-type{font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid;letter-spacing:.04em}
.mon-paused{font-size:9px;color:var(--text-ghost);background:var(--input-bg);border:1px solid var(--border2);border-radius:4px;padding:2px 6px;font-weight:600}

/* Agents */
.agent-row{display:flex;align-items:center;gap:0}
.agent-stat{display:flex;flex-direction:column;align-items:center;padding:12px 24px;flex:1}
.agent-num{font-size:22px;font-weight:800;color:var(--text);line-height:1}
.agent-lbl{font-size:10px;font-weight:600;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.agent-sep{width:1px;height:40px;background:var(--border);flex-shrink:0}

/* Tickets / Payments */
.list-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--row-border);gap:8px;text-decoration:none}
.list-row:last-child{border-bottom:none}
.list-row:hover{opacity:.8}
.list-title{font-size:13px;color:var(--text-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.list-meta{font-size:11px;color:var(--text-dim);flex-shrink:0}
.fee{font-size:12px;font-weight:600;color:var(--text-muted)}
.badge{font-size:10px;font-weight:700;padding:3px 7px;border-radius:5px;border:1px solid;white-space:nowrap}
.empty{font-size:13px;color:var(--text-ghost);padding:8px 0}

/* Documents */
.doc-empty{font-size:13px;color:var(--text-ghost);padding:4px 0 16px}
.doc-list{display:flex;flex-direction:column;margin-bottom:16px;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.doc-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--row-border)}
.doc-row:last-child{border-bottom:none}
.doc-icon{font-size:9px;font-weight:800;letter-spacing:.04em;padding:4px 6px;border-radius:5px;border:1px solid;flex-shrink:0}
.doc-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.doc-name{font-size:13px;font-weight:600;color:#3b82f6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none}
.doc-name:hover{text-decoration:underline}
.doc-meta{font-size:11px;color:var(--text-ghost)}
.del-wrap{position:relative;flex-shrink:0}
.del-wrap summary{list-style:none;cursor:pointer;font-size:11px;font-weight:600;color:var(--text-dimmer);padding:5px 10px;border-radius:5px;border:1px solid var(--border2);user-select:none}
.del-wrap summary::-webkit-details-marker{display:none}
.del-wrap summary:hover{color:#ef4444;border-color:rgba(239,68,68,.3)}
.del-popup{position:absolute;right:0;top:calc(100% + 6px);background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;z-index:10;display:flex;flex-direction:column;gap:8px;min-width:160px;box-shadow:0 4px 16px rgba(0,0,0,.15)}
.del-popup span{font-size:12px;color:var(--text-muted);white-space:nowrap}
.del-confirm{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;background:#ef4444;color:#fff;border:none;cursor:pointer;width:100%}
.del-confirm:hover{background:#dc2626}
.upload-form{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:4px}
.file-label{display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer}
.file-input{display:none}
.file-btn{font-size:12px;font-weight:600;padding:8px 14px;border-radius:7px;border:1px solid var(--input-border);background:var(--input-bg);color:var(--text-muted);white-space:nowrap;cursor:pointer;flex-shrink:0}
.file-hint{font-size:11px;color:var(--text-ghost);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.btn-upload{padding:8px 20px;border-radius:7px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;min-height:36px}
.btn-upload:hover{background:#1d4ed8}
@media(max-width:500px){.upload-form{flex-direction:column;align-items:flex-start}.btn-upload{width:100%}}

/* Notes */
.note-form{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.note-textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:10px 12px;color:var(--text);outline:none;font-size:13px;line-height:1.6;resize:vertical;width:100%}
.note-textarea:focus{border-color:#3b82f6}
.note-actions{display:flex;justify-content:flex-end}
.btn-note-add{padding:8px 20px;border-radius:7px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer}
.btn-note-add:hover{background:#1d4ed8}
.note-empty{font-size:13px;color:var(--text-ghost);padding:4px 0}
.notes-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.note-item{padding:12px 14px;border-bottom:1px solid var(--row-border)}
.note-item:last-child{border-bottom:none}
.note-item.pinned{background:rgba(234,179,8,.04)}
.note-body{font-size:13px;color:var(--text-sub);line-height:1.65;white-space:pre-wrap;word-break:break-word;margin-bottom:6px}
.note-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--text-ghost)}
.note-author{font-weight:600;color:var(--text-dim)}
.note-dot{color:var(--text-ghost)}
.note-pin{font-size:11px}
.note-del{background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-ghost);padding:0 4px;line-height:1;margin-left:4px}
.note-del:hover{color:#ef4444}

/* AD Integration */
.ad-enabled-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;color:#6366f1;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25)}
.ad-test-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;border:1px solid}
.ad-test-badge.ok{color:#22c55e;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.3)}
.ad-test-badge.fail{color:#ef4444;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.3)}
.ad-sync-summary-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--input-bg);border:1px solid var(--border2);border-radius:8px;margin-bottom:16px;flex-wrap:wrap}
.ad-sync-status{font-size:14px;font-weight:800;flex-shrink:0}
.ad-sync-status.ok{color:#22c55e}
.ad-sync-status.err{color:#ef4444}
.ad-sync-info{font-size:12px;color:var(--text-muted);flex:1}
.ad-sync-errmsg{font-size:11px;color:#ef4444;font-family:monospace}
.ad-config-form{display:flex;flex-direction:column;gap:14px}
.ad-config-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:700px){.ad-config-grid{grid-template-columns:1fr}}
.ad-field{display:flex;flex-direction:column;gap:4px}
.ad-field.full{grid-column:1/-1}
.ad-field label:not(.ad-toggle-label){font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:.06em}
.ad-field input,.ad-field select{background:var(--input-bg);border:1px solid var(--input-border);border-radius:7px;padding:9px 11px;color:var(--text);font-size:13px;outline:none}
.ad-field input:focus,.ad-field select:focus{border-color:#6366f1}
.ad-hint{font-size:10px;color:var(--text-ghost)}
.ad-toggle-label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer}
.ad-toggle-label input{width:16px;height:16px}
.ad-form-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.btn-ad-save{padding:9px 20px;border-radius:7px;font-size:13px;font-weight:700;background:#6366f1;color:#fff;border:none;cursor:pointer}
.btn-ad-save:hover{background:#4f46e5}
.btn-ad-test{padding:8px 16px;border-radius:7px;font-size:12px;font-weight:700;border:1px solid rgba(99,102,241,.3);color:#6366f1;background:rgba(99,102,241,.07);cursor:pointer}
.btn-ad-test:hover{background:rgba(99,102,241,.14)}
.btn-ad-sync{padding:8px 16px;border-radius:7px;font-size:12px;font-weight:700;border:1px solid rgba(34,197,94,.3);color:#22c55e;background:rgba(34,197,94,.07);cursor:pointer}
.btn-ad-sync:hover{background:rgba(34,197,94,.14)}
.btn-deep-scan{padding:8px 16px;border-radius:7px;font-size:12px;font-weight:700;border:1px solid rgba(245,158,11,.3);color:#f59e0b;background:rgba(245,158,11,.07);cursor:pointer}
.btn-deep-scan:hover{background:rgba(245,158,11,.14)}
.ad-no-agent{font-size:12px;color:var(--text-ghost)}
.ad-error-box{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#ef4444;margin-top:4px;font-family:monospace}
.ad-form-actions-commands{margin-top:6px;padding-top:10px;border-top:1px solid var(--border)}
.cmd-status-table{margin-top:10px;display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,.03);border-radius:8px;padding:10px 12px}
.cmd-status-row{display:flex;align-items:center;gap:10px;font-size:12px;flex-wrap:wrap}
.cmd-label{font-weight:600;color:var(--text-main);min-width:110px}
.cmd-badge{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
.cmd-done{background:rgba(34,197,94,.12);color:#16a34a}
.cmd-error{background:rgba(239,68,68,.1);color:#dc2626}
.cmd-pending{background:rgba(99,102,241,.1);color:#6366f1}
.cmd-time{color:var(--text-ghost);font-size:11px}
.cmd-result{color:var(--text-ghost);font-family:monospace;font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmd-refreshing{font-size:11px;color:#6366f1;margin-top:4px;opacity:.8}

/* Portal Users */
.pu-count{font-size:11px;color:var(--text-ghost);font-weight:600}
.pu-empty{font-size:13px;color:var(--text-ghost);padding:4px 0 12px}
.pu-list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px}
.pu-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--row-border);gap:12px}
.pu-row:last-child{border-bottom:none}
.pu-row.pu-inactive{opacity:.6}
.pu-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.pu-name-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pu-name{font-size:13px;font-weight:600;color:var(--text-sub)}
.pu-src-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em}
.pu-src-badge.ad{color:#6366f1;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25)}
.pu-src-badge.local{color:#0891b2;background:rgba(8,145,178,.1);border:1px solid rgba(8,145,178,.2)}
.pu-pasif{font-size:9px;font-weight:700;color:#64748b;background:var(--input-bg);border:1px solid var(--border2);border-radius:4px;padding:2px 6px}
.pu-nopw{font-size:9px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:4px;padding:2px 6px}
.pu-sub{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pu-email{font-size:11px;color:var(--text-ghost)}
.pu-aduser{font-size:11px;color:#6366f1;font-family:monospace;background:rgba(99,102,241,.06);padding:1px 5px;border-radius:3px}
.pu-group-tag{font-size:10px;color:var(--text-dimmer);background:var(--input-bg);padding:1px 6px;border-radius:4px;border:1px solid var(--border2)}
.pu-actions{flex-shrink:0}
.pu-toggle{padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid rgba(239,68,68,.3);color:#ef4444;background:rgba(239,68,68,.06);cursor:pointer;white-space:nowrap}
.pu-toggle:hover{background:rgba(239,68,68,.12)}
.pu-toggle.inactive{border-color:rgba(34,197,94,.3);color:#22c55e;background:rgba(34,197,94,.06)}
.pu-toggle.inactive:hover{background:rgba(34,197,94,.12)}

/* Add portal user form */
.add-pu-wrap{margin-top:4px}
.add-pu-summary{list-style:none;cursor:pointer;font-size:12px;font-weight:700;color:#3b82f6;padding:8px 0;user-select:none}
.add-pu-summary::-webkit-details-marker{display:none}
.add-pu-form{margin-top:12px;background:var(--input-bg);border:1px solid var(--border2);border-radius:10px;padding:16px}
.pu-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
@media(max-width:600px){.pu-form-grid{grid-template-columns:1fr}}
.pu-field{display:flex;flex-direction:column;gap:5px}
.pu-field label{font-size:10px;font-weight:700;color:var(--section-title);text-transform:uppercase;letter-spacing:.06em}
.pu-field input,.pu-field select{background:var(--card);border:1px solid var(--input-border);border-radius:7px;padding:9px 11px;color:var(--text);font-size:13px;outline:none}
.pu-field input:focus,.pu-field select:focus{border-color:#3b82f6}
.pu-form-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pu-form-hint{font-size:11px;color:var(--text-ghost);flex:1}
.btn-pu-create{padding:9px 20px;border-radius:7px;font-size:13px;font-weight:700;background:#2563eb;color:#fff;border:none;cursor:pointer;white-space:nowrap}
.btn-pu-create:hover{background:#1d4ed8}

/* AD Sync */
.ad-sync-wrap{background:rgba(99,102,241,.04);border:1px solid rgba(99,102,241,.15);border-radius:8px;overflow:hidden;margin-bottom:14px}
.ad-sync-agent{border-bottom:1px solid rgba(99,102,241,.1)}
.ad-sync-agent:last-child{border-bottom:none}
.ad-sync-summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 14px;user-select:none}
.ad-sync-summary::-webkit-details-marker{display:none}
.ad-sync-dot{font-size:8px}
.ad-sync-agname{font-size:12px;font-weight:600;color:var(--text-sub);flex:1}
.ad-sync-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;border:1px solid rgba(100,116,139,.2);color:#64748b;background:rgba(100,116,139,.08)}
.ad-sync-badge.enabled{color:#6366f1;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.25)}
.ad-sync-form{padding:12px 14px 14px;border-top:1px solid rgba(99,102,241,.1)}
.ad-sync-fields{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:10px}
.ad-toggle{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer;flex-shrink:0}
.ad-toggle input{width:16px;height:16px}
.ad-group-field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:180px}
.ad-group-lbl{font-size:10px;font-weight:700;color:var(--text-dimmer);text-transform:uppercase;letter-spacing:.06em}
.ad-group-field select{background:var(--card);border:1px solid var(--input-border);border-radius:7px;padding:8px 10px;color:var(--text);font-size:12px;outline:none}
.ad-group-field select:focus{border-color:#6366f1}
.btn-ad-save{padding:7px 16px;border-radius:6px;font-size:12px;font-weight:700;background:#6366f1;color:#fff;border:none;cursor:pointer}
.btn-ad-save:hover{background:#4f46e5}
`;
