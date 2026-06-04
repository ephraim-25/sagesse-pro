
-- =====================================================
-- 1) SKILLS DIRECTORY (catalogue géré par Super Admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.skills_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, label)
);

GRANT SELECT ON public.skills_directory TO authenticated;
GRANT ALL ON public.skills_directory TO service_role;

ALTER TABLE public.skills_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY skills_directory_select_auth ON public.skills_directory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY skills_directory_insert_super ON public.skills_directory
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY skills_directory_update_super ON public.skills_directory
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY skills_directory_delete_super ON public.skills_directory
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER skills_directory_updated_at
  BEFORE UPDATE ON public.skills_directory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed catalogue initial
INSERT INTO public.skills_directory (category, label, sort_order) VALUES
('Santé & Médical', 'Soins infirmiers d''urgence', 1),
('Santé & Médical', 'Gestion de pharmacie / dispensaire', 2),
('Santé & Médical', 'Premiers secours', 3),
('Santé & Médical', 'Suivi médical du travail', 4),
('Santé & Médical', 'Hygiène et sécurité sanitaire', 5),
('Logistique & Transport', 'Conduite sécurisée (véhicules légers)', 1),
('Logistique & Transport', 'Conduite VIP / protocole', 2),
('Logistique & Transport', 'Mécanique automobile (maintenance)', 3),
('Logistique & Transport', 'Mécanique automobile (diagnostic)', 4),
('Logistique & Transport', 'Gestion de flotte', 5),
('Logistique & Transport', 'Logistique d''événements officiels', 6),
('Logistique & Transport', 'Gestion d''entrepôt / magasin', 7),
('Médias, Édition & Communication', 'Journalisme d''investigation', 1),
('Médias, Édition & Communication', 'Rédaction d''articles', 2),
('Médias, Édition & Communication', 'Correcteur / écrivain public', 3),
('Médias, Édition & Communication', 'Relations presse', 4),
('Médias, Édition & Communication', 'Photographie', 5),
('Médias, Édition & Communication', 'Caméraman / prise de vue', 6),
('Médias, Édition & Communication', 'Montage vidéo', 7),
('Médias, Édition & Communication', 'Community management institutionnel', 8),
('Médias, Édition & Communication', 'Communication institutionnelle', 9),
('Administration & Secrétariat', 'Secrétariat de direction', 1),
('Administration & Secrétariat', 'Accueil et protocole d''État', 2),
('Administration & Secrétariat', 'Rédaction administrative', 3),
('Administration & Secrétariat', 'Archivage institutionnel', 4),
('Administration & Secrétariat', 'Gestion des dossiers agents', 5),
('Administration & Secrétariat', 'Organisation de réunions officielles', 6),
('Économie, Finances & Droit', 'Comptabilité publique', 1),
('Économie, Finances & Droit', 'Gestion budgétaire', 2),
('Économie, Finances & Droit', 'Analyse financière', 3),
('Économie, Finances & Droit', 'Marchés publics', 4),
('Économie, Finances & Droit', 'Droit public', 5),
('Économie, Finances & Droit', 'Contentieux administratif', 6),
('Économie, Finances & Droit', 'Audit interne', 7),
('Recherche & Science', 'Méthodologie de recherche', 1),
('Recherche & Science', 'Rédaction scientifique', 2),
('Recherche & Science', 'Analyse statistique', 3),
('Recherche & Science', 'Gestion de projets scientifiques', 4),
('Recherche & Science', 'Veille documentaire', 5),
('Technique & Numérique', 'Maintenance informatique', 1),
('Technique & Numérique', 'Gestion des réseaux', 2),
('Technique & Numérique', 'Support technique utilisateurs', 3),
('Technique & Numérique', 'Développement d''applications', 4),
('Technique & Numérique', 'Cybersécurité', 5),
('Technique & Numérique', 'Gestion documentaire numérique', 6),
('Technique & Numérique', 'Bureautique avancée (Word/Excel/PowerPoint)', 7),
('Management & Leadership', 'Leadership institutionnel', 1),
('Management & Leadership', 'Gestion d''équipe', 2),
('Management & Leadership', 'Conduite de réunions', 3),
('Management & Leadership', 'Prise de décision', 4),
('Management & Leadership', 'Résolution de conflits', 5),
('Langues', 'Français (rédaction)', 1),
('Langues', 'Anglais (technique)', 2),
('Langues', 'Lingala', 3),
('Langues', 'Swahili', 4),
('Langues', 'Kikongo', 5),
('Langues', 'Tshiluba', 6)
ON CONFLICT (category, label) DO NOTHING;

-- =====================================================
-- 2) USER_COMPETENCES (table de liaison user <-> skill)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_competences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills_directory(id) ON DELETE CASCADE,
  level smallint NOT NULL DEFAULT 3 CHECK (level IN (2,3,5)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS user_competences_user_idx ON public.user_competences(user_id);
CREATE INDEX IF NOT EXISTS user_competences_skill_idx ON public.user_competences(skill_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_competences TO authenticated;
GRANT ALL ON public.user_competences TO service_role;

ALTER TABLE public.user_competences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_competences_select_restricted ON public.user_competences
  FOR SELECT TO authenticated USING (
    user_id = public.get_profile_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'president'::public.app_role)
    OR public.is_manager_of(auth.uid(), user_id)
  );

CREATE POLICY user_competences_insert_own ON public.user_competences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY user_competences_update_own ON public.user_competences
  FOR UPDATE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()))
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY user_competences_delete_own ON public.user_competences
  FOR DELETE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY user_competences_admin_all ON public.user_competences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER user_competences_updated_at
  BEFORE UPDATE ON public.user_competences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3) BATCH RESOLVE STRUCTURE (perf /competences)
-- =====================================================
CREATE OR REPLACE FUNCTION public.resolve_profiles_structure_batch(p_ids uuid[])
RETURNS TABLE(profile_id uuid, bureau text, division text, direction text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  r record;
BEGIN
  FOREACH v_id IN ARRAY p_ids LOOP
    SELECT b.bureau, b.division, b.direction
      INTO r
    FROM public.resolve_profile_structure(v_id) b;
    profile_id := v_id;
    bureau := r.bureau;
    division := r.division;
    direction := r.direction;
    RETURN NEXT;
  END LOOP;
END;
$$;
