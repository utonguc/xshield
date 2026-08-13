import { query, queryOne } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/portal-mail";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PortalUserForm } from "./_portal_user_form";

type SupplierCred = { id: number; source: string; label: string; bayi_kodu: string; kullanici_adi: string; parola: string; enabled: boolean; updated_at: string };

export const metadata: Metadata = { title: "Ayarlar — xShield MNG" };
export const dynamic = "force-dynamic";

// ── Server Actions ──────────────────────────────────────────────────────────

async function addUser(fd: FormData) {
  "use server";
  const username = (fd.get("username") as string)?.trim();
  const email    = (fd.get("email") as string)?.trim();
  const password = fd.get("password") as string;
  const role     = fd.get("role") as string;
  if (!username || !password || !email) return;
  const hash = hashPassword(password);
  await query(
    "INSERT INTO users (username,email,password_hash,role) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [username, email, hash, role || "support"]
  );
  redirect(`/settings?tab=kullanicilar&_toast=${encodeURIComponent("Kullanıcı oluşturuldu")}&_tt=success`);
}

async function toggleUser(fd: FormData) {
  "use server";
  const id = fd.get("id");
  await query("UPDATE users SET is_active=NOT is_active WHERE id=$1", [id]);
  redirect(`/settings?tab=kullanicilar&_toast=${encodeURIComponent("Kullanıcı durumu güncellendi")}&_tt=info`);
}

async function changePassword(fd: FormData) {
  "use server";
  const id       = fd.get("id");
  const password = fd.get("password") as string;
  if (!password || password.length < 8) return;
  const hash = hashPassword(password);
  await query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, id]);
  redirect(`/settings?tab=kullanicilar&_toast=${encodeURIComponent("Şifre güncellendi")}&_tt=success`);
}

async function updateEmailTemplate(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const key       = fd.get("key") as string;
  const subject   = (fd.get("subject") as string)?.trim();
  const body_text = (fd.get("body_text") as string)?.trim();
  if (!subject || !body_text) return;
  await query(
    "UPDATE email_templates SET subject=$1, body_text=$2, updated_at=now() WHERE key=$3",
    [subject, body_text, key]
  );
  redirect(`/settings?tab=eposta&_toast=${encodeURIComponent("Şablon güncellendi")}&_tt=success`);
}

async function addPermissionGroup(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const name = (fd.get("name") as string)?.trim();
  if (!name) return;
  const permissions = {
    inventory:     fd.get("inventory")     === "1",
    employees:     fd.get("employees")     === "1",
    tickets:       fd.get("tickets")       === "1",
    contract:      fd.get("contract")      === "1",
    create_ticket: fd.get("create_ticket") === "1",
    own_only:      fd.get("own_only")      === "1",
  };
  await query(
    "INSERT INTO portal_permission_groups (name, permissions) VALUES ($1, $2)",
    [name, JSON.stringify(permissions)]
  );
  redirect(`/settings?tab=portal&_toast=${encodeURIComponent("Yetki grubu oluşturuldu")}&_tt=success`);
}

async function deletePermissionGroup(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = fd.get("id");
  await query("DELETE FROM portal_permission_groups WHERE id=$1", [id]);
  redirect(`/settings?tab=portal&_toast=${encodeURIComponent("Yetki grubu silindi")}&_tt=info`);
}

