import "server-only";
import { query, queryOne } from "@/lib/db";

type ADUser = {
  ad_object_guid: string;
  username: string;
  display_name: string;
  email: string;
  department?: string;
  title?: string;
  domain?: string;
  is_enabled: boolean;
  groups?: string[];
};

function parseName(displayName: string): { first: string; last: string } {
  const parts = displayName.trim().split(" ");
  return {
    first: parts[0] ?? displayName,
    last: parts.slice(1).join(" ") || "—",
  };
}

export async function POST(req: Request) {
  let body: { token: string; users: ADUser[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!body.token || !Array.isArray(body.users)) {
    return new Response("Bad Request", { status: 400 });
  }

  const agent = await queryOne<{
    id: number;
    customer_id: number;
    ad_sync_enabled: boolean;
    ad_sync_default_group_id: number | null;
  }>(
    "SELECT id, customer_id, ad_sync_enabled, ad_sync_default_group_id FROM network_agents WHERE token=$1",
    [body.token]
  );
  if (!agent) return new Response("Unauthorized", { status: 401 });
  if (!agent.ad_sync_enabled) return new Response("AD sync disabled for this agent", { status: 403 });

  await query("UPDATE network_agents SET last_seen=now() WHERE id=$1", [agent.id]);

  const defaultGroupId = agent.ad_sync_default_group_id;
  let created = 0, updated = 0, deactivated = 0;
  let errorMsg: string | null = null;

  try {
    const syncedGuids = body.users.map((u) => u.ad_object_guid).filter(Boolean);

    for (const u of body.users) {
      if (!u.ad_object_guid || !u.email) continue;
      const email      = u.email.trim().toLowerCase();
      const adUsername = (u.username ?? "").trim().toLowerCase();
      const adDomain   = (u.domain ?? "").trim();
      const groups     = JSON.stringify(u.groups ?? []);
      const { first: firstName, last: lastName } = parseName(u.display_name);

      // --- Step 1: Upsert customer_employees ---
      let employeeId: number | null = null;
      const existingEmp = await queryOne<{ id: number }>(
        "SELECT id FROM customer_employees WHERE customer_id=$1 AND LOWER(email)=$2",
        [agent.customer_id, email]
      );
      if (existingEmp) {
        employeeId = existingEmp.id;
        await query(
          `UPDATE customer_employees
           SET first_name=$1, last_name=$2, department=$3, title=$4, is_active=$5
           WHERE id=$6`,
          [firstName, lastName, u.department ?? null, u.title ?? null, u.is_enabled, employeeId]
        );
      } else {
        const newEmp = await queryOne<{ id: number }>(
          `INSERT INTO customer_employees (customer_id, first_name, last_name, email, department, title, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [agent.customer_id, firstName, lastName, email, u.department ?? null, u.title ?? null, u.is_enabled]
        );
        employeeId = newEmp?.id ?? null;
      }

      // --- Step 2: Upsert portal_users (is_active stays false — portal access must be granted explicitly) ---
      const existing = await queryOne<{ id: number; source: string }>(
        "SELECT id, source FROM portal_users WHERE ad_object_guid=$1 OR (LOWER(email)=$2 AND customer_id=$3)",
        [u.ad_object_guid, email, agent.customer_id]
      );

      if (existing) {
        if (existing.source !== "ad") {
          // Local user matched by email — update AD metadata only, keep auth & is_active untouched
          await query(
            `UPDATE portal_users
             SET ad_object_guid=$1, ad_username=$2, ad_domain=$3, ad_groups=$4, ad_synced_at=now(),
                 full_name=COALESCE(NULLIF($5,''), full_name),
                 employee_id=COALESCE(employee_id,$6)
             WHERE id=$7`,
            [u.ad_object_guid, adUsername, adDomain, groups, u.display_name, employeeId, existing.id]
          );
        } else {
          // AD-sourced user — full update; do NOT touch is_active (admin controls portal access)
          await query(
            `UPDATE portal_users
             SET email=$1, full_name=$2, ad_username=$3, ad_domain=$4, ad_groups=$5,
                 ad_synced_at=now(), employee_id=COALESCE(employee_id,$6)
             WHERE id=$7`,
            [email, u.display_name, adUsername, adDomain, groups, employeeId, existing.id]
          );
        }
        updated++;
      } else {
        // New AD user: create portal record with is_active=false — portal access requires explicit grant
        await query(
          `INSERT INTO portal_users
             (customer_id, employee_id, email, full_name, source,
              ad_object_guid, ad_username, ad_domain, ad_groups, ad_synced_at,
              permission_group_id, is_active, is_verified)
           VALUES ($1,$2,$3,$4,'ad',$5,$6,$7,$8,now(),$9,false,true)
           ON CONFLICT (email) DO NOTHING`,
          [
            agent.customer_id, employeeId, email, u.display_name,
            u.ad_object_guid, adUsername, adDomain, groups,
            defaultGroupId ?? null,
          ]
        );
        created++;
      }
    }

    // Deactivate AD users removed from AD; also deactivate their customer_employee record
    if (syncedGuids.length > 0) {
      const deactivated_users = await query<{ id: number; employee_id: number | null }>(
        `UPDATE portal_users SET is_active=false
         WHERE customer_id=$1 AND source='ad'
           AND ad_object_guid IS NOT NULL
           AND ad_object_guid <> ALL($2::text[])
           AND is_active=true
         RETURNING id, employee_id`,
        [agent.customer_id, syncedGuids]
      );
      deactivated = deactivated_users.length;
      // Also deactivate the linked customer_employee records
      for (const pu of deactivated_users) {
        if (pu.employee_id) {
          await query(
            "UPDATE customer_employees SET is_active=false WHERE id=$1",
            [pu.employee_id]
          );
        }
      }
    }
  } catch (err) {
    errorMsg = String(err);
    console.error("[ad-sync] error:", err);
  }

  await query(
    `INSERT INTO ad_sync_logs (customer_id, agent_id, users_total, users_created, users_updated, users_deactivated, status, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      agent.customer_id, agent.id,
      body.users.length, created, updated, deactivated,
      errorMsg ? "error" : "ok",
      errorMsg,
    ]
  );

  console.log(`[ad-sync] customer=${agent.customer_id} total=${body.users.length} created=${created} updated=${updated} deactivated=${deactivated}`);
  return Response.json({ ok: true, created, updated, deactivated });
}
