import { pollNewMail } from "@/lib/imap";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-poll-key");
  if (key !== process.env.IMAP_POLL_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await pollNewMail();
  return Response.json({ ok: true, ...result });
}
