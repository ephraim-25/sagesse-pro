-- Add double affectation columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS double_affectation TEXT,
  ADD COLUMN IF NOT EXISTS fonction_double_affectation TEXT;

-- Allow admin_update_profile to handle these new fields
CREATE OR REPLACE FUNCTION public.admin_update_profile(p_user_id uuid, p_updates jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET
    nom = COALESCE(p_updates->>'nom', nom),
    prenom = COALESCE(p_updates->>'prenom', prenom),
    postnom = COALESCE(p_updates->>'postnom', postnom),
    email = COALESCE(p_updates->>'email', email),
    telephone = COALESCE(p_updates->>'telephone', telephone),
    fonction = COALESCE(p_updates->>'fonction', fonction),
    service = COALESCE(p_updates->>'service', service),
    direction = COALESCE(p_updates->>'direction', direction),
    lieu_naissance = COALESCE(p_updates->>'lieu_naissance', lieu_naissance),
    date_naissance = COALESCE((p_updates->>'date_naissance')::date, date_naissance),
    matricule = COALESCE(p_updates->>'matricule', matricule),
    niveau_etude = COALESCE(p_updates->>'niveau_etude', niveau_etude),
    date_engagement = COALESCE((p_updates->>'date_engagement')::date, date_engagement),
    date_notification = COALESCE((p_updates->>'date_notification')::date, date_notification),
    date_octroi_matricule = COALESCE((p_updates->>'date_octroi_matricule')::date, date_octroi_matricule),
    secondary_bureau = COALESCE(p_updates->>'secondary_bureau', secondary_bureau),
    double_affectation = COALESCE(p_updates->>'double_affectation', double_affectation),
    fonction_double_affectation = COALESCE(p_updates->>'fonction_double_affectation', fonction_double_affectation),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$function$;

-- Fix storage RLS for task-documents: allow any authenticated user to upload/manage
-- (RLS on the taches table already controls who can attach docs to a task)
DROP POLICY IF EXISTS task_documents_insert_management ON storage.objects;
DROP POLICY IF EXISTS task_documents_update_management ON storage.objects;
DROP POLICY IF EXISTS task_documents_delete_management ON storage.objects;

CREATE POLICY task_documents_insert_authenticated
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-documents');

CREATE POLICY task_documents_update_authenticated
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-documents');

CREATE POLICY task_documents_delete_authenticated
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'task-documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'president'::app_role)
    OR has_role(auth.uid(), 'chef_service'::app_role)
    OR owner = auth.uid()
  )
);