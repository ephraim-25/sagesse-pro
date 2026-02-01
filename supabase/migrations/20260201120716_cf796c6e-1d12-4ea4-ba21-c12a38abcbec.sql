-- Secure enrollment via backend functions instead of broad UPDATE rights on profiles

-- 1) Remove broad UPDATE policy for chef_service enrollment (we'll use RPC functions)
DROP POLICY IF EXISTS "profiles_update_manager_assignment" ON public.profiles;

-- 2) Allow a manager to SELECT their direct reports (needed after enrollment)
DROP POLICY IF EXISTS "profiles_select_manager_team" ON public.profiles;
CREATE POLICY "profiles_select_manager_team"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  manager_id = public.get_profile_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'president'::public.app_role)
);

-- 3) Enrollment RPC: only updates manager_id (prevents privilege escalation)
CREATE OR REPLACE FUNCTION public.enroll_agent(
  p_agent_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_my_rank int;
  v_target_rank int;
  v_current_manager uuid;
BEGIN
  v_me := public.get_profile_id(auth.uid());
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only Chef de Bureau (rank<=4) OR admin/president
  v_my_rank := public.get_user_grade_rank(v_me);
  IF NOT (v_my_rank <= 4 OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'president'::public.app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT manager_id INTO v_current_manager
  FROM public.profiles
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile not found';
  END IF;

  IF v_current_manager IS NOT NULL THEN
    RAISE EXCEPTION 'Agent already assigned';
  END IF;

  v_target_rank := public.get_user_grade_rank(p_agent_id);
  IF NOT (v_target_rank > v_my_rank) THEN
    RAISE EXCEPTION 'Cannot enroll a superior or equal rank';
  END IF;

  UPDATE public.profiles
  SET manager_id = v_me
  WHERE id = p_agent_id;
END;
$$;

-- 4) Unenrollment RPC
CREATE OR REPLACE FUNCTION public.unenroll_agent(
  p_agent_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_is_admin boolean;
  v_is_president boolean;
BEGIN
  v_me := public.get_profile_id(auth.uid());
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  v_is_president := public.has_role(auth.uid(), 'president'::public.app_role);

  -- Allow removal by the current manager or admin/president
  IF NOT (v_is_admin OR v_is_president) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = p_agent_id AND p.manager_id = v_me
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  UPDATE public.profiles
  SET manager_id = NULL,
      team_id = NULL
  WHERE id = p_agent_id;
END;
$$;
