-- Add RLS policy for admin to delete profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'profiles_delete_admin'
  ) THEN
    CREATE POLICY "profiles_delete_admin"
    ON public.profiles
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

-- Update set_user_grade_and_role to handle directeur
CREATE OR REPLACE FUNCTION public.set_user_grade_and_role(p_user_id uuid, p_grade_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Map grade -> role (including directeur)
  v_role := CASE
    WHEN v_grade_code = 'president_conseil' THEN 'president'::public.app_role
    WHEN v_grade_code IN ('secretaire_permanent', 'directeur') THEN 'admin'::public.app_role
    WHEN v_grade_code IN ('chef_division', 'chef_bureau') THEN 'chef_service'::public.app_role
    ELSE 'agent'::public.app_role
  END;

  -- Replace roles (avoid privilege escalation)
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, v_role);
END;
$function$;

-- Update handle_new_user to include directeur mapping
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_profile_id UUID;
  requested_grade_code TEXT;
  grade_record RECORD;
  needs_approval BOOLEAN := false;
BEGIN
  -- Récupérer le grade demandé
  requested_grade_code := COALESCE(NEW.raw_user_meta_data->>'grade_code', 'agent');
  
  -- Vérifier si le grade nécessite une approbation
  SELECT * INTO grade_record FROM grades WHERE code::text = requested_grade_code;
  
  IF grade_record.rank_order <= 3 THEN
    needs_approval := true;
  END IF;
  
  -- Créer le profil
  INSERT INTO public.profiles (
    auth_id, 
    nom, 
    prenom, 
    email,
    grade_id,
    custom_grade,
    account_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', 'Nouveau'),
    COALESCE(NEW.raw_user_meta_data->>'prenom', 'Utilisateur'),
    NEW.email,
    grade_record.id,
    CASE WHEN requested_grade_code = 'custom' THEN NEW.raw_user_meta_data->>'custom_grade' ELSE NULL END,
    CASE WHEN needs_approval THEN 'pending_approval'::account_status ELSE 'active'::account_status END
  )
  RETURNING id INTO new_profile_id;
  
  -- Attribuer le rôle en fonction du grade (including directeur)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new_profile_id, 
    CASE 
      WHEN requested_grade_code = 'president_conseil' THEN 'president'::app_role
      WHEN requested_grade_code IN ('secretaire_permanent', 'directeur') THEN 'admin'::app_role
      WHEN requested_grade_code IN ('chef_division', 'chef_bureau') THEN 'chef_service'::app_role
      ELSE 'agent'::app_role
    END
  );
  
  -- Créer une demande d'approbation si nécessaire
  IF needs_approval THEN
    INSERT INTO public.approvals (target_user_id, type, ref_table, status)
    VALUES (new_profile_id, 'account_creation', 'profiles', 'pending');
    
    -- Notifier les administrateurs
    INSERT INTO public.notifications (user_id, title, body, type, meta)
    SELECT 
      p.id,
      'Nouvelle demande d''approbation de compte',
      'Un nouvel utilisateur avec le grade ' || grade_record.label || ' demande l''activation de son compte.',
      'approval_request',
      jsonb_build_object('target_user_id', new_profile_id, 'grade', grade_record.label)
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role IN ('admin', 'president');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create an RPC function for admin to update any profile field
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can update any profile
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
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$function$;

-- Create an RPC function for admin to delete a user
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

  -- Delete from profiles (cascades to related tables)
  DELETE FROM public.profiles WHERE id = p_user_id;
  
  -- Note: The auth.users entry should be deleted separately via admin API if needed
END;
$function$;