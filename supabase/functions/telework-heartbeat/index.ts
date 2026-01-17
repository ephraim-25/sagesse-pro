import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, rateLimitedResponse, rateLimitHeaders, HEARTBEAT_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeActivity, isValidUUID, isValidStatus, sanitizeNumber, pseudonymizeId, sanitizeError } from "../_shared/input-sanitizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeartbeatRequest {
  session_id: string;
  active_seconds?: number;
  current_status?: 'connecte' | 'pause' | 'reunion';
  activity?: string;
}

const ALLOWED_STATUSES = ['connecte', 'pause', 'reunion'] as const;

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

    // Rate limiting for heartbeat - higher limit since it's called frequently
    const rateLimitResult = checkRateLimit(`heartbeat:${user.id}`, HEARTBEAT_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for heartbeat: user ${pseudonymizeId(user.id)}`);
      return rateLimitedResponse(rateLimitResult.resetIn, corsHeaders);
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profil non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request
    let body: HeartbeatRequest;
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

    // Validate current_status if provided
    if (body.current_status !== undefined && !isValidStatus(body.current_status, [...ALLOWED_STATUSES])) {
      return new Response(JSON.stringify({ error: 'Statut invalide' }), {
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
      return new Response(JSON.stringify({ error: 'Session non trouvée ou terminée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Update active seconds (max 5 min per heartbeat for safety)
    const sanitizedSeconds = sanitizeNumber(body.active_seconds, 0, 300);
    if (sanitizedSeconds !== null && sanitizedSeconds > 0) {
      updateData.active_seconds = session.active_seconds + sanitizedSeconds;
    }

    // Update status (already validated above)
    if (body.current_status && isValidStatus(body.current_status, [...ALLOWED_STATUSES])) {
      updateData.current_status = body.current_status;
    }

    // Add activity if provided with sanitization
    const sanitizedActivity = sanitizeActivity(body.activity, 200);
    if (sanitizedActivity) {
      const activities = session.activities || [];
      activities.push({
        timestamp: new Date().toISOString(),
        description: sanitizedActivity,
        type: body.current_status || 'activity'
      });
      updateData.activities = activities;
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('telework_sessions')
      .update(updateData)
      .eq('id', body.session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Heartbeat update error:', sanitizeError(updateError));
      return new Response(JSON.stringify({ error: 'Erreur de mise à jour' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      session: {
        id: updatedSession.id,
        active_seconds: updatedSession.active_seconds,
        current_status: updatedSession.current_status
      }
    }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetIn, HEARTBEAT_RATE_LIMIT.maxRequests)
      },
    });

  } catch (error) {
    console.error('Heartbeat error:', sanitizeError(error));
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
