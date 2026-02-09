
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_id uuid;
BEGIN
  -- Only admins can delete users
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get the auth_id before deleting
  SELECT auth_id INTO v_auth_id FROM public.profiles WHERE id = p_user_id;
  
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete related data first
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id OR sender_id = p_user_id;
  DELETE FROM public.approvals WHERE target_user_id = p_user_id OR approver_id = p_user_id;
  DELETE FROM public.competences WHERE user_id = p_user_id;
  DELETE FROM public.performances WHERE user_id = p_user_id;
  DELETE FROM public.presences WHERE user_id = p_user_id;
  DELETE FROM public.teletravail_logs WHERE user_id = p_user_id;
  DELETE FROM public.telework_sessions WHERE user_id = p_user_id;
  DELETE FROM public.taches WHERE assigned_to = p_user_id OR created_by = p_user_id;
  DELETE FROM public.timesheets WHERE user_id = p_user_id;
  DELETE FROM public.audit_logs WHERE user_id = p_user_id;
  DELETE FROM public.roles_organisationnels WHERE user_id = p_user_id;
  DELETE FROM public.exports WHERE requested_by = p_user_id;
  
  -- Clear manager references
  UPDATE public.profiles SET manager_id = NULL WHERE manager_id = p_user_id;
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = p_user_id;
  
  -- Delete from auth.users (complete removal)
  DELETE FROM auth.users WHERE id = v_auth_id;
END;
$function$;
