import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  Loader2, 
  Download, 
  TrendingUp, 
  Clock,
  Users,
  Laptop,
  Building2,
  Target,
  AlertTriangle,
  FileText,
  Printer
} from "lucide-react";
import { useDashboardData, useTaches, useProfiles } from "@/hooks/useData";
import { usePerformanceStats } from "@/hooks/useHierarchy";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const PerformanceStats = () => {
  const { isPresident, isAdmin } = useAuth();
  const [selectedService, setSelectedService] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: dashboardData, isLoading: loadingDashboard } = useDashboardData();
  const { data: tasks, isLoading: loadingTasks } = useTaches();
  const { data: profiles } = useProfiles();
  const { data: perfStats, isLoading: loadingPerf } = usePerformanceStats();

  const isLoading = loadingDashboard || loadingTasks || loadingPerf;

  // Calculate tasks by service
  const tasksByService = tasks?.reduce((acc: Record<string, number>, task) => {
    const service = task.assigned_profile?.service || 'Non assigné';
    if (task.statut === 'termine') {
      acc[service] = (acc[service] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  const taskChartData = Object.entries(tasksByService)
    .map(([service, count]) => ({ service: service.slice(0, 15), taches: count }))
    .sort((a, b) => b.taches - a.taches)
    .slice(0, 8);

  // Work mode distribution
  const workModeData = [
    { name: 'Au Bureau', value: dashboardData?.overview.presents || 0, color: 'hsl(var(--success))' },
    { name: 'Télétravail', value: dashboardData?.overview.teletravail || 0, color: 'hsl(var(--info))' },
    { name: 'Absent', value: dashboardData?.overview.absents || 0, color: 'hsl(var(--muted))' },
  ];

  // Calculate average response time
  const avgResponseTime = () => {
    const completedTasks = tasks?.filter(t => t.statut === 'termine' && t.date_fin && t.created_at) || [];
    if (completedTasks.length === 0) return 0;
    
    const totalDays = completedTasks.reduce((sum, task) => {
      const created = new Date(task.created_at);
      const completed = new Date(task.date_fin!);
      return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    
    return Math.round(totalDays / completedTasks.length);
  };

  const responseTime = avgResponseTime();
  const responseTimeColor = responseTime <= 3 ? 'text-success' : responseTime <= 7 ? 'text-warning' : 'text-destructive';

  // Get unique services for filter
  const services = [...new Set(profiles?.map(p => p.service).filter(Boolean))] as string[];

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  if (!isPresident && !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Accès Restreint</h2>
            <p className="text-muted-foreground">
              Cette page est réservée au Président et au Secrétaire Permanent.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in print:animate-none" ref={reportRef}>
        {/* Header - Hidden in print */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="page-header mb-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="page-title">Statistiques de Performance</h1>
                <p className="page-description">Vue exécutive des performances institutionnelles</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les services</SelectItem>
                {services.map(service => (
                  <SelectItem key={service} value={service}>{service}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>

        {/* Print Header - Only shown in print */}
        <div className="hidden print:block mb-8">
          <div className="text-center border-b-2 border-primary pb-4 mb-4">
            <h1 className="text-2xl font-bold text-primary">CONSEIL SCIENTIFIQUE NATIONAL</h1>
            <p className="text-sm text-muted-foreground">République Démocratique du Congo</p>
            <h2 className="text-xl font-semibold mt-4">Rapport de Performance Institutionnelle</h2>
            <p className="text-sm">{new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Effectif Total</p>
                      <p className="text-3xl font-bold">{dashboardData?.overview.totalMembers || 0}</p>
                    </div>
                    <Users className="w-10 h-10 text-primary/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-success">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tâches Terminées</p>
                      <p className="text-3xl font-bold">{dashboardData?.tasks.terminees || 0}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        sur {dashboardData?.tasks.total || 0}
                      </Badge>
                    </div>
                    <Target className="w-10 h-10 text-success/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-info">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Temps Moyen</p>
                      <p className={`text-3xl font-bold ${responseTimeColor}`}>{responseTime} jours</p>
                      <p className="text-xs text-muted-foreground">pour compléter une tâche</p>
                    </div>
                    <Clock className="w-10 h-10 text-info/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">En Retard</p>
                      <p className="text-3xl font-bold text-warning">{dashboardData?.tasks.en_retard || 0}</p>
                      <p className="text-xs text-muted-foreground">tâches dépassées</p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-warning/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tasks by Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Classement des Bureaux
                  </CardTitle>
                  <CardDescription>Tâches terminées par service</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={taskChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="service" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar 
                        dataKey="taches" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                        name="Tâches terminées"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Work Mode Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-info" />
                    Indice d'Assiduité
                  </CardTitle>
                  <CardDescription>Répartition du travail aujourd'hui</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={workModeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {workModeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Reactivity Gauge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Taux de Réactivité par Service
                </CardTitle>
                <CardDescription>Temps moyen de complétion des tâches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(perfStats?.byService || {}).slice(0, 6).map(([service, stats]) => {
                    const avgTime = stats.avg_completion_time;
                    const color = avgTime <= 3 ? 'bg-success' : avgTime <= 7 ? 'bg-warning' : 'bg-destructive';
                    const percentage = Math.min(100, Math.max(0, 100 - (avgTime * 10)));
                    
                    return (
                      <div key={service} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium truncate">{service}</span>
                          <span className="text-sm text-muted-foreground">{avgTime.toFixed(1)}j</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${color} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stats.tasks_completed} tâches terminées
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  Top Performers de la Semaine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.topPerformers.slice(0, 5).map((performer, index) => (
                    <div key={performer.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-slate-400 text-white' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{performer.prenom} {performer.nom}</p>
                        <p className="text-sm text-muted-foreground">{performer.service || 'Non assigné'}</p>
                      </div>
                      <Badge variant="secondary">{performer.taches_terminees} tâches</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Print Footer - Only shown in print */}
            <div className="hidden print:block mt-16 pt-8 border-t-2 border-primary">
              <div className="grid grid-cols-2 gap-16">
                <div className="text-center">
                  <div className="h-24 border-b border-dashed border-muted-foreground mb-2" />
                  <p className="font-semibold">Visa du Président</p>
                  <p className="text-sm text-muted-foreground">Conseil Scientifique National</p>
                </div>
                <div className="text-center">
                  <div className="h-24 border-b border-dashed border-muted-foreground mb-2" />
                  <p className="font-semibold">Sceau du Secrétariat</p>
                  <p className="text-sm text-muted-foreground">Secrétaire Permanent</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #root {
            visibility: visible;
          }
          [class*="Sidebar"],
          nav,
          header {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 20px !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>
    </AppLayout>
  );
};

export default PerformanceStats;
