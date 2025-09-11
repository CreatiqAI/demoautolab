-- Enhance knowledge base schema for better customer service entries

-- Add new columns for enhanced AI analysis
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS customer_scenarios JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS related_questions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS key_points JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE;