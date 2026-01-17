import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  UserPlus, 
  FileText, 
  LogIn, 
  LogOut, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  type: 'checkin' | 'checkout' | 'task_completed' | 'report_submitted' | 'user_connected' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    nom: string;
    prenom: string;
  };
  department?: string;
  variant: 'success' | 'info' | 'warning' | 'error' | 'neutral';
}

const getEventIcon = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'checkin':
      return LogIn;
    case 'checkout':
      return LogOut;
    case 'task_completed':
      return CheckCircle2;
    case 'report_submitted':
      return FileText;
    case 'user_connected':
      return UserPlus;
    case 'alert':
      return AlertTriangle;
    default:
      return Clock;
  }
};

const getVariantStyles = (variant: TimelineEvent['variant']) => {
  switch (variant) {
    case 'success':
      return { bg: 'bg-success/10', text: 'text-success', line: 'bg-success' };
    case 'info':
      return { bg: 'bg-info/10', text: 'text-info', line: 'bg-info' };
    case 'warning':
      return { bg: 'bg-warning/10', text: 'text-warning', line: 'bg-warning' };
    case 'error':
      return { bg: 'bg-destructive/10', text: 'text-destructive', line: 'bg-destructive' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground', line: 'bg-border' };
  }
};

export function ActivityTimeline() {
  // Fetch recent activity from multiple sources
  const { data: recentSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['timeline-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telework_sessions')
        .select(`
          id,
          check_in,
          check_out,
          current_status,
          profiles!telework_sessions_user_id_fkey (
            nom,
            prenom,
            service
          )
        `)
        .order('check_in', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recentTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['timeline-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taches')
        .select(`
          id,
          titre,
          statut,
          updated_at,
          assigned_to
        `)
        .eq('statut', 'termine')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Fetch profiles separately to avoid relationship issues
      if (data && data.length > 0) {
        const assignedToIds = data.map(t => t.assigned_to).filter(Boolean);
        if (assignedToIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nom, prenom')
            .in('id', assignedToIds);
          
          // Attach profiles to tasks
          return data.map(task => ({
            ...task,
            profiles: profiles?.find(p => p.id === task.assigned_to) || null
          }));
        }
      }
      
      return data?.map(task => ({ ...task, profiles: null })) || [];
    },
    refetchInterval: 60000,
  });

  // Transform data into timeline events
  const events: TimelineEvent[] = [];

  if (recentSessions) {
    recentSessions.forEach((session) => {
      const profile = session.profiles as { nom: string; prenom: string; service?: string } | null;
      
      // Check-in event
      if (session.check_in) {
        events.push({
          id: `checkin-${session.id}`,
          type: 'checkin',
          title: 'Connexion télétravail',
          description: `${profile?.prenom || ''} ${profile?.nom || 'Agent'} a démarré sa session`,
          timestamp: session.check_in,
          user: profile ? { nom: profile.nom, prenom: profile.prenom } : undefined,
          department: profile?.service || undefined,
          variant: 'success',
        });
      }
      
      // Check-out event
      if (session.check_out) {
        events.push({
          id: `checkout-${session.id}`,
          type: 'checkout',
          title: 'Fin de session',
          description: `${profile?.prenom || ''} ${profile?.nom || 'Agent'} a terminé sa session`,
          timestamp: session.check_out,
          user: profile ? { nom: profile.nom, prenom: profile.prenom } : undefined,
          department: profile?.service || undefined,
          variant: 'neutral',
        });
      }
    });
  }

  if (recentTasks) {
    recentTasks.forEach((task) => {
      // Handle the profiles data - may be null or have different shapes
      let profileData: { nom: string; prenom: string } | null = null;
      
      if (task.profiles && typeof task.profiles === 'object' && !Array.isArray(task.profiles)) {
        const prof = task.profiles as Record<string, unknown>;
        if (typeof prof.nom === 'string' && typeof prof.prenom === 'string') {
          profileData = { nom: prof.nom, prenom: prof.prenom };
        }
      }
      
      events.push({
        id: `task-${task.id}`,
        type: 'task_completed',
        title: 'Tâche terminée',
        description: `"${task.titre}" complétée${profileData ? ` par ${profileData.prenom} ${profileData.nom}` : ''}`,
        timestamp: task.updated_at || '',
        user: profileData || undefined,
        variant: 'info',
      });
    });
  }

  // Sort all events by timestamp (most recent first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const isLoading = loadingSessions || loadingTasks;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Activité en temps réel</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Activité en temps réel</h3>
            <p className="text-xs text-muted-foreground">Mise à jour automatique</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-xs text-muted-foreground">En direct</span>
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune activité récente</p>
          </div>
        ) : (
          events.slice(0, 15).map((event, index) => {
            const Icon = getEventIcon(event.type);
            const styles = getVariantStyles(event.variant);
            const isLast = index === Math.min(events.length, 15) - 1;

            return (
              <div key={event.id} className="relative flex gap-3 pb-4">
                {/* Timeline line */}
                {!isLast && (
                  <div className={cn(
                    'absolute left-4 top-8 w-0.5 h-[calc(100%-8px)]',
                    styles.line,
                    'opacity-30'
                  )} />
                )}
                
                {/* Icon */}
                <div className={cn(
                  'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  styles.bg
                )}>
                  <Icon className={cn('w-4 h-4', styles.text)} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(event.timestamp), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </span>
                    {event.department && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground/70">{event.department}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
