import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const sp = new URL(req.url).searchParams;
  const rawCustomers = sp.getAll("customers");
  const isAll = rawCustomers.length === 0 || rawCustomers.includes("all");
  const customerIds = isAll ? null : rawCustomers.map(Number).filter(Boolean);
  const from = sp.get("from") || null;
  const to = sp.get("to") || null;

  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT t.id,
              COALESCE(t.subject,'') AS subject,
              COALESCE(t.from_name,'') AS from_name,
              COALESCE(t.from_email,'') AS from_email,
              COALESCE(c.company_name,t.from_name,t.from_email,'') AS company,
              t.status,
              t.priority,
              COALESCE(tc.name,'') AS category,
              COALESCE(ts.name,'') AS subcategory,
              t.created_at,
              (SELECT MIN(tm.created_at) FROM ticket_messages tm
               WHERE tm.ticket_id=t.id AND tm.author_type='agent') AS first_response_at,
              t.resolved_at,
              COALESCE(u.username,'') AS assigned_to,
              COALESCE(t.body,'') AS body
       FROM tickets t
       LEFT JOIN customers c ON c.id=t.customer_id
       LEFT JOIN users u ON u.id=t.assigned_to
       LEFT JOIN ticket_categories tc ON tc.id=t.category_id
       LEFT JOIN ticket_subcategories ts ON ts.id=t.subcategory_id
       WHERE ($1::int[] IS NULL OR t.customer_id = ANY($1::int[]))
         AND ($2::date IS NULL OR t.created_at >= $2::date)
         AND ($3::date IS NULL OR t.created_at < ($3::date::date + interval '1 day'))
       ORDER BY t.id`,
      [customerIds, from, to]
    );

    const COLS = [
      "id", "subject", "from_name", "from_email", "company",
      "status", "priority", "category", "subcategory",
      "created_at", "first_response_at", "resolved_at", "assigned_to", "body",
    ];

    const esc = (v: unknown): string => {
      if (v == null) return "";
      const s = v instanceof Date ? v.toISOString() : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [
      COLS.join(","),
      ...rows.map((r) => COLS.map((c) => esc(r[c])).join(",")),
    ];

    const csv = "﻿" + lines.join("\r\n");
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets-${date}.csv"`,
      },
    });
  } catch (e) {
    console.error("[tickets/export] error:", e);
    return new Response("Export failed", { status: 500 });
  }
}
