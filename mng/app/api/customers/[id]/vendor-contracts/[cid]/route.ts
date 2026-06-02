import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const CONTRACT_DIR = path.join(UPLOAD_DIR, "vendor-contracts");

type Params = { params: Promise<{ id: string; cid: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;

  const formData = await req.formData();
  const vendorName = String(formData.get("vendor_name") ?? "").trim();
  if (!vendorName) return NextResponse.json({ error: "vendor_name gerekli" }, { status: 400 });

  const existing = await queryOne<{ file_stored: string | null }>(
    "SELECT file_stored FROM customer_vendor_contracts WHERE id=$1 AND customer_id=$2",
    [Number(cid), Number(id)]
  );
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const file = formData.get("file") as File | null;
  let fileStored = existing.file_stored;
  let fileOriginal = formData.get("file_original") as string | null;
  let fileSize: number | null = null;

  if (file && file.size > 0) {
    if (existing.file_stored) {
      await unlink(path.join(CONTRACT_DIR, existing.file_stored)).catch(() => {});
    }
    await mkdir(CONTRACT_DIR, { recursive: true });
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    fileStored = `${randomUUID()}.${ext}`;
    fileOriginal = file.name;
    fileSize = file.size;
    await writeFile(path.join(CONTRACT_DIR, fileStored), Buffer.from(await file.arrayBuffer()));
  }

  await query(
    `UPDATE customer_vendor_contracts SET
       vendor_name=$1, service_type=$2, contract_no=$3, start_date=$4, end_date=$5,
       monthly_fee=$6, currency=$7, notes=$8, file_stored=$9, file_original=$10,
       file_size=COALESCE($11, file_size), updated_at=now()
     WHERE id=$12 AND customer_id=$13`,
    [
      vendorName,
      formData.get("service_type") || null,
      formData.get("contract_no") || null,
      formData.get("start_date") || null,
      formData.get("end_date") || null,
      formData.get("monthly_fee") ? parseFloat(formData.get("monthly_fee") as string) : null,
      formData.get("currency") || "TRY",
      formData.get("notes") || null,
      fileStored, fileOriginal, fileSize,
      Number(cid), Number(id),
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cid } = await params;

  const row = await queryOne<{ file_stored: string | null }>(
    "SELECT file_stored FROM customer_vendor_contracts WHERE id=$1 AND customer_id=$2",
    [Number(cid), Number(id)]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (row.file_stored) {
    await unlink(path.join(CONTRACT_DIR, row.file_stored)).catch(() => {});
  }
  await query("DELETE FROM customer_vendor_contracts WHERE id=$1", [Number(cid)]);
  return NextResponse.json({ ok: true });
}
