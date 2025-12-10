-- =====================================================
-- SIGC - Module Télétravail et Gestion des Grades
-- Migration complète pour le système de grades hiérarchiques
-- et la gestion du télétravail
-- =====================================================

-- 1. Créer l'enum pour les grades hiérarchiques
CREATE TYPE public.grade_hierarchique AS ENUM (
  'president_conseil',
  'secretaire_permanent',
  'chef_division',
  'chef_bureau',
  'ata_1',
  'ata_2',
  'aga_1',
  'aga_2',
  'huissier',
  'custom'
);

-- 2. Créer l'enum pour le statut de compte
CREATE TYPE public.account_status AS ENUM (
  'pending_approval',
  'active',
  'suspended',
  'rejected'
);

-- 3. Créer l'enum pour le statut de télétravail
CREATE TYPE public.telework_status AS ENUM (
  'connecte',
  'pause',
  'reunion',
  'hors_ligne'
);

-- 4. Créer l'enum pour le type d'approbation
CREATE TYPE public.approval_type AS ENUM (
  'account_creation',
  'timesheet',
  'telework_session',
  'grade_change',
  'leave_request'
);

-- 5. Créer l'enum pour le statut d'approbation
CREATE TYPE public.approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- 6. Créer l'enum pour le type d'export
CREATE TYPE public.export_type AS ENUM (
  'presence',
  'performance',
  'telework',
  'timesheet'
);

-- 7. Créer l'enum pour le statut d'export
CREATE TYPE public.export_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- 8. Table des grades hiérarchiques
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code grade_hierarchique NOT NULL UNIQUE,
  label TEXT NOT NULL,
  rank_order INTEGER NOT NULL, -- Plus petit = plus haut dans la hiérarchie
  description TEXT,
  can_approve_accounts BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  can_view_all_data BOOLEAN DEFAULT false,
  can_force_checkout BOOLEAN DEFAULT false,
  can_export_reports BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Insérer les grades par défaut
INSERT INTO public.grades (code, label, rank_order, can_approve_accounts, can_manage_team, can_view_all_data, can_force_checkout, can_export_reports) VALUES
  ('president_conseil', 'Président du Conseil', 1, true, true, true, true, true),
  ('secretaire_permanent', 'Secrétaire Permanent', 2, true, true, true, true, true),
  ('chef_division', 'Chef de Division', 3, false, true, false, true, true),
  ('chef_bureau', 'Chef de Bureau', 4, false, true, false, true, true),
  ('ata_1', 'ATA 1 (Attaché 1ère classe)', 5, false, false, false, false, false),
  ('ata_2', 'ATA 2 (Attaché 2ème classe)', 6, false, false, false, false, false),
  ('aga_1', 'AGA 1', 7, false, false, false, false, false),
  ('aga_2', 'AGA 2', 8, false, false, false, false, false),
  ('huissier', 'Huissier', 9, false, false, false, false, false),
  ('custom', 'Grade Personnalisé', 10, false, false, false, false, false);

-- 10. Table des équipes/divisions
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  division TEXT,
  parent_team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Ajouter les colonnes de grade et hiérarchie à profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS grade_id UUID REFERENCES public.grades(id),
ADD COLUMN IF NOT EXISTS custom_grade TEXT,
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS account_status account_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_status telework_status DEFAULT 'hors_ligne',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- 12. Table des sessions de télétravail (remplacement de teletravail_logs)
CREATE TABLE public.telework_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  current_status telework_status DEFAULT 'connecte',
  active_seconds INTEGER DEFAULT 0,
  activities JSONB DEFAULT '[]'::jsonb, -- [{timestamp, description, type}]
  country TEXT,
  device TEXT,
  ip_address TEXT,
  forced_checkout BOOLEAN DEFAULT false,
  forced_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Table des feuilles de temps
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  worked_hours NUMERIC(5,2) DEFAULT 0,
  telework_hours NUMERIC(5,2) DEFAULT 0,
  presence_hours NUMERIC(5,2) DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  status approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 14. Table des approbations
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approver_id UUID REFERENCES public.profiles(id),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type approval_type NOT NULL,
  ref_id UUID, -- Référence vers la table concernée
  ref_table TEXT, -- Nom de la table référencée
  status approval_status DEFAULT 'pending',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  acted_at TIMESTAMPTZ
);

