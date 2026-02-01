-- =====================================================
-- CORRECTION DES FAILLES DE SÉCURITÉ RLS
-- =====================================================

-- 1. Supprimer la policy trop permissive sur profiles
-- Cette policy permettait à TOUT utilisateur authentifié de voir TOUS les profils
DROP POLICY IF EXISTS "profiles_authenticated_only" ON public.profiles;

-- 2. Supprimer la policy trop permissive sur telework_sessions
-- Cette policy permettait à TOUT utilisateur authentifié de voir TOUTES les sessions
DROP POLICY IF EXISTS "telework_sessions_authenticated_only" ON public.telework_sessions;

-- 3. Améliorer les policies sur presences pour limiter l'accès aux managers directs
-- D'abord supprimer l'ancienne policy trop large
DROP POLICY IF EXISTS "presences_select" ON public.presences;

-- Recréer avec accès limité : soi-même, manager direct, admin, président
CREATE POLICY "presences_select_restricted" 
ON public.presences 
FOR SELECT 
USING (
  user_id = get_profile_id(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'president'::app_role)
  OR is_manager_of(auth.uid(), user_id)
);

-- 4. Améliorer les policies sur teletravail_logs
DROP POLICY IF EXISTS "teletravail_select" ON public.teletravail_logs;

CREATE POLICY "teletravail_select_restricted" 
ON public.teletravail_logs 
FOR SELECT 
USING (
  user_id = get_profile_id(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'president'::app_role)
  OR is_manager_of(auth.uid(), user_id)
);

-- 5. Améliorer les policies sur performances
DROP POLICY IF EXISTS "performances_select" ON public.performances;

CREATE POLICY "performances_select_restricted" 
ON public.performances 
FOR SELECT 
USING (
  user_id = get_profile_id(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'president'::app_role)
  OR is_manager_of(auth.uid(), user_id)
);

-- 6. Améliorer les policies sur competences
DROP POLICY IF EXISTS "competences_select" ON public.competences;

CREATE POLICY "competences_select_restricted" 
ON public.competences 
FOR SELECT 
USING (
  user_id = get_profile_id(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'president'::app_role)
  OR is_manager_of(auth.uid(), user_id)
);

-- 7. Améliorer les policies sur timesheets
DROP POLICY IF EXISTS "timesheets_select_manager" ON public.timesheets;

CREATE POLICY "timesheets_select_manager_restricted" 
ON public.timesheets 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'president'::app_role)
  OR is_manager_of(auth.uid(), user_id)
);