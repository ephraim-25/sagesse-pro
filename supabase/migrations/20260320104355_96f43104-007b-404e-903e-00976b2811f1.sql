
-- Replace can_assign_task_to to support hierarchical (indirect) assignment
CREATE OR REPLACE FUNCTION public.can_assign_task_to(_auth_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    has_role(_auth_id, 'admin'::app_role)
    OR has_role(_auth_id, 'president'::app_role)
    OR (
      has_role(_auth_id, 'chef_service'::app_role) 
      AND (
        -- Direct manager check
        is_manager_of(_auth_id, _target_user_id)
        -- Indirect: target's manager is managed by me
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = _target_user_id
          AND p.manager_id IN (
            SELECT id FROM profiles WHERE manager_id = get_profile_id(_auth_id)
          )
        )
      )
    )
$$;
