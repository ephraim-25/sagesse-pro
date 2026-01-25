-- Fix remaining "RLS Policy Always True" warnings
-- These are INSERT policies on approvals and notifications with WITH CHECK(true)

-- 1. Fix approvals INSERT policy - restrict to system operations or self-target
DROP POLICY IF EXISTS "approvals_insert_system" ON public.approvals;

CREATE POLICY "approvals_insert_restricted" 
ON public.approvals 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User can create approvals targeting themselves (e.g., account creation request)
  target_user_id = get_profile_id(auth.uid())
  -- Or admins/presidents can create approvals for anyone
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'president'::app_role)
);

-- 2. Fix notifications INSERT policy - restrict appropriately
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;

CREATE POLICY "notifications_insert_restricted"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins and presidents can send notifications to anyone
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'president'::app_role)
  -- Managers can send to their team members
  OR is_manager_of(auth.uid(), user_id)
  -- System can insert for self (e.g., triggers creating notifications)
  OR user_id = get_profile_id(auth.uid())
);