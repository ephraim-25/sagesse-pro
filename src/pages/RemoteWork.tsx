import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Laptop, 
  Clock, 
  Play,
  Pause,
  Square,
  Globe,
  Wifi,
  WifiOff,
  Coffee,
  Users,
  MessageSquare,
  History,
  Plus,
  Loader2,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeleworkSession, TeleworkStatus } from "@/hooks/useTeleworkSession";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const RemoteWork = () => {
  const { profile, isChefService, isPresident, isAdmin } = useAuth();
  const {
    session,
    isLoading,
    isCheckedIn,
    status,
    elapsedSeconds,
    checkin,
    checkout,
    updateStatus,
    addActivity
  } = useTeleworkSession();

  const [activityInput, setActivityInput] = useState("");
  const [showTeamView, setShowTeamView] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const canManageTeam = isChefService || isPresident || isAdmin;

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Load team members for managers
  useEffect(() => {
    if (showTeamView && canManageTeam) {
      loadTeamMembers();
    }
  }, [showTeamView, canManageTeam]);

  const loadTeamMembers = async () => {
    if (!profile?.id) return;
    setLoadingTeam(true);
    try {
      // Get team members (those who have this user as manager)
      const { data: members } = await supabase
        .from('profiles')
        .select('id, nom, prenom, photo_url')
        .eq('manager_id', profile.id)
        .neq('id', profile.id);

      if (members) {
        // Get active sessions for team members
        const memberIds = members.map(m => m.id);
        const { data: sessions } = await supabase
          .from('telework_sessions')
          .select('*')
          .in('user_id', memberIds)
          .is('check_out', null);

        setTeamMembers(members.map(m => ({
          ...m,
          last_status: null,
          last_activity_at: null,
          activeSession: sessions?.find(s => s.user_id === m.id) ? {
            id: sessions.find(s => s.user_id === m.id)!.id,
            check_in: sessions.find(s => s.user_id === m.id)!.check_in,
            current_status: sessions.find(s => s.user_id === m.id)!.current_status as TeleworkStatus,
            active_seconds: sessions.find(s => s.user_id === m.id)!.active_seconds || 0
          } : null
        })));
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Subscribe to team updates
  useEffect(() => {
    if (!showTeamView || !canManageTeam) return;

    const channel = supabase
      .channel('telework:team')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telework_sessions'
        },
        () => {
          loadTeamMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showTeamView, canManageTeam]);

  const statusConfig: Record<TeleworkStatus, { label: string; color: string; icon: typeof Wifi }> = {
    hors_ligne: { label: "Hors ligne", color: "bg-muted text-muted-foreground", icon: WifiOff },
    connecte: { label: "En travail", color: "bg-success text-success-foreground", icon: Wifi },
    pause: { label: "En pause", color: "bg-warning text-warning-foreground", icon: Coffee },
    reunion: { label: "En réunion", color: "bg-info text-info-foreground", icon: Video },
  };

  const handleCheckin = async () => {
    await checkin(activityInput || undefined);
    setActivityInput("");
  };

  const handleCheckout = async () => {
    await checkout(activityInput || undefined);
    setActivityInput("");
  };

  const handleAddActivity = async () => {
    if (activityInput.trim()) {
      await addActivity(activityInput);
      setActivityInput("");
    }
  };

  const handleForceCheckout = async (sessionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('telework-force-checkout', {
        body: { session_id: sessionId, reason: 'Checkout forcé par le superviseur' }
      });
      if (!error) {
        loadTeamMembers();
      }
    } catch (error) {
      console.error('Force checkout error:', error);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header flex justify-between items-start">
          <div>
            <h1 className="page-title">Télétravail</h1>
            <p className="page-description">Gérez votre session de travail à distance</p>
          </div>
          {canManageTeam && (
            <Button
              variant={showTeamView ? "default" : "outline"}
              onClick={() => setShowTeamView(!showTeamView)}
            >
              <Users className="w-4 h-4 mr-2" />
              {showTeamView ? "Ma session" : "Mon équipe"}
            </Button>
          )}
        </div>

        {showTeamView && canManageTeam ? (
          // Team View
          <TeamView 
            members={teamMembers} 
            loading={loadingTeam}
            onForceCheckout={handleForceCheckout}
            statusConfig={statusConfig}
          />
        ) : (
          // Personal Session View
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
                    <p className="text-5xl font-bold text-foreground mb-2 font-mono">
                      {formatTime(elapsedSeconds)}
                    </p>
                    <p className="text-muted-foreground">Durée de la session</p>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {!isCheckedIn ? (
                    <Button 
                      size="lg" 
                      className="bg-success hover:bg-success/90 text-white"
                      onClick={handleCheckin}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5 mr-2" />
                      )}
                      Démarrer la session
                    </Button>
                  ) : (
                    <>
                      {status === 'connecte' && (
                        <>
                          <Button 
                            size="lg" 
                            variant="outline"
                            className="border-warning text-warning hover:bg-warning/10"
                            onClick={() => updateStatus('pause')}
                            disabled={isLoading}
                          >
                            <Pause className="w-5 h-5 mr-2" />
                            Pause
                          </Button>
                          <Button 
                            size="lg" 
                            variant="outline"
                            className="border-info text-info hover:bg-info/10"
                            onClick={() => updateStatus('reunion')}
                            disabled={isLoading}
                          >
                            <Video className="w-5 h-5 mr-2" />
                            Réunion
                          </Button>
                        </>
                      )}
                      {(status === 'pause' || status === 'reunion') && (
                        <Button 
                          size="lg" 
                          className="bg-success hover:bg-success/90 text-white"
                          onClick={() => updateStatus('connecte')}
                          disabled={isLoading}
                        >
                          <Play className="w-5 h-5 mr-2" />
                          Reprendre
                        </Button>
                      )}
                      <Button 
                        size="lg" 
                        variant="destructive" 
                        onClick={handleCheckout}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <Square className="w-5 h-5 mr-2" />
                        )}
                        Terminer
                      </Button>
                    </>
                  )}
                </div>

                {/* Activity Input */}
                {isCheckedIn && (
                  <div className="border-t border-border pt-6">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Décrivez votre activité actuelle..."
                        value={activityInput}
                        onChange={(e) => setActivityInput(e.target.value)}
                        className="flex-1"
                        maxLength={200}
                      />
                      <Button onClick={handleAddActivity} disabled={!activityInput.trim()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="border-t border-border pt-6 mt-6">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Globe className="w-5 h-5" />
                    <span>Localisation : {session?.country || 'Non définie'}</span>
                  </div>
                </div>
              </div>

              {/* Session Timeline */}
              {session && session.activities && session.activities.length > 0 && (
                <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50 mt-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Timeline de la session
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {session.activities.map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div className="flex-1">
                          <p className="text-muted-foreground text-xs">
                            {new Date(activity.timestamp).toLocaleTimeString('fr-FR')}
                          </p>
                          <p className="text-foreground">{activity.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Cette Semaine
                </h3>
                <WeekStats userId={profile?.id} />
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Actions Rapides</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/history">
                      <Clock className="w-4 h-4 mr-2" />
                      Voir mon historique
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/tasks">
                      <Laptop className="w-4 h-4 mr-2" />
                      Mes tâches
                    </a>
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
                  <li>• Décrivez vos activités régulièrement</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

// Team member type
interface TeamMember {
  id: string;
  nom: string;
  prenom: string;
  photo_url: string | null;
  last_status: TeleworkStatus | null;
  last_activity_at: string | null;
  activeSession: {
    id: string;
    check_in: string;
    current_status: TeleworkStatus;
    active_seconds: number;
  } | null;
}

// Team View Component
const TeamView = ({ 
  members, 
  loading, 
  onForceCheckout,
  statusConfig 
}: { 
  members: TeamMember[];
  loading: boolean;
  onForceCheckout: (sessionId: string) => void;
  statusConfig: Record<TeleworkStatus, { label: string; color: string; icon: typeof Wifi }>;
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-card rounded-xl p-8 shadow-soft border border-border/50 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Aucun membre dans votre équipe</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Membres de l'équipe ({members.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => {
          const currentStatus = member.activeSession?.current_status || member.last_status || 'hors_ligne';
          const config = statusConfig[currentStatus];
          const StatusIcon = config.icon;

          return (
            <div 
              key={member.id}
              className="p-4 rounded-lg border border-border bg-muted/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-primary font-semibold">
                      {member.prenom[0]}{member.nom[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.prenom} {member.nom}</p>
                  <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs", config.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </div>
                </div>
              </div>
              
              {member.activeSession && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Connecté depuis {new Date(member.activeSession.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => onForceCheckout(member.activeSession!.id)}
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Forcer checkout
                    </Button>
                  </div>
                </div>
              )}
              
              {!member.activeSession && member.last_activity_at && (
                <p className="text-xs text-muted-foreground">
                  Dernière activité: {new Date(member.last_activity_at).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Week Stats Component
const WeekStats = ({ userId }: { userId?: string }) => {
  const [stats, setStats] = useState({
    totalHours: 0,
    avgPerDay: '0h 0min',
    sessionsCount: 0,
    productivity: 0
  });

  useEffect(() => {
    if (userId) {
      loadWeekStats();
    }
  }, [userId]);

  const loadWeekStats = async () => {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('telework_sessions')
        .select('active_seconds, check_in')
        .eq('user_id', userId)
        .gte('check_in', weekStart.toISOString())
        .not('check_out', 'is', null);

      if (data && data.length > 0) {
        const totalSeconds = data.reduce((sum, s) => sum + (s.active_seconds || 0), 0);
        const totalHours = Math.round(totalSeconds / 3600);
        const uniqueDays = new Set(data.map(s => s.check_in.split('T')[0])).size;
        const avgMinutes = uniqueDays > 0 ? Math.round((totalSeconds / uniqueDays) / 60) : 0;
        
        setStats({
          totalHours,
          avgPerDay: `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}min`,
          sessionsCount: data.length,
          productivity: Math.min(100, Math.round((totalHours / 40) * 100))
        });
      }
    } catch (error) {
      console.error('Error loading week stats:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Heures totales</span>
        <span className="font-bold text-foreground">{stats.totalHours}h</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Moyenne/jour</span>
        <span className="font-bold text-foreground">{stats.avgPerDay}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Sessions</span>
        <span className="font-bold text-foreground">{stats.sessionsCount}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Productivité</span>
        <span className="font-bold text-success">{stats.productivity}%</span>
      </div>
    </div>
  );
};

export default RemoteWork;
