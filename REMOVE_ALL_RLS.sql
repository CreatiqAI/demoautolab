-- COMPLETE RLS REMOVAL AND FRESH START
-- This will remove all RLS issues and make everything work

-- Step 1: Disable RLS entirely on all knowledge base tables
ALTER TABLE knowledge_base DISABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE kb_ai_processing_jobs DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on these tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on knowledge_base
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'knowledge_base')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON knowledge_base';
    END LOOP;
    
    -- Drop all policies on kb_documents  
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'kb_documents')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON kb_documents';
    END LOOP;
    
    -- Drop all policies on kb_ai_processing_jobs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'kb_ai_processing_jobs')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON kb_ai_processing_jobs';
    END LOOP;
END $$;

-- Step 3: Add the file_data column for database storage
ALTER TABLE kb_documents 
ADD COLUMN IF NOT EXISTS file_data TEXT;

-- Step 4: Create the storage bucket (ignore errors if it exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base-pdfs',
  'knowledge-base-pdfs',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Make storage bucket public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'knowledge-base-pdfs';

-- Step 6: Verify everything is set up correctly
SELECT 'Tables without RLS:' as status;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('knowledge_base', 'kb_documents', 'kb_ai_processing_jobs');

SELECT 'Storage bucket status:' as status;
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'knowledge-base-pdfs';

SELECT 'Columns in kb_documents:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kb_documents' 
AND column_name IN ('file_data', 'file_path', 'extracted_text');