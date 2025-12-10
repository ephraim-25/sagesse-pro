import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckinRequest {
  activity?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
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

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, account_status, nom, prenom')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profil non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.account_status !== 'active') {
      return new Response(JSON.stringify({ error: 'Compte non activé' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing active session today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingSession } = await supabase
      .from('telework_sessions')
      .select('id')
      .eq('user_id', profile.id)
      .gte('check_in', `${today}T00:00:00`)
      .is('check_out', null)
      .single();

    if (existingSession) {
      return new Response(JSON.stringify({ 
        error: 'Session active déjà en cours',
        session_id: existingSession.id 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: CheckinRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is ok
    }

    // Get device and country info from headers
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip');
    
    // Determine country (simplified - in production use a geo-IP service)
    let country = 'Unknown';
    const cfCountry = req.headers.get('cf-ipcountry');
    if (cfCountry) {
      country = cfCountry;
    }

    // Create telework session
    const activities = body.activity ? [{
      timestamp: new Date().toISOString(),
      description: body.activity.substring(0, 200),
      type: 'start'
    }] : [];

    const { data: session, error: sessionError } = await supabase
      .from('telework_sessions')
      .insert({
        user_id: profile.id,
        current_status: 'connecte',
        country,
        device: userAgent.substring(0, 200),
        ip_address: forwardedFor?.split(',')[0] || null,
        activities
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création de la session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log audit
    await supabase.rpc('log_audit_action', {
      p_action: 'telework_checkin',
      p_table_cible: 'telework_sessions',
      p_nouvelle_valeur: { session_id: session.id, check_in: session.check_in }
    });

    console.log(`Telework checkin: ${profile.nom} ${profile.prenom} - Session ${session.id}`);

    return new Response(JSON.stringify({
      success: true,
      session: {
        id: session.id,
        check_in: session.check_in,
        current_status: session.current_status,
        country: session.country
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Telework checkin error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
