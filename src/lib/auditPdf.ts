import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface AuditPdfRow {
  created_at: string;
  action: string;
  table_cible: string | null;
  actor_name?: string;
  summary?: string;
}

export function exportAuditPdf(rows: AuditPdfRow[], periodStart: string, periodEnd: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SIGC-CSN — Journal d'audit", 12, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport institutionnel des actions sensibles", 12, 17);

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Période : ${format(new Date(periodStart), "dd MMM yyyy", { locale: fr })} → ${format(
      new Date(periodEnd),
      "dd MMM yyyy",
      { locale: fr }
    )}`,
    12,
    32
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Généré le ${format(new Date(), "dd MMM yyyy 'à' HH:mm", { locale: fr })} · ${rows.length} entrée(s)`,
    12,
    38
  );

  autoTable(doc, {
    startY: 44,
    head: [["Date / heure", "Action", "Table", "Acteur", "Résumé"]],
    body: rows.map((r) => [
      format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss"),
      r.action,
      r.table_cible ?? "—",
      r.actor_name ?? "—",
      r.summary ?? "",
    ]),
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: { 4: { cellWidth: 110 } },
    margin: { left: 10, right: 10 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `SIGC-CSN · Document confidentiel · Page ${i}/${pageCount}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  doc.save(`audit_${periodStart}_${periodEnd}.pdf`);
}
