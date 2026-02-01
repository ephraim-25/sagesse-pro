-- Allow chef_service users (Chef de Bureau, Chef de Division) to view available agents
-- (agents who have no manager assigned and are at a lower grade level)
-- This enables the "Agents Disponibles" tab in /mon-bureau to work properly

CREATE POLICY "profiles_select_available_agents"
ON public.profiles
FOR SELECT
USING (
  -- Only applies if viewing profiles without a manager (available for assignment)
  manager_id IS NULL
  AND
  -- The viewer must have chef_service role
  has_role(auth.uid(), 'chef_service'::app_role)
  AND
  -- Only show profiles with lower grade rank than the viewer
  -- (prevents a bureau chief from seeing presidents/division chiefs as "available")
  public.get_user_grade_rank(id) > public.get_user_grade_rank(public.get_profile_id(auth.uid()))
);