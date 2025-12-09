import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeleworkRequest {
  action: 'check_in' | 'check_out' | 'pause' | 'resume';
  activite?: string;
  localisation?: string;
}

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

    const { action, activite, localisation }: TeleworkRequest = await req.json();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Récupérer le profile_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profil non trouvé');
    }

    // Vérifier si un log télétravail existe pour aujourd'hui
    const { data: existingLog, error: checkError } = await supabase
      .from('teletravail_logs')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    let result;
    let message = '';

    switch (action) {
      case 'check_in':
        if (existingLog && existingLog.check_in && !existingLog.check_out) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Session télétravail déjà active',
              log: existingLog 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: newLog, error: insertError } = await supabase
          .from('teletravail_logs')
          .insert({
            user_id: profile.id,
            date: today,
            check_in: now,
            statut: 'connecte',
            activite_declaree: activite,
            localisation_generale: localisation
          })
          .select()
          .single();

        if (insertError) throw insertError;
        result = newLog;
        message = 'Session télétravail démarrée';
        break;

      case 'check_out':
        if (!existingLog || !existingLog.check_in) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Aucune session télétravail active' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculer la durée active
        const checkInTime = new Date(existingLog.check_in).getTime();
        const checkOutTime = new Date(now).getTime();
        const dureeMinutes = Math.round((checkOutTime - checkInTime) / 60000);

        const { data: updatedLog, error: updateError } = await supabase
          .from('teletravail_logs')
          .update({
            check_out: now,
            statut: 'hors_ligne',
            duree_active_minutes: dureeMinutes
          })
          .eq('id', existingLog.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updatedLog;
        message = `Session terminée. Durée: ${Math.floor(dureeMinutes / 60)}h ${dureeMinutes % 60}min`;
        break;

      case 'pause':
        if (!existingLog || existingLog.statut !== 'connecte') {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Aucune session active à mettre en pause' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: pausedLog, error: pauseError } = await supabase
          .from('teletravail_logs')
          .update({ statut: 'pause' })
          .eq('id', existingLog.id)
          .select()
          .single();

        if (pauseError) throw pauseError;
        result = pausedLog;
        message = 'Session mise en pause';
        break;

      case 'resume':
        if (!existingLog || existingLog.statut !== 'pause') {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Aucune session en pause à reprendre' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: resumedLog, error: resumeError } = await supabase
          .from('teletravail_logs')
          .update({ statut: 'connecte' })
          .eq('id', existingLog.id)
          .select()
          .single();

        if (resumeError) throw resumeError;
        result = resumedLog;
        message = 'Session reprise';
        break;
    }

    // Log audit
    await supabase.rpc('log_audit_action', {
      p_action: `TELETRAVAIL_${action.toUpperCase()}`,
      p_table_cible: 'teletravail_logs',
      p_nouvelle_valeur: result
    });

    console.log(`Télétravail ${action} pour user ${profile.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        log: result,
        timestamp: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur record-telework:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
