-- =============================================
-- Create storage bucket for task documents
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-documents',
  'task-documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RLS policies for task-documents bucket
-- =============================================

-- Allow authenticated users to read task documents
CREATE POLICY "task_documents_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-documents');

-- Allow management grades (chef_service and above) to upload documents
CREATE POLICY "task_documents_insert_management"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'president'::public.app_role)
    OR public.has_role(auth.uid(), 'chef_service'::public.app_role)
  )
);

-- Allow management to update their own uploaded files
CREATE POLICY "task_documents_update_management"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'president'::public.app_role)
    OR public.has_role(auth.uid(), 'chef_service'::public.app_role)
  )
);

-- Allow management to delete their own uploaded files
CREATE POLICY "task_documents_delete_management"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'president'::public.app_role)
    OR public.has_role(auth.uid(), 'chef_service'::public.app_role)
  )
);