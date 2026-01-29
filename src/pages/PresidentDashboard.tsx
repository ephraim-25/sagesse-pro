import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { InteractiveOrgChart } from "@/components/orgchart/InteractiveOrgChart";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { DepartmentRadar } from "@/components/dashboard/DepartmentRadar";
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Building2,
  Target,
  FileText,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useData";
import { Loader2 } from "lucide-react";

const PresidentDashboard = () => {
  const { data: dashboardData, isLoading } = useDashboardData();

  const presenceRate = dashboardData?.overview.totalMembers 
    ? Math.round(((dashboardData.overview.presents + dashboardData.overview.teletravail) / dashboardData.overview.totalMembers) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">SIGC-CSN</h1>
                <p className="text-muted-foreground">Système Intégré de Gestion du Conseil</p>
              </div>
            </div>
            
            {/* Report Generation Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Exporter le Rapport Journalier (PDF)
                <Download className="w-4 h-4" />
              </Button>
              <Button className="gap-2 bg-slate-800 hover:bg-slate-700 text-white shadow-lg">
                <FileText className="w-4 h-4" />
                Générer le Rapport Hebdomadaire
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Radar Stats - 3 Key Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Taux d'Assiduité Global"
              value={`${presenceRate}%`}
              icon={<Users className="w-6 h-6" />}
              variant={presenceRate >= 80 ? "success" : presenceRate >= 60 ? "warning" : "primary"}
              trend={{ value: 5, label: "vs semaine dernière" }}
            />
            <StatCard
              title="Missions en Cours"
              value={dashboardData?.tasks.en_cours || 0}
              icon={<Target className="w-6 h-6" />}
              variant="accent"
              trend={dashboardData?.tasks.a_faire 
                ? { value: dashboardData.tasks.a_faire, label: "à planifier" }
                : undefined
              }
            />
            <StatCard
              title="Alertes Retard"
              value={dashboardData?.tasks.en_retard || 0}
              icon={<AlertTriangle className="w-6 h-6" />}
              variant={dashboardData?.tasks.en_retard && dashboardData.tasks.en_retard > 0 ? "warning" : "success"}
              trend={dashboardData?.tasks.en_retard && dashboardData.tasks.en_retard > 0
                ? { value: -dashboardData.tasks.en_retard, label: "à traiter" }
                : undefined
              }
            />
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Radar - Takes 2 columns */}
          <div className="lg:col-span-2">
            <DepartmentRadar />
          </div>

          {/* Activity Timeline */}
          <div>
            <ActivityTimeline />
          </div>
        </div>

        {/* Interactive Org Chart */}
        <InteractiveOrgChart />
      </div>
    </AppLayout>
  );
};

export default PresidentDashboard;
