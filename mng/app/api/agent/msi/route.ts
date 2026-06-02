import "server-only";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

const MSI_PATH = path.join(process.cwd(), "agent", "xshield_agent.msi");

export async function GET(req: Request) {
  // Allow unauthenticated download — token is embedded by the PS1 script
  // but the MSI itself is generic and safe to distribute publicly
  if (!fs.existsSync(MSI_PATH)) {
    console.error("[agent/msi] MSI not found at", MSI_PATH);
    return new Response("MSI not found", { status: 404 });
  }

  const data = fs.readFileSync(MSI_PATH);
  console.log(`[agent/msi] Serving MSI (${(data.length / 1024 / 1024).toFixed(1)} MB)`);

  return new Response(data as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/x-msi",
      "Content-Disposition": 'attachment; filename="xshield_agent.msi"',
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
