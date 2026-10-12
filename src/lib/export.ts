import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), 14, 25);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c))),
    startY: 32,
    headStyles: { fillColor: [30, 50, 110] },
    styles: { fontSize: 9 },
  });
  doc.save(`${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}

export function exportXLSX(title: string, headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${Date.now()}.xlsx`);
}
