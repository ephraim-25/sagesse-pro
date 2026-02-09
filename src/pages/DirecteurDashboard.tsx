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
  Briefcase,
  FolderOpen,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTaches } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Dashboard for Directors (Directeurs)
 * - Directors are under the Secrétaire Permanent
 * - Directors have authority over Division Chiefs
 * - View is filtered by their direction
 */
const DirecteurDashboard = () => {
  const { profile, grade } = useAuth();
  const { data: allTasks, isLoading: loadingTasks } = useTaches();

  // Get the director's direction
  const myDirection = (profile as any)?.direction;

  // Check if user is actually a Directeur
  const isDirecteur = grade?.code === 'directeur';

  // Fetch all Division Chiefs under this director (same direction or managed by this director)
  const { data: divisionChiefs, isLoading: loadingDivisionChiefs } = useQuery({
    queryKey: ['division-chiefs', profile?.id, myDirection],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      // Division chiefs either managed by this director OR in the same direction
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          grade:grades(code, label, rank_order)
        `)
        .eq('statut', 'actif')
        .or(`manager_id.eq.${profile.id}${myDirection ? `,direction.eq.${myDirection}` : ''}`);

      if (error) throw error;
      
      // Filter to only division chiefs (rank 4) and bureau chiefs (rank 5)
      return (data || []).filter((p: any) => 
        p.grade?.rank_order === 4 || p.grade?.rank_order === 5
      );
    },
    enabled: !!profile?.id && isDirecteur,
  });

  // Fetch all staff in this direction (agents under the division/bureau chiefs)
  const { data: directionStaff, isLoading: loadingStaff } = useQuery({
    queryKey: ['direction-staff', divisionChiefs?.map(c => c.id)],
    queryFn: async () => {
      if (!divisionChiefs?.length) return [];
      
      const chiefIds = divisionChiefs.map(c => c.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, grade:grades(code, label)')
        .in('manager_id', chiefIds)
        .eq('statut', 'actif');

      if (error) throw error;
      return data || [];
    },
    enabled: !!divisionChiefs?.length,
  });

  // Fetch today's presence for direction staff
  const { data: todayPresence, isLoading: loadingPresence } = useQuery({
    queryKey: ['direction-presence', directionStaff?.map(s => s.id)],
    queryFn: async () => {
      if (!directionStaff?.length) return [];
      
      const staffIds = directionStaff.map(s => s.id);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('presences')
        .select('*')
        .in('user_id', staffIds)
        .eq('date', today);

      if (error) throw error;
      return data || [];
    },
    enabled: !!directionStaff?.length,
  });

  // Calculate stats
  const totalDivisionChiefs = divisionChiefs?.filter(c => (c as any).grade?.rank_order === 4).length || 0;
  const totalBureauChiefs = divisionChiefs?.filter(c => (c as any).grade?.rank_order === 5).length || 0;
  const totalStaff = directionStaff?.length || 0;
  const presentToday = todayPresence?.filter(p => p.heure_entree).length || 0;

  // Direction tasks (all tasks from the direction hierarchy)
  const allStaffIds = new Set([
    profile?.id,
    ...(divisionChiefs?.map(c => c.id) || []),
    ...(directionStaff?.map(s => s.id) || [])
  ]);
  
  const directionTasks = allTasks?.filter(t => 
    allStaffIds.has(t.created_by || '') || allStaffIds.has(t.assigned_to || '')
  ) || [];

  const completedTasks = directionTasks.filter(t => t.statut === 'termine').length;
  const pendingTasks = directionTasks.filter(t => t.statut === 'a_faire' || t.statut === 'en_cours').length;
  const overdueTasks = directionTasks.filter(t => {
    if (!t.date_limite) return false;
    return new Date(t.date_limite) < new Date() && t.statut !== 'termine';
  }).length;

  const isLoading = loadingTasks || loadingDivisionChiefs || loadingStaff || loadingPresence;

  if (!isDirecteur) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Accès Restreint</h2>
            <p className="text-muted-foreground">
              Cette page est réservée aux Directeurs.
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
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Tableau de Bord Directeur</h1>
              <p className="page-description">
                {myDirection ? `Direction: ${myDirection}` : 'Supervision de votre direction'}
              </p>
            </div>
          </div>
        </div>

        {/* Direction Info Banner */}
        {myDirection && (
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-primary" />
                <span className="font-medium">Direction: </span>
                <Badge variant="secondary" className="text-sm">
                  {myDirection}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-primary/10 rounded-lg mb-2">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{totalDivisionChiefs}</p>
                <p className="text-xs text-muted-foreground">Chefs Division</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/10 to-info/5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-info/10 rounded-lg mb-2">
                  <Building2 className="w-5 h-5 text-info" />
                </div>
                <p className="text-2xl font-bold">{totalBureauChiefs}</p>
                <p className="text-xs text-muted-foreground">Chefs Bureau</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/20 to-secondary/10">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-secondary/20 rounded-lg mb-2">
                  <Users className="w-5 h-5 text-foreground" />
                </div>
                <p className="text-2xl font-bold">{totalStaff}</p>
                <p className="text-xs text-muted-foreground">Agents</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-success/10 rounded-lg mb-2">
                  <UserCheck className="w-5 h-5 text-success" />
                </div>
                <p className="text-2xl font-bold">{presentToday}</p>
                <p className="text-xs text-muted-foreground">Présents</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-warning/10 rounded-lg mb-2">
                  <ClipboardCheck className="w-5 h-5 text-warning" />
                </div>
                <p className="text-2xl font-bold">{pendingTasks}</p>
                <p className="text-xs text-muted-foreground">Tâches en cours</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-destructive/10 rounded-lg mb-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <p className="text-xs text-muted-foreground">En retard</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Division Chiefs Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Chefs de Division & Bureau
              </CardTitle>
              <CardDescription>
                Responsables sous votre autorité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!divisionChiefs?.length ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucun responsable rattaché</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Affectez des Chefs de Division à votre direction
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {divisionChiefs.map((chief) => {
                    const chiefStaff = directionStaff?.filter(s => s.manager_id === chief.id) || [];
                    const isDivisionChief = (chief as any).grade?.rank_order === 4;
                    
                    return (
                      <div 
                        key={chief.id}
                        className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              isDivisionChief ? "bg-primary/10" : "bg-info/10"
                            )}>
                              <span className={cn(
                                "text-sm font-medium",
                                isDivisionChief ? "text-primary" : "text-info"
                              )}>
                                {chief.prenom[0]}{chief.nom[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{chief.prenom} {chief.nom}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant={isDivisionChief ? "default" : "secondary"} className="text-xs">
                                  {(chief as any).grade?.label || 'Chef'}
                                </Badge>
                                {chief.service && (
                                  <span className="text-xs text-muted-foreground">
                                    {chief.service}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{chiefStaff.length}</p>
                            <p className="text-xs text-muted-foreground">agents</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Tâches de la Direction
              </CardTitle>
              <CardDescription>
                Activité récente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {directionTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune tâche</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {directionTasks.slice(0, 10).map((task) => {
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
                            className="text-xs flex-shrink-0"
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
              Performance de la Direction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">
                  {directionTasks.length > 0 
                    ? Math.round((completedTasks / directionTasks.length) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">Taux de complétion</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-success">{completedTasks}</p>
                <p className="text-sm text-muted-foreground mt-1">Tâches terminées</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-info">
                  {totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">Taux de présence</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground">
                  {totalDivisionChiefs + totalBureauChiefs}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total encadrement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DirecteurDashboard;
