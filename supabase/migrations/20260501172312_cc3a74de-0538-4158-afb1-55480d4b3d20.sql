-- Fonction RPC permettant à tout utilisateur authentifié de notifier
-- l'ensemble des administrateurs (transparence totale plateforme).
-- Bypass RLS via SECURITY DEFINER, mais limitée aux admins comme destinataires.
CREATE OR REPLACE FUNCTION public.notify_all_admins(
  p_title text,
  p_body text DEFAULT NULL,
  p_type text DEFAULT 'admin_alert',
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender uuid;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_sender := public.get_profile_id(auth.uid());

  INSERT INTO public.notifications (user_id, sender_id, title, body, type, meta)
  SELECT DISTINCT p.id, v_sender, p_title, p_body, p_type, COALESCE(p_meta, '{}'::jsonb)
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'admin'::public.app_role;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_all_admins(text, text, text, jsonb) TO authenticated;