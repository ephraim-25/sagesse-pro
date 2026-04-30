import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LeaveRow {
  id: string;
  start_date: string;
  end_date: string;
  working_days: number;
  status: string;
  reason: string | null;
  chef_comment: string | null;
  admin_comment: string | null;
  created_at: string;
  user_name?: string;
}

const statusLabel: Record<string, string> = {
  pending_chef: "En attente Chef",
  pending_admin: "En attente Admin",
  approved: "Approuvé",
  rejected: "Rejeté",
  cancelled: "Annulé",
};

export function exportLeavesPdf(rows: LeaveRow[], periodStart: string, periodEnd: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header institutionnel
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SIGC-CSN — Conseil Scientifique National", 12, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport des demandes de congé", 12, 17);

  // Période
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
    `Généré le ${format(new Date(), "dd MMM yyyy 'à' HH:mm", { locale: fr })} · ${rows.length} demande(s)`,
    12,
    38
  );

  // Synthèse
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalDays = rows
    .filter((r) => r.status === "approved")
    .reduce((s, r) => s + (r.working_days ?? 0), 0);

  doc.setFontSize(9);
  let y = 45;
  doc.text(
    `Approuvés: ${counts.approved ?? 0}  ·  Rejetés: ${counts.rejected ?? 0}  ·  En attente: ${
      (counts.pending_chef ?? 0) + (counts.pending_admin ?? 0)
    }  ·  Annulés: ${counts.cancelled ?? 0}`,
    12,
    y
  );
  y += 5;
  doc.text(`Total jours ouvrables approuvés : ${totalDays}`, 12, y);

  // Table
  autoTable(doc, {
    startY: y + 4,
    head: [["Agent", "Du", "Au", "Jours", "Statut", "Motif", "Comm. Chef", "Comm. Admin", "Soumis le"]],
    body: rows.map((r) => [
      r.user_name ?? "—",
      format(new Date(r.start_date), "dd/MM/yyyy"),
      format(new Date(r.end_date), "dd/MM/yyyy"),
      String(r.working_days),
      statusLabel[r.status] ?? r.status,
      r.reason ?? "",
      r.chef_comment ?? "",
      r.admin_comment ?? "",
      format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
    ]),
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 35 },
      5: { cellWidth: 40 },
      6: { cellWidth: 40 },
      7: { cellWidth: 40 },
    },
    margin: { left: 10, right: 10 },
  });

  // Footer
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

  doc.save(`rapport-conges_${periodStart}_${periodEnd}.pdf`);
}
