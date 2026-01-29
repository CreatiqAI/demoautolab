-- ============================================================================
-- MERCHANT DOCUMENTS STORAGE BUCKET SETUP
-- Purpose: Create storage bucket for merchant registration documents
-- ============================================================================

-- ============================================================================
-- 1. CREATE THE STORAGE BUCKET
-- ============================================================================

-- Insert the bucket into storage.buckets table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-documents',
  'merchant-documents',
  true,  -- Public bucket for admin viewing
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 2. STORAGE POLICIES
-- ============================================================================

-- Policy: Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated users can upload merchant documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload merchant documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'merchant-documents');

-- Policy: Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Users can update own merchant documents" ON storage.objects;
CREATE POLICY "Users can update own merchant documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'merchant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete own merchant documents" ON storage.objects;
CREATE POLICY "Users can delete own merchant documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'merchant-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow public read access (for admin viewing)
DROP POLICY IF EXISTS "Public can view merchant documents" ON storage.objects;
CREATE POLICY "Public can view merchant documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'merchant-documents');

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'merchant-documents';

-- Verify policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname LIKE '%merchant%';
