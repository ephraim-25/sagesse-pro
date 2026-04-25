import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, rateLimitedResponse, rateLimitHeaders, DEFAULT_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeActivity, pseudonymizeId, sanitizeError } from "../_shared/input-sanitizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckinRequest {
  activity?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

// Free, no-key needed. Returns proxy/hosting flags.
// Docs: https://ipapi.co/api/#complete-location5
async function checkIp(ip: string | null): Promise<{
  ok: boolean;
  is_vpn: boolean;
  is_proxy: boolean;
  country: string | null;
  raw: Record<string, unknown> | null;
  reason?: string;
}> {
  if (!ip) return { ok: true, is_vpn: false, is_proxy: false, country: null, raw: null };
  try {
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { 'User-Agent': 'sigc-csn-checkin/1.0' },
    });
    if (!r.ok) {
      // Fail-open: don't block the user if the IP service is down.
      return { ok: true, is_vpn: false, is_proxy: false, country: null, raw: null, reason: `lookup_status_${r.status}` };
    }
    const j = await r.json();
    // ipapi.co exposes `proxy` as boolean for paid tiers; on free tier we use heuristic via `org`/`asn`.
    const org = String(j.org || '').toLowerCase();
    const knownVpn = ['vpn', 'proxy', 'hosting', 'datacenter', 'cloud', 'amazon', 'google llc', 'microsoft', 'digitalocean', 'ovh', 'hetzner', 'linode', 'vultr', 'choopa', 'leaseweb', 'm247'];
    const flagged = knownVpn.some(k => org.includes(k));
    const explicitProxy = j.proxy === true || j.hosting === true;
    return {
      ok: true,
      is_vpn: explicitProxy || flagged,
      is_proxy: explicitProxy || flagged,
      country: j.country_name || j.country || null,
      raw: { org: j.org, asn: j.asn, country: j.country, proxy: j.proxy, hosting: j.hosting },
    };
  } catch (e) {
    return { ok: true, is_vpn: false, is_proxy: false, country: null, raw: null, reason: 'lookup_failed' };
  }
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

    const rateLimitResult = checkRateLimit(`checkin:${user.id}`, DEFAULT_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return rateLimitedResponse(rateLimitResult.resetIn, corsHeaders);
    }

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
        session_id: existingSession.id,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: CheckinRequest = {};
    try {
      const rawBody = await req.json();
      if (rawBody.activity !== undefined && typeof rawBody.activity !== 'string') {
        return new Response(JSON.stringify({ error: 'Format activité invalide' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = rawBody;
    } catch {
      // empty body is ok
    }

    // ---- Mandatory GPS coordinates ----
    const lat = typeof body.latitude === 'number' ? body.latitude : NaN;
    const lng = typeof body.longitude === 'number' ? body.longitude : NaN;
    const acc = typeof body.accuracy === 'number' ? body.accuracy : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(JSON.stringify({
        error: "Géolocalisation requise. Veuillez autoriser l'accès à votre position pour démarrer la session.",
        code: 'GEO_REQUIRED',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- IP / VPN / Proxy check ----
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || null;

    const cfCountry = req.headers.get('cf-ipcountry');
    const ipCheck = await checkIp(clientIp);
    if (ipCheck.is_vpn || ipCheck.is_proxy) {
      console.log(`Checkin blocked (VPN/Proxy) for ${pseudonymizeId(profile.id)}`);
      return new Response(JSON.stringify({
        error: "Pointage refusé : un VPN, proxy ou serveur d'hébergement a été détecté sur votre connexion. Désactivez-le et réessayez.",
        code: 'VPN_DETECTED',
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const country = ipCheck.country || cfCountry || 'Unknown';

    const sanitizedActivity = sanitizeActivity(body.activity, 200);
    const activities = sanitizedActivity ? [{
      timestamp: new Date().toISOString(),
      description: sanitizedActivity,
      type: 'start',
    }] : [];

    const sanitizedDevice = userAgent.substring(0, 200).replace(/[<>]/g, '');

    const { data: session, error: sessionError } = await supabase
      .from('telework_sessions')
      .insert({
        user_id: profile.id,
        current_status: 'connecte',
        country,
        device: sanitizedDevice,
        ip_address: clientIp,
        activities,
        latitude: lat,
        longitude: lng,
        location_accuracy: acc,
        is_vpn: false,
        is_proxy: false,
        network_check: ipCheck.raw,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sanitizeError(sessionError));
      return new Response(JSON.stringify({ error: 'Erreur lors de la création de la session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.rpc('log_audit_action', {
      p_action: 'telework_checkin',
      p_table_cible: 'telework_sessions',
      p_nouvelle_valeur: { session_id: session.id, check_in: session.check_in, lat, lng },
    });

    return new Response(JSON.stringify({
      success: true,
      session: {
        id: session.id,
        check_in: session.check_in,
        current_status: session.current_status,
        country: session.country,
      },
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetIn, DEFAULT_RATE_LIMIT.maxRequests),
      },
    });

  } catch (error) {
    console.error('Telework checkin error:', sanitizeError(error));
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
