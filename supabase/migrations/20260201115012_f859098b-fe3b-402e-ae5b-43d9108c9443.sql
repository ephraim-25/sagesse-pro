-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "profiles_update_manager_assignment" ON public.profiles;

-- Create a PERMISSIVE policy for chef_service to update manager_id
CREATE POLICY "profiles_update_manager_assignment"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  -- The viewer must have chef_service role
  has_role(auth.uid(), 'chef_service'::app_role)
  AND
  -- Can only update profiles currently without a manager OR already managed by them
  (manager_id IS NULL OR manager_id = public.get_profile_id(auth.uid()))
  AND
  -- Only update profiles with lower grade rank
  public.get_user_grade_rank(id) > public.get_user_grade_rank(public.get_profile_id(auth.uid()))
)
WITH CHECK (
  -- Ensure the new manager_id is the current user's profile id (enrollment)
  -- OR null (removal from team)
  (manager_id = public.get_profile_id(auth.uid()) OR manager_id IS NULL)
  AND
  -- Must still have chef_service role
  has_role(auth.uid(), 'chef_service'::app_role)
);