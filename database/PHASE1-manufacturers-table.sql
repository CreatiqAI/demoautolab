-- ============================================================================
-- PHASE 1: CREATE MANUFACTURERS TABLE
-- Purpose: Store product manufacturer/factory brand information
-- Date: 2025-12-07
-- ============================================================================

-- Create manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  country TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_manufacturers_name ON manufacturers(name);
CREATE INDEX idx_manufacturers_is_active ON manufacturers(is_active);

-- Insert some example manufacturers
INSERT INTO manufacturers (name, description, country, is_active, display_order) VALUES
('Original Equipment Manufacturer (OEM)', 'Official manufacturer parts', 'Various', true, 1),
('Factory A Premium', 'High-quality aftermarket parts manufacturer', 'China', true, 2),
('Factory B Standard', 'Standard quality aftermarket parts', 'China', true, 3),
('Factory C Budget', 'Budget-friendly aftermarket parts', 'China', true, 4),
('Taiwan Quality Parts', 'Taiwan-manufactured quality parts', 'Taiwan', true, 5),
('Korean Auto Parts', 'Korean-manufactured automotive parts', 'South Korea', true, 6),
('Japan Premium Auto', 'Premium Japanese automotive parts', 'Japan', true, 7),
('Malaysia Local Manufacturer', 'Locally manufactured parts', 'Malaysia', true, 8)
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE manufacturers IS 'Product manufacturer/factory brand information for dual categorization (Car Brand + Manufacturer Brand)';

-- Enable Row Level Security
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active manufacturers
CREATE POLICY "Anyone can view active manufacturers" ON manufacturers
  FOR SELECT
  USING (is_active = true);

-- Policy: Admins can manage manufacturers
CREATE POLICY "Admins can manage manufacturers" ON manufacturers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
