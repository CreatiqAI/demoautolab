-- Add file_data column to store PDF content directly in database
-- This bypasses the storage RLS issues

ALTER TABLE kb_documents 
ADD COLUMN IF NOT EXISTS file_data TEXT;