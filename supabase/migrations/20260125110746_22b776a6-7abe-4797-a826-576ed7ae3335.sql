-- Fix PUBLIC_USER_DATA: profiles table requires authentication for SELECT
-- Add authentication requirement to ensure only authenticated users can access profiles

-- First, let's add a restrictive policy that requires authentication for all SELECT operations
CREATE POLICY "profiles_require_auth"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the policy and recreate with proper check
DROP POLICY IF EXISTS "profiles_require_auth" ON public.profiles;

-- Create a policy that blocks anonymous access completely
CREATE POLICY "profiles_authenticated_only"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix PUBLIC_SENSITIVE_DATA: telework_sessions table requires authentication
CREATE POLICY "telework_sessions_authenticated_only"
ON public.telework_sessions
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix EXPOSED_SENSITIVE_DATA: admin_matricules table requires authentication
-- Enable RLS on admin_matricules (if not already enabled)
ALTER TABLE public.admin_matricules ENABLE ROW LEVEL SECURITY;

-- Add authentication policy for admin_matricules
-- Only authenticated admins/presidents should access this table
CREATE POLICY "admin_matricules_admin_only"
ON public.admin_matricules
AS RESTRICTIVE
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'president'::app_role));

-- Also add restrictive policies for INSERT/UPDATE/DELETE on admin_matricules to be safe
CREATE POLICY "admin_matricules_admin_insert"
ON public.admin_matricules
AS RESTRICTIVE
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_matricules_admin_update"
ON public.admin_matricules
AS RESTRICTIVE
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_matricules_admin_delete"
ON public.admin_matricules
AS RESTRICTIVE
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));