// Fetches DejaVu Sans (Turkish-compatible) font files from /fonts/ and
// registers them with a jsPDF instance. Fonts are cached in memory after
// the first fetch so subsequent PDF generations are instant.

import type { jsPDF } from "jspdf";

let normalB64: string | null = null;
let boldB64:   string | null = null;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function registerTurkishFont(doc: jsPDF): Promise<void> {
  if (!normalB64) normalB64 = await toBase64("/fonts/DejaVuSans.ttf");
  if (!boldB64)   boldB64   = await toBase64("/fonts/DejaVuSans-Bold.ttf");

  doc.addFileToVFS("DejaVuSans.ttf",      normalB64);
  doc.addFileToVFS("DejaVuSans-Bold.ttf", boldB64);
  doc.addFont("DejaVuSans.ttf",      "DejaVuSans", "normal");
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  doc.setFont("DejaVuSans", "normal");
}
