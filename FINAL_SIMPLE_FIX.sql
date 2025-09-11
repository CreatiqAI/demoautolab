-- FINAL SIMPLE FIX - Just add the database storage column
-- This completely bypasses storage permission issues

-- Add file_data column to store PDF content directly in database
ALTER TABLE kb_documents 
ADD COLUMN IF NOT EXISTS file_data TEXT;

-- That's it! The fallback service will handle everything else.