-- Allow chef_service users to update manager_id for agents they can view (unassigned, lower grade)
-- This enables the "Enrôler" functionality in /mon-bureau

CREATE POLICY "profiles_update_manager_assignment"
ON public.profiles
FOR UPDATE
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
  -- Ensure the new manager_id is the current user's profile id
  manager_id = public.get_profile_id(auth.uid())
  OR manager_id IS NULL
);