-- 1) Backfill: ensure Chef de Bureau / Chef de Division profiles have chef_service role
-- Only adjusts users missing chef_service.

DO $$
BEGIN
  -- Remove 'agent' role for bureau/division chiefs if they don't already have chef_service
  DELETE FROM public.user_roles ur
  USING public.profiles p
  JOIN public.grades g ON g.id = p.grade_id
  WHERE ur.user_id = p.id
    AND g.code IN ('chef_bureau', 'chef_division')
    AND ur.role = 'agent'::public.app_role
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.id AND ur2.role = 'chef_service'::public.app_role
    );

  -- Add chef_service role when missing
  INSERT INTO public.user_roles (user_id, role)
  SELECT p.id, 'chef_service'::public.app_role
  FROM public.profiles p
  JOIN public.grades g ON g.id = p.grade_id
  WHERE g.code IN ('chef_bureau', 'chef_division')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'chef_service'::public.app_role
    );
END $$;

-- 2) Atomic admin operation: set grade + set corresponding role
CREATE OR REPLACE FUNCTION public.set_user_grade_and_role(
  p_user_id uuid,
  p_grade_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade_code text;
  v_role public.app_role;
BEGIN
  -- Only admins/president can change grades
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'president'::public.app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT g.code::text
    INTO v_grade_code
  FROM public.grades g
  WHERE g.id = p_grade_id;

  IF v_grade_code IS NULL THEN
    RAISE EXCEPTION 'Grade not found';
  END IF;

  -- Update profile grade
  UPDATE public.profiles
  SET grade_id = p_grade_id,
      custom_grade = NULL
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Map grade -> role
  v_role := CASE
    WHEN v_grade_code = 'president_conseil' THEN 'president'::public.app_role
    WHEN v_grade_code = 'secretaire_permanent' THEN 'admin'::public.app_role
    WHEN v_grade_code IN ('chef_division', 'chef_bureau') THEN 'chef_service'::public.app_role
    ELSE 'agent'::public.app_role
  END;

  -- Replace roles (avoid privilege escalation)
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, v_role);
END;
$$;