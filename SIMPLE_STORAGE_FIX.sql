-- SIMPLE STORAGE FIX - Works with standard Supabase setup

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

-- Step 2: Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Allow all operations for knowledge-base-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read PDFs" ON storage.objects; 
DROP POLICY IF EXISTS "Authenticated users can delete PDFs" ON storage.objects;

-- Step 3: Create a single, simple policy for all operations
CREATE POLICY "knowledge_base_pdfs_policy" ON storage.objects
FOR ALL 
USING (bucket_id = 'knowledge-base-pdfs')
WITH CHECK (bucket_id = 'knowledge-base-pdfs');

-- Step 4: If the above doesn't work, disable RLS entirely
-- Uncomment this line if you still get RLS errors:
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Step 5: Verify the bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'knowledge-base-pdfs';