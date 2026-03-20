
-- Create task_messages table
CREATE TABLE public.task_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.taches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_task_messages_task_id ON public.task_messages(task_id);
CREATE INDEX idx_task_messages_sender_id ON public.task_messages(sender_id);
CREATE INDEX idx_task_messages_created_at ON public.task_messages(task_id, created_at);

-- Enable RLS
ALTER TABLE public.task_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is participant in a task
CREATE OR REPLACE FUNCTION public.is_task_participant(_auth_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.taches t
    WHERE t.id = _task_id
    AND (
      t.created_by = get_profile_id(_auth_id)
      OR t.assigned_to = get_profile_id(_auth_id)
    )
  )
$$;

-- SELECT: only task participants + admin/president
CREATE POLICY "task_messages_select" ON public.task_messages
FOR SELECT TO authenticated
USING (
  is_task_participant(auth.uid(), task_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'president'::app_role)
);

-- INSERT: only task participants can send messages
CREATE POLICY "task_messages_insert" ON public.task_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = get_profile_id(auth.uid())
  AND is_task_participant(auth.uid(), task_id)
);

-- UPDATE: only for marking as read (own received messages)
CREATE POLICY "task_messages_update" ON public.task_messages
FOR UPDATE TO authenticated
USING (
  is_task_participant(auth.uid(), task_id)
  AND sender_id != get_profile_id(auth.uid())
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_messages;
