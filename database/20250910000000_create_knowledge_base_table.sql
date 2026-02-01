-- Create knowledge_base table for customer service bot
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for full-text search on title and content
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search ON knowledge_base 
USING GIN (to_tsvector('english', title || ' ' || content));

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base (category);

-- Create index on tags for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN (tags);

-- Create index on updated_at for ordering
CREATE INDEX IF NOT EXISTS idx_knowledge_base_updated_at ON knowledge_base (updated_at DESC);

-- Enable Row Level Security
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read knowledge base entries
CREATE POLICY "Allow authenticated users to read knowledge base" ON knowledge_base
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert knowledge base entries
CREATE POLICY "Allow authenticated users to insert knowledge base" ON knowledge_base
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update knowledge base entries
CREATE POLICY "Allow authenticated users to update knowledge base" ON knowledge_base
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete knowledge base entries
CREATE POLICY "Allow authenticated users to delete knowledge base" ON knowledge_base
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_base_updated_at();

-- Create function for enhanced search functionality
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