-- 15. Table des notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  body TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Table des exports
CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type export_type NOT NULL,
  params JSONB DEFAULT '{}'::jsonb,
  file_path TEXT,
  file_hash TEXT,
  status export_status DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  ready_at TIMESTAMPTZ
);

-- 17. Index pour améliorer les performances
CREATE INDEX idx_telework_sessions_user_date ON public.telework_sessions(user_id, created_at);
CREATE INDEX idx_telework_sessions_status ON public.telework_sessions(current_status) WHERE check_out IS NULL;
CREATE INDEX idx_timesheets_user_date ON public.timesheets(user_id, date);
CREATE INDEX idx_approvals_target_user ON public.approvals(target_user_id, status);
CREATE INDEX idx_approvals_approver ON public.approvals(approver_id, status);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_profiles_grade ON public.profiles(grade_id);
CREATE INDEX idx_profiles_manager ON public.profiles(manager_id);
CREATE INDEX idx_profiles_team ON public.profiles(team_id);

-- 18. Activer RLS sur toutes les nouvelles tables
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telework_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- 19. Fonctions helper pour la hiérarchie
CREATE OR REPLACE FUNCTION public.get_user_grade_rank(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(g.rank_order, 999)
  FROM profiles p
  LEFT JOIN grades g ON g.id = p.grade_id
  WHERE p.id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_auth_id UUID, _target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = _target_user_id
    AND p.manager_id = (SELECT id FROM profiles WHERE auth_id = _manager_auth_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_user(_auth_id UUID, _target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN grades g ON g.id = p.grade_id
    WHERE p.auth_id = _auth_id
    AND (
      g.can_view_all_data = true
      OR is_manager_of(_auth_id, _target_user_id)
      OR is_same_service(_auth_id, _target_user_id)
    )
  )
$$;

-- 20. RLS Policies pour grades (lecture publique pour authenticated)
CREATE POLICY grades_select_authenticated ON public.grades
  FOR SELECT TO authenticated
  USING (true);

-- 21. RLS Policies pour teams
CREATE POLICY teams_select_authenticated ON public.teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY teams_manage_admin ON public.teams
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 22. RLS Policies pour telework_sessions
CREATE POLICY telework_sessions_select_own ON public.telework_sessions
  FOR SELECT TO authenticated
  USING (user_id = get_profile_id(auth.uid()));

CREATE POLICY telework_sessions_select_manager ON public.telework_sessions
  FOR SELECT TO authenticated
  USING (can_manage_user(auth.uid(), user_id));

CREATE POLICY telework_sessions_insert_own ON public.telework_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_profile_id(auth.uid()));

CREATE POLICY telework_sessions_update_own ON public.telework_sessions
  FOR UPDATE TO authenticated
  USING (user_id = get_profile_id(auth.uid()));

CREATE POLICY telework_sessions_update_manager ON public.telework_sessions
  FOR UPDATE TO authenticated
  USING (can_manage_user(auth.uid(), user_id) AND forced_checkout = true);

-- 23. RLS Policies pour timesheets
CREATE POLICY timesheets_select_own ON public.timesheets
  FOR SELECT TO authenticated
  USING (user_id = get_profile_id(auth.uid()));

CREATE POLICY timesheets_select_manager ON public.timesheets
  FOR SELECT TO authenticated
  USING (can_manage_user(auth.uid(), user_id));

CREATE POLICY timesheets_insert_own ON public.timesheets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_profile_id(auth.uid()));

