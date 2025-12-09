-- =============================================
-- SIGC - Schéma de base de données complet
-- =============================================

-- 1. ENUMS
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'president', 'chef_service', 'agent');
CREATE TYPE public.statut_utilisateur AS ENUM ('actif', 'suspendu');
CREATE TYPE public.niveau_competence AS ENUM ('1', '2', '3', '4', '5');
CREATE TYPE public.priorite_tache AS ENUM ('faible', 'moyen', 'eleve', 'urgente');
CREATE TYPE public.statut_tache AS ENUM ('a_faire', 'en_cours', 'en_pause', 'termine');
CREATE TYPE public.type_presence AS ENUM ('presentiel', 'teletravail');
CREATE TYPE public.statut_teletravail AS ENUM ('connecte', 'pause', 'hors_ligne');

-- 2. TABLE PROFILES (users)
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  postnom TEXT,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telephone TEXT,
  fonction TEXT,
  service TEXT,
  statut statut_utilisateur DEFAULT 'actif',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_auth_id ON public.profiles(auth_id);
CREATE INDEX idx_profiles_service ON public.profiles(service);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 3. TABLE USER_ROLES (séparée pour sécurité)
-- =============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- 4. TABLE COMPETENCES
-- =============================================

CREATE TABLE public.competences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  competence TEXT NOT NULL,
  niveau INTEGER CHECK (niveau >= 1 AND niveau <= 5) DEFAULT 1,
  justification TEXT,
  date_evaluation DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_competences_user_id ON public.competences(user_id);

-- 5. TABLE ROLES_ORGANISATIONNELS
-- =============================================

CREATE TABLE public.roles_organisationnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  niveau_responsabilite INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_roles_org_user_id ON public.roles_organisationnels(user_id);

-- 6. TABLE PRESENCES (présentiel)
-- =============================================

CREATE TABLE public.presences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  heure_entree TIMESTAMPTZ,
  heure_sortie TIMESTAMPTZ,
  type type_presence DEFAULT 'presentiel',
  appareil TEXT,
  localisation_generale TEXT,
  justification_retard TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_presences_user_id ON public.presences(user_id);
CREATE INDEX idx_presences_date ON public.presences(date);

-- 7. TABLE TELETRAVAIL_LOGS
-- =============================================

CREATE TABLE public.teletravail_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  statut statut_teletravail DEFAULT 'hors_ligne',
  activite_declaree TEXT,
  localisation_generale TEXT,
  duree_active_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_teletravail_user_id ON public.teletravail_logs(user_id);
CREATE INDEX idx_teletravail_date ON public.teletravail_logs(date);

-- 8. TABLE TACHES
-- =============================================

CREATE TABLE public.taches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  priorite priorite_tache DEFAULT 'moyen',
  statut statut_tache DEFAULT 'a_faire',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date_limite DATE,
  date_debut DATE,
  date_fin DATE,
  progression INTEGER DEFAULT 0 CHECK (progression >= 0 AND progression <= 100),
  documents_lies TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_taches_created_by ON public.taches(created_by);
CREATE INDEX idx_taches_assigned_to ON public.taches(assigned_to);
CREATE INDEX idx_taches_statut ON public.taches(statut);
CREATE INDEX idx_taches_priorite ON public.taches(priorite);

-- 9. TABLE PERFORMANCES
-- =============================================

CREATE TABLE public.performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  periode TEXT NOT NULL,
  score_productivite DECIMAL(5,2) DEFAULT 0,
  taux_presence DECIMAL(5,2) DEFAULT 0,
  taux_teletravail_actif DECIMAL(5,2) DEFAULT 0,
  nombre_taches_terminees INTEGER DEFAULT 0,
  evaluations_automatiques JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_performances_user_id ON public.performances(user_id);
CREATE INDEX idx_performances_periode ON public.performances(periode);

-- 10. TABLE AUDIT_LOGS
-- =============================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_cible TEXT,
  ancienne_valeur JSONB,
  nouvelle_valeur JSONB,
  ip_address TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 11. FONCTION SECURITY DEFINER - Vérification des rôles
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.auth_id = _user_id
      AND ur.role = _role
  )
$$;

-- Fonction pour obtenir le profile_id depuis auth_id
CREATE OR REPLACE FUNCTION public.get_profile_id(_auth_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_id = _auth_id LIMIT 1
$$;

-- Fonction pour obtenir le service de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_service(_auth_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service FROM public.profiles WHERE auth_id = _auth_id LIMIT 1
$$;

-- Fonction pour vérifier si chef de service
CREATE OR REPLACE FUNCTION public.is_same_service(_auth_id UUID, _target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1, public.profiles p2
    WHERE p1.auth_id = _auth_id
      AND p2.id = _target_user_id
      AND p1.service = p2.service
  )
$$;

-- 12. TRIGGER - Mise à jour updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competences_updated_at
  BEFORE UPDATE ON public.competences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_org_updated_at
  BEFORE UPDATE ON public.roles_organisationnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_presences_updated_at
  BEFORE UPDATE ON public.presences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teletravail_updated_at
  BEFORE UPDATE ON public.teletravail_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_taches_updated_at
  BEFORE UPDATE ON public.taches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. TRIGGER - Création automatique du profil après inscription
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  INSERT INTO public.profiles (auth_id, nom, prenom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', 'Nouveau'),
    COALESCE(NEW.raw_user_meta_data->>'prenom', 'Utilisateur'),
    NEW.email
  )
  RETURNING id INTO new_profile_id;
  
  -- Attribuer le rôle agent par défaut
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_profile_id, 'agent');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. FONCTION - Enregistrement audit
-- =============================================

CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_action TEXT,
  p_table_cible TEXT,
  p_ancienne_valeur JSONB DEFAULT NULL,
  p_nouvelle_valeur JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_log_id UUID;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE auth_id = auth.uid();
  
  INSERT INTO public.audit_logs (user_id, action, table_cible, ancienne_valeur, nouvelle_valeur)
  VALUES (v_profile_id, p_action, p_table_cible, p_ancienne_valeur, p_nouvelle_valeur)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 15. ENABLE RLS
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_organisationnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teletravail_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 16. RLS POLICIES - PROFILES
-- =============================================

-- Tout le monde peut voir les profils (annuaire)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Utilisateur peut modifier son propre profil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Admin peut tout modifier
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 17. RLS POLICIES - USER_ROLES
-- =============================================

-- Seuls les admins peuvent voir les rôles
CREATE POLICY "user_roles_select_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'president')
  );

