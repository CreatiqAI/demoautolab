-- Enhanced Commercial Knowledge Base Schema
-- This migration adds commercial-grade features to the knowledge base

-- Add enhanced columns to knowledge_base table
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5; -- 1-10 priority scale
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS applies_to TEXT[] DEFAULT ARRAY['all']; -- customer types
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS expires_date DATE;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS related_entries UUID[];
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS parent_entry_id UUID;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add search optimization
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_kb_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tags, ARRAY[]::TEXT[]), ' ')), 'C') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.keywords, ARRAY[]::TEXT[]), ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector updates
DROP TRIGGER IF EXISTS kb_search_vector_update ON knowledge_base;
CREATE TRIGGER kb_search_vector_update
  BEFORE INSERT OR UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_kb_search_vector();

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_kb_search_vector ON knowledge_base USING gin(search_vector);

-- Enhanced document metadata
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS document_type TEXT; -- 'terms', 'policy', 'manual', 'faq'
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS processing_log JSONB;

-- Create categories table
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES kb_categories(id),
  display_order INTEGER DEFAULT 0,
  color_code TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default categories
INSERT INTO kb_categories (name, description, display_order, color_code, icon) VALUES
('Product Information', 'Product details, specifications, and features', 1, '#10B981', 'package'),
('Shipping & Returns', 'Shipping policies, return procedures, and delivery information', 2, '#F59E0B', 'truck'),
('Technical Support', 'Troubleshooting guides and technical assistance', 3, '#EF4444', 'wrench'),
('Company Policies', 'Terms of service, privacy policy, and company rules', 4, '#8B5CF6', 'shield'),
('Troubleshooting', 'Problem-solving guides and solutions', 5, '#F97316', 'alert-triangle'),
('General FAQ', 'Frequently asked questions and common inquiries', 6, '#06B6D4', 'help-circle'),
('Terms & Conditions', 'Legal terms, conditions, and agreements', 7, '#6366F1', 'file-text'),
('Billing & Payments', 'Payment methods, billing cycles, and financial policies', 8, '#84CC16', 'credit-card'),
('Account Management', 'User accounts, profiles, and account-related procedures', 9, '#EC4899', 'user'),
('Security & Privacy', 'Data protection, security measures, and privacy policies', 10, '#64748B', 'lock')
ON CONFLICT (name) DO NOTHING;

-- Create AI interactions tracking table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_question TEXT NOT NULL,
  matched_entries UUID[], -- KB entries used in response
  ai_response TEXT NOT NULL,
  confidence_score REAL,
  customer_satisfaction INTEGER, -- 1-5 rating
  feedback TEXT,
  session_id TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for kb_categories
CREATE POLICY "Allow authenticated users to read categories" ON kb_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage categories" ON kb_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for ai_interactions
CREATE POLICY "Allow authenticated users to read interactions" ON ai_interactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert interactions" ON ai_interactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base (category);
CREATE INDEX IF NOT EXISTS idx_kb_subcategory ON knowledge_base (subcategory);
CREATE INDEX IF NOT EXISTS idx_kb_priority ON knowledge_base (priority DESC);
CREATE INDEX IF NOT EXISTS idx_kb_effective_date ON knowledge_base (effective_date);
CREATE INDEX IF NOT EXISTS idx_kb_expires_date ON knowledge_base (expires_date);
CREATE INDEX IF NOT EXISTS idx_kb_parent_entry ON knowledge_base (parent_entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_applies_to ON knowledge_base USING gin(applies_to);
CREATE INDEX IF NOT EXISTS idx_kb_keywords ON knowledge_base USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_kb_related_entries ON knowledge_base USING gin(related_entries);

CREATE INDEX IF NOT EXISTS idx_doc_type ON kb_documents (document_type);
CREATE INDEX IF NOT EXISTS idx_doc_active ON kb_documents (is_active);
CREATE INDEX IF NOT EXISTS idx_doc_department ON kb_documents (department);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_created ON ai_interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_session ON ai_interactions (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_confidence ON ai_interactions (confidence_score DESC);

-- Create enhanced search function
CREATE OR REPLACE FUNCTION search_knowledge_base_commercial(
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  customer_type TEXT DEFAULT 'all',
  include_expired BOOLEAN DEFAULT false,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  subcategory TEXT,
  tags TEXT[],
  keywords TEXT[],
  priority INTEGER,
  confidence_score REAL,
  is_approved BOOLEAN,
  search_rank REAL
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
    kb.subcategory,
    kb.tags,
    kb.keywords,
    kb.priority,
    kb.confidence_score,
    kb.is_approved,
    ts_rank(kb.search_vector, plainto_tsquery('english', search_query)) as search_rank
  FROM knowledge_base kb
  WHERE 
    kb.is_approved = true
    AND (category_filter IS NULL OR kb.category = category_filter)
    AND (customer_type = ANY(kb.applies_to) OR 'all' = ANY(kb.applies_to))
    AND (include_expired = true OR kb.expires_date IS NULL OR kb.expires_date > CURRENT_DATE)
    AND (kb.effective_date IS NULL OR kb.effective_date <= CURRENT_DATE)
    AND kb.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY 
    kb.priority DESC,
    search_rank DESC,
    kb.confidence_score DESC
  LIMIT match_limit;
END;
$$;

-- Update existing search vectors for all entries
UPDATE knowledge_base SET updated_at = NOW();