async function addPortalUser(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const email       = (fd.get("email") as string)?.trim().toLowerCase();
  const full_name   = (fd.get("full_name") as string)?.trim();
  const customer_id = fd.get("customer_id");
  const employee_id = fd.get("employee_id") || null;
  const group_id    = fd.get("permission_group_id");
  if (!email || !full_name || !customer_id || !group_id) return;
  let resolvedEmployeeId: number | null = employee_id ? Number(employee_id) : null;
  if (!resolvedEmployeeId) {
    const nameParts = full_name.split(" ");
    const firstName = nameParts[0] ?? full_name;
    const lastName  = nameParts.slice(1).join(" ") || "";
    const newEmp = await queryOne<{ id: number }>(
      `INSERT INTO customer_employees (customer_id, first_name, last_name, email)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
      [customer_id, firstName, lastName, email]
    );
    if (newEmp) {
      resolvedEmployeeId = newEmp.id;
    } else {
      const existing = await queryOne<{ id: number }>(
        "SELECT id FROM customer_employees WHERE customer_id=$1 AND LOWER(email)=LOWER($2)",
        [customer_id, email]
      );
      resolvedEmployeeId = existing?.id ?? null;
    }
  }
  const isNew = await queryOne<{ cnt: string }>(
    "SELECT COUNT(*)::text AS cnt FROM portal_users WHERE email=$1", [email]
  );
  await query(
    `INSERT INTO portal_users (email, full_name, customer_id, employee_id, permission_group_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE SET
       full_name=EXCLUDED.full_name, customer_id=EXCLUDED.customer_id,
       employee_id=EXCLUDED.employee_id, permission_group_id=EXCLUDED.permission_group_id`,
    [email, full_name, customer_id, resolvedEmployeeId, group_id]
  );
  if (parseInt(isNew?.cnt ?? "0") === 0) {
    const cust = await queryOne<{ company_name: string }>(
      "SELECT company_name FROM customers WHERE id=$1", [customer_id]
    );
    await sendWelcomeEmail(email, full_name, cust?.company_name ?? "");
  }
  redirect(`/settings?tab=portal&_toast=${encodeURIComponent("Portal kullanıcısı oluşturuldu")}&_tt=success`);
}

async function togglePortalUser(fd: FormData) {
  "use server";
  const id = fd.get("id");
  await query("UPDATE portal_users SET is_active=NOT is_active WHERE id=$1", [id]);
  redirect(`/settings?tab=portal&_toast=${encodeURIComponent("Kullanıcı durumu güncellendi")}&_tt=info`);
}

async function changePortalUserGroup(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id       = fd.get("id");
  const group_id = fd.get("permission_group_id");
  if (!id || !group_id) return;
  await query("UPDATE portal_users SET permission_group_id=$1 WHERE id=$2", [group_id, id]);
  redirect(`/settings?tab=portal&_toast=${encodeURIComponent("Yetki grubu güncellendi")}&_tt=success`);
}

async function resendPortalInvite(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = fd.get("id");
  const pu = await queryOne<{ email: string; full_name: string; company_name: string }>(
    `SELECT pu.email, pu.full_name, c.company_name
     FROM portal_users pu JOIN customers c ON c.id=pu.customer_id WHERE pu.id=$1`,
    [id]
  );
  if (!pu) return;
  await sendWelcomeEmail(pu.email, pu.full_name, pu.company_name);
  redirect(`/settings?tab=portal&_toast=${encodeURIComponent("Davet e-postası gönderildi")}&_tt=success`);
}

async function updateSupplierCred(fd: FormData) {
  "use server";
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id            = fd.get("id");
  const bayi_kodu     = (fd.get("bayi_kodu") as string)?.trim();
  const kullanici_adi = (fd.get("kullanici_adi") as string)?.trim();
  const parola        = (fd.get("parola") as string)?.trim();
  const enabled       = fd.get("enabled") === "1";
  await query(
    "UPDATE supplier_credentials SET bayi_kodu=$1, kullanici_adi=$2, parola=$3, enabled=$4, updated_at=now() WHERE id=$5",
    [bayi_kodu, kullanici_adi, parola, enabled, id]
  );
  redirect(`/settings?tab=tedarikci&_toast=${encodeURIComponent("Tedarikçi bilgileri güncellendi")}&_tt=success`);
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/");

  const { tab: rawTab } = await searchParams;
  const TABS = ["kullanicilar", "portal", "eposta", "tedarikci"] as const;
  type Tab = typeof TABS[number];
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "kullanicilar";

  const [users, emailTemplates, permissionGroups, portalUsers, customers, allEmployees, supplierCreds] = await Promise.all([
    query<{ id: number; username: string; email: string; role: string; is_active: boolean; created_at: string; last_login: string }>(
      "SELECT * FROM users ORDER BY created_at"
    ),
    query<{ id: number; key: string; name: string; subject: string; body_text: string; updated_at: string }>(
      "SELECT * FROM email_templates ORDER BY key"
    ),
    query<{ id: number; name: string; permissions: Record<string, boolean>; created_at: string }>(
      "SELECT id, name, permissions, created_at FROM portal_permission_groups ORDER BY name"
    ),
    query<{
      id: number; email: string; full_name: string; customer_id: number; company_name: string;
      employee_id: number | null; permission_group_id: number; group_name: string;
      is_active: boolean; source: string | null; created_at: string;
    }>(
      `SELECT pu.id, pu.email, pu.full_name, pu.customer_id, c.company_name,
              pu.employee_id, pu.permission_group_id, pg.name AS group_name,
              pu.is_active, pu.source, pu.created_at
       FROM portal_users pu
       JOIN customers c ON c.id=pu.customer_id
       JOIN portal_permission_groups pg ON pg.id=pu.permission_group_id
       ORDER BY c.company_name, pu.full_name`
    ),
    query<{ id: number; company_name: string }>(
      "SELECT id, company_name FROM customers WHERE status='active' ORDER BY company_name"
    ),
    query<{ id: number; first_name: string; last_name: string; email: string; customer_id: number }>(
      "SELECT id, first_name, last_name, email, customer_id FROM customer_employees ORDER BY first_name, last_name"
    ),
    query<SupplierCred>(
      "SELECT id, source, label, bayi_kodu, kullanici_adi, parola, enabled, updated_at FROM supplier_credentials ORDER BY id"
    ),
  ]);

  const PERM_LABELS: Record<string, string> = {
    inventory: "Envanter", employees: "Çalışanlar", tickets: "Talepler",
    contract: "Sözleşme", create_ticket: "Talep Açabilir", own_only: "Sadece Kendisi",
  };

  const TAB_META: Record<Tab, { label: string; icon: string; badge?: number }> = {
    kullanicilar: { label: "Kullanıcılar",     icon: "👤", badge: users.length },
    portal:       { label: "Müşteri Portalı",  icon: "🌐", badge: portalUsers.filter(u => u.is_active).length },
    eposta:       { label: "E-posta & IMAP",   icon: "📧", badge: emailTemplates.length },
    tedarikci:    { label: "Tedarikçiler",     icon: "📦", badge: supplierCreds.filter(s => s.enabled).length },
  };

  return (
    <>
      <style>{css}</style>
      <div className="st-page">

        {/* Header */}
        <div className="st-header">
          <div>
            <h1 className="st-title">Ayarlar</h1>
            <p className="st-sub">Sistem yapılandırması ve yönetimi</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="tab-bar">
          {TABS.map((t) => {
            const m = TAB_META[t];
            return (
              <a key={t} href={`/settings?tab=${t}`} className={`tab-btn ${tab === t ? "active" : ""}`}>
                <span className="tab-icon">{m.icon}</span>
                <span className="tab-label">{m.label}</span>
                {m.badge !== undefined && m.badge > 0 && (
                  <span className="tab-badge">{m.badge}</span>
                )}
              </a>
            );
          })}
        </div>

        {/* ══════════ TAB: Kullanıcılar ══════════ */}
        {tab === "kullanicilar" && (
          <div className="tab-content">
            <div className="card">
              <div className="card-title">Yönetim Kullanıcıları</div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Kullanıcı</th><th>E-posta</th><th>Rol</th>
                    <th>Durum</th><th>Son Giriş</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-col">{u.username}</td>
                      <td className="dim-col">{u.email}</td>
                      <td>
                        <span className="role-badge" style={{
                          color: u.role === "admin" ? "#3b82f6" : "#94a3b8",
                          background: u.role === "admin" ? "rgba(59,130,246,0.1)" : "rgba(148,163,184,0.1)",
                        }}>
                          {u.role === "admin" ? "Yönetici" : "Destek"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-dot ${u.is_active ? "green" : "red"}`}>
                          {u.is_active ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="date-col">
                        {u.last_login ? new Date(u.last_login).toLocaleString("tr-TR") : "—"}
                      </td>
                      <td>
                        {u.id !== session.id && (
                          <form action={toggleUser} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={u.id} />
                            <button type="submit" className="act-btn">
                              {u.is_active ? "Devre Dışı" : "Aktif Et"}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="two-col">
              <div className="card">
                <div className="card-title">Yeni Kullanıcı Ekle</div>
                <form action={addUser} className="form-stack">
                  <Field name="username" label="Kullanıcı Adı *" required />
                  <Field name="email" label="E-posta *" type="email" required />
                  <Field name="password" label="Şifre *" type="password" required />
                  <div className="field">
                    <label>Rol</label>
                    <select name="role">
                      <option value="support">Destek Personeli</option>
                      <option value="admin">Yönetici</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary">Kullanıcı Oluştur</button>
                </form>
              </div>

              <div className="card">
                <div className="card-title">Şifre Değiştir</div>
                <form action={changePassword} className="form-stack">
                  <div className="field">
                    <label>Kullanıcı</label>
                    <select name="id">
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  <Field name="password" label="Yeni Şifre *" type="password" required />
                  <div className="help-text">En az 8 karakter</div>
                  <button type="submit" className="btn-primary">Şifreyi Güncelle</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ TAB: Müşteri Portalı ══════════ */}
        {tab === "portal" && (
          <div className="tab-content">

            {/* Yetki Grupları */}
            <div className="card">
              <div className="card-hdr">
                <div className="card-title">Yetki Grupları</div>
                <div className="card-hint">Her grupta hangi portal modüllerinin görüneceğini belirleyin</div>
              </div>
              {permissionGroups.length === 0 ? (
                <div className="empty-state">Henüz yetki grubu yok</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Grup Adı</th><th>İzinler</th><th></th></tr>
                  </thead>
                  <tbody>
                    {permissionGroups.map((g) => (
                      <tr key={g.id}>
                        <td className="fw-col">{g.name}</td>
                        <td>
                          <div className="chip-row">
                            {Object.entries(PERM_LABELS).map(([key, label]) =>
                              g.permissions[key] ? (
                                <span key={key} className={`pchip ${key === "own_only" ? "pchip-warn" : "pchip-ok"}`}>
                                  {label}
                                </span>
                              ) : null
                            )}
                          </div>
                        </td>
                        <td>
                          <form action={deletePermissionGroup} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={g.id} />
                            <button type="submit" className="btn-danger-sm">Sil</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <details className="detail-form">
                <summary className="detail-toggle">+ Yeni Yetki Grubu Ekle</summary>
                <form action={addPermissionGroup} className="form-stack detail-body">
                  <Field name="name" label="Grup Adı *" required />
                  <div className="field">
                    <label>İzinler</label>
                    <div className="perm-checks">
                      {Object.entries(PERM_LABELS).map(([key, label]) => (
                        <label key={key} className="check-label">
                          <input type="checkbox" name={key} value="1" defaultChecked={key !== "own_only"} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">Grup Oluştur</button>
                </form>
              </details>
            </div>

            {/* Portal Kullanıcıları */}
            <div className="card">
              <div className="card-hdr">
                <div className="card-title">Portal Kullanıcıları</div>
                <div className="card-hint">
                  Giriş e-posta OTP ile yapılır · Şifre gerekmez · AD kullanıcıları ayrı yönetilir
                </div>
              </div>

              {portalUsers.length > 0 && (
                <div className="pu-stats">
                  <span className="pu-stat total">{portalUsers.length} toplam</span>
                  <span className="pu-stat active">{portalUsers.filter(u => u.is_active).length} aktif</span>
                  <span className="pu-stat inactive">{portalUsers.filter(u => !u.is_active).length} pasif</span>
                  <span className="pu-stat ad">{portalUsers.filter(u => u.source === "ad").length} AD</span>
                </div>
              )}

              {portalUsers.length === 0 ? (
                <div className="empty-state">Henüz portal kullanıcısı yok</div>
              ) : (
                <div className="pu-table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ad Soyad</th><th>E-posta</th><th>Firma</th>
                        <th>Yetki Grubu</th><th>Kaynak</th><th>Durum</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {portalUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="fw-col">{u.full_name}</td>
                          <td className="dim-col">{u.email}</td>
                          <td className="dim-col">{u.company_name}</td>
                          <td>
                            <form action={changePortalUserGroup} className="group-form">
                              <input type="hidden" name="id" value={u.id} />
                              <select name="permission_group_id" defaultValue={u.permission_group_id} className="group-select">
                                {permissionGroups.map((g) => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                              <button type="submit" className="act-btn">Kaydet</button>
                            </form>
                          </td>
                          <td>
                            {u.source === "ad"
                              ? <span className="source-ad">AD</span>
                              : <span className="source-manual">Manuel</span>}
                          </td>
                          <td>
                            <span className={`status-dot ${u.is_active ? "green" : "red"}`}>
                              {u.is_active ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td>
                            <div className="action-row">
                              <form action={togglePortalUser} style={{ display: "inline" }}>
                                <input type="hidden" name="id" value={u.id} />
                                <button type="submit" className="act-btn">
                                  {u.is_active ? "Devre Dışı" : "Aktif Et"}
                                </button>
                              </form>
                              {u.source !== "ad" && (
                                <form action={resendPortalInvite} style={{ display: "inline" }}>
                                  <input type="hidden" name="id" value={u.id} />
                                  <button type="submit" className="act-btn">Davet</button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <details className="detail-form">
                <summary className="detail-toggle">+ Yeni Manuel Portal Kullanıcısı Ekle</summary>
                <div className="detail-body">
                  <PortalUserForm
                    customers={customers}
                    employees={allEmployees}
                    groups={permissionGroups}
                    addPortalUser={addPortalUser}
                  />
                </div>
              </details>
            </div>
          </div>
        )}

        {/* ══════════ TAB: E-posta & IMAP ══════════ */}
        {tab === "eposta" && (
          <div className="tab-content">
            <div className="card">
              <div className="card-hdr">
                <div className="card-title">E-posta Şablonları</div>
                <div className="card-hint">
                  Değişkenler: <code className="var-code">{"{{body}}"}</code>{" "}
                  <code className="var-code">{"{{ticket_id}}"}</code>{" "}
                  <code className="var-code">{"{{ticket_subject}}"}</code>
                </div>
              </div>
              {emailTemplates.length === 0 ? (
                <div className="empty-state">Şablon bulunamadı</div>
              ) : (
                <div className="tpl-list">
                  {emailTemplates.map((tpl) => (
                    <details key={tpl.key} className="tpl-item">
                      <summary className="tpl-summary">
                        <span className="tpl-name">{tpl.name}</span>
                        <code className="tpl-key">{tpl.key}</code>
                        <span className="tpl-date">
                          {new Date(tpl.updated_at).toLocaleDateString("tr-TR")}
                        </span>
                      </summary>
                      <form action={updateEmailTemplate} className="form-stack tpl-body">
                        <input type="hidden" name="key" value={tpl.key} />
                        <Field name="subject" label="Konu" defaultValue={tpl.subject} required />
                        <div className="field">
                          <label>Mesaj Gövdesi</label>
                          <textarea name="body_text" rows={7} required defaultValue={tpl.body_text}
                            style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
                        </div>
                        <button type="submit" className="btn-primary" style={{ alignSelf: "flex-start" }}>
                          Şablonu Kaydet
                        </button>
                      </form>
                    </details>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-hdr">
                <div className="card-title">IMAP Polling</div>
                <div className="card-hint">
                  support@xshield.com.tr adresine gelen mailler otomatik destek talebi oluşturur
                </div>
              </div>
              <div className="imap-info">
                <div className="imap-row">
                  <span className="imap-label">Cron komutu</span>
                  <div className="cron-box">
                    <code>* * * * * curl -s -X POST -H &quot;X-Poll-Key: $MNG_POLL_KEY&quot; https://mng.xshield.com.tr/api/imap-poll</code>
                  </div>
                </div>
                <div className="imap-row">
                  <span className="imap-label">Manuel tetikle</span>
                  <form action="/api/imap-poll" method="POST" target="_blank">
                    <button type="submit" className="btn-secondary">▶ Şimdi Kontrol Et</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ TAB: Tedarikçiler ══════════ */}
        {tab === "tedarikci" && (
          <div className="tab-content">
            <div className="card">
              <div className="card-hdr">
                <div className="card-title">Tedarikçi Giriş Bilgileri</div>
                <div className="card-hint">
                  Senkronizasyonda kullanılan kimlik bilgileri. Değişiklikler bir sonraki sync&apos;te uygulanır.
                </div>
              </div>
              <div className="supplier-list">
                {supplierCreds.map((cred) => (
                  <div key={cred.id} className="supplier-card">
                    <div className="supplier-hdr">
                      <div className="supplier-meta">
                        <span className="supplier-name">{cred.label}</span>
                        <code className="tpl-key">{cred.source}</code>
                      </div>
                      <span className={`status-dot ${cred.enabled ? "green" : "red"}`}>
                        {cred.enabled ? "Aktif" : "Devre Dışı"}
                      </span>
                    </div>
                    <form action={updateSupplierCred} className="form-stack supplier-form">
                      <input type="hidden" name="id" value={cred.id} />
                      <div className="two-col-fields">
                        <Field name="bayi_kodu"     label="Bayi Kodu"     defaultValue={cred.bayi_kodu} />
                        <Field name="kullanici_adi" label="Kullanıcı Adı" defaultValue={cred.kullanici_adi} />
                      </div>
                      <Field name="parola" label="Parola" type="password" defaultValue={cred.parola} />
                      <label className="check-label">
                        <input type="checkbox" name="enabled" value="1" defaultChecked={cred.enabled} />
                        Senkronizasyona dahil et
                      </label>
                      <button type="submit" className="btn-primary" style={{ alignSelf: "flex-start" }}>
                        Kaydet
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

function Field({ name, label, type = "text", required = false, defaultValue }: {
  name: string; label: string; type?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input name={name} type={type} required={required || undefined} defaultValue={defaultValue} />
    </div>
  );
}

const css = `
/* Layout */
.st-page{padding:28px;display:flex;flex-direction:column;gap:20px;max-width:1100px}
@media(max-width:640px){.st-page{padding:14px}}
.st-header{margin-bottom:0}
.st-title{font-size:22px;font-weight:900;color:var(--text);letter-spacing:-0.5px}
.st-sub{font-size:13px;color:var(--text-muted);margin-top:3px}

/* Tab bar */
.tab-bar{display:flex;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:6px}
.tab-btn{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-muted);text-decoration:none;transition:background 0.15s,color 0.15s;cursor:pointer;user-select:none}
.tab-btn:hover{background:var(--input-bg);color:var(--text)}
.tab-btn.active{background:#2563eb;color:#fff}
.tab-icon{font-size:15px;line-height:1}
.tab-label{white-space:nowrap}
.tab-badge{font-size:10px;font-weight:800;padding:1px 6px;border-radius:10px;background:rgba(255,255,255,0.2);color:inherit;min-width:18px;text-align:center}
.tab-btn:not(.active) .tab-badge{background:var(--input-bg);color:var(--text-dimmer)}
@media(max-width:600px){
  .tab-bar{flex-wrap:wrap}
  .tab-btn{flex:1;justify-content:center}
  .tab-label{display:none}
}

/* Tab content */
.tab-content{display:flex;flex-direction:column;gap:20px}

/* Cards */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:16px}
.card-hdr{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:0}
.card-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--section-title)}
.card-hint{font-size:12px;color:var(--text-muted)}

/* Two-column layout */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.two-col-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:640px){.two-col,.two-col-fields{grid-template-columns:1fr}}

/* Table */
.table{width:100%;border-collapse:collapse}
.table th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-dimmer);border-bottom:2px solid var(--divider)}
.table td{padding:11px 12px;border-bottom:1px solid var(--row-border);font-size:13px;color:var(--text-sub);vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:var(--row-hover)}
.fw-col{font-weight:700;color:var(--text)}
.dim-col{color:var(--text-dim);font-size:12px}
.date-col{color:var(--text-dimmer);font-size:11px;white-space:nowrap}

/* Badges */
.role-badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px}
.status-dot{font-size:12px;font-weight:700}
.status-dot.green{color:#22c55e}
.status-dot.red{color:#ef4444}
.source-ad{font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px;background:rgba(99,102,241,0.12);color:#6366f1;border:1px solid rgba(99,102,241,0.25)}
.source-manual{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:var(--input-bg);color:var(--text-dimmer);border:1px solid var(--border2)}

/* Group change inline form */
.group-form{display:flex;align-items:center;gap:6px}
.group-select{font-size:12px;padding:4px 8px;border-radius:6px;background:var(--input-bg);color:var(--text);border:1px solid var(--input-border);cursor:pointer;max-width:160px}
.group-select:focus{border-color:#3b82f6;outline:none}

/* Actions */
.act-btn{font-size:11px;font-weight:600;padding:5px 11px;border-radius:6px;background:var(--input-bg);border:1px solid var(--border2);color:var(--text-muted);cursor:pointer;white-space:nowrap}
.act-btn:hover{background:var(--row-hover)}
.action-row{display:flex;gap:5px;align-items:center}
.btn-primary{background:#2563eb;color:#fff;border:none;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}
.btn-primary:hover{background:#1d4ed8}
.btn-secondary{background:var(--input-bg);border:1px solid var(--border2);color:var(--text-muted);padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.btn-secondary:hover{background:var(--row-hover)}
.btn-danger-sm{font-size:11px;color:#ef4444;background:transparent;border:1px solid rgba(239,68,68,0.25);padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600}
.btn-danger-sm:hover{background:rgba(239,68,68,0.08)}

/* Form */
.form-stack{display:flex;flex-direction:column;gap:14px}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--section-title)}
.field input,.field select,.field textarea{background:var(--input-bg);border:1px solid var(--input-border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:13px;outline:none}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6}
.field select option{background:var(--card)}
.help-text{font-size:11px;color:var(--text-dimmer);margin-top:-8px}
.check-label{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--text-sub);cursor:pointer}
.check-label input{accent-color:#3b82f6;width:14px;height:14px}
.perm-checks{display:flex;flex-wrap:wrap;gap:8px 18px;padding:4px 0}

/* Collapsible form */
.detail-form{border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:4px}
.detail-toggle{padding:11px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#2563eb;list-style:none;display:flex;align-items:center}
.detail-toggle::-webkit-details-marker{display:none}
.detail-form[open] .detail-toggle{border-bottom:1px solid var(--divider);background:var(--input-bg)}
.detail-body{padding:16px}

/* Portal stats */
.pu-stats{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:4px}
.pu-stat{font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px}
.pu-stat.total{background:var(--input-bg);color:var(--text-muted)}
.pu-stat.active{background:rgba(34,197,94,0.1);color:#16a34a}
.pu-stat.inactive{background:rgba(239,68,68,0.08);color:#dc2626}
.pu-stat.ad{background:rgba(99,102,241,0.1);color:#6366f1}
.pu-table-wrap{overflow-x:auto}

/* Permission chips */
.chip-row{display:flex;flex-wrap:wrap;gap:4px}
.pchip{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px}
.pchip-ok{background:rgba(34,197,94,0.12);color:#16a34a}
.pchip-warn{background:rgba(245,158,11,0.12);color:#d97706}

/* Email templates */
.tpl-list{display:flex;flex-direction:column;gap:8px}
.tpl-item{border:1px solid var(--border);border-radius:8px;overflow:hidden}
.tpl-summary{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;list-style:none;flex-wrap:wrap}
.tpl-summary::-webkit-details-marker{display:none}
.tpl-item[open] .tpl-summary{border-bottom:1px solid var(--divider);background:var(--input-bg)}
.tpl-name{font-size:13px;font-weight:700;color:var(--text);flex:1;min-width:120px}
.tpl-key{font-size:10px;font-family:monospace;color:var(--text-ghost);background:var(--card);border:1px solid var(--border2);border-radius:4px;padding:2px 6px}
.tpl-date{font-size:11px;color:var(--text-dimmer);margin-left:auto}
.tpl-body{padding:16px}
.var-code{font-size:11px;font-family:monospace;background:rgba(59,130,246,0.08);color:#3b82f6;border:1px solid rgba(59,130,246,0.2);border-radius:4px;padding:1px 5px}

/* IMAP */
.imap-info{display:flex;flex-direction:column;gap:16px}
.imap-row{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap}
.imap-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--section-title);padding-top:4px;min-width:100px;flex-shrink:0}
.cron-box{background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:8px;padding:11px 14px;flex:1}
.cron-box code{font-size:11px;color:var(--text-muted);font-family:monospace;word-break:break-all;line-height:1.6}

/* Suppliers */
.supplier-list{display:flex;flex-direction:column;gap:16px}
.supplier-card{border:1px solid var(--border);border-radius:10px;overflow:hidden}
.supplier-hdr{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;background:var(--input-bg);border-bottom:1px solid var(--border)}
.supplier-meta{display:flex;align-items:center;gap:10px}
.supplier-name{font-size:14px;font-weight:700;color:var(--text)}
.supplier-form{padding:16px}

/* Empty */
.empty-state{padding:20px;text-align:center;font-size:13px;color:var(--text-ghost);background:var(--bg);border-radius:8px}
`;
