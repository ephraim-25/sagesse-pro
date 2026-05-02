import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PresenceRequest {
  type: 'entree' | 'sortie';
  appareil?: string;
  localisation?: string;
  justification_retard?: string;
}

// Get current time in Kinshasa timezone (Africa/Kinshasa = UTC+1)
function getKinshasaTime(): { hours: number; minutes: number } {
  const now = new Date();
  // Kinshasa is UTC+1 (no DST)
  const kinshasaOffset = 1 * 60; // +1 hour in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kinshasaMinutes = utcMinutes + kinshasaOffset;
  
  // Handle day overflow
  const adjustedMinutes = ((kinshasaMinutes % 1440) + 1440) % 1440;
  
  return {
    hours: Math.floor(adjustedMinutes / 60),
    minutes: adjustedMinutes % 60
  };
}

// Validate time restrictions for check-in/check-out
function validateTimeRestrictions(type: 'entree' | 'sortie'): { allowed: boolean; message?: string } {
  const { hours, minutes } = getKinshasaTime();
  const currentTimeMinutes = hours * 60 + minutes;
  
  if (type === 'entree') {
    // Check-in allowed until 10:00 (10 * 60 = 600 minutes)
    const cutoffMinutes = 10 * 60;
    if (currentTimeMinutes > cutoffMinutes) {
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return { 
        allowed: false, 
        message: `Le pointage d'entrée n'est plus disponible après 10h00 (heure actuelle: ${formattedTime})` 
      };
    }
  } else if (type === 'sortie') {
    // Check-out allowed from 16:00 (16 * 60 = 960 minutes)
    const startMinutes = 16 * 60;
    if (currentTimeMinutes < startMinutes) {
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return { 
        allowed: false, 
        message: `Le pointage de sortie n'est disponible qu'à partir de 16h00 (heure actuelle: ${formattedTime})` 
      };
    }
  }
  
  return { allowed: true };
}

