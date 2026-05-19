
-- 1. Add hierarchical FK and structure columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS superieur_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nom_direction text,
  ADD COLUMN IF NOT EXISTS nom_division text,
  ADD COLUMN IF NOT EXISTS nom_bureau text;

CREATE INDEX IF NOT EXISTS idx_profiles_superieur_id ON public.profiles(superieur_id);

-- 2. Prevent self-reference and obvious cycles
CREATE OR REPLACE FUNCTION public.prevent_superieur_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cursor uuid;
  v_depth int := 0;
BEGIN
  IF NEW.superieur_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.superieur_id = NEW.id THEN
    RAISE EXCEPTION 'Un profil ne peut pas être son propre supérieur';
  END IF;

  v_cursor := NEW.superieur_id;
  WHILE v_cursor IS NOT NULL AND v_depth < 20 LOOP
    IF v_cursor = NEW.id THEN
      RAISE EXCEPTION 'Cycle hiérarchique détecté';
    END IF;
    SELECT superieur_id INTO v_cursor FROM public.profiles WHERE id = v_cursor;
    v_depth := v_depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_superieur_cycle ON public.profiles;
CREATE TRIGGER trg_prevent_superieur_cycle
  BEFORE INSERT OR UPDATE OF superieur_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_superieur_cycle();

-- 3. Resolver function: walk up the hierarchy and return effective bureau/division/direction
CREATE OR REPLACE FUNCTION public.resolve_profile_structure(p_profile_id uuid)
RETURNS TABLE(bureau text, division text, direction text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bureau text;
  v_division text;
  v_direction text;
  v_cursor uuid := p_profile_id;
  v_depth int := 0;
  v_nom_bureau text;
  v_nom_division text;
  v_nom_direction text;
  v_grade_code text;
BEGIN
  WHILE v_cursor IS NOT NULL AND v_depth < 10 LOOP
    SELECT p.nom_bureau, p.nom_division, p.nom_direction, g.code::text, p.superieur_id
      INTO v_nom_bureau, v_nom_division, v_nom_direction, v_grade_code, v_cursor
    FROM public.profiles p
    LEFT JOIN public.grades g ON g.id = p.grade_id
    WHERE p.id = v_cursor;

    IF v_bureau IS NULL AND v_nom_bureau IS NOT NULL THEN
      v_bureau := v_nom_bureau;
    END IF;
    IF v_division IS NULL AND v_nom_division IS NOT NULL THEN
      v_division := v_nom_division;
    END IF;
    IF v_direction IS NULL AND v_nom_direction IS NOT NULL THEN
      v_direction := v_nom_direction;
    END IF;

    v_depth := v_depth + 1;
  END LOOP;

  RETURN QUERY SELECT v_bureau, v_division, v_direction;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_profile_structure(uuid) TO authenticated;

-- 4. Allow users to update their own superieur_id / structure columns via RLS (profiles_update_own already covers; ensure admin update RPC accepts new fields)
CREATE OR REPLACE FUNCTION public.admin_update_profile(p_user_id uuid, p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    nom_direction = COALESCE(p_updates->>'nom_direction', nom_direction),
    nom_division = COALESCE(p_updates->>'nom_division', nom_division),
    nom_bureau = COALESCE(p_updates->>'nom_bureau', nom_bureau),
    superieur_id = COALESCE(NULLIF(p_updates->>'superieur_id','')::uuid, superieur_id),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$$;