-- Seuls les admins peuvent modifier les rôles
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 18. RLS POLICIES - COMPETENCES
-- =============================================

-- Utilisateur voit ses compétences + admins/chefs voient leur service
CREATE POLICY "competences_select" ON public.competences
  FOR SELECT TO authenticated
  USING (
    user_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    (public.has_role(auth.uid(), 'chef_service') AND public.is_same_service(auth.uid(), user_id))
  );

-- Utilisateur peut modifier ses compétences
CREATE POLICY "competences_insert_own" ON public.competences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "competences_update_own" ON public.competences
  FOR UPDATE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "competences_delete_own" ON public.competences
  FOR DELETE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

-- Admin peut tout
CREATE POLICY "competences_admin_all" ON public.competences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 19. RLS POLICIES - ROLES_ORGANISATIONNELS
-- =============================================

CREATE POLICY "roles_org_select" ON public.roles_organisationnels
  FOR SELECT TO authenticated
  USING (
    user_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president')
  );

CREATE POLICY "roles_org_admin_all" ON public.roles_organisationnels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 20. RLS POLICIES - PRESENCES
-- =============================================

-- Utilisateur voit ses présences + hiérarchie voit son service
CREATE POLICY "presences_select" ON public.presences
  FOR SELECT TO authenticated
  USING (
    user_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    (public.has_role(auth.uid(), 'chef_service') AND public.is_same_service(auth.uid(), user_id))
  );

-- Utilisateur peut créer/modifier ses présences
CREATE POLICY "presences_insert_own" ON public.presences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "presences_update_own" ON public.presences
  FOR UPDATE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

-- Admin peut tout
CREATE POLICY "presences_admin_all" ON public.presences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 21. RLS POLICIES - TELETRAVAIL_LOGS
-- =============================================

CREATE POLICY "teletravail_select" ON public.teletravail_logs
  FOR SELECT TO authenticated
  USING (
    user_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    (public.has_role(auth.uid(), 'chef_service') AND public.is_same_service(auth.uid(), user_id))
  );

CREATE POLICY "teletravail_insert_own" ON public.teletravail_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "teletravail_update_own" ON public.teletravail_logs
  FOR UPDATE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "teletravail_admin_all" ON public.teletravail_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 22. RLS POLICIES - TACHES
-- =============================================

-- Créateur, assigné, admins et président peuvent voir
CREATE POLICY "taches_select" ON public.taches
  FOR SELECT TO authenticated
  USING (
    created_by = public.get_profile_id(auth.uid()) OR
    assigned_to = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    public.has_role(auth.uid(), 'chef_service')
  );

-- Chefs de service et plus peuvent créer des tâches
CREATE POLICY "taches_insert" ON public.taches
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    public.has_role(auth.uid(), 'chef_service')
  );

-- Créateur et admins peuvent modifier
CREATE POLICY "taches_update" ON public.taches
  FOR UPDATE TO authenticated
  USING (
    created_by = public.get_profile_id(auth.uid()) OR
    assigned_to = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

-- Admins peuvent supprimer
CREATE POLICY "taches_delete_admin" ON public.taches
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 23. RLS POLICIES - PERFORMANCES
-- =============================================

CREATE POLICY "performances_select" ON public.performances
  FOR SELECT TO authenticated
  USING (
    user_id = public.get_profile_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    (public.has_role(auth.uid(), 'chef_service') AND public.is_same_service(auth.uid(), user_id))
  );

-- Seul le système (admin) peut créer/modifier les performances
CREATE POLICY "performances_admin_all" ON public.performances
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 24. RLS POLICIES - AUDIT_LOGS
-- =============================================

-- Seuls admins peuvent voir les logs d'audit
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tout utilisateur authentifié peut créer un log (via fonction)
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 25. STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('justifications', 'justifications', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Storage policies - profiles (public pour les avatars)
CREATE POLICY "profiles_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "profiles_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profiles_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies - documents (privé)
CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Storage policies - justifications (privé, accès hiérarchique)
CREATE POLICY "justifications_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'justifications');

CREATE POLICY "justifications_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'justifications');

-- Storage policies - exports (privé)
CREATE POLICY "exports_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'exports');

CREATE POLICY "exports_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exports');