import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting for matricule checks (prevent brute force)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MATRICULE_CHECK_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
};

function checkMatriculeRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + MATRICULE_CHECK_LIMIT.windowMs });
    return { allowed: true, remaining: MATRICULE_CHECK_LIMIT.maxRequests - 1 };
  }
  
  if (entry.count >= MATRICULE_CHECK_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  entry.count++;
  return { allowed: true, remaining: MATRICULE_CHECK_LIMIT.maxRequests - entry.count };
}

// Input sanitization
function sanitizeMatricule(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  // Only allow the exact format CSN-2013-XXX where XXX is 3 digits
  const sanitized = input.trim().toUpperCase();
  if (!/^CSN-2013-\d{3}$/.test(sanitized)) {
    return null;
  }
  return sanitized;
}

interface ValidateRequest {
  matricule: string;
  action: 'check' | 'use';
  profile_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Rate limit check
    const rateLimitResult = checkMatriculeRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for matricule check from IP: ${clientIP.substring(0, 10)}...`);
      return new Response(JSON.stringify({ 
        error: 'Trop de tentatives. Veuillez réessayer dans une minute.',
        valid: false 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        },
      });
    }

    // Parse request
    let body: ValidateRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Données invalides', valid: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize matricule input
    const matricule = sanitizeMatricule(body.matricule);
    if (!matricule) {
      return new Response(JSON.stringify({ 
        error: 'Format matricule invalide. Format attendu: CSN-2013-XXX', 
        valid: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: check - just validate if matricule exists and is available
    if (body.action === 'check') {
      const { data: matriculeData, error } = await supabase
        .from('admin_matricules')
        .select('id, is_used')
        .eq('matricule', matricule)
        .single();

      if (error || !matriculeData) {
        // Don't reveal whether matricule doesn't exist vs is already used
        return new Response(JSON.stringify({ 
          valid: false,
          message: 'Matricule invalide ou non disponible'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        valid: !matriculeData.is_used,
        message: matriculeData.is_used ? 'Matricule déjà utilisé' : 'Matricule disponible'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: use - mark matricule as used and assign admin role (requires auth)
    if (body.action === 'use') {
      // This action requires authentication
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authentification requise', success: false }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Token invalide', success: false }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!body.profile_id) {
        return new Response(JSON.stringify({ error: 'profile_id requis', success: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the profile belongs to the authenticated user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, auth_id')
        .eq('id', body.profile_id)
        .single();

      if (profileError || !profile || profile.auth_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Profil non autorisé', success: false }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use the database function to validate and assign
      const { data: validated, error: validateError } = await supabase.rpc('validate_admin_matricule', {
        p_matricule: matricule,
        p_profile_id: body.profile_id
      });

      if (validateError) {
        console.error('Matricule validation error:', validateError);
        return new Response(JSON.stringify({ 
          error: 'Erreur lors de la validation du matricule', 
          success: false 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!validated) {
        return new Response(JSON.stringify({ 
          error: 'Matricule invalide ou déjà utilisé', 
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the admin registration
      await supabase.rpc('log_audit_action', {
        p_action: 'admin_registration',
        p_table_cible: 'admin_matricules',
        p_nouvelle_valeur: { matricule, profile_id: body.profile_id }
      });

      console.log(`Admin registration: matricule ${matricule} used by profile ${body.profile_id.substring(0, 8)}...`);

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Compte administrateur activé avec succès'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Action invalide', valid: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Matricule validation error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur', valid: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
