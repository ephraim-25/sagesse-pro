import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  FileText,
  Download,
  Calendar,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  FileDown,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useState } from "react";
import logoCsn from "@/assets/logo-csn.png";

const Reports = () => {
  const { 
    exportDailyPresenceReport, 
    exportTasksReport, 
    exportPerformanceReport, 
    exportTeleworkReport,
    exportMemberList
  } = usePdfExport();
  
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  const handleExport = async (type: string, exportFn: () => Promise<void>) => {
    setLoadingReport(type);
    try {
      await exportFn();
    } finally {
      setLoadingReport(null);
    }
  };

  const reportTypes = [
    {
      id: "presence",
      title: "Rapport de Présences",
      description: "Statistiques complètes des présences et absences du jour",
      icon: Users,
      color: "bg-success/10 text-success",
      lastGenerated: "Aujourd'hui",
      onExport: () => handleExport("presence", exportDailyPresenceReport),
    },
    {
      id: "performance",
      title: "Rapport de Performance",
      description: "Analyse de la productivité par département",
      icon: TrendingUp,
      color: "bg-info/10 text-info",
      lastGenerated: "À générer",
      onExport: () => handleExport("performance", exportPerformanceReport),
    },
    {
      id: "tasks",
      title: "Rapport des Tâches",
      description: "État d'avancement des projets et tâches",
      icon: BarChart3,
      color: "bg-warning/10 text-warning",
      lastGenerated: "À générer",
      onExport: () => handleExport("tasks", exportTasksReport),
    },
    {
      id: "telework",
      title: "Rapport de Télétravail",
      description: "Analyse des sessions de travail à distance (30 derniers jours)",
      icon: Clock,
      color: "bg-accent/10 text-accent",
      lastGenerated: "À générer",
      onExport: () => handleExport("telework", exportTeleworkReport),
    },
  ];

  const recentReports = [
    { name: "Rapport Mensuel - Janvier 2026.pdf", date: "01 Fév 2026", size: "2.4 MB" },
    { name: "Analyse Performance Q4.pdf", date: "15 Jan 2026", size: "3.1 MB" },
    { name: "Bilan Présences Décembre.pdf", date: "02 Jan 2026", size: "1.8 MB" },
    { name: "Rapport Annuel 2025.pdf", date: "15 Jan 2026", size: "8.5 MB" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <div className="flex items-center gap-3">
              <img 
                src={logoCsn} 
                alt="Logo CSN" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="page-title">Rapports</h1>
                <p className="page-description">Générez et exportez les rapports officiels du CSN</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Planifier
            </Button>
            <Button onClick={() => handleExport("members", exportMemberList)}>
              <Users className="w-4 h-4 mr-2" />
              {loadingReport === "members" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Annuaire des Membres"
              )}
            </Button>
          </div>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report) => (
            <div 
              key={report.id}
              className="bg-card rounded-xl p-6 shadow-soft border border-border/50 hover:shadow-card transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", report.color)}>
                  <report.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Dernier rapport : {report.lastGenerated}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  disabled={loadingReport === report.id}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={report.onExport}
                  disabled={loadingReport === report.id}
                >
                  {loadingReport === report.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Générer PDF
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Reports */}
        <div className="bg-card rounded-xl shadow-soft border border-border/50">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Rapports Récents</h3>
                <p className="text-sm text-muted-foreground">Historique des rapports générés</p>
              </div>
              <Button variant="ghost" size="sm">Voir tous</Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {recentReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.date} • {report.size}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <FileDown className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <p className="text-3xl font-bold text-foreground">48</p>
            <p className="text-sm text-muted-foreground">Rapports générés ce mois</p>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <p className="text-3xl font-bold text-foreground">12</p>
            <p className="text-sm text-muted-foreground">Rapports planifiés</p>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50">
            <p className="text-3xl font-bold text-foreground">156 MB</p>
            <p className="text-sm text-muted-foreground">Stockage utilisé</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
