import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Building2,
  Clock,
  Target,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

const alerts = [
  { id: 1, type: "warning", message: "3 agents en retard ce matin", time: "08:15" },
  { id: 2, type: "error", message: "2 tâches critiques en dépassement", time: "09:30" },
  { id: 3, type: "info", message: "Réunion de direction dans 1h", time: "10:00" },
  { id: 4, type: "success", message: "Objectif mensuel atteint - Dept. IT", time: "Hier" },
];

const topPerformers = [
  { name: "Marie Dupont", dept: "Recherche", score: 98, avatar: "MD" },
  { name: "Jean Martin", dept: "IT", score: 96, avatar: "JM" },
  { name: "Sophie Bernard", dept: "Communication", score: 94, avatar: "SB" },
];

const projectProgress = [
  { name: "Rapport Annuel 2024", progress: 85, status: "on_track" },
  { name: "Digitalisation Archives", progress: 62, status: "delayed" },
  { name: "Formation Continue", progress: 100, status: "completed" },
  { name: "Audit Sécurité", progress: 45, status: "on_track" },
];

const PresidentDashboard = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="page-title">Tableau de Bord Exécutif</h1>
              <p className="page-description">Vue d'ensemble stratégique du Conseil</p>
            </div>
          </div>
        </div>

        {/* Executive Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Présence Globale"
            value="87%"
            icon={<Users className="w-6 h-6" />}
            variant="success"
            trend={{ value: 5, label: "vs semaine dernière" }}
          />
          <StatCard
            title="Productivité Moyenne"
            value="92%"
            icon={<TrendingUp className="w-6 h-6" />}
            variant="primary"
            trend={{ value: 8, label: "ce trimestre" }}
          />
          <StatCard
            title="Projets Actifs"
            value={12}
            icon={<Target className="w-6 h-6" />}
            variant="accent"
            trend={{ value: 2, label: "nouveaux" }}
          />
          <StatCard
            title="Objectifs Atteints"
            value="78%"
            icon={<Award className="w-6 h-6" />}
            variant="warning"
            trend={{ value: -5, label: "vs objectif" }}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Panel */}
          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Alertes & Notifications</h3>
                <p className="text-sm text-muted-foreground">{alerts.length} alertes actives</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border-l-4",
                    alert.type === "error" && "bg-destructive/5 border-l-destructive",
                    alert.type === "warning" && "bg-warning/5 border-l-warning",
                    alert.type === "info" && "bg-info/5 border-l-info",
                    alert.type === "success" && "bg-success/5 border-l-success"
                  )}
                >
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Projects Progress */}
          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Progression des Projets</h3>
                <p className="text-sm text-muted-foreground">Projets prioritaires</p>
              </div>
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-4">
              {projectProgress.map((project) => (
                <div key={project.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{project.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{project.progress}%</span>
                      {project.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      )}
                      {project.status === "delayed" && (
                        <Clock className="w-4 h-4 text-warning" />
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        project.status === "completed" ? "bg-success" :
                        project.status === "delayed" ? "bg-warning" : "bg-primary"
                      )}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Meilleurs Performances</h3>
                <p className="text-sm text-muted-foreground">Ce mois</p>
              </div>
              <Award className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div 
                  key={performer.name}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                    index === 0 ? "bg-warning/20 text-warning" :
                    index === 1 ? "bg-muted text-muted-foreground" :
                    "bg-accent/20 text-accent"
                  )}>
                    {performer.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{performer.name}</p>
                    <p className="text-xs text-muted-foreground">{performer.dept}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{performer.score}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Department Overview */}
        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
          <h3 className="font-semibold text-foreground mb-6">Vue Globale par Département</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: "Recherche", present: 12, absent: 2, remote: 1, tasks: 8 },
              { name: "Administration", present: 10, absent: 1, remote: 1, tasks: 5 },
              { name: "Communication", present: 6, absent: 1, remote: 1, tasks: 4 },
              { name: "Finance", present: 8, absent: 0, remote: 2, tasks: 6 },
              { name: "IT", present: 5, absent: 0, remote: 1, tasks: 3 },
            ].map((dept) => (
              <div key={dept.name} className="p-4 rounded-lg bg-muted/30 space-y-3">
                <h4 className="font-medium text-sm">{dept.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span>{dept.present} présents</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span>{dept.absent} absents</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-info" />
                    <span>{dept.remote} télétravail</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <span>{dept.tasks} tâches</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PresidentDashboard;
