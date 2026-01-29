-- ============================================================================
-- PRODUCT INSTALLATION GUIDES TABLE
-- Adds installation guide settings directly to products
-- ============================================================================

-- Create product_installation_guides table
CREATE TABLE IF NOT EXISTS product_installation_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE CASCADE,

  -- Installation Info
  recommended_time TEXT,                    -- e.g., "30-45 minutes"
  workman_power INTEGER DEFAULT 1,          -- Number of workers needed
  installation_price DECIMAL(10,2),         -- Price in RM

  -- Installation Videos (JSONB array)
  installation_videos JSONB DEFAULT '[]'::jsonb,   -- [{url, title, duration}]

  -- Optional metadata
  difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
  notes TEXT,                               -- Additional notes for customers

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One installation guide per product
  CONSTRAINT unique_product_installation UNIQUE(product_id)
);

-- Add comments
COMMENT ON TABLE product_installation_guides IS 'Installation guide settings for products - optional, one per product';
COMMENT ON COLUMN product_installation_guides.recommended_time IS 'Recommended installation time (e.g., "30-45 minutes")';
COMMENT ON COLUMN product_installation_guides.workman_power IS 'Number of workers/technicians needed';
COMMENT ON COLUMN product_installation_guides.installation_price IS 'Installation price in RM';
COMMENT ON COLUMN product_installation_guides.installation_videos IS 'Array of video objects: [{url, title, duration}]';
COMMENT ON COLUMN product_installation_guides.difficulty_level IS 'Installation difficulty: easy, medium, hard, expert';
COMMENT ON COLUMN product_installation_guides.notes IS 'Additional notes for customers';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_installation_guides_product_id
  ON product_installation_guides(product_id);

-- Enable RLS
ALTER TABLE product_installation_guides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view product installation guides" ON product_installation_guides;
DROP POLICY IF EXISTS "Admins can manage product installation guides" ON product_installation_guides;

-- Create RLS policies
-- Public read access (for product details page - all users can view)
CREATE POLICY "Anyone can view product installation guides"
  ON product_installation_guides FOR SELECT
  USING (true);

-- Admin write access
CREATE POLICY "Admins can manage product installation guides"
  ON product_installation_guides FOR ALL
  USING (true);

-- Grant permissions
GRANT ALL ON product_installation_guides TO authenticated;
GRANT SELECT ON product_installation_guides TO anon;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_installation_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_installation_guides_updated_at
  ON product_installation_guides;
CREATE TRIGGER trigger_update_product_installation_guides_updated_at
  BEFORE UPDATE ON product_installation_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_product_installation_guides_updated_at();

-- Verify creation
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'product_installation_guides'
ORDER BY ordinal_position;