// Input validation function
function validatePresenceInput(data: unknown): { valid: true; data: PresenceRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Corps de requête invalide' };
  }

  const input = data as Record<string, unknown>;

  // Validate type (required)
  if (!input.type || !['entree', 'sortie'].includes(input.type as string)) {
    return { valid: false, error: 'Le type doit être "entree" ou "sortie"' };
  }

  // Validate optional string fields with length limits
  if (input.appareil !== undefined) {
    if (typeof input.appareil !== 'string' || input.appareil.length > 256) {
      return { valid: false, error: 'Appareil doit être une chaîne de 256 caractères max' };
    }
  }

  if (input.localisation !== undefined) {
    if (typeof input.localisation !== 'string' || input.localisation.length > 100) {
      return { valid: false, error: 'Localisation doit être une chaîne de 100 caractères max' };
    }
  }

  if (input.justification_retard !== undefined) {
    if (typeof input.justification_retard !== 'string' || input.justification_retard.length > 500) {
      return { valid: false, error: 'Justification doit être une chaîne de 500 caractères max' };
    }
  }

  return {
    valid: true,
    data: {
      type: input.type as 'entree' | 'sortie',
      appareil: input.appareil as string | undefined,
      localisation: input.localisation as string | undefined,
      justification_retard: input.justification_retard as string | undefined,
    }
  };
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
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Autorisation requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validatePresenceInput(rawBody);
    if (!validation.valid) {
      console.error('Validation error:', validation.error);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, appareil, localisation, justification_retard } = validation.data;

    // Validate time restrictions
    const timeRestriction = validateTimeRestrictions(type);
    if (!timeRestriction.allowed) {
      console.log(`Time restriction: ${timeRestriction.message}`);
      return new Response(
        JSON.stringify({ success: false, error: timeRestriction.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute Kinshasa-local date (UTC+1, no DST)
    const nowDate = new Date();
    const kinshasaMs = nowDate.getTime() + 60 * 60 * 1000;
    const kinshasaDate = new Date(kinshasaMs);
    const today = kinshasaDate.toISOString().split('T')[0];
    const now = nowDate.toISOString();

    // Block weekends (Mon=1..Fri=5 only). getUTCDay on shifted date gives Kinshasa weekday.
    const weekday = kinshasaDate.getUTCDay(); // 0=Sun, 6=Sat
    const weekdayName = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][weekday];
    const debugBase = {
      today,
      weekday,
      weekday_name: weekdayName,
      timezone: 'Africa/Kinshasa (UTC+1)',
      utc_now: nowDate.toISOString(),
    };

    if (weekday === 0 || weekday === 6) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'weekend',
          error: "Le pointage n'est pas autorisé les week-ends (samedi/dimanche). Le Conseil opère du lundi au vendredi.",
          debug: { ...debugBase, blocked_by: 'weekend' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le profile_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profil non trouvé');
    }

    // Block active holidays (recurring MM-DD or specific date)
    const mmdd = today.slice(5);
    const { data: holidayHits } = await supabase
      .from('holidays')
      .select('id, label, date, is_recurring')
      .eq('active', true);
    const matchedHoliday = (holidayHits ?? []).find((h: { date: string; is_recurring: boolean }) =>
      h.is_recurring ? h.date.slice(5) === mmdd : h.date === today
    );
    if (matchedHoliday) {
      const h = matchedHoliday as { id: string; label: string; date: string; is_recurring: boolean };
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'holiday',
          error: `Le pointage est désactivé : jour férié RDC actif (« ${h.label} »).`,
          debug: {
            ...debugBase,
            blocked_by: 'holiday',
            holiday: { id: h.id, label: h.label, date: h.date, recurring: h.is_recurring },
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Block if agent has an approved leave covering today
    const { data: leaveHit } = await supabase
      .from('leave_requests')
      .select('id, start_date, end_date')
      .eq('user_id', profile.id)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle();
    if (leaveHit) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'leave',
          error: `Vous êtes en congé approuvé du ${leaveHit.start_date} au ${leaveHit.end_date}. Pointage non autorisé pendant cette période.`,
          debug: {
            ...debugBase,
            blocked_by: 'approved_leave',
            leave: leaveHit,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si une présence existe déjà pour aujourd'hui
    const { data: existingPresence, error: checkError } = await supabase
      .from('presences')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    let result;

    if (type === 'entree') {
      if (existingPresence && existingPresence.heure_entree) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Vous avez déjà pointé votre entrée aujourd\'hui',
            presence: existingPresence 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingPresence) {
        // Mettre à jour l'entrée existante
        const { data, error } = await supabase
          .from('presences')
          .update({
            heure_entree: now,
            appareil,
            localisation_generale: localisation,
            justification_retard
          })
          .eq('id', existingPresence.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Créer une nouvelle présence
        const { data, error } = await supabase
          .from('presences')
          .insert({
            user_id: profile.id,
            date: today,
            heure_entree: now,
            type: 'presentiel',
            appareil,
            localisation_generale: localisation,
            justification_retard
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Log audit
      await supabase.rpc('log_audit_action', {
        p_action: 'PRESENCE_ENTREE',
        p_table_cible: 'presences',
        p_nouvelle_valeur: result
      });

    } else if (type === 'sortie') {
      if (!existingPresence) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Aucune entrée enregistrée pour aujourd\'hui' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingPresence.heure_sortie) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Vous avez déjà pointé votre sortie aujourd\'hui',
            presence: existingPresence 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('presences')
        .update({ heure_sortie: now })
        .eq('id', existingPresence.id)
        .select()
        .single();

      if (error) throw error;
      result = data;

      // Log audit
      await supabase.rpc('log_audit_action', {
        p_action: 'PRESENCE_SORTIE',
        p_table_cible: 'presences',
        p_nouvelle_valeur: result
      });
    }

    console.log(`Présence enregistrée: ${type} pour user ${profile.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: type === 'entree' ? 'Entrée enregistrée' : 'Sortie enregistrée',
        presence: result,
        timestamp: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur record-presence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
