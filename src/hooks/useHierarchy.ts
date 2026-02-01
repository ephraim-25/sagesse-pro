import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TeamMember {
  id: string;
  nom: string;
  prenom: string;
  postnom: string | null;
  email: string;
  telephone: string | null;
  fonction: string | null;
  service: string | null;
  photo_url: string | null;
  manager_id: string | null;
  team_id: string | null;
  statut: 'actif' | 'suspendu';
  grade?: {
    id: string;
    code: string;
    label: string;
    rank_order: number;
  };
}

// Get team members that report to the current user (manager)
export const useMyTeamMembers = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['my-team-members', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, nom, prenom, postnom, email, telephone, fonction, 
          service, photo_url, manager_id, team_id, statut,
          grade:grades(id, code, label, rank_order)
        `)
        .eq('manager_id', profile.id)
        .eq('statut', 'actif')
        .order('nom');

      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!profile?.id,
  });
};

// Get unassigned agents (no manager assigned)
export const useUnassignedAgents = () => {
  return useQuery({
    queryKey: ['unassigned-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, nom, prenom, postnom, email, telephone, fonction, 
          service, photo_url, manager_id, team_id, statut,
          grade:grades(id, code, label, rank_order)
        `)
        .is('manager_id', null)
        .eq('statut', 'actif')
        .order('nom');

      if (error) throw error;
      // Filter out high-level users (president, secretaire, etc.)
      return (data as TeamMember[]).filter(p => {
        const rankOrder = (p.grade as any)?.rank_order ?? 999;
        return rankOrder > 3; // Only agents below chef de division level
      });
    },
  });
};

// Assign an agent to current manager's team
export const useAssignToTeam = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!profile?.id) throw new Error('Non authentifié');

      // Use backend function to avoid granting broad UPDATE permissions on profiles
      const { error } = await (supabase as any).rpc('enroll_agent', {
        p_agent_id: agentId,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-team-members'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-agents'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};

// Remove an agent from manager's team
export const useRemoveFromTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await (supabase as any).rpc('unenroll_agent', {
        p_agent_id: agentId,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-team-members'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-agents'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};

// Get assignable members based on user's role hierarchy
export const useAssignableMembers = () => {
  const { profile, isAdmin, isPresident, isChefService, hasRole } = useAuth();

  return useQuery({
    queryKey: ['assignable-members', profile?.id, isAdmin, isPresident, isChefService],
    queryFn: async () => {
      if (!profile?.id) return [];

      // President/Admin can assign to anyone
      if (isAdmin || isPresident) {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, nom, prenom, fonction, service, photo_url,
            grade:grades(id, code, label, rank_order)
          `)
          .eq('statut', 'actif')
          .order('nom');

        if (error) throw error;
        return data;
      }

      // Chef de Division: can assign to chefs de bureau in their division
      if (hasRole('chef_service')) {
        // First get my grade to determine if I'm a division chief
        const { data: myProfile, error: profileError } = await supabase
          .from('profiles')
          .select('service, grade:grades(rank_order)')
          .eq('id', profile.id)
          .single();

        if (profileError) throw profileError;

        const myGradeRank = (myProfile?.grade as any)?.rank_order ?? 999;

        // If I'm a division chief (rank_order ~3), I can assign to bureau chiefs
        if (myGradeRank <= 3) {
          const { data, error } = await supabase
            .from('profiles')
            .select(`
              id, nom, prenom, fonction, service, photo_url,
              grade:grades(id, code, label, rank_order)
            `)
            .eq('service', myProfile.service)
            .eq('statut', 'actif')
            .order('nom');

          if (error) throw error;
          // Return only those with lower rank (bureau chiefs and below)
          return data.filter(p => {
            const rank = (p.grade as any)?.rank_order ?? 999;
            return rank > myGradeRank;
          });
        }

        // If I'm a bureau chief, I can only assign to my direct reports
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, nom, prenom, fonction, service, photo_url,
            grade:grades(id, code, label, rank_order)
          `)
          .eq('manager_id', profile.id)
          .eq('statut', 'actif')
          .order('nom');

        if (error) throw error;
        return data;
      }

      // Regular agents can't assign to anyone
      return [];
    },
    enabled: !!profile?.id,
  });
};

// Get personnel movement logs for SP/President
export const usePersonnelMovements = () => {
  return useQuery({
    queryKey: ['personnel-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id, action, table_cible, nouvelle_valeur, ancienne_valeur, created_at,
          user:profiles!audit_logs_user_id_fkey(nom, prenom, fonction)
        `)
        .in('table_cible', ['profiles', 'taches'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
};

// Performance statistics by team/bureau
export const usePerformanceStats = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['performance-stats'],
    queryFn: async () => {
      // Get tasks completed by service
      const { data: tasks, error: tasksError } = await supabase
        .from('taches')
        .select(`
          id, statut, priorite, date_limite, date_fin, created_at,
          assigned_profile:profiles!taches_assigned_to_fkey(id, nom, prenom, service, manager_id)
        `)
        .eq('statut', 'termine');

      if (tasksError) throw tasksError;

      // Get presence data
      const today = new Date().toISOString().split('T')[0];
      const { data: presences, error: presError } = await supabase
        .from('presences')
        .select('*, profile:profiles(service)')
        .eq('date', today);

      if (presError) throw presError;

      // Get telework data
      const { data: telework, error: teleworkError } = await supabase
        .from('teletravail_logs')
        .select('*, profile:profiles(service)')
        .eq('date', today);

      if (teleworkError) throw teleworkError;

      // Calculate stats by service
      const serviceStats: Record<string, { 
        tasks_completed: number; 
        tasks_total: number;
        avg_completion_time: number;
        presence_count: number;
        telework_count: number;
      }> = {};

      tasks?.forEach(task => {
        const service = (task.assigned_profile as any)?.service || 'Non assigné';
        if (!serviceStats[service]) {
          serviceStats[service] = { 
            tasks_completed: 0, 
            tasks_total: 0, 
            avg_completion_time: 0,
            presence_count: 0,
            telework_count: 0
          };
        }
        serviceStats[service].tasks_completed++;
        
        // Calculate completion time
        if (task.date_fin && task.created_at) {
          const created = new Date(task.created_at);
          const completed = new Date(task.date_fin);
          const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          serviceStats[service].avg_completion_time += days;
        }
      });

      // Finalize averages
      Object.keys(serviceStats).forEach(service => {
        if (serviceStats[service].tasks_completed > 0) {
          serviceStats[service].avg_completion_time /= serviceStats[service].tasks_completed;
        }
      });

      // Add presence data
      presences?.forEach(p => {
        const service = (p.profile as any)?.service || 'Non assigné';
        if (serviceStats[service]) {
          serviceStats[service].presence_count++;
        }
      });

      telework?.forEach(t => {
        const service = (t.profile as any)?.service || 'Non assigné';
        if (serviceStats[service]) {
          serviceStats[service].telework_count++;
        }
      });

      return {
        byService: serviceStats,
        totalCompleted: tasks?.length || 0,
        presenceToday: presences?.length || 0,
        teleworkToday: telework?.length || 0,
      };
    },
    enabled: !!session,
  });
};
