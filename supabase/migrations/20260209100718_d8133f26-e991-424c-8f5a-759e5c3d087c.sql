-- =============================================
-- 1. Adjust rank_order for all grades to make room for Directeur
-- =============================================
UPDATE public.grades SET rank_order = 11 WHERE code = 'custom';
UPDATE public.grades SET rank_order = 10 WHERE code = 'huissier';
UPDATE public.grades SET rank_order = 9 WHERE code = 'aga_2';
UPDATE public.grades SET rank_order = 8 WHERE code = 'aga_1';
UPDATE public.grades SET rank_order = 7 WHERE code = 'ata_2';
UPDATE public.grades SET rank_order = 6 WHERE code = 'ata_1';
UPDATE public.grades SET rank_order = 5 WHERE code = 'chef_bureau';
UPDATE public.grades SET rank_order = 4 WHERE code = 'chef_division';
UPDATE public.grades SET rank_order = 2, can_view_all_data = true WHERE code = 'secretaire_permanent';

-- =============================================
-- 2. Insert Directeur grade at rank 3
-- =============================================
INSERT INTO public.grades (code, label, rank_order, can_approve_accounts, can_manage_team, can_view_all_data, can_force_checkout, can_export_reports, description)
VALUES (
  'directeur',
  'Directeur',
  3,
  true,
  true,
  false,
  true,
  true,
  'Directeur - Accès à sa direction et bureaux subordonnés'
)
ON CONFLICT DO NOTHING;

-- =============================================
-- 3. Add enriched columns to profiles table
-- =============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS lieu_naissance text,
  ADD COLUMN IF NOT EXISTS date_naissance date,
  ADD COLUMN IF NOT EXISTS matricule text,
  ADD COLUMN IF NOT EXISTS niveau_etude text,
  ADD COLUMN IF NOT EXISTS date_engagement date,
  ADD COLUMN IF NOT EXISTS date_notification date,
  ADD COLUMN IF NOT EXISTS date_octroi_matricule date,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS secondary_bureau text;

-- =============================================
-- 4. Insert NTIC and Revue as official bureaus
-- =============================================
INSERT INTO public.teams (name, description, division)
VALUES 
  ('NTIC', 'Cellule des Nouvelles Technologies de l''Information et de la Communication', 'Cellule Spécialisée'),
  ('Revue', 'Cellule de la Revue', 'Cellule Spécialisée')
ON CONFLICT DO NOTHING;

-- =============================================
-- 5. Update admin_update_profile function to handle new fields
-- =============================================
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
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$function$;

-- =============================================
-- 6. Update set_user_grade_and_role to handle Directeur
-- =============================================
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
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'president'::public.app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT g.code::text INTO v_grade_code FROM public.grades g WHERE g.id = p_grade_id;

  IF v_grade_code IS NULL THEN
    RAISE EXCEPTION 'Grade not found';
  END IF;

  UPDATE public.profiles
  SET grade_id = p_grade_id, custom_grade = NULL
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  v_role := CASE
    WHEN v_grade_code = 'president_conseil' THEN 'president'::public.app_role
    WHEN v_grade_code = 'secretaire_permanent' THEN 'admin'::public.app_role
    WHEN v_grade_code = 'directeur' THEN 'chef_service'::public.app_role
    WHEN v_grade_code IN ('chef_division', 'chef_bureau') THEN 'chef_service'::public.app_role
    ELSE 'agent'::public.app_role
  END;

  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, v_role);
END;
$function$;

-- =============================================
-- 7. Update handle_new_user to handle Directeur
-- =============================================
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
  requested_grade_code := COALESCE(NEW.raw_user_meta_data->>'grade_code', 'agent');
  
  SELECT * INTO grade_record FROM grades WHERE code::text = requested_grade_code;
  
  IF grade_record.rank_order <= 3 THEN
    needs_approval := true;
  END IF;
  
  INSERT INTO public.profiles (
    auth_id, nom, prenom, email, grade_id, custom_grade, account_status
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
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new_profile_id, 
    CASE 
      WHEN requested_grade_code = 'president_conseil' THEN 'president'::app_role
      WHEN requested_grade_code = 'secretaire_permanent' THEN 'admin'::app_role
      WHEN requested_grade_code = 'directeur' THEN 'chef_service'::app_role
      WHEN requested_grade_code IN ('chef_division', 'chef_bureau') THEN 'chef_service'::app_role
      ELSE 'agent'::app_role
    END
  );
  
  IF needs_approval THEN
    INSERT INTO public.approvals (target_user_id, type, ref_table, status)
    VALUES (new_profile_id, 'account_creation', 'profiles', 'pending');
    
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