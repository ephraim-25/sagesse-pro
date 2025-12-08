import { CheckCircle2, Clock, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const tasks = [
  { 
    id: 1, 
    title: "Finaliser le rapport annuel", 
    assignee: "Marie Dupont",
    priority: "high",
    status: "in_progress",
    dueDate: "10 Dec"
  },
  { 
    id: 2, 
    title: "Révision des politiques de recherche", 
    assignee: "Jean Martin",
    priority: "medium",
    status: "pending",
    dueDate: "12 Dec"
  },
  { 
    id: 3, 
    title: "Organiser la réunion trimestrielle", 
    assignee: "Sophie Bernard",
    priority: "high",
    status: "completed",
    dueDate: "08 Dec"
  },
  { 
    id: 4, 
    title: "Mettre à jour les données budgétaires", 
    assignee: "Pierre Durand",
    priority: "low",
    status: "pending",
    dueDate: "15 Dec"
  },
];

const priorityConfig = {
  high: { color: "text-destructive", bg: "bg-destructive/10", label: "Haute" },
  medium: { color: "text-warning", bg: "bg-warning/10", label: "Moyenne" },
  low: { color: "text-muted-foreground", bg: "bg-muted", label: "Basse" },
};

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-success" },
  in_progress: { icon: Clock, color: "text-info" },
  pending: { icon: Circle, color: "text-muted-foreground" },
  overdue: { icon: AlertTriangle, color: "text-destructive" },
};

export function TasksOverview() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Tâches Récentes</h3>
          <p className="text-sm text-muted-foreground">4 tâches actives</p>
        </div>
        <button className="text-sm text-primary hover:underline">Voir tout</button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const StatusIcon = statusConfig[task.status as keyof typeof statusConfig].icon;
          const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
          const status = statusConfig[task.status as keyof typeof statusConfig];

          return (
            <div 
              key={task.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <StatusIcon className={cn("w-5 h-5 flex-shrink-0", status.color)} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  task.status === "completed" && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">{task.assignee}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  priority.bg, priority.color
                )}>
                  {priority.label}
                </span>
                <span className="text-xs text-muted-foreground">{task.dueDate}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
