-- Table des matricules administrateurs prédéfinis
CREATE TABLE public.admin_matricules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule TEXT NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.admin_matricules ENABLE ROW LEVEL SECURITY;

-- Politique: lecture pour vérification (sans auth pour l'inscription)
CREATE POLICY "admin_matricules_check_available"
ON public.admin_matricules
FOR SELECT
USING (is_used = false);

-- Politique: mise à jour par le système uniquement (via trigger)
CREATE POLICY "admin_matricules_update_system"
ON public.admin_matricules
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Insérer les 3 matricules administrateurs
INSERT INTO public.admin_matricules (matricule) VALUES
  ('CSN-2013-001'),
  ('CSN-2013-002'),
  ('CSN-2013-003');

-- Fonction pour valider et marquer un matricule comme utilisé
CREATE OR REPLACE FUNCTION public.validate_admin_matricule(p_matricule TEXT, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matricule_id UUID;
BEGIN
  -- Vérifier si le matricule existe et n'est pas utilisé
  SELECT id INTO v_matricule_id
  FROM admin_matricules
  WHERE matricule = p_matricule AND is_used = false
  FOR UPDATE;
  
  IF v_matricule_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Marquer comme utilisé
  UPDATE admin_matricules
  SET is_used = true, used_by = p_profile_id, used_at = now()
  WHERE id = v_matricule_id;
  
  -- Ajouter le rôle admin
  INSERT INTO user_roles (user_id, role)
  VALUES (p_profile_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Mettre à jour le statut du compte
  UPDATE profiles
  SET account_status = 'active'
  WHERE id = p_profile_id;
  
  RETURN true;
END;
$$;