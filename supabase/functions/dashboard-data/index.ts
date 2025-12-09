import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Non autorisé');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];

    // Compter les membres actifs
    const { count: totalMembers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'actif');

    // Présences aujourd'hui
    const { data: presencesToday } = await supabase
      .from('presences')
      .select('*')
      .eq('date', today);

    const presentsCount = presencesToday?.filter(p => p.heure_entree && !p.heure_sortie).length || 0;

    // Télétravail aujourd'hui
    const { data: teleworkToday } = await supabase
      .from('teletravail_logs')
      .select('*')
      .eq('date', today)
      .eq('statut', 'connecte');

    const teleworkCount = teleworkToday?.length || 0;

    // Tâches statistiques
    const { data: allTasks } = await supabase
      .from('taches')
      .select('statut, priorite, date_limite');

    const tasksStats = {
      total: allTasks?.length || 0,
      a_faire: allTasks?.filter(t => t.statut === 'a_faire').length || 0,
      en_cours: allTasks?.filter(t => t.statut === 'en_cours').length || 0,
      terminees: allTasks?.filter(t => t.statut === 'termine').length || 0,
      en_retard: allTasks?.filter(t => 
        t.date_limite && 
        new Date(t.date_limite) < new Date() && 
        t.statut !== 'termine'
      ).length || 0,
      urgentes: allTasks?.filter(t => t.priorite === 'urgente' && t.statut !== 'termine').length || 0
    };

    // Top performers (basé sur tâches terminées cette semaine)
    const { data: weeklyCompletedTasks } = await supabase
      .from('taches')
      .select('assigned_to')
      .eq('statut', 'termine')
      .gte('date_fin', weekStart);

    const performerCounts: Record<string, number> = {};
    weeklyCompletedTasks?.forEach(task => {
      if (task.assigned_to) {
        performerCounts[task.assigned_to] = (performerCounts[task.assigned_to] || 0) + 1;
      }
    });

    const topPerformerIds = Object.entries(performerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let topPerformers: any[] = [];
    if (topPerformerIds.length > 0) {
      const { data: performers } = await supabase
        .from('profiles')
        .select('id, nom, prenom, service')
        .in('id', topPerformerIds);

      topPerformers = performers?.map(p => ({
        ...p,
        taches_terminees: performerCounts[p.id]
      })) || [];
    }

    // Statistiques par service
    const { data: profilesByService } = await supabase
      .from('profiles')
      .select('service')
      .eq('statut', 'actif');

    const serviceCounts: Record<string, number> = {};
    profilesByService?.forEach(p => {
      if (p.service) {
        serviceCounts[p.service] = (serviceCounts[p.service] || 0) + 1;
      }
    });

    const departmentStats = Object.entries(serviceCounts).map(([service, count]) => ({
      service,
      membres: count
    }));

    // Alertes
    const alerts = [];
    
    if (tasksStats.en_retard > 0) {
      alerts.push({
        type: 'warning',
        message: `${tasksStats.en_retard} tâche(s) en retard`
      });
    }
    
    if (tasksStats.urgentes > 0) {
      alerts.push({
        type: 'danger',
        message: `${tasksStats.urgentes} tâche(s) urgente(s) non terminée(s)`
      });
    }

    const absentsCount = (totalMembers || 0) - presentsCount - teleworkCount;
    if (absentsCount > (totalMembers || 0) * 0.3) {
      alerts.push({
        type: 'info',
        message: `${absentsCount} membre(s) absent(s) aujourd'hui`
      });
    }

    console.log('Dashboard data generated');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          overview: {
            totalMembers: totalMembers || 0,
            presents: presentsCount,
            teletravail: teleworkCount,
            absents: absentsCount > 0 ? absentsCount : 0
          },
          tasks: tasksStats,
          topPerformers,
          departments: departmentStats,
          alerts,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dashboard-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
