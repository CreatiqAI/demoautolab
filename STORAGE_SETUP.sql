-- Storage Setup for Knowledge Base PDFs
-- Run this FIRST before the main database setup

-- Step 1: Create the storage bucket
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

-- Step 2: Create storage policies for PDF uploads
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete PDFs" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'knowledge-base-pdfs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can read PDFs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'knowledge-base-pdfs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete PDFs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'knowledge-base-pdfs' 
  AND auth.role() = 'authenticated'
);

-- Step 3: Grant necessary permissions (if needed)
-- This ensures the bucket is accessible
UPDATE storage.buckets 
SET public = false 
WHERE id = 'knowledge-base-pdfs';