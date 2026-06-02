import "server-only";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

function esc(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

const CAT: Record<string, string> = {
  pc: "Masaüstü PC", laptop: "Dizüstü", server: "Sunucu",
  switch: "Switch", router: "Router/Modem", printer: "Yazıcı",
  monitor: "Monitör", phone: "Telefon/IP", tablet: "Tablet", other: "Diğer",
};
const STATUS: Record<string, string> = { active: "Aktif", maintenance: "Bakımda", retired: "Hizmetten Çıktı" };

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const customer = url.searchParams.get("customer");
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");

  const rows = await query<{
    company_name: string; name: string; category: string; brand: string;
    model: string; serial_no: string; asset_tag: string; status: string;
    purchase_date: string; assigned_date: string;
    emp_first: string | null; emp_last: string | null; notes: string;
  }>(
    `SELECT c.company_name, i.name, i.category, i.brand, i.model,
            i.serial_no, i.asset_tag, i.status, i.purchase_date, i.assigned_date,
            e.first_name AS emp_first, e.last_name AS emp_last, i.notes
     FROM inventory_items i
     JOIN customers c ON c.id=i.customer_id
     LEFT JOIN customer_employees e ON e.id=i.employee_id
     WHERE ($1::int IS NULL OR i.customer_id=$1)
       AND ($2::text IS NULL OR i.category=$2)
       AND ($3::text IS NULL OR i.status=$3)
     ORDER BY c.company_name, i.category, i.name`,
    [customer ? Number(customer) : null, category || null, status || null]
  );

  const header = ["Firma", "Cihaz Adı", "Kategori", "Marka", "Model",
    "Seri No", "Envanter No", "Durum", "Alım Tarihi", "Zimmet Tarihi",
    "Zimmetli Çalışan", "Notlar"].join(",");
  const lines = rows.map((r) => [
    esc(r.company_name), esc(r.name), esc(CAT[r.category] ?? r.category),
    esc(r.brand), esc(r.model), esc(r.serial_no), esc(r.asset_tag),
    esc(STATUS[r.status] ?? r.status),
    esc(r.purchase_date ? new Date(r.purchase_date).toLocaleDateString("tr-TR") : ""),
    esc(r.assigned_date ? new Date(r.assigned_date).toLocaleDateString("tr-TR") : ""),
    esc(r.emp_first ? `${r.emp_first} ${r.emp_last}` : ""),
    esc(r.notes),
  ].join(","));

  const csv = "﻿" + [header, ...lines].join("\r\n");
  const date = new Date().toISOString().split("T")[0];
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="envanter-${date}.csv"`,
    },
  });
}
