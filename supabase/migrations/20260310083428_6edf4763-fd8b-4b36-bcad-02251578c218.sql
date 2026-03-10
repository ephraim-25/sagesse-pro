
-- Update RLS policy: Directors (rank 3) can only see unassigned Chef de Division and Chef de Bureau
DROP POLICY IF EXISTS profiles_select_available_agents ON public.profiles;

CREATE POLICY profiles_select_available_agents ON public.profiles
  AS RESTRICTIVE
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

-- Update enroll_agent to enforce same restriction for Directors
CREATE OR REPLACE FUNCTION public.enroll_agent(p_agent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_my_rank := public.get_user_grade_rank(v_me);
  IF NOT (v_my_rank <= 5 OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'president'::public.app_role)) THEN
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

  -- Directors (rank 3) can only enroll Chef de Division (rank 4) and Chef de Bureau (rank 5)
  IF v_my_rank = 3 AND v_target_rank > 5 THEN
    RAISE EXCEPTION 'Les directeurs ne peuvent enrôler que des chefs de division et chefs de bureau';
  END IF;

  UPDATE public.profiles
  SET manager_id = v_me
  WHERE id = p_agent_id;
END;
$function$;
