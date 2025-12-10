-- Fix: Change all profiles SELECT policies to use 'authenticated' role instead of 'public'
-- This prevents anonymous users from querying employee data

-- Drop existing policies that use 'public' role
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_select_admin ON profiles;
DROP POLICY IF EXISTS profiles_select_president ON profiles;
DROP POLICY IF EXISTS profiles_select_chef_service ON profiles;

-- Recreate policies with 'authenticated' role
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY profiles_select_president ON profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'president'::app_role));

CREATE POLICY profiles_select_chef_service ON profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'chef_service'::app_role) AND is_same_service(auth.uid(), id));