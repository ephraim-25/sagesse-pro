
DROP POLICY IF EXISTS audit_logs_insert_own ON public.audit_logs;

CREATE OR REPLACE FUNCTION public.can_manage_user(_auth_id uuid, _target_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles p JOIN grades g ON g.id = p.grade_id
    WHERE p.auth_id = _auth_id
      AND (g.can_view_all_data = true OR is_manager_of(_auth_id, _target_user_id))
  )
$function$;

DROP POLICY IF EXISTS task_messages_update ON public.task_messages;
CREATE POLICY task_messages_update ON public.task_messages
  FOR UPDATE TO authenticated
  USING (is_task_participant(auth.uid(), task_id) AND sender_id = get_profile_id(auth.uid()))
  WITH CHECK (sender_id = get_profile_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'president'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.auth_id        := OLD.auth_id;
  NEW.grade_id       := OLD.grade_id;
  NEW.custom_grade   := OLD.custom_grade;
  NEW.account_status := OLD.account_status;
  NEW.manager_id     := OLD.manager_id;
  NEW.team_id        := OLD.team_id;
  NEW.superieur_id   := OLD.superieur_id;
  NEW.matricule      := OLD.matricule;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS exports_storage_insert ON storage.objects;
DROP POLICY IF EXISTS exports_storage_select ON storage.objects;
DROP POLICY IF EXISTS justifications_storage_insert ON storage.objects;
DROP POLICY IF EXISTS justifications_storage_select ON storage.objects;

CREATE POLICY documents_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text);
CREATE POLICY documents_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text
         OR public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'president'::public.app_role)));
CREATE POLICY documents_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text
         OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY exports_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text);
CREATE POLICY exports_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'exports' AND ((storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text
         OR public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'president'::public.app_role)));

CREATE POLICY justifications_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'justifications' AND (storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text);
CREATE POLICY justifications_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'justifications' AND ((storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text
         OR public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'president'::public.app_role)));

DROP POLICY IF EXISTS task_chat_attachments_select ON storage.objects;
CREATE POLICY task_chat_attachments_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'task-chat-attachments');

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enroll_agent(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unenroll_agent(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_grade_and_role(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_all_admins(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_action(text, text, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_admin_matricule(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_profile_structure(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_profiles_structure_batch(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_assign_task_to(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_task_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_same_service(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_grade_rank(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_service(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profile_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
