import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const CONTRACT_DIR = path.join(UPLOAD_DIR, "vendor-contracts");

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const rows = await query<{
    id: number; vendor_name: string; service_type: string | null;
    contract_no: string | null; start_date: string | null; end_date: string | null;
    monthly_fee: string | null; currency: string; notes: string | null;
    file_stored: string | null; file_original: string | null; file_size: number | null;
    created_at: string;
  }>(
    `SELECT id, vendor_name, service_type, contract_no, start_date, end_date,
            monthly_fee, currency, notes, file_stored, file_original, file_size, created_at
     FROM customer_vendor_contracts WHERE customer_id=$1 ORDER BY created_at DESC`,
    [Number(id)]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const formData = await req.formData();
  const vendorName  = String(formData.get("vendor_name") ?? "").trim();
  if (!vendorName) return NextResponse.json({ error: "vendor_name gerekli" }, { status: 400 });

  const serviceType = formData.get("service_type") as string | null;
  const contractNo  = formData.get("contract_no") as string | null;
  const startDate   = formData.get("start_date") as string | null;
  const endDate     = formData.get("end_date") as string | null;
  const monthlyFee  = formData.get("monthly_fee") as string | null;
  const currency    = (formData.get("currency") as string) || "TRY";
  const notes       = formData.get("notes") as string | null;
  const file        = formData.get("file") as File | null;

  let fileStored: string | null = null;
  let fileOriginal: string | null = null;
  let fileSize: number | null = null;

  if (file && file.size > 0) {
    await mkdir(CONTRACT_DIR, { recursive: true });
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    fileStored = `${randomUUID()}.${ext}`;
    fileOriginal = file.name;
    fileSize = file.size;
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(CONTRACT_DIR, fileStored), buf);
  }

  const row = await queryOne<{ id: number }>(
    `INSERT INTO customer_vendor_contracts
       (customer_id, vendor_name, service_type, contract_no, start_date, end_date,
        monthly_fee, currency, notes, file_stored, file_original, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      Number(id), vendorName, serviceType || null, contractNo || null,
      startDate || null, endDate || null,
      monthlyFee ? parseFloat(monthlyFee) : null, currency,
      notes || null, fileStored, fileOriginal, fileSize,
    ]
  );
  return NextResponse.json({ id: row!.id });
}
