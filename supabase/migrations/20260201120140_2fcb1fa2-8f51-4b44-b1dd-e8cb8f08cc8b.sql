-- Fix enrollment RLS: accept Chef de Bureau by role OR by grade rank (in case role/grade drift)

-- SELECT: available agents
DROP POLICY IF EXISTS "profiles_select_available_agents" ON public.profiles;
CREATE POLICY "profiles_select_available_agents"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  manager_id IS NULL
  AND (
    has_role(auth.uid(), 'chef_service'::app_role)
    OR public.get_user_grade_rank(public.get_profile_id(auth.uid())) <= 4
  )
  AND public.get_user_grade_rank(id) > public.get_user_grade_rank(public.get_profile_id(auth.uid()))
);

-- UPDATE: enroll/remove by Chef de Bureau
DROP POLICY IF EXISTS "profiles_update_manager_assignment" ON public.profiles;
CREATE POLICY "profiles_update_manager_assignment"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  (
    has_role(auth.uid(), 'chef_service'::app_role)
    OR public.get_user_grade_rank(public.get_profile_id(auth.uid())) <= 4
  )
  AND (manager_id IS NULL OR manager_id = public.get_profile_id(auth.uid()))
  AND public.get_user_grade_rank(id) > public.get_user_grade_rank(public.get_profile_id(auth.uid()))
)
WITH CHECK (
  (
    has_role(auth.uid(), 'chef_service'::app_role)
    OR public.get_user_grade_rank(public.get_profile_id(auth.uid())) <= 4
  )
  AND (manager_id = public.get_profile_id(auth.uid()) OR manager_id IS NULL)
);
