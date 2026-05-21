-- Helper: identifies the super admin by email
CREATE OR REPLACE FUNCTION public.is_super_admin(_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = _auth_id
      AND lower(email) = 'ephraimyaba7@gmail.com'
  )
$$;

-- App settings table (singleton row)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed singleton row
INSERT INTO public.app_settings (maintenance_mode)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users
DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings;
CREATE POLICY app_settings_select_auth
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Update: super admin only
DROP POLICY IF EXISTS app_settings_update_super ON public.app_settings;
CREATE POLICY app_settings_update_super
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Insert: super admin only (defensive, normally singleton already exists)
DROP POLICY IF EXISTS app_settings_insert_super ON public.app_settings;
CREATE POLICY app_settings_insert_super
  ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Auto update timestamp
DROP TRIGGER IF EXISTS app_settings_set_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings';
  END IF;
END $$;
