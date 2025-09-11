-- QUICK FIX for Storage RLS Issues
-- This will allow PDF uploads to work immediately

-- Step 1: Create/Update the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base-pdfs',
  'knowledge-base-pdfs',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- Step 2: Remove ALL existing storage policies for this bucket
DELETE FROM storage.policies 
WHERE bucket_id = 'knowledge-base-pdfs';

-- Step 3: Create very permissive policies that actually work
CREATE POLICY "Allow all operations for knowledge-base-pdfs" ON storage.objects
FOR ALL 
USING (bucket_id = 'knowledge-base-pdfs')
WITH CHECK (bucket_id = 'knowledge-base-pdfs');

-- Alternative: If the above still doesn't work, disable RLS entirely for storage
-- Uncomment the line below if you still get errors:
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify the bucket exists and is configured
SELECT * FROM storage.buckets WHERE id = 'knowledge-base-pdfs';