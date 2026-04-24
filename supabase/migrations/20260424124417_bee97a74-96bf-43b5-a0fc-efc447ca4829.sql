-- Ensure task-documents bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-documents', 'task-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create dedicated bucket for task chat attachments (images + files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-chat-attachments', 'task-chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS for task-chat-attachments
DROP POLICY IF EXISTS task_chat_attachments_select ON storage.objects;
DROP POLICY IF EXISTS task_chat_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS task_chat_attachments_delete ON storage.objects;

CREATE POLICY task_chat_attachments_select
ON storage.objects FOR SELECT TO authenticated, anon
USING (bucket_id = 'task-chat-attachments');

CREATE POLICY task_chat_attachments_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-chat-attachments');

CREATE POLICY task_chat_attachments_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'task-chat-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR owner = auth.uid()
  )
);

-- Add attachments column to task_messages so chat can store file URLs
ALTER TABLE public.task_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Allow content to be empty when attachments are present
ALTER TABLE public.task_messages
  ALTER COLUMN content DROP NOT NULL;