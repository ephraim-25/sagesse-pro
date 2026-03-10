
-- Create push_subscriptions table for Web Push
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_select_own ON public.push_subscriptions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (user_id = get_profile_id(auth.uid()));

CREATE POLICY push_subs_insert_own ON public.push_subscriptions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = get_profile_id(auth.uid()));

CREATE POLICY push_subs_delete_own ON public.push_subscriptions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (user_id = get_profile_id(auth.uid()));

CREATE POLICY push_subs_update_own ON public.push_subscriptions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (user_id = get_profile_id(auth.uid()));
