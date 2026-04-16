-- ============================================================================
-- PHASE 1: INSTALLATION GUIDES ENHANCEMENTS
-- Purpose: Add pricing fields and enhanced structure to installation guides
-- Date: 2025-12-07
-- ============================================================================

-- Add installation pricing fields
ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS recommended_installation_price_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS recommended_installation_price_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pricing_notes TEXT;

-- Add structured steps field (JSON)
ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;

-- Add required tools field
ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS required_tools TEXT[] DEFAULT '{}'::TEXT[];

-- Add difficulty level if not exists
ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_installation_guides_difficulty ON installation_guides(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_installation_guides_steps ON installation_guides USING GIN(steps);

-- Add comments
COMMENT ON COLUMN installation_guides.recommended_installation_price_min IS 'Minimum recommended installation price in RM';
COMMENT ON COLUMN installation_guides.recommended_installation_price_max IS 'Maximum recommended installation price in RM';
COMMENT ON COLUMN installation_guides.pricing_notes IS 'Additional pricing information or notes';
COMMENT ON COLUMN installation_guides.steps IS 'Structured step-by-step guide in JSON format: [{"step_number": 1, "title": "...", "description": "...", "image_url": "...", "duration_minutes": 5}]';
COMMENT ON COLUMN installation_guides.required_tools IS 'Array of required tools for installation';

-- Example update with structured data (optional - can be done via admin panel)
-- UPDATE installation_guides
-- SET
--   recommended_installation_price_min = 50.00,
--   recommended_installation_price_max = 80.00,
--   pricing_notes = 'Price may vary based on vehicle model and complexity',
--   required_tools = ARRAY['Socket wrench set', 'Trim removal tools', 'Heat gun', 'Wire stripper'],
--   steps = '[
--     {"step_number": 1, "title": "Prepare workspace", "description": "Ensure vehicle is parked safely and tools are ready", "duration_minutes": 5},
--     {"step_number": 2, "title": "Remove old component", "description": "Carefully remove the existing component", "duration_minutes": 15},
--     {"step_number": 3, "title": "Install new component", "description": "Install the new component and secure properly", "duration_minutes": 20}
--   ]'::jsonb
-- WHERE id = 'some-guide-id';
