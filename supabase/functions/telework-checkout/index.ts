import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, rateLimitedResponse, rateLimitHeaders, DEFAULT_RATE_LIMIT } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  session_id: string;
  final_activity?: string;
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

    // Rate limiting
    const rateLimitResult = checkRateLimit(`checkout:${user.id}`, DEFAULT_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for checkout: user ${user.id}`);
      return rateLimitedResponse(rateLimitResult.resetIn, corsHeaders);
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nom, prenom')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profil non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body: CheckoutRequest = await req.json();
    
    if (!body.session_id) {
      return new Response(JSON.stringify({ error: 'session_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('telework_sessions')
      .select('*')
      .eq('id', body.session_id)
      .eq('user_id', profile.id)
      .is('check_out', null)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session non trouvée ou déjà terminée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(session.check_in);
    const durationSeconds = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 1000);

    // Build update
    const activities = session.activities || [];
    if (body.final_activity && body.final_activity.trim()) {
      activities.push({
        timestamp: checkOutTime.toISOString(),
        description: body.final_activity.substring(0, 200),
        type: 'checkout'
      });
    }
    activities.push({
      timestamp: checkOutTime.toISOString(),
      description: 'Session terminée',
      type: 'end'
    });

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('telework_sessions')
      .update({
        check_out: checkOutTime.toISOString(),
        current_status: 'hors_ligne',
        activities,
        active_seconds: Math.max(session.active_seconds, durationSeconds)
      })
      .eq('id', body.session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Checkout update error:', updateError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la fermeture' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log audit
    await supabase.rpc('log_audit_action', {
      p_action: 'telework_checkout',
      p_table_cible: 'telework_sessions',
      p_ancienne_valeur: { session_id: session.id, check_in: session.check_in },
      p_nouvelle_valeur: { 
        session_id: session.id, 
        check_out: checkOutTime.toISOString(),
        duration_seconds: durationSeconds 
      }
    });

    console.log(`Telework checkout: ${profile.nom} ${profile.prenom} - Session ${session.id} - Duration: ${Math.floor(durationSeconds / 60)} min`);

    return new Response(JSON.stringify({
      success: true,
      session: {
        id: updatedSession.id,
        check_in: updatedSession.check_in,
        check_out: updatedSession.check_out,
        duration_seconds: durationSeconds,
        duration_formatted: formatDuration(durationSeconds)
      }
    }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetIn, DEFAULT_RATE_LIMIT.maxRequests)
      },
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}