CREATE POLICY timesheets_update_own ON public.timesheets
  FOR UPDATE TO authenticated
  USING (user_id = get_profile_id(auth.uid()) AND status = 'pending');

CREATE POLICY timesheets_update_manager ON public.timesheets
  FOR UPDATE TO authenticated
  USING (can_manage_user(auth.uid(), user_id));

-- 24. RLS Policies pour approvals
CREATE POLICY approvals_select_target ON public.approvals
  FOR SELECT TO authenticated
  USING (target_user_id = get_profile_id(auth.uid()));

CREATE POLICY approvals_select_approver ON public.approvals
  FOR SELECT TO authenticated
  USING (approver_id = get_profile_id(auth.uid()));

CREATE POLICY approvals_select_admin ON public.approvals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'president'::app_role));

CREATE POLICY approvals_insert_system ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Controlled by edge functions

CREATE POLICY approvals_update_approver ON public.approvals
  FOR UPDATE TO authenticated
  USING (
    approver_id = get_profile_id(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'president'::app_role)
  );

-- 25. RLS Policies pour notifications
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = get_profile_id(auth.uid()));

CREATE POLICY notifications_insert_system ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Controlled by edge functions

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = get_profile_id(auth.uid()));

-- 26. RLS Policies pour exports
CREATE POLICY exports_select_own ON public.exports
  FOR SELECT TO authenticated
  USING (requested_by = get_profile_id(auth.uid()));

CREATE POLICY exports_select_admin ON public.exports
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY exports_insert_authenticated ON public.exports
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = get_profile_id(auth.uid()));

-- 27. Trigger pour mettre à jour updated_at
CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telework_sessions_updated_at
  BEFORE UPDATE ON public.telework_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 28. Fonction pour créer/mettre à jour le timesheet après checkout
CREATE OR REPLACE FUNCTION public.update_timesheet_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_duration NUMERIC;
  session_date DATE;
BEGIN
  -- Seulement si check_out vient d'être défini
  IF NEW.check_out IS NOT NULL AND OLD.check_out IS NULL THEN
    session_date := DATE(NEW.check_in);
    session_duration := EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600.0;
    
    INSERT INTO timesheets (user_id, date, telework_hours, worked_hours, details)
    VALUES (
      NEW.user_id,
      session_date,
      session_duration,
      session_duration,
      jsonb_build_object('sessions', jsonb_build_array(jsonb_build_object(
        'session_id', NEW.id,
        'check_in', NEW.check_in,
        'check_out', NEW.check_out,
        'duration_hours', session_duration
      )))
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      telework_hours = timesheets.telework_hours + session_duration,
      worked_hours = timesheets.worked_hours + session_duration,
      details = jsonb_set(
        timesheets.details,
        '{sessions}',
        COALESCE(timesheets.details->'sessions', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'session_id', NEW.id,
          'check_in', NEW.check_in,
          'check_out', NEW.check_out,
          'duration_hours', session_duration
        ))
      ),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_timesheet_on_checkout
  AFTER UPDATE ON public.telework_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_timesheet_on_checkout();

-- 29. Fonction pour mettre à jour last_status du profil
CREATE OR REPLACE FUNCTION public.update_profile_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET 
    last_status = NEW.current_status,
    last_activity_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_profile_status
  AFTER INSERT OR UPDATE OF current_status ON public.telework_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_status();

-- 30. Activer Realtime pour les tables nécessaires
ALTER PUBLICATION supabase_realtime ADD TABLE public.telework_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 31. Mettre à jour handle_new_user pour inclure le grade par défaut
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  IF grade_record.rank_order <= 2 THEN
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
  
  -- Attribuer le rôle en fonction du grade
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new_profile_id, 
    CASE 
      WHEN requested_grade_code = 'president_conseil' THEN 'president'::app_role
      WHEN requested_grade_code = 'secretaire_permanent' THEN 'admin'::app_role
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
$$;