// Fatura PDF oluşturucu — jsPDF + jspdf-autotable kullanır
// Import'lar lazy: ilk çağrıda bundle'a yüklenir.

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type InvoiceData = {
  invoiceNo: string;
  issuedAtUtc: string;
  dueAtUtc?: string;
  status: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  items: InvoiceItem[];
  patientName: string;
  doctorName?: string;
};

type ClinicInfo = {
  companyName: string;
  primaryColor?: string;
};

const STATUS_LABELS: Record<string, string> = {
  Draft: "Taslak", Sent: "Gönderildi", Paid: "Ödendi",
  Overdue: "Gecikmiş", Cancelled: "İptal",
};

function fmtDate(utc: string) {
  return new Date(utc).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtMoney(n: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(n);
}

export async function downloadInvoicePdf(inv: InvoiceData, clinic: ClinicInfo) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const primary = clinic.primaryColor ?? "#1d4ed8";

  // Helper: hex → [r,g,b]
  const hex2rgb = (h: string): [number, number, number] => {
    const c = h.replace("#", "");
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  };
  const [pr, pg, pb] = hex2rgb(primary);

  /* ── Header band ─────────────────────────────────────────────────── */
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, W, 38, "F");

  // Clinic name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(clinic.companyName, 14, 16);

  // "FATURA" label top-right
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA", W - 14, 16, { align: "right" });

  // Invoice number
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(inv.invoiceNo, W - 14, 24, { align: "right" });

  // Powered-by tiny text
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255, 0.6);
  doc.text("xShield e-Clinic", 14, 35);

  /* ── Meta row ────────────────────────────────────────────────────── */
  doc.setTextColor(40, 40, 40);

  const metaY = 50;
  const colW  = (W - 28) / 3;

  const fields = [
    ["Düzenleme Tarihi", fmtDate(inv.issuedAtUtc)],
    ["Vade Tarihi",      inv.dueAtUtc ? fmtDate(inv.dueAtUtc) : "—"],
    ["Durum",            STATUS_LABELS[inv.status] ?? inv.status],
  ];

  fields.forEach(([label, value], i) => {
    const x = 14 + i * colW;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), x, metaY);
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(value, x, metaY + 6);
  });

  // Separator line
  doc.setDrawColor(230, 230, 230);
  doc.line(14, metaY + 12, W - 14, metaY + 12);

  /* ── Parties ────────────────────────────────────────────────────── */
  const partyY = metaY + 20;

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("FATURA KESİLEN", 14, partyY);

  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(inv.patientName, 14, partyY + 7);

  if (inv.doctorName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Doktor: ${inv.doctorName}`, 14, partyY + 14);
  }

  /* ── Items table ─────────────────────────────────────────────────── */
  const tableY = partyY + (inv.doctorName ? 24 : 18);

  autoTable(doc, {
    startY: tableY,
    head: [["Açıklama", "Miktar", "Birim Fiyat", "Tutar"]],
    body: inv.items.map(item => [
      item.description,
      String(item.quantity),
      fmtMoney(item.unitPrice, inv.currency),
      fmtMoney(item.lineTotal, inv.currency),
    ]),
    headStyles: {
      fillColor: [pr, pg, pb],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles:      { fontSize: 9, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 38, halign: "right" },
      3: { cellWidth: 38, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [230, 230, 230],
    tableLineWidth: 0.2,
  });

  /* ── Totals ──────────────────────────────────────────────────────── */
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  const totX   = W - 80;

  const totRows: [string, string, boolean][] = [
    ["Ara Toplam",  fmtMoney(inv.subtotal, inv.currency), false],
    [`KDV (%${inv.taxRate})`, fmtMoney(inv.taxAmount, inv.currency), false],
    ["GENEL TOPLAM", fmtMoney(inv.total, inv.currency), true],
  ];

  let ty = finalY;
  totRows.forEach(([label, value, bold]) => {
    if (bold) {
      doc.setFillColor(pr, pg, pb);
      doc.rect(totX - 4, ty - 5, W - totX - 10, 10, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(80, 80, 80);
    }
    doc.setFontSize(bold ? 11 : 9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, totX, ty, { align: "left" });
    doc.text(value, W - 14, ty, { align: "right" });
    ty += 10;
  });

  /* ── Notes ───────────────────────────────────────────────────────── */
  if (inv.notes) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Notlar:", 14, ty + 6);
    doc.text(inv.notes, 14, ty + 12, { maxWidth: 120 });
  }

  /* ── Footer ──────────────────────────────────────────────────────── */
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 246, 250);
  doc.rect(0, pageH - 14, W, 14, "F");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${clinic.companyName} · xShield e-Clinic ile oluşturulmuştur`,
    W / 2, pageH - 5, { align: "center" }
  );

  /* ── Save ────────────────────────────────────────────────────────── */
  doc.save(`${inv.invoiceNo}.pdf`);
}
