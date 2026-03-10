
-- Fix: Make profiles_select_available_agents PERMISSIVE (not RESTRICTIVE)
-- A RESTRICTIVE policy blocks rows even when other PERMISSIVE policies allow them
DROP POLICY IF EXISTS profiles_select_available_agents ON public.profiles;

CREATE POLICY profiles_select_available_agents ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    manager_id IS NULL
    AND (
      has_role(auth.uid(), 'chef_service'::app_role)
      OR (get_user_grade_rank(get_profile_id(auth.uid())) <= 5)
    )
    AND get_user_grade_rank(id) > get_user_grade_rank(get_profile_id(auth.uid()))
    AND (
      get_user_grade_rank(get_profile_id(auth.uid())) != 3
      OR get_user_grade_rank(id) <= 5
    )
  );
