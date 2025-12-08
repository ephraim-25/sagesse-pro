import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown,
  Download,
  Users,
  Target,
  Clock,
  Award,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const performanceData = [
  { name: "Marie Dupont", dept: "Recherche", score: 96, tasks: 24, hours: 168, trend: 8 },
  { name: "Jean Martin", dept: "IT", score: 94, tasks: 31, hours: 172, trend: 5 },
  { name: "Sophie Bernard", dept: "Communication", score: 91, tasks: 18, hours: 165, trend: -2 },
  { name: "Pierre Durand", dept: "Finance", score: 88, tasks: 22, hours: 160, trend: 3 },
  { name: "Claire Moreau", dept: "Administration", score: 85, tasks: 15, hours: 158, trend: -5 },
];

const alerts = [
  { type: "warning", message: "3 agents sous le seuil de productivité", count: 3 },
  { type: "error", message: "Retards fréquents détectés", count: 2 },
  { type: "info", message: "Objectifs mensuels atteints", count: 8 },
];

const Performance = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Performance & Reporting</h1>
            <p className="page-description">Analysez la productivité et les performances</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="month">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50 border-l-4 border-l-success">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Productivité Globale</p>
                <p className="text-3xl font-bold text-foreground mt-1">92%</p>
                <div className="flex items-center gap-1 text-xs text-success mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>+5% vs mois dernier</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50 border-l-4 border-l-info">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tâches Complétées</p>
                <p className="text-3xl font-bold text-foreground mt-1">156</p>
                <div className="flex items-center gap-1 text-xs text-info mt-2">
                  <Target className="w-3 h-3" />
                  <span>87% de l'objectif</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-info" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50 border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heures Travaillées</p>
                <p className="text-3xl font-bold text-foreground mt-1">1,248h</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3" />
                  <span>Moyenne: 8h 12min/jour</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-soft border border-border/50 border-l-4 border-l-warning">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux Présence</p>
                <p className="text-3xl font-bold text-foreground mt-1">94%</p>
                <div className="flex items-center gap-1 text-xs text-warning mt-2">
                  <Users className="w-3 h-3" />
                  <span>6% absence/congés</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Table */}
          <div className="lg:col-span-2 bg-card rounded-xl shadow-soft border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-foreground">Classement des Performances</h3>
              <p className="text-sm text-muted-foreground">Top performers ce mois</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rang</th>
                    <th>Membre</th>
                    <th>Score</th>
                    <th>Tâches</th>
                    <th>Heures</th>
                    <th>Tendance</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((member, index) => (
                    <tr key={member.name} className="hover:bg-muted/30 transition-colors">
                      <td>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                          index === 0 ? "bg-warning/20 text-warning" :
                          index === 1 ? "bg-muted text-foreground" :
                          index === 2 ? "bg-accent/20 text-accent" :
                          "bg-muted/50 text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.dept}</p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                member.score >= 90 ? "bg-success" :
                                member.score >= 80 ? "bg-info" :
                                "bg-warning"
                              )}
                              style={{ width: `${member.score}%` }}
                            />
                          </div>
                          <span className="font-medium">{member.score}%</span>
                        </div>
                      </td>
                      <td>{member.tasks}</td>
                      <td>{member.hours}h</td>
                      <td>
                        <div className={cn(
                          "flex items-center gap-1 text-sm",
                          member.trend >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {member.trend >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {Math.abs(member.trend)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-foreground">Alertes</h3>
              </div>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border-l-4",
                      alert.type === "error" && "bg-destructive/5 border-l-destructive",
                      alert.type === "warning" && "bg-warning/5 border-l-warning",
                      alert.type === "info" && "bg-info/5 border-l-info"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{alert.message}</p>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        alert.type === "error" && "bg-destructive/10 text-destructive",
                        alert.type === "warning" && "bg-warning/10 text-warning",
                        alert.type === "info" && "bg-info/10 text-info"
                      )}>
                        {alert.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground">Objectifs</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Productivité</span>
                    <span className="text-success">92/90%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-success rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tâches</span>
                    <span className="text-info">156/180</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-info rounded-full" style={{ width: '87%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Présence</span>
                    <span className="text-warning">94/95%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full bg-warning rounded-full" style={{ width: '99%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Performance;
