import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  Laptop, 
  Clock, 
  Play,
  Pause,
  Square,
  Globe,
  Wifi,
  WifiOff,
  Coffee
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type WorkStatus = "offline" | "working" | "break" | "meeting";

const RemoteWork = () => {
  const [status, setStatus] = useState<WorkStatus>("offline");
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [workDuration, setWorkDuration] = useState(0);
  const { toast } = useToast();

  const handleStartWork = () => {
    setStatus("working");
    setSessionStart(new Date());
    toast({
      title: "Session démarrée",
      description: "Bon travail !",
    });
  };

  const handleTakeBreak = () => {
    setStatus("break");
    toast({
      title: "Pause",
      description: "Profitez de votre pause !",
    });
  };

  const handleEndWork = () => {
    setStatus("offline");
    setSessionStart(null);
    toast({
      title: "Session terminée",
      description: "À bientôt !",
    });
  };

  const statusConfig = {
    offline: { label: "Hors ligne", color: "bg-muted text-muted-foreground", icon: WifiOff },
    working: { label: "En travail", color: "bg-success text-success-foreground", icon: Wifi },
    break: { label: "En pause", color: "bg-warning text-warning-foreground", icon: Coffee },
    meeting: { label: "En réunion", color: "bg-info text-info-foreground", icon: Laptop },
  };

  const todayTasks = [
    { id: 1, title: "Révision du rapport Q4", duration: "2h 30min", completed: true },
    { id: 2, title: "Appel avec l'équipe IT", duration: "45min", completed: true },
    { id: 3, title: "Analyse des données", duration: "1h 15min", completed: false },
    { id: 4, title: "Préparation présentation", duration: "—", completed: false },
  ];

  const weekStats = {
    totalHours: 32,
    avgPerDay: "6h 24min",
    tasksCompleted: 12,
    productivity: 94,
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Télétravail</h1>
          <p className="page-description">Gérez votre session de travail à distance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Session Card */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl p-8 shadow-soft border border-border/50">
              {/* Status Display */}
              <div className="text-center mb-8">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4",
                  statusConfig[status].color
                )}>
                  {(() => {
                    const StatusIcon = statusConfig[status].icon;
                    return <StatusIcon className="w-4 h-4" />;
                  })()}
                  <span className="font-medium">{statusConfig[status].label}</span>
                </div>

                <div className="mb-6">
                  <p className="text-5xl font-bold text-foreground mb-2">
                    {sessionStart ? (
                      new Date(Date.now() - sessionStart.getTime())
                        .toISOString()
                        .substr(11, 8)
                    ) : (
                      "00:00:00"
                    )}
                  </p>
                  <p className="text-muted-foreground">Durée de la session</p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {status === "offline" && (
                  <Button size="lg" variant="success" onClick={handleStartWork}>
                    <Play className="w-5 h-5 mr-2" />
                    Démarrer la session
                  </Button>
                )}

                {status === "working" && (
                  <>
                    <Button size="lg" variant="warning" onClick={handleTakeBreak}>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </Button>
                    <Button size="lg" variant="destructive" onClick={handleEndWork}>
                      <Square className="w-5 h-5 mr-2" />
                      Terminer
                    </Button>
                  </>
                )}

                {status === "break" && (
                  <>
                    <Button size="lg" variant="success" onClick={() => setStatus("working")}>
                      <Play className="w-5 h-5 mr-2" />
                      Reprendre
                    </Button>
                    <Button size="lg" variant="destructive" onClick={handleEndWork}>
                      <Square className="w-5 h-5 mr-2" />
                      Terminer
                    </Button>
                  </>
                )}
              </div>

              {/* Location */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Globe className="w-5 h-5" />
                  <span>Localisation : France 🇫🇷</span>
                </div>
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50 mt-6">
              <h3 className="font-semibold text-foreground mb-4">Tâches du Jour</h3>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      task.completed ? "bg-success/5" : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.completed ? "bg-success" : "bg-muted-foreground"
                      )} />
                      <span className={cn(
                        "font-medium",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{task.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Week Stats */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Cette Semaine
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Heures totales</span>
                  <span className="font-bold text-foreground">{weekStats.totalHours}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Moyenne/jour</span>
                  <span className="font-bold text-foreground">{weekStats.avgPerDay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tâches terminées</span>
                  <span className="font-bold text-foreground">{weekStats.tasksCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Productivité</span>
                  <span className="font-bold text-success">{weekStats.productivity}%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Actions Rapides</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Laptop className="w-4 h-4 mr-2" />
                  Rejoindre une réunion
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Voir mon historique
                </Button>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-info/5 rounded-xl p-6 border border-info/20">
              <h3 className="font-semibold text-foreground mb-3">Rappel</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Minimum 6h de travail par jour</li>
                <li>• Pauses de 15min max toutes les 2h</li>
                <li>• Restez joignable pendant les heures de bureau</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default RemoteWork;
