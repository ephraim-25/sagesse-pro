-- Fix 1: Replace overly permissive profiles_select_all policy
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Create proper role-based SELECT policies for profiles
-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT
USING (auth_id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Presidents can view all profiles
CREATE POLICY "profiles_select_president" ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'president'::app_role));

-- Chefs de service can view profiles in their service
CREATE POLICY "profiles_select_chef_service" ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'chef_service'::app_role) 
  AND is_same_service(auth.uid(), id)
);

-- Fix 2: Replace overly permissive audit_logs_insert policy
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "audit_logs_insert" ON public.profiles;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

-- Create restricted INSERT policy - only authenticated users can insert their own logs
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = get_profile_id(auth.uid()));