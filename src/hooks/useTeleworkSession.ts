import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type TeleworkStatus = 'connecte' | 'pause' | 'reunion' | 'hors_ligne';

interface TeleworkSession {
  id: string;
  check_in: string;
  check_out: string | null;
  current_status: TeleworkStatus;
  active_seconds: number;
  activities: Array<{
    timestamp: string;
    description: string;
    type: string;
  }>;
  country: string | null;
  device: string | null;
}

interface UseTeleworkSessionReturn {
  session: TeleworkSession | null;
  isLoading: boolean;
  isCheckedIn: boolean;
  status: TeleworkStatus;
  elapsedSeconds: number;
  checkin: (activity?: string) => Promise<void>;
  checkout: (finalActivity?: string) => Promise<void>;
  updateStatus: (status: TeleworkStatus, activity?: string) => Promise<void>;
  addActivity: (description: string) => Promise<void>;
}

const HEARTBEAT_INTERVAL = 60000; // 60 seconds
const LOCAL_STORAGE_KEY = 'sigc_telework_pending_heartbeats';

export function useTeleworkSession(): UseTeleworkSessionReturn {
  const { session: authSession, profile } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<TeleworkSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());

  // Load active session on mount
  useEffect(() => {
    if (profile?.id) {
      loadActiveSession();
    } else {
      setIsLoading(false);
    }
  }, [profile?.id]);

  // Setup heartbeat and elapsed timer when session is active
  useEffect(() => {
    if (session && !session.check_out) {
      // Calculate initial elapsed time
      const checkInTime = new Date(session.check_in).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - checkInTime) / 1000));

      // Start elapsed timer
      elapsedRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      // Start heartbeat
      heartbeatRef.current = setInterval(() => {
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL);

      // Sync pending heartbeats from localStorage
      syncPendingHeartbeats();

      return () => {
        if (elapsedRef.current) clearInterval(elapsedRef.current);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      };
    }
  }, [session?.id, session?.check_out]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`telework:user:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telework_sessions',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setSession(payload.new as TeleworkSession);
            if (payload.new.check_out) {
              // Session ended (possibly force checkout)
              toast({
                title: 'Session terminée',
                description: payload.new.forced_checkout 
                  ? 'Votre session a été terminée par un superviseur.'
                  : 'Votre session de télétravail est terminée.',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadActiveSession = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('telework_sessions')
        .select('*')
        .eq('user_id', profile!.id)
        .gte('check_in', `${today}T00:00:00`)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSession({
          ...data,
          activities: (data.activities as unknown as TeleworkSession['activities']) || []
        });
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendHeartbeat = async () => {
    if (!session || session.check_out) return;

    const secondsSinceLastHeartbeat = Math.floor((Date.now() - lastHeartbeatRef.current) / 1000);
    lastHeartbeatRef.current = Date.now();

    try {
      const { error } = await supabase.functions.invoke('telework-heartbeat', {
        body: {
          session_id: session.id,
          active_seconds: secondsSinceLastHeartbeat,
          current_status: session.current_status
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Heartbeat failed, storing locally:', error);
      // Store failed heartbeat for later sync
      storePendingHeartbeat(session.id, secondsSinceLastHeartbeat);
    }
  };

  const storePendingHeartbeat = (sessionId: string, seconds: number) => {
    try {
      const pending = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      pending.push({ sessionId, seconds, timestamp: Date.now() });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pending));
    } catch {
      // Ignore localStorage errors
    }
  };

  const syncPendingHeartbeats = async () => {
    try {
      const pending = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      if (pending.length === 0) return;

      // Aggregate seconds per session
      const aggregated: Record<string, number> = {};
      for (const hb of pending) {
        aggregated[hb.sessionId] = (aggregated[hb.sessionId] || 0) + hb.seconds;
      }

      // Send aggregated heartbeats
      for (const [sessionId, totalSeconds] of Object.entries(aggregated)) {
        await supabase.functions.invoke('telework-heartbeat', {
          body: { session_id: sessionId, active_seconds: totalSeconds }
        });
      }

      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to sync pending heartbeats:', error);
    }
  };

  const checkin = useCallback(async (activity?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telework-checkin', {
        body: { activity }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Reload session
      await loadActiveSession();
      lastHeartbeatRef.current = Date.now();

      toast({
        title: 'Session démarrée',
        description: 'Votre session de télétravail a commencé. Bon travail !',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du check-in';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  const checkout = useCallback(async (finalActivity?: string) => {
    if (!session) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telework-checkout', {
        body: { session_id: session.id, final_activity: finalActivity }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSession(null);
      setElapsedSeconds(0);

      toast({
        title: 'Session terminée',
        description: `Durée: ${data.session.duration_formatted}. À bientôt !`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du checkout';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [session?.id]);

  const updateStatus = useCallback(async (newStatus: TeleworkStatus, activity?: string) => {
    if (!session) return;

    try {
      const { error } = await supabase.functions.invoke('telework-heartbeat', {
        body: {
          session_id: session.id,
          current_status: newStatus,
          activity
        }
      });

      if (error) throw error;

      setSession(prev => prev ? { ...prev, current_status: newStatus } : null);

      const statusLabels: Record<TeleworkStatus, string> = {
        connecte: 'En travail',
        pause: 'En pause',
        reunion: 'En réunion',
        hors_ligne: 'Hors ligne'
      };

      toast({
        title: 'Statut mis à jour',
        description: statusLabels[newStatus],
      });
    } catch (error) {
      console.error('Status update failed:', error);
    }
  }, [session?.id]);

  const addActivity = useCallback(async (description: string) => {
    if (!session || !description.trim()) return;

    try {
      await supabase.functions.invoke('telework-heartbeat', {
        body: {
          session_id: session.id,
          activity: description
        }
      });

      toast({
        title: 'Activité enregistrée',
        description: 'Votre activité a été ajoutée à la session.',
      });
    } catch (error) {
      console.error('Add activity failed:', error);
    }
  }, [session?.id]);

  return {
    session,
    isLoading,
    isCheckedIn: !!session && !session.check_out,
    status: session?.current_status || 'hors_ligne',
    elapsedSeconds,
    checkin,
    checkout,
    updateStatus,
    addActivity
  };
}
