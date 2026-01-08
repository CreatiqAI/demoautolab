-- Add new fields to installation_guides table
-- These fields help merchants with installation pricing and planning

-- Add recommended_time column (e.g., "30-45 minutes")
ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS recommended_time TEXT;

-- Add workman_power column (number of workers needed)
ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS workman_power INTEGER DEFAULT 1;

-- Add installation_price column (price in RM)
ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS installation_price DECIMAL(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN installation_guides.recommended_time IS 'Recommended time to complete installation (e.g., "30-45 minutes")';
COMMENT ON COLUMN installation_guides.workman_power IS 'Number of workers/technicians needed for installation';
COMMENT ON COLUMN installation_guides.installation_price IS 'Recommended installation price in RM for merchant reference';
