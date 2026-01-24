import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Loader2,
  Building2,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTaches } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ChefDivisionDashboard = () => {
  const { profile, isChefService } = useAuth();
  const { data: allTasks, isLoading: loadingTasks } = useTaches();

  // Fetch all bureau chiefs under this division chief
  const { data: bureauChiefs, isLoading: loadingChiefs } = useQuery({
    queryKey: ['bureau-chiefs', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          grade:grades(code, label)
        `)
        .eq('manager_id', profile.id)
        .eq('statut', 'actif');

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id && isChefService,
  });

  // Fetch agents under each bureau chief for stats
  const { data: divisionAgents, isLoading: loadingAgents } = useQuery({
    queryKey: ['division-agents', bureauChiefs?.map(c => c.id)],
    queryFn: async () => {
      if (!bureauChiefs?.length) return [];
      
      const chiefIds = bureauChiefs.map(c => c.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, grade:grades(code, label)')
        .in('manager_id', chiefIds)
        .eq('statut', 'actif');

      if (error) throw error;
      return data || [];
    },
    enabled: !!bureauChiefs?.length,
  });

  // Calculate division stats
  const totalBureaus = bureauChiefs?.length || 0;
  const totalAgents = divisionAgents?.length || 0;
  
  // Tasks created by bureau chiefs or assigned to division agents
  const divisionTaskIds = new Set([
    ...(bureauChiefs?.map(c => c.id) || []),
    ...(divisionAgents?.map(a => a.id) || [])
  ]);
  
  const divisionTasks = allTasks?.filter(t => 
    divisionTaskIds.has(t.created_by || '') || divisionTaskIds.has(t.assigned_to || '')
  ) || [];
  
  const completedTasks = divisionTasks.filter(t => t.statut === 'termine').length;
  const pendingTasks = divisionTasks.filter(t => t.statut === 'a_faire' || t.statut === 'en_cours').length;
  const overdueTasks = divisionTasks.filter(t => {
    if (!t.date_limite) return false;
    return new Date(t.date_limite) < new Date() && t.statut !== 'termine';
  }).length;

  const isLoading = loadingTasks || loadingChiefs || loadingAgents;

  if (!isChefService) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Accès Restreint</h2>
            <p className="text-muted-foreground">
              Cette page est réservée aux Chefs de Division.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Tableau de Bord Division</h1>
          <p className="page-description">
            Supervision de vos bureaux et équipes
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalBureaus}</p>
                  <p className="text-sm text-muted-foreground">Bureaux</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/10 to-info/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-info/10 rounded-xl">
                  <Users className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalAgents}</p>
                  <p className="text-sm text-muted-foreground">Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{completedTasks}</p>
                  <p className="text-sm text-muted-foreground">Tâches terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{overdueTasks}</p>
                  <p className="text-sm text-muted-foreground">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bureau Chiefs Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Mes Bureaux
              </CardTitle>
              <CardDescription>
                Chefs de Bureau sous votre supervision
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bureauChiefs?.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucun bureau rattaché</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bureauChiefs?.map((chief) => {
                    const chiefAgents = divisionAgents?.filter(a => a.manager_id === chief.id) || [];
                    const chiefTasks = allTasks?.filter(t => 
                      t.created_by === chief.id || chiefAgents.some(a => a.id === t.assigned_to)
                    ) || [];
                    const chiefCompletedTasks = chiefTasks.filter(t => t.statut === 'termine').length;
                    
                    return (
                      <div 
                        key={chief.id}
                        className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {chief.prenom[0]}{chief.nom[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{chief.prenom} {chief.nom}</p>
                              <p className="text-sm text-muted-foreground">
                                {(chief as any).grade?.label || chief.fonction || 'Chef de Bureau'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{chiefAgents.length} agents</p>
                            <p className="text-xs text-muted-foreground">
                              {chiefCompletedTasks} tâches terminées
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks from Division */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Tâches de la Division
              </CardTitle>
              <CardDescription>
                Activité récente de vos bureaux
              </CardDescription>
            </CardHeader>
            <CardContent>
              {divisionTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune tâche</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {divisionTasks.slice(0, 10).map((task) => {
                    const isOverdue = task.date_limite && new Date(task.date_limite) < new Date() && task.statut !== 'termine';
                    
                    return (
                      <div 
                        key={task.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{task.titre}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {task.assigned_profile && (
                                <span className="text-xs text-muted-foreground">
                                  → {task.assigned_profile.prenom} {task.assigned_profile.nom}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant={
                              task.statut === 'termine' ? 'default' : 
                              task.statut === 'en_cours' ? 'secondary' : 
                              'outline'
                            }
                            className="text-xs"
                          >
                            {task.statut === 'termine' ? 'Terminé' : 
                             task.statut === 'en_cours' ? 'En cours' : 'À faire'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Performance Globale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-4xl font-bold text-primary">
                  {divisionTasks.length > 0 
                    ? Math.round((completedTasks / divisionTasks.length) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">Taux de complétion</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-4xl font-bold text-info">{pendingTasks}</p>
                <p className="text-sm text-muted-foreground mt-1">Tâches en cours</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-4xl font-bold text-success">
                  {totalBureaus > 0 ? Math.round(totalAgents / totalBureaus) : 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Agents/Bureau (moy.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ChefDivisionDashboard;
