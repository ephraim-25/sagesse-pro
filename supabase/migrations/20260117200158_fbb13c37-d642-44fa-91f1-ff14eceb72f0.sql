-- Fix security issues with admin_matricules table
-- Remove overly permissive public SELECT policy
-- Remove overly permissive UPDATE policy

-- Drop the public SELECT policy that exposes unused admin codes to everyone
DROP POLICY IF EXISTS "admin_matricules_check_available" ON public.admin_matricules;

-- Drop the overly permissive UPDATE policy (USING true / WITH CHECK true)
DROP POLICY IF EXISTS "admin_matricules_update_system" ON public.admin_matricules;

-- Note: We do NOT create replacement policies here because:
-- 1. SELECT: Matricule validation should happen server-side via edge function only
-- 2. UPDATE: The validate_admin_matricule() function uses SECURITY DEFINER and bypasses RLS
-- This means the admin_matricules table is now completely locked from direct client access
-- All operations must go through the edge function or the database function

-- Restrict grades table to only show basic info to authenticated users
-- Keep permission flags hidden (they can be accessed via join from profiles)
-- The current policy is acceptable since grades are reference data needed for signup

-- Note: The profiles RLS policies are already properly scoped:
-- - users can see their own profile
-- - admins/presidents can see all
-- - chef_service can see profiles in their service
-- These are intentional for the organizational structure