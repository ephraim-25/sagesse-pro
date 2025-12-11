import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, rateLimitedResponse, rateLimitHeaders, HEARTBEAT_RATE_LIMIT } from "../_shared/rate-limiter.ts";

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
      console.log(`Rate limit exceeded for heartbeat: user ${user.id}`);
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

    // Parse request
    const body: HeartbeatRequest = await req.json();
    
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
    if (body.active_seconds && body.active_seconds > 0) {
      updateData.active_seconds = session.active_seconds + Math.min(body.active_seconds, 300);
    }

    // Update status
    if (body.current_status && ['connecte', 'pause', 'reunion'].includes(body.current_status)) {
      updateData.current_status = body.current_status;
    }

    // Add activity if provided
    if (body.activity && body.activity.trim()) {
      const activities = session.activities || [];
      activities.push({
        timestamp: new Date().toISOString(),
        description: body.activity.substring(0, 200),
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
      console.error('Heartbeat update error:', updateError);
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
    console.error('Heartbeat error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
