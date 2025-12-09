import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaches } from "@/hooks/useData";

export function TasksOverview() {
  const { data: tasks, isLoading } = useTaches();

  const isOverdue = (task: any) => {
    if (!task.date_limite || task.statut === 'termine') return false;
    return new Date(task.date_limite) < new Date();
  };

  const recentTasks = tasks
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5) || [];

  const getStatusIcon = (task: any) => {
    if (isOverdue(task)) return { icon: AlertTriangle, color: "text-destructive" };
    switch (task.statut) {
      case 'termine': return { icon: CheckCircle2, color: "text-success" };
      case 'en_cours': return { icon: Clock, color: "text-info" };
      default: return { icon: ListTodo, color: "text-muted-foreground" };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Tâches Récentes</h3>
          <p className="text-sm text-muted-foreground">{tasks?.length || 0} tâches</p>
        </div>
      </div>

      <div className="space-y-3">
        {recentTasks.length > 0 ? recentTasks.map((task) => {
          const status = getStatusIcon(task);
          const StatusIcon = status.icon;
          return (
            <div 
              key={task.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <StatusIcon className={cn("w-5 h-5 flex-shrink-0", status.color)} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  task.statut === "termine" && "line-through text-muted-foreground"
                )}>
                  {task.titre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.assigned_profile ? `${task.assigned_profile.prenom} ${task.assigned_profile.nom}` : 'Non assigné'}
                </p>
              </div>
              {task.date_limite && (
                <span className="text-xs text-muted-foreground">
                  {new Date(task.date_limite).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          );
        }) : (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune tâche</p>
        )}
      </div>
    </div>
  );
}
