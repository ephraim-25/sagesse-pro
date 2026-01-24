-- Update RLS policies for hierarchical task security

-- Drop existing task policies
DROP POLICY IF EXISTS "taches_select" ON public.taches;
DROP POLICY IF EXISTS "taches_insert" ON public.taches;
DROP POLICY IF EXISTS "taches_update" ON public.taches;

-- Create a function to check if user can assign tasks to a specific profile
CREATE OR REPLACE FUNCTION public.can_assign_task_to(_auth_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_auth_id, 'admin')
    OR has_role(_auth_id, 'president')
    OR (has_role(_auth_id, 'chef_service') AND is_manager_of(_auth_id, _target_user_id))
$$;

-- SELECT: Users can see tasks they created, are assigned to, or manage
CREATE POLICY "taches_select_hierarchical" ON public.taches
FOR SELECT TO authenticated
USING (
  created_by = get_profile_id(auth.uid())
  OR assigned_to = get_profile_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'president')
  OR (has_role(auth.uid(), 'chef_service') AND is_manager_of(auth.uid(), assigned_to))
);

-- INSERT: Only chef_service can insert to their direct reports
CREATE POLICY "taches_insert_hierarchical" ON public.taches
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'president')
  OR (has_role(auth.uid(), 'chef_service') AND can_assign_task_to(auth.uid(), assigned_to))
);

-- UPDATE: Creator, assignee, or manager can update
CREATE POLICY "taches_update_hierarchical" ON public.taches
FOR UPDATE TO authenticated
USING (
  created_by = get_profile_id(auth.uid())
  OR assigned_to = get_profile_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'chef_service') AND is_manager_of(auth.uid(), assigned_to))
);

-- Prevent self-assignment trigger
CREATE OR REPLACE FUNCTION public.prevent_self_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'Cannot assign yourself as your own manager';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_assignment_trigger ON public.profiles;
CREATE TRIGGER prevent_self_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_assignment();