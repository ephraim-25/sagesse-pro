
-- 1. Task chat attachments: enforce task participation on insert/select
DROP POLICY IF EXISTS task_chat_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS task_chat_attachments_select ON storage.objects;

CREATE POLICY task_chat_attachments_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.taches t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.created_by = public.get_profile_id(auth.uid())
        OR t.assigned_to = public.get_profile_id(auth.uid())
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'president'::public.app_role)
      )
  )
);

CREATE POLICY task_chat_attachments_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.taches t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.created_by = public.get_profile_id(auth.uid())
        OR t.assigned_to = public.get_profile_id(auth.uid())
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'president'::public.app_role)
      )
  )
);

-- 2. DELETE policies for exports and justifications buckets (owner folder + admins)
CREATE POLICY exports_storage_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'exports'
  AND (
    (storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY justifications_storage_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'justifications'
  AND (
    (storage.foldername(name))[1] = (public.get_profile_id(auth.uid()))::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 3. Defense-in-depth: restrictive RLS policy on profiles UPDATE
-- Prevents non-admin/non-president users from changing privileged columns
-- even if the prevent_profile_privilege_escalation trigger is bypassed.
DROP POLICY IF EXISTS profiles_update_no_privilege_escalation ON public.profiles;

CREATE POLICY profiles_update_no_privilege_escalation
ON public.profiles
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'president'::public.app_role)
  OR (
    grade_id IS NOT DISTINCT FROM (SELECT grade_id FROM public.profiles WHERE id = profiles.id)
    AND account_status IS NOT DISTINCT FROM (SELECT account_status FROM public.profiles WHERE id = profiles.id)
    AND manager_id IS NOT DISTINCT FROM (SELECT manager_id FROM public.profiles WHERE id = profiles.id)
    AND team_id IS NOT DISTINCT FROM (SELECT team_id FROM public.profiles WHERE id = profiles.id)
    AND superieur_id IS NOT DISTINCT FROM (SELECT superieur_id FROM public.profiles WHERE id = profiles.id)
    AND auth_id IS NOT DISTINCT FROM (SELECT auth_id FROM public.profiles WHERE id = profiles.id)
    AND matricule IS NOT DISTINCT FROM (SELECT matricule FROM public.profiles WHERE id = profiles.id)
    AND custom_grade IS NOT DISTINCT FROM (SELECT custom_grade FROM public.profiles WHERE id = profiles.id)
  )
);
