import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardData {
  overview: {
    totalMembers: number;
    presents: number;
    teletravail: number;
    absents: number;
  };
  tasks: {
    total: number;
    a_faire: number;
    en_cours: number;
    terminees: number;
    en_retard: number;
    urgentes: number;
  };
  topPerformers: Array<{
    id: string;
    nom: string;
    prenom: string;
    service: string;
    taches_terminees: number;
  }>;
  departments: Array<{
    service: string;
    membres: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
  }>;
}

export const useDashboardData = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async (): Promise<DashboardData> => {
      const { data, error } = await supabase.functions.invoke('dashboard-data', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      return data.data;
    },
    enabled: !!session,
    refetchInterval: 60000, // Refresh every minute
  });
};

export interface Profile {
  id: string;
  auth_id: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  email: string;
  telephone: string | null;
  fonction: string | null;
  service: string | null;
  statut: 'actif' | 'suspendu';
  photo_url: string | null;
  created_at: string;
}

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nom');

      if (error) throw error;
      return data as Profile[];
    },
  });
};

export const useProfile = (id: string) => {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!id,
  });
};

export interface Tache {
  id: string;
  titre: string;
  description: string | null;
  priorite: 'faible' | 'moyen' | 'eleve' | 'urgente';
  statut: 'a_faire' | 'en_cours' | 'en_pause' | 'termine';
  created_by: string | null;
  assigned_to: string | null;
  date_limite: string | null;
  date_debut: string | null;
  date_fin: string | null;
  progression: number;
  documents_lies: string[] | null;
  created_at: string;
  assigned_profile?: Profile;
  creator_profile?: Profile;
}

export const useTaches = () => {
  return useQuery({
    queryKey: ['taches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taches')
        .select(`
          *,
          assigned_profile:profiles!taches_assigned_to_fkey(*),
          creator_profile:profiles!taches_created_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Tache[];
    },
  });
};

export const useCreateTache = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (tache: {
      titre: string;
      description?: string | null;
      priorite?: 'faible' | 'moyen' | 'eleve' | 'urgente';
      assigned_to?: string | null;
      date_limite?: string | null;
      documents_lies?: string[] | null;
    }) => {
      const { data, error } = await supabase
        .from('taches')
        .insert({
          titre: tache.titre,
          description: tache.description,
          priorite: tache.priorite || 'moyen',
          assigned_to: tache.assigned_to,
          date_limite: tache.date_limite,
          documents_lies: tache.documents_lies,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });
};

export const useUpdateTache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tache> & { id: string }) => {
      const { data, error } = await supabase
        .from('taches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });
};

export interface Presence {
  id: string;
  user_id: string;
  date: string;
  heure_entree: string | null;
  heure_sortie: string | null;
  type: 'presentiel' | 'teletravail';
  appareil: string | null;
  localisation_generale: string | null;
  justification_retard: string | null;
  profile?: Profile;
}

export const usePresences = (date?: string) => {
  return useQuery({
    queryKey: ['presences', date],
    queryFn: async () => {
      let query = supabase
        .from('presences')
        .select('*, profile:profiles(*)')
        .order('heure_entree', { ascending: false });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Presence[];
    },
  });
};

export const useTodayPresence = () => {
  const { profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-presence', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('presences')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as Presence | null;
    },
    enabled: !!profile?.id,
  });
};

export const useRecordPresence = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      type: 'entree' | 'sortie';
      appareil?: string;
      localisation?: string;
      justification_retard?: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('record-presence', {
        body: data,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.message || result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presences'] });
      queryClient.invalidateQueries({ queryKey: ['today-presence'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });
};

export interface TeletravailLog {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  statut: 'connecte' | 'pause' | 'hors_ligne';
  activite_declaree: string | null;
  localisation_generale: string | null;
  duree_active_minutes: number;
  profile?: Profile;
}

export const useTodayTeletravail = () => {
  const { profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-teletravail', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('teletravail_logs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as TeletravailLog | null;
    },
    enabled: !!profile?.id,
  });
};

export const useRecordTeletravail = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      action: 'check_in' | 'check_out' | 'pause' | 'resume';
      activite?: string;
      localisation?: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('record-telework', {
        body: data,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.message || result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teletravail_logs'] });
      queryClient.invalidateQueries({ queryKey: ['today-teletravail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });
};

export interface Competence {
  id: string;
  user_id: string;
  competence: string;
  niveau: number;
  justification: string | null;
  date_evaluation: string;
}

export const useCompetences = (userId?: string) => {
  return useQuery({
    queryKey: ['competences', userId],
    queryFn: async () => {
      let query = supabase.from('competences').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Competence[];
    },
  });
};
