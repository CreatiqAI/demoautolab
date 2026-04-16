-- Customer Tiers System
-- This allows admins to manage customer tier levels and their benefits

-- Create customer_tiers table
CREATE TABLE IF NOT EXISTS customer_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(100) NOT NULL UNIQUE,
  tier_level INTEGER NOT NULL UNIQUE, -- Lower number = higher tier (1 = highest)
  description TEXT,

  -- Benefits
  discount_percentage DECIMAL(5,2) DEFAULT 0, -- e.g., 5.00 for 5%
  points_multiplier DECIMAL(5,2) DEFAULT 1.00, -- e.g., 1.5 for 1.5x points
  free_shipping_threshold DECIMAL(10,2), -- Free shipping above this amount
  has_priority_support BOOLEAN DEFAULT false,
  has_early_access BOOLEAN DEFAULT false,

  -- Requirements to achieve this tier
  min_lifetime_spending DECIMAL(10,2) DEFAULT 0,
  min_orders_count INTEGER DEFAULT 0,

  -- Display
  badge_color VARCHAR(50), -- e.g., 'gold', 'silver', 'bronze'
  badge_icon VARCHAR(50), -- e.g., 'crown', 'star', 'shield'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tier_id to customer_profiles if not exists
DO $$ BEGIN
  ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES customer_tiers(id);
  ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS tier_achieved_at TIMESTAMPTZ;
  ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS lifetime_spending DECIMAL(10,2) DEFAULT 0;
  ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS total_orders_count INTEGER DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create tier_upgrade_history table
CREATE TABLE IF NOT EXISTS tier_upgrade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  previous_tier_id UUID REFERENCES customer_tiers(id),
  new_tier_id UUID NOT NULL REFERENCES customer_tiers(id),
  upgrade_date TIMESTAMPTZ DEFAULT NOW(),
  triggered_by VARCHAR(50), -- 'auto' or 'manual' or 'admin'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO customer_tiers (tier_name, tier_level, description, discount_percentage, points_multiplier, min_lifetime_spending, min_orders_count, badge_color, badge_icon, display_order)
VALUES
  ('Platinum', 1, 'Elite tier for our most valued customers', 15.00, 3.00, 10000, 50, 'purple', 'crown', 1),
  ('Gold', 2, 'Premium tier with exclusive benefits', 10.00, 2.00, 5000, 30, 'gold', 'star', 2),
  ('Silver', 3, 'Advanced tier with great perks', 5.00, 1.50, 2000, 15, 'silver', 'shield', 3),
  ('Bronze', 4, 'Entry tier with basic benefits', 2.00, 1.20, 500, 5, 'bronze', 'badge', 4),
  ('Standard', 5, 'Starting tier for all new customers', 0.00, 1.00, 0, 0, 'gray', 'user', 5)
ON CONFLICT (tier_name) DO NOTHING;

-- Update existing customers to Standard tier
DO $$
DECLARE
  standard_tier_id UUID;
BEGIN
  SELECT id INTO standard_tier_id FROM customer_tiers WHERE tier_name = 'Standard' LIMIT 1;

  IF standard_tier_id IS NOT NULL THEN
    UPDATE customer_profiles
    SET tier_id = standard_tier_id,
        tier_achieved_at = NOW()
    WHERE tier_id IS NULL;
  END IF;
END $$;

-- Function to automatically upgrade customer tiers based on spending
CREATE OR REPLACE FUNCTION check_and_upgrade_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
  eligible_tier RECORD;
  current_tier_level INTEGER;
BEGIN
  -- Get current tier level
  SELECT tier_level INTO current_tier_level
  FROM customer_tiers
  WHERE id = NEW.tier_id;

  -- Find the highest tier the customer qualifies for
  SELECT * INTO eligible_tier
  FROM customer_tiers
  WHERE is_active = true
    AND NEW.lifetime_spending >= min_lifetime_spending
    AND NEW.total_orders_count >= min_orders_count
    AND tier_level < COALESCE(current_tier_level, 999) -- Only upgrade, not downgrade
  ORDER BY tier_level ASC
  LIMIT 1;

  -- If found a better tier, upgrade
  IF eligible_tier.id IS NOT NULL AND (NEW.tier_id IS NULL OR eligible_tier.id != NEW.tier_id) THEN
    -- Log the upgrade
    INSERT INTO tier_upgrade_history (customer_id, previous_tier_id, new_tier_id, triggered_by)
    VALUES (NEW.id, NEW.tier_id, eligible_tier.id, 'auto');

    -- Update customer tier
    NEW.tier_id := eligible_tier.id;
    NEW.tier_achieved_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tier upgrades
DROP TRIGGER IF EXISTS trigger_check_customer_tier ON customer_profiles;
CREATE TRIGGER trigger_check_customer_tier
  BEFORE UPDATE OF lifetime_spending, total_orders_count
  ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_upgrade_customer_tier();

-- Enable RLS
ALTER TABLE customer_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_upgrade_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_tiers
CREATE POLICY "Anyone can view active tiers"
  ON customer_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tiers"
  ON customer_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- RLS Policies for tier_upgrade_history
CREATE POLICY "Customers can view their own tier history"
  ON tier_upgrade_history FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all tier history"
  ON tier_upgrade_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

CREATE POLICY "Admins can insert tier history"
  ON tier_upgrade_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_profiles_tier ON customer_profiles(tier_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_spending ON customer_profiles(lifetime_spending);
CREATE INDEX IF NOT EXISTS idx_tier_upgrade_history_customer ON tier_upgrade_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tiers_level ON customer_tiers(tier_level);

-- Grant permissions
GRANT ALL ON customer_tiers TO authenticated;
GRANT ALL ON tier_upgrade_history TO authenticated;
