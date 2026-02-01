-- Allow users to read their own role(s) so the UI can display the correct grade/dashboard
-- and ProtectedRoute/Sidebar can work without requiring admin-only visibility.

DO $$
BEGIN
  -- Create SELECT policy for own roles if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'user_roles_select_own'
  ) THEN
    CREATE POLICY "user_roles_select_own"
    ON public.user_roles
    FOR SELECT
    USING (user_id = public.get_profile_id(auth.uid()));
  END IF;
END $$;