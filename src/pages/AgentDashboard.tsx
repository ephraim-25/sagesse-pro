import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  ListTodo, 
  Loader2,
  Calendar,
  AlertCircle,
  Play,
  Pause,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  useTodayPresence, 
  useRecordPresence, 
  useTaches, 
  useUpdateTache,
  useTodayTeletravail,
  useRecordTeletravail
} from "@/hooks/useData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const AgentDashboard = () => {
  const { profile } = useAuth();
  const { data: todayPresence, isLoading: loadingPresence } = useTodayPresence();
  const { data: todayTeletravail, isLoading: loadingTeletravail } = useTodayTeletravail();
  const { data: allTasks, isLoading: loadingTasks } = useTaches();
  const recordPresence = useRecordPresence();
  const recordTeletravail = useRecordTeletravail();
  const updateTache = useUpdateTache();

  // Filter tasks assigned to current user
  const myTasks = allTasks?.filter(t => t.assigned_to === profile?.id) || [];
  const pendingTasks = myTasks.filter(t => t.statut === 'a_faire' || t.statut === 'en_cours');
  const overdueTasks = myTasks.filter(t => {
    if (!t.date_limite) return false;
    return new Date(t.date_limite) < new Date() && t.statut !== 'termine';
  });

  const isCheckedIn = todayPresence?.heure_entree && !todayPresence?.heure_sortie;
  const isTeleworking = todayTeletravail?.statut === 'connecte';
  const checkInTime = todayPresence?.heure_entree 
    ? new Date(todayPresence.heure_entree).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleCheckIn = async () => {
    try {
      await recordPresence.mutateAsync({ 
        type: 'entree',
        appareil: navigator.userAgent,
        localisation: 'Bureau'
      });
      toast.success('Entrée enregistrée avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du pointage');
    }
  };

  const handleCheckOut = async () => {
    try {
      await recordPresence.mutateAsync({ type: 'sortie' });
      toast.success('Sortie enregistrée avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du pointage');
    }
  };

  const handleTeleworkCheckIn = async () => {
    try {
      await recordTeletravail.mutateAsync({ action: 'check_in' });
      toast.success('Session télétravail démarrée');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

  const handleTeleworkCheckOut = async () => {
    try {
      await recordTeletravail.mutateAsync({ action: 'check_out' });
      toast.success('Session télétravail terminée');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la fermeture');
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await updateTache.mutateAsync({ id: taskId, statut: 'en_cours' });
      toast.success('Tâche démarrée');
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTache.mutateAsync({ 
        id: taskId, 
        statut: 'termine', 
        progression: 100,
        date_fin: new Date().toISOString().split('T')[0]
      });
      toast.success('Tâche terminée');
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    }
  };

  const priorityColors = {
    faible: 'bg-gray-100 text-gray-700',
    moyen: 'bg-blue-100 text-blue-700',
    eleve: 'bg-orange-100 text-orange-700',
    urgente: 'bg-red-100 text-red-700',
  };

  const priorityLabels = {
    faible: 'Faible',
    moyen: 'Moyen',
    eleve: 'Élevé',
    urgente: 'Urgent',
  };

  if (loadingPresence || loadingTasks) {
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
          <h1 className="page-title">SIGC-CSN - Mon Espace</h1>
          <p className="page-description">
            Bonjour {profile?.prenom}, gérez votre présence et vos tâches
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ListTodo className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Tâches en cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueTasks.length}</p>
                  <p className="text-xs text-muted-foreground">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {myTasks.filter(t => t.statut === 'termine').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/10 to-info/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {format(new Date(), 'dd', { locale: fr })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(), 'MMMM', { locale: fr })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Presence Section */}
          <div className="space-y-6">
            {/* Check-in Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  Pointage Bureau
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className={cn(
                    "w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center",
                    isCheckedIn ? "bg-success/10" : "bg-muted"
                  )}>
                    {isCheckedIn ? (
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    ) : (
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium">
                    {isCheckedIn ? "Vous êtes présent" : "Non pointé"}
                  </p>
                  {checkInTime && isCheckedIn && (
                    <p className="text-sm text-muted-foreground">
                      Arrivée à {checkInTime}
                    </p>
                  )}
                </div>

                {!isCheckedIn ? (
                  <Button 
                    className="w-full" 
                    variant="success" 
                    onClick={handleCheckIn}
                    disabled={recordPresence.isPending}
                  >
                    {recordPresence.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4 mr-2" />
                    )}
                    Pointer l'arrivée
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant="destructive" 
                    onClick={handleCheckOut}
                    disabled={recordPresence.isPending}
                  >
                    {recordPresence.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    Pointer le départ
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Telework Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isTeleworking ? "bg-success animate-pulse" : "bg-muted-foreground"
                  )} />
                  Télétravail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {isTeleworking 
                      ? "Session en cours" 
                      : "Démarrez une session de télétravail"}
                  </p>
                </div>

                {!isTeleworking ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleTeleworkCheckIn}
                    disabled={recordTeletravail.isPending}
                  >
                    {recordTeletravail.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Démarrer télétravail
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleTeleworkCheckOut}
                    disabled={recordTeletravail.isPending}
                  >
                    {recordTeletravail.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4 mr-2" />
                    )}
                    Terminer session
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tasks Section */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  Mes Tâches
                </CardTitle>
                <CardDescription>
                  Tâches assignées par votre chef de bureau
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Aucune tâche en attente</p>
                    <p className="text-sm text-muted-foreground/70">
                      Vous êtes à jour !
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {pendingTasks.map((task) => {
                      const isOverdue = task.date_limite && new Date(task.date_limite) < new Date();
                      
                      return (
                        <div 
                          key={task.id}
                          className={cn(
                            "p-4 rounded-lg border transition-all hover:shadow-md",
                            isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{task.titre}</h4>
                                <Badge className={cn("text-xs", priorityColors[task.priorite])}>
                                  {priorityLabels[task.priorite]}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {task.date_limite && (
                                  <span className={cn(
                                    "flex items-center gap-1",
                                    isOverdue && "text-destructive font-medium"
                                  )}>
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(task.date_limite), 'dd MMM yyyy', { locale: fr })}
                                  </span>
                                )}
                                {task.creator_profile && (
                                  <span>
                                    Par: {task.creator_profile.prenom} {task.creator_profile.nom}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              {task.statut === 'a_faire' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleStartTask(task.id)}
                                  disabled={updateTache.isPending}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Démarrer
                                </Button>
                              )}
                              {task.statut === 'en_cours' && (
                                <Button 
                                  size="sm" 
                                  variant="success"
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={updateTache.isPending}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Terminer
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progression</span>
                              <span>{task.progression}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${task.progression}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AgentDashboard;
