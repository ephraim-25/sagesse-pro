import { UserPlus, ClipboardCheck, FileText, Settings, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    icon: ClipboardCheck,
    title: "Check-in effectué",
    description: "Marie Dupont a pointé à 08:45",
    time: "Il y a 5 min",
    color: "text-success bg-success/10",
  },
  {
    id: 2,
    icon: FileText,
    title: "Tâche terminée",
    description: "Rapport mensuel finalisé par Jean Martin",
    time: "Il y a 15 min",
    color: "text-info bg-info/10",
  },
  {
    id: 3,
    icon: UserPlus,
    title: "Nouveau membre",
    description: "Sophie Bernard ajoutée au département Recherche",
    time: "Il y a 1h",
    color: "text-primary bg-primary/10",
  },
  {
    id: 4,
    icon: Settings,
    title: "Paramètres modifiés",
    description: "Politique de télétravail mise à jour",
    time: "Il y a 2h",
    color: "text-warning bg-warning/10",
  },
  {
    id: 5,
    icon: Clock,
    title: "Check-out enregistré",
    description: "Pierre Durand - départ à 17:30",
    time: "Hier",
    color: "text-muted-foreground bg-muted",
  },
];

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Activité Récente</h3>
          <p className="text-sm text-muted-foreground">Dernières actions</p>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              activity.color
            )}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{activity.time}</p>
            </div>
            {index < activities.length - 1 && (
              <div className="absolute left-[1.125rem] top-10 w-px h-8 bg-border" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
