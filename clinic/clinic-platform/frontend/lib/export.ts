/* Client-side export helpers — Excel via xlsx, PDF via jsPDF + autotable */

// ── Excel ─────────────────────────────────────────────────────────────────────
export async function exportExcel(
  rows: Record<string, unknown>[],
  headers: { key: string; label: string }[],
  filename: string
) {
  const XLSX = await import("xlsx");

  const data = [
    headers.map(h => h.label),
    ...rows.map(r => headers.map(h => r[h.key] ?? "")),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Veri");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────
export async function exportPDF(
  rows: Record<string, unknown>[],
  headers: { key: string; label: string }[],
  filename: string,
  title?: string
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  if (title) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}`, 14, 22);
    doc.setTextColor(0);
  }

  autoTable(doc, {
    startY: title ? 28 : 14,
    head: [headers.map(h => h.label)],
    body: rows.map(r => headers.map(h => String(r[h.key] ?? ""))),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${filename}.pdf`);
}
