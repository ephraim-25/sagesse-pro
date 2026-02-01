import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  fonction: string | null;
  service: string | null;
}

interface PresenceData {
  id: string;
  user_id: string;
  date: string;
  heure_entree: string | null;
  heure_sortie: string | null;
  type: string | null;
  profile?: Profile;
}

interface TeleworkData {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  statut: string | null;
  duree_active_minutes: number;
  profile?: Profile;
}

interface TaskData {
  id: string;
  titre: string;
  statut: string;
  priorite: string;
  assigned_to: string | null;
  date_limite: string | null;
  assigned_profile?: Profile;
}

const CSN_BLUE: [number, number, number] = [0, 51, 102]; // Institutional blue
const CSN_GRAY: [number, number, number] = [100, 100, 100];

const addHeader = (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(CSN_BLUE[0], CSN_BLUE[1], CSN_BLUE[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSEIL SCIENTIFIQUE NATIONAL', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Système Intégré de Gestion du Conseil (SIGC-CSN)', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(title, pageWidth / 2, 28, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return 45; // Return Y position after header
};

const addFooter = (doc: jsPDF, pageNum: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(8);
  doc.setTextColor(CSN_GRAY[0], CSN_GRAY[1], CSN_GRAY[2]);
  
  // Footer line
  doc.setDrawColor(CSN_BLUE[0], CSN_BLUE[1], CSN_BLUE[2]);
  doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
  
  // Footer text
  doc.text(
    `Document généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`,
    20,
    pageHeight - 12
  );
  doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 12, { align: 'right' });
  
  // Confidential note
  doc.text('CONFIDENTIEL - Usage interne uniquement', pageWidth / 2, pageHeight - 12, { align: 'center' });
};

const addSignatureSection = (doc: jsPDF, startY: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  // Signature boxes
  const boxWidth = 70;
  const leftX = 20;
  const rightX = pageWidth - boxWidth - 20;
  
  doc.text('Vérifié par:', leftX, startY);
  doc.rect(leftX, startY + 5, boxWidth, 30);
  doc.text('Signature:', leftX + 5, startY + 25);
  doc.text('Date: ____/____/____', leftX + 5, startY + 32);
  
  doc.text('Approuvé par:', rightX, startY);
  doc.rect(rightX, startY + 5, boxWidth, 30);
  doc.text('Signature:', rightX + 5, startY + 25);
  doc.text('Date: ____/____/____', rightX + 5, startY + 32);
  
  // Visa/Seal space
  doc.text('Visa / Cachet:', pageWidth / 2 - 25, startY + 50);
  doc.rect(pageWidth / 2 - 25, startY + 55, 50, 30);
  
  return startY + 90;
};

export const usePdfExport = () => {
  // Export Daily Presence Report
  const exportDailyPresenceReport = async (date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      toast.loading('Génération du rapport de présences...');
      
      // Fetch presence data
      const { data: presences, error } = await supabase
        .from('presences')
        .select('*, profile:profiles(*)')
        .eq('date', targetDate)
        .order('heure_entree', { ascending: true });
      
      if (error) throw error;
      
      // Fetch telework data for the same day
      const { data: telework } = await supabase
        .from('teletravail_logs')
        .select('*, profile:profiles(*)')
        .eq('date', targetDate);
      
      const doc = new jsPDF();
      let yPos = addHeader(doc, `RAPPORT JOURNALIER DE PRÉSENCES - ${format(new Date(targetDate), 'dd MMMM yyyy', { locale: fr })}`);
      
      // Summary section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSUMÉ', 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const presentielCount = presences?.filter(p => p.type === 'presentiel' && p.heure_entree).length || 0;
      const teleworkCount = telework?.filter(t => t.check_in).length || 0;
      
      doc.text(`• Présences au bureau: ${presentielCount}`, 25, yPos);
      yPos += 6;
      doc.text(`• Télétravail: ${teleworkCount}`, 25, yPos);
      yPos += 6;
      doc.text(`• Total personnel actif: ${presentielCount + teleworkCount}`, 25, yPos);
      yPos += 15;
      
      // Presence table
      doc.setFont('helvetica', 'bold');
      doc.text('DÉTAIL DES PRÉSENCES AU BUREAU', 20, yPos);
      yPos += 5;
      
      if (presences && presences.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Nom', 'Prénom', 'Service', 'Heure Entrée', 'Heure Sortie', 'Durée']],
          body: presences.map(p => {
            const entree = p.heure_entree ? format(new Date(p.heure_entree), 'HH:mm') : '-';
            const sortie = p.heure_sortie ? format(new Date(p.heure_sortie), 'HH:mm') : 'En cours';
            let duree = '-';
            if (p.heure_entree && p.heure_sortie) {
              const diff = new Date(p.heure_sortie).getTime() - new Date(p.heure_entree).getTime();
              const hours = Math.floor(diff / 3600000);
              const mins = Math.floor((diff % 3600000) / 60000);
              duree = `${hours}h ${mins}m`;
            }
            return [
              (p.profile as any)?.nom || '-',
              (p.profile as any)?.prenom || '-',
              (p.profile as any)?.service || '-',
              entree,
              sortie,
              duree
            ];
          }),
          headStyles: { fillColor: CSN_BLUE, textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 20, right: 20 },
        });
        yPos = doc.lastAutoTable.finalY + 15;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.text('Aucune présence enregistrée pour cette date', 25, yPos + 5);
        yPos += 20;
      }
      
      // Telework table
      if (telework && telework.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('DÉTAIL DU TÉLÉTRAVAIL', 20, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Nom', 'Prénom', 'Check-in', 'Check-out', 'Statut', 'Durée (min)']],
          body: telework.map(t => [
            (t.profile as any)?.nom || '-',
            (t.profile as any)?.prenom || '-',
            t.check_in ? format(new Date(t.check_in), 'HH:mm') : '-',
            t.check_out ? format(new Date(t.check_out), 'HH:mm') : 'En cours',
            t.statut || '-',
            t.duree_active_minutes?.toString() || '0'
          ]),
          headStyles: { fillColor: CSN_BLUE, textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 20, right: 20 },
        });
        yPos = doc.lastAutoTable.finalY + 15;
      }
      
      // Signature section
      if (yPos > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        yPos = 30;
      }
      addSignatureSection(doc, yPos);
      
      // Add footer to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i);
      }
      
      doc.save(`Rapport_Presences_${targetDate}.pdf`);
      toast.dismiss();
      toast.success('Rapport de présences généré avec succès');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du rapport');
      console.error(error);
    }
  };
  
  // Export Tasks Report
  const exportTasksReport = async (filters?: { service?: string; status?: string }) => {
    try {
      toast.loading('Génération du rapport des tâches...');
      
      let query = supabase
        .from('taches')
        .select('*, assigned_profile:profiles!taches_assigned_to_fkey(*), creator_profile:profiles!taches_created_by_fkey(*)')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('statut', filters.status as 'a_faire' | 'en_cours' | 'en_pause' | 'termine');
      }
      
      const { data: tasks, error } = await query;
      if (error) throw error;
      
      const doc = new jsPDF();
      let yPos = addHeader(doc, 'RAPPORT DES TÂCHES ET MISSIONS');
      
      // Summary
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSUMÉ DES TÂCHES', 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const aFaire = tasks?.filter(t => t.statut === 'a_faire').length || 0;
      const enCours = tasks?.filter(t => t.statut === 'en_cours').length || 0;
      const terminees = tasks?.filter(t => t.statut === 'termine').length || 0;
      const enRetard = tasks?.filter(t => {
        if (!t.date_limite) return false;
        return new Date(t.date_limite) < new Date() && t.statut !== 'termine';
      }).length || 0;
      
      doc.text(`• À faire: ${aFaire}`, 25, yPos);
      yPos += 6;
      doc.text(`• En cours: ${enCours}`, 25, yPos);
      yPos += 6;
      doc.text(`• Terminées: ${terminees}`, 25, yPos);
      yPos += 6;
      doc.text(`• En retard: ${enRetard}`, 25, yPos);
      yPos += 15;
      
      // Tasks table
      doc.setFont('helvetica', 'bold');
      doc.text('LISTE DES TÂCHES', 20, yPos);
      yPos += 5;
      
      const statusLabels: Record<string, string> = {
        'a_faire': 'À faire',
        'en_cours': 'En cours',
        'en_pause': 'En pause',
        'termine': 'Terminé'
      };
      
      const priorityLabels: Record<string, string> = {
        'faible': 'Faible',
        'moyen': 'Moyen',
        'eleve': 'Élevé',
        'urgente': 'Urgent'
      };
      
      if (tasks && tasks.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Titre', 'Assigné à', 'Priorité', 'Statut', 'Date Limite', 'Progression']],
          body: tasks.map(t => [
            t.titre.substring(0, 30) + (t.titre.length > 30 ? '...' : ''),
            t.assigned_profile ? `${t.assigned_profile.prenom} ${t.assigned_profile.nom}` : '-',
            priorityLabels[t.priorite] || t.priorite,
            statusLabels[t.statut] || t.statut,
            t.date_limite ? format(new Date(t.date_limite), 'dd/MM/yyyy') : '-',
            `${t.progression || 0}%`
          ]),
          headStyles: { fillColor: CSN_BLUE, textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 50 },
            5: { halign: 'center' }
          }
        });
        yPos = doc.lastAutoTable.finalY + 15;
      }
      
      // Signature
      if (yPos > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        yPos = 30;
      }
      addSignatureSection(doc, yPos);
      
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i);
      }
      
      doc.save(`Rapport_Taches_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.dismiss();
      toast.success('Rapport des tâches généré avec succès');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du rapport');
      console.error(error);
    }
  };
  
  // Export Performance Report
  const exportPerformanceReport = async () => {
    try {
      toast.loading('Génération du rapport de performance...');
      
      // Get members by service
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('statut', 'actif');
      
      // Get tasks stats
      const { data: tasks } = await supabase
        .from('taches')
        .select('*');
      
      const doc = new jsPDF();
      let yPos = addHeader(doc, 'RAPPORT DE PERFORMANCE DÉPARTEMENTALE');
      
      // Service statistics
      const serviceStats: Record<string, { membres: number; taches: number; terminees: number }> = {};
      
      profiles?.forEach(p => {
        const service = p.service || 'Non attribué';
        if (!serviceStats[service]) {
          serviceStats[service] = { membres: 0, taches: 0, terminees: 0 };
        }
        serviceStats[service].membres++;
      });
      
      tasks?.forEach(t => {
        const profile = profiles?.find(p => p.id === t.assigned_to);
        const service = profile?.service || 'Non attribué';
        if (serviceStats[service]) {
          serviceStats[service].taches++;
          if (t.statut === 'termine') {
            serviceStats[service].terminees++;
          }
        }
      });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PERFORMANCE PAR DÉPARTEMENT', 20, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Département', 'Membres', 'Tâches Totales', 'Tâches Terminées', 'Taux Réalisation']],
        body: Object.entries(serviceStats).map(([service, stats]) => [
          service,
          stats.membres.toString(),
          stats.taches.toString(),
          stats.terminees.toString(),
          stats.taches > 0 ? `${Math.round((stats.terminees / stats.taches) * 100)}%` : '-'
        ]),
        headStyles: { fillColor: CSN_BLUE, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 },
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // Signature
      if (yPos > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        yPos = 30;
      }
      addSignatureSection(doc, yPos);
      
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i);
      }
      
      doc.save(`Rapport_Performance_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.dismiss();
      toast.success('Rapport de performance généré avec succès');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du rapport');
      console.error(error);
    }
  };
  
  // Export Telework Report
  const exportTeleworkReport = async (startDate?: string, endDate?: string) => {
    try {
      toast.loading('Génération du rapport de télétravail...');
      
      const start = startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');
      
      const { data: telework, error } = await supabase
        .from('teletravail_logs')
        .select('*, profile:profiles(*)')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const doc = new jsPDF();
      let yPos = addHeader(doc, `RAPPORT DE TÉLÉTRAVAIL - ${format(new Date(start), 'dd/MM/yyyy')} au ${format(new Date(end), 'dd/MM/yyyy')}`);
      
      // Summary
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSUMÉ', 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const totalSessions = telework?.length || 0;
      const totalMinutes = telework?.reduce((acc, t) => acc + (t.duree_active_minutes || 0), 0) || 0;
      const uniqueUsers = new Set(telework?.map(t => t.user_id)).size;
      
      doc.text(`• Total sessions: ${totalSessions}`, 25, yPos);
      yPos += 6;
      doc.text(`• Utilisateurs uniques: ${uniqueUsers}`, 25, yPos);
      yPos += 6;
      doc.text(`• Durée totale: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`, 25, yPos);
      yPos += 15;
      
      // Sessions table
      doc.setFont('helvetica', 'bold');
      doc.text('DÉTAIL DES SESSIONS', 20, yPos);
      yPos += 5;
      
      if (telework && telework.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Nom', 'Prénom', 'Check-in', 'Check-out', 'Durée (min)', 'Statut']],
          body: telework.map(t => [
            format(new Date(t.date), 'dd/MM/yyyy'),
            (t.profile as any)?.nom || '-',
            (t.profile as any)?.prenom || '-',
            t.check_in ? format(new Date(t.check_in), 'HH:mm') : '-',
            t.check_out ? format(new Date(t.check_out), 'HH:mm') : '-',
            t.duree_active_minutes?.toString() || '0',
            t.statut || '-'
          ]),
          headStyles: { fillColor: CSN_BLUE, textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 20, right: 20 },
        });
        yPos = doc.lastAutoTable.finalY + 15;
      }
      
      // Signature
      if (yPos > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        yPos = 30;
      }
      addSignatureSection(doc, yPos);
      
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i);
      }
      
      doc.save(`Rapport_Teletravail_${start}_${end}.pdf`);
      toast.dismiss();
      toast.success('Rapport de télétravail généré avec succès');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du rapport');
      console.error(error);
    }
  };
  
  // Export Member List
  const exportMemberList = async () => {
    try {
      toast.loading('Génération de la liste des membres...');
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*, grades:grade_id(*)')
        .order('nom');
      
      if (error) throw error;
      
      const doc = new jsPDF();
      let yPos = addHeader(doc, 'ANNUAIRE DES MEMBRES DU CONSEIL');
      
      // Stats
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('STATISTIQUES', 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const actifs = profiles?.filter(p => p.statut === 'actif').length || 0;
      const suspendus = profiles?.filter(p => p.statut === 'suspendu').length || 0;
      
      doc.text(`• Membres actifs: ${actifs}`, 25, yPos);
      yPos += 6;
      doc.text(`• Membres suspendus: ${suspendus}`, 25, yPos);
      yPos += 15;
      
      // Members table
      doc.setFont('helvetica', 'bold');
      doc.text('LISTE DES MEMBRES', 20, yPos);
      yPos += 5;
      
      if (profiles && profiles.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Nom', 'Prénom', 'Email', 'Grade', 'Service', 'Statut']],
          body: profiles.map(p => [
            p.nom,
            p.prenom,
            p.email,
            (p.grades as any)?.label || p.custom_grade || '-',
            p.service || '-',
            p.statut === 'actif' ? 'Actif' : 'Suspendu'
          ]),
          headStyles: { fillColor: CSN_BLUE, textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 20, right: 20 },
          columnStyles: {
            2: { cellWidth: 45 }
          }
        });
        yPos = doc.lastAutoTable.finalY + 15;
      }
      
      // Signature
      if (yPos > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        yPos = 30;
      }
      addSignatureSection(doc, yPos);
      
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i);
      }
      
      doc.save(`Annuaire_Membres_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.dismiss();
      toast.success('Annuaire des membres généré avec succès');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du rapport');
      console.error(error);
    }
  };
  
  return {
    exportDailyPresenceReport,
    exportTasksReport,
    exportPerformanceReport,
    exportTeleworkReport,
    exportMemberList
  };
};
