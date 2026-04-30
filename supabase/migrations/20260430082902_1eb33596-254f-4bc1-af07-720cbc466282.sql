-- Jours fériés (RDC + occasionnels)
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  label TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_occasional BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, label)
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_select_authenticated" ON public.holidays
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "holidays_admin_insert" ON public.holidays
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "holidays_admin_update" ON public.holidays
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "holidays_admin_delete" ON public.holidays
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed jours fériés RDC (récurrents)
INSERT INTO public.holidays (date, label, is_recurring) VALUES
  ('2026-01-01', 'Nouvel An', true),
  ('2026-01-04', 'Journée des Martyrs', true),
  ('2026-01-16', 'Journée Laurent-Désiré Kabila', true),
  ('2026-01-17', 'Journée Patrice Lumumba', true),
  ('2026-05-01', 'Fête du Travail', true),
  ('2026-05-17', 'Journée de la Libération', true),
  ('2026-06-30', 'Fête de l''Indépendance', true),
  ('2026-08-01', 'Journée des Parents', true),
  ('2026-12-25', 'Noël', true)
ON CONFLICT (date, label) DO NOTHING;

-- Demandes de congé annuel
CREATE TYPE public.leave_status AS ENUM ('pending_chef', 'pending_admin', 'approved', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  working_days INTEGER NOT NULL,
  reason TEXT,
  status public.leave_status NOT NULL DEFAULT 'pending_chef',
  chef_id UUID,
  chef_decided_at TIMESTAMPTZ,
  chef_comment TEXT,
  admin_id UUID,
  admin_decided_at TIMESTAMPTZ,
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- L'agent voit les siennes
CREATE POLICY "leave_select_own" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

-- Le chef voit celles de ses subordonnés
CREATE POLICY "leave_select_chef" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (public.is_manager_of(auth.uid(), user_id));

-- Admin / Président
CREATE POLICY "leave_select_admin" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'president'::public.app_role));

-- L'agent crée pour lui-même
CREATE POLICY "leave_insert_own" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));

-- Le chef peut mettre à jour (approuver/rejeter) ses subordonnés
CREATE POLICY "leave_update_chef" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (public.is_manager_of(auth.uid(), user_id));

-- Admin met à jour
CREATE POLICY "leave_update_admin" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- L'agent peut annuler tant que non approuvé
CREATE POLICY "leave_update_own_pending" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid())
         AND status IN ('pending_chef', 'pending_admin'));

-- Fonction utilitaire: jours ouvrables (lun-ven, hors fériés)
CREATE OR REPLACE FUNCTION public.count_working_days(p_start DATE, p_end DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_cur DATE := p_start;
BEGIN
  WHILE v_cur <= p_end LOOP
    -- 1=Mon..5=Fri (ISO)
    IF EXTRACT(ISODOW FROM v_cur) BETWEEN 1 AND 5
       AND NOT EXISTS (
         SELECT 1 FROM public.holidays h
         WHERE h.active = true
           AND (
             (h.is_recurring = true AND TO_CHAR(h.date, 'MM-DD') = TO_CHAR(v_cur, 'MM-DD'))
             OR (h.is_recurring = false AND h.date = v_cur)
           )
       )
    THEN
      v_count := v_count + 1;
    END IF;
    v_cur := v_cur + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Réaltime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.holidays;