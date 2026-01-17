import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, rateLimitedResponse, rateLimitHeaders, STRICT_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeReason, isValidUUID, pseudonymizeId, sanitizeError } from "../_shared/input-sanitizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ForceCheckoutRequest {
  session_id: string;
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stricter rate limiting for force checkout (sensitive action)
    const rateLimitResult = checkRateLimit(`force-checkout:${user.id}`, STRICT_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for force-checkout: user ${pseudonymizeId(user.id)}`);
      return rateLimitedResponse(rateLimitResult.resetIn, corsHeaders);
    }

    // Get manager profile with grade permissions
    const { data: managerProfile } = await supabase
      .from('profiles')
      .select(`
        id, nom, prenom,
        grades!profiles_grade_id_fkey (
          can_force_checkout,
          can_manage_team,
          can_view_all_data
        )
      `)
      .eq('auth_id', user.id)
      .single();

    if (!managerProfile) {
      return new Response(JSON.stringify({ error: 'Profil non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check permissions
    const gradeArr = managerProfile.grades as unknown as Array<{ can_force_checkout: boolean; can_manage_team: boolean; can_view_all_data: boolean }> | null;
    const grade = gradeArr?.[0] || null;
    if (!grade?.can_force_checkout && !grade?.can_view_all_data) {
      return new Response(JSON.stringify({ error: 'Permission insuffisante pour forcer un checkout' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request
    let body: ForceCheckoutRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Données invalides' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate session_id format
    if (!body.session_id || !isValidUUID(body.session_id)) {
      return new Response(JSON.stringify({ error: 'session_id invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('telework_sessions')
      .select('*, profiles!telework_sessions_user_id_fkey(id, nom, prenom, manager_id)')
      .eq('id', body.session_id)
      .is('check_out', null)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session non trouvée ou déjà terminée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify manager relationship (unless has full access)
    const targetProfile = session.profiles as { id: string; nom: string; prenom: string; manager_id: string | null };
    if (!grade?.can_view_all_data && targetProfile.manager_id !== managerProfile.id) {
      return new Response(JSON.stringify({ error: 'Vous ne pouvez forcer le checkout que pour votre équipe' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(session.check_in);
    const durationSeconds = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 1000);

    // Sanitize reason and build activities
    const sanitizedReason = sanitizeReason(body.reason, 100);
    const activities = session.activities || [];
    activities.push({
      timestamp: checkOutTime.toISOString(),
      description: `Checkout forcé par manager${sanitizedReason ? ': ' + sanitizedReason : ''}`,
      type: 'force_checkout'
    });

    // Force checkout
    const { data: updatedSession, error: updateError } = await supabase
      .from('telework_sessions')
      .update({
        check_out: checkOutTime.toISOString(),
        current_status: 'hors_ligne',
        forced_checkout: true,
        forced_by: managerProfile.id,
        activities,
        active_seconds: Math.max(session.active_seconds, durationSeconds)
      })
      .eq('id', body.session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Force checkout error:', sanitizeError(updateError));
      return new Response(JSON.stringify({ error: 'Erreur lors du checkout forcé' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notification to user with sanitized content
    await supabase
      .from('notifications')
      .insert({
        user_id: session.user_id,
        sender_id: managerProfile.id,
        title: 'Session télétravail terminée',
        body: `Votre session a été terminée par votre responsable.${sanitizedReason ? ' Raison: ' + sanitizedReason : ''}`,
        type: 'force_checkout',
        meta: { session_id: session.id }
      });

    // Log audit
    await supabase.rpc('log_audit_action', {
      p_action: 'telework_force_checkout',
      p_table_cible: 'telework_sessions',
      p_ancienne_valeur: { session_id: session.id, user_id: session.user_id },
      p_nouvelle_valeur: { 
        session_id: session.id, 
        forced_by: managerProfile.id,
        reason: sanitizedReason || null
      }
    });

    console.log(`Force checkout: manager ${pseudonymizeId(managerProfile.id)} forced checkout for session ${pseudonymizeId(session.id)}`);

    return new Response(JSON.stringify({
      success: true,
      session: {
        id: updatedSession.id,
        check_out: updatedSession.check_out,
        forced_checkout: true
      }
    }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetIn, STRICT_RATE_LIMIT.maxRequests)
      },
    });

  } catch (error) {
    console.error('Force checkout error:', sanitizeError(error));
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
