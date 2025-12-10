import { ClipboardCheck, FileText, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresences, useTaches } from "@/hooks/useData";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Activity {
  id: string;
  icon: typeof ClipboardCheck;
  title: string;
  description: string;
  time: string;
  color: string;
}

export function RecentActivity() {
  const today = new Date().toISOString().split('T')[0];
  const { data: presences, isLoading: loadingPresences } = usePresences(today);
  const { data: tasks, isLoading: loadingTasks } = useTaches();

  const isLoading = loadingPresences || loadingTasks;

  // Build activities from real data
  const activities: Activity[] = [];

  // Add recent check-ins
  if (presences) {
    presences.slice(0, 3).forEach((presence) => {
      if (presence.heure_entree) {
        activities.push({
          id: `checkin-${presence.id}`,
          icon: ClipboardCheck,
          title: "Check-in effectué",
          description: `${presence.profile?.prenom || ''} ${presence.profile?.nom || ''} a pointé`,
          time: formatDistanceToNow(new Date(presence.heure_entree), { addSuffix: true, locale: fr }),
          color: "text-success bg-success/10",
        });
      }
      if (presence.heure_sortie) {
        activities.push({
          id: `checkout-${presence.id}`,
          icon: Clock,
          title: "Check-out enregistré",
          description: `${presence.profile?.prenom || ''} ${presence.profile?.nom || ''} - départ`,
          time: formatDistanceToNow(new Date(presence.heure_sortie), { addSuffix: true, locale: fr }),
          color: "text-muted-foreground bg-muted",
        });
      }
    });
  }

  // Add recent completed tasks
  if (tasks) {
    tasks
      .filter((t) => t.statut === 'termine' && t.date_fin)
      .slice(0, 2)
      .forEach((task) => {
        activities.push({
          id: `task-${task.id}`,
          icon: FileText,
          title: "Tâche terminée",
          description: `${task.titre} - ${task.assigned_profile?.prenom || ''} ${task.assigned_profile?.nom || ''}`,
          time: formatDistanceToNow(new Date(task.date_fin!), { addSuffix: true, locale: fr }),
          color: "text-info bg-info/10",
        });
      });
  }

  // Sort by time and limit
  const sortedActivities = activities
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Activité Récente</h3>
          <p className="text-sm text-muted-foreground">Dernières actions</p>
        </div>
      </div>

      <div className="space-y-4">
        {sortedActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune activité récente
          </p>
        ) : (
          sortedActivities.map((activity) => (
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
