-- Fix admin_matricules_permissive: Drop the overly permissive UPDATE policy
-- The SECURITY DEFINER function validate_admin_matricule can still update due to elevated privileges
-- The restrictive admin-only policies from migration 20260125110746 are sufficient

DROP POLICY IF EXISTS "admin_matricules_update_system" ON public.admin_matricules;

-- Also check and drop any other overly permissive policies on this table
DROP POLICY IF EXISTS "admin_matricules_insert_system" ON public.admin_matricules;