-- Enhanced Knowledge Base System - FIXED VERSION
-- Run this AFTER running STORAGE_SETUP.sql

-- Step 1: Create basic knowledge_base table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Create enum types
DO $$ BEGIN
    CREATE TYPE kb_entry_source AS ENUM ('manual', 'pdf_ai_generated', 'imported');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ai_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create PDF documents table
CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ai_processing_status ai_processing_status DEFAULT 'pending',
    ai_processing_error TEXT,
    total_pages INTEGER,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 4: Add new columns to knowledge_base table for PDF support
DO $$ BEGIN
    ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS source kb_entry_source DEFAULT 'manual';
    ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES kb_documents(id) ON DELETE SET NULL;
    ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS page_number INTEGER;
    ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 1.0;
    ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
    ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS original_text TEXT;
    ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Step 5: Create AI processing jobs table
CREATE TABLE IF NOT EXISTS kb_ai_processing_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE NOT NULL,
    status ai_processing_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    current_step TEXT,
    error_message TEXT,
    openai_model TEXT DEFAULT 'gpt-4',
    total_tokens_used INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,4) DEFAULT 0,
    processing_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search ON knowledge_base 
USING GIN (to_tsvector('english', title || ' ' || content));

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_updated_at ON knowledge_base (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base (source);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_document ON knowledge_base (source_document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_ai_generated ON knowledge_base (ai_generated);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_approved ON knowledge_base (is_approved);

CREATE INDEX IF NOT EXISTS idx_kb_documents_processing_status ON kb_documents (ai_processing_status);
CREATE INDEX IF NOT EXISTS idx_kb_documents_uploaded_by ON kb_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_kb_documents_created_at ON kb_documents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_document ON kb_ai_processing_jobs (document_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_status ON kb_ai_processing_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_created ON kb_ai_processing_jobs (created_at DESC);

-- Step 7: Enable Row Level Security
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_ai_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing table policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read knowledge base" ON knowledge_base;
DROP POLICY IF EXISTS "Allow authenticated users to insert knowledge base" ON knowledge_base;
DROP POLICY IF EXISTS "Allow authenticated users to update knowledge base" ON knowledge_base;
DROP POLICY IF EXISTS "Allow authenticated users to delete knowledge base" ON knowledge_base;

DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON kb_documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON kb_documents;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON kb_documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON kb_documents;

DROP POLICY IF EXISTS "Allow authenticated users to read processing jobs" ON kb_ai_processing_jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert processing jobs" ON kb_ai_processing_jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update processing jobs" ON kb_ai_processing_jobs;

-- Step 9: Create SIMPLE table policies (more permissive for testing)
-- Knowledge Base policies
CREATE POLICY "Enable all access for authenticated users" ON knowledge_base
    FOR ALL USING (auth.role() = 'authenticated');

-- Documents policies  
CREATE POLICY "Enable all access for authenticated users" ON kb_documents
    FOR ALL USING (auth.role() = 'authenticated');

-- Processing jobs policies
CREATE POLICY "Enable all access for authenticated users" ON kb_ai_processing_jobs
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 10: Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_kb_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_kb_documents_updated_at ON kb_documents;
CREATE TRIGGER update_kb_documents_updated_at
    BEFORE UPDATE ON kb_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_documents_updated_at();

DROP TRIGGER IF EXISTS update_ai_processing_jobs_updated_at ON kb_ai_processing_jobs;
CREATE TRIGGER update_ai_processing_jobs_updated_at
    BEFORE UPDATE ON kb_ai_processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_documents_updated_at();

-- Step 12: Enhanced search function for knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(search_query TEXT, match_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance_rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.title,
        kb.content,
        kb.category,
        kb.tags,
        kb.created_at,
        kb.updated_at,
        COALESCE(
            ts_rank(to_tsvector('english', kb.title || ' ' || kb.content), plainto_tsquery('english', search_query)),
            0
        ) as relevance_rank
    FROM knowledge_base kb
    WHERE 
        to_tsvector('english', kb.title || ' ' || kb.content) @@ plainto_tsquery('english', search_query)
        OR kb.title ILIKE '%' || search_query || '%'
        OR kb.content ILIKE '%' || search_query || '%'
        OR EXISTS (
            SELECT 1 FROM unnest(kb.tags) as tag 
            WHERE tag ILIKE '%' || search_query || '%'
        )
    ORDER BY 
        relevance_rank DESC,
        kb.updated_at DESC
    LIMIT match_limit;
END;
$$;

-- Step 13: Enhanced search function with PDF support
CREATE OR REPLACE FUNCTION search_knowledge_base_enhanced(
    search_query TEXT, 
    match_limit INTEGER DEFAULT 10,
    include_ai_generated BOOLEAN DEFAULT true,
    approved_only BOOLEAN DEFAULT true
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    tags TEXT[],
    source kb_entry_source,
    source_document_id UUID,
    document_title TEXT,
    page_number INTEGER,
    confidence_score REAL,
    ai_generated BOOLEAN,
    is_approved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance_rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.title,
        kb.content,
        kb.category,
        kb.tags,
        kb.source,
        kb.source_document_id,
        doc.title as document_title,
        kb.page_number,
        kb.confidence_score,
        kb.ai_generated,
        kb.is_approved,
        kb.created_at,
        kb.updated_at,
        COALESCE(
            ts_rank(to_tsvector('english', kb.title || ' ' || kb.content), plainto_tsquery('english', search_query)),
            0
        ) as relevance_rank
    FROM knowledge_base kb
    LEFT JOIN kb_documents doc ON kb.source_document_id = doc.id
    WHERE 
        (approved_only = false OR kb.is_approved = true)
        AND (include_ai_generated = true OR kb.ai_generated = false)
        AND (
            to_tsvector('english', kb.title || ' ' || kb.content) @@ plainto_tsquery('english', search_query)
            OR kb.title ILIKE '%' || search_query || '%'
            OR kb.content ILIKE '%' || search_query || '%'
            OR EXISTS (
                SELECT 1 FROM unnest(kb.tags) as tag 
                WHERE tag ILIKE '%' || search_query || '%'
            )
        )
    ORDER BY 
        relevance_rank DESC,
        kb.confidence_score DESC,
        kb.updated_at DESC
    LIMIT match_limit;
END;
$$;

-- Step 14: Function to get document processing status
CREATE OR REPLACE FUNCTION get_document_processing_status(doc_id UUID)
RETURNS TABLE(
    document_id UUID,
    document_title TEXT,
    processing_status ai_processing_status,
    progress INTEGER,
    current_step TEXT,
    error_message TEXT,
    entries_generated INTEGER,
    estimated_cost DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as document_id,
        d.title as document_title,
        COALESCE(j.status, d.ai_processing_status) as processing_status,
        COALESCE(j.progress, 0) as progress,
        j.current_step,
        COALESCE(j.error_message, d.ai_processing_error) as error_message,
        (
            SELECT COUNT(*)::INTEGER 
            FROM knowledge_base kb 
            WHERE kb.source_document_id = d.id
        ) as entries_generated,
        COALESCE(j.estimated_cost, 0) as estimated_cost
    FROM kb_documents d
    LEFT JOIN kb_ai_processing_jobs j ON d.id = j.document_id
    WHERE d.id = doc_id;
END;
$$;