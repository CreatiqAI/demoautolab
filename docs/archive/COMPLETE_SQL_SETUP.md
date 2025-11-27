# Complete SQL Setup Guide for Supabase

This document contains all SQL scripts needed to set up the Customer Tiers and Installation Guides system, in the correct execution order.

---

## 📋 Execution Order

Run these scripts in Supabase SQL Editor **in this exact order**:

1. **Customer Tiers System** (Base schema)
2. **Installation Guides System** (Base schema)
3. **Monthly Spending Update** (Migration to monthly model)

---

## 🚀 Script 1: Customer Tiers System

**File**: `database/customer-tiers-system.sql`

Copy and paste this entire script into Supabase SQL Editor:

```sql
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
```

**Expected Result**: ✅ "Success. No rows returned."

---

## 🎥 Script 2: Installation Guides System

**File**: `database/installation-guides-system.sql`

Copy and paste this entire script into Supabase SQL Editor:

```sql
-- Installation Guides System
-- Enterprise merchants can access installation guides for various car models and products

-- Create installation_guides table
CREATE TABLE IF NOT EXISTS installation_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'Head Unit', 'Camera', 'Dashcam', 'Audio', 'Sensors', etc.
  difficulty_level VARCHAR(50) DEFAULT 'Medium', -- 'Easy', 'Medium', 'Hard', 'Expert'

  -- Car Information
  car_brand VARCHAR(100), -- 'Toyota', 'Honda', 'Proton', etc.
  car_model VARCHAR(100), -- 'Vios', 'City', 'X50', etc.
  car_year_start INTEGER,
  car_year_end INTEGER,

  -- Content
  video_url TEXT, -- YouTube or Vimeo URL
  video_duration VARCHAR(20), -- e.g., '15:30'
  thumbnail_url TEXT,
  pdf_url TEXT, -- Optional PDF guide

  -- Step-by-step instructions (JSON array)
  instructions_steps JSONB, -- [{step: 1, title: '...', description: '...', image_url: '...'}]

  -- Required tools and materials (JSON array)
  required_tools JSONB, -- ['Screwdriver', 'Wire stripper', 'Multimeter']
  required_materials JSONB, -- ['Wiring harness', 'Mounting bracket']

  -- Metadata
  estimated_time_minutes INTEGER, -- Total installation time
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,

  -- Access Control
  is_published BOOLEAN DEFAULT false,
  requires_enterprise_plan BOOLEAN DEFAULT true,

  -- Tags for better searchability (JSON array)
  tags JSONB, -- ['installation', 'android player', 'toyota']

  -- SEO
  search_keywords TEXT, -- Space-separated keywords for search

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES customer_profiles(id),

  CONSTRAINT valid_year_range CHECK (car_year_end IS NULL OR car_year_end >= car_year_start)
);

-- Create guide_views table for tracking
CREATE TABLE IF NOT EXISTS guide_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES installation_guides(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  watch_duration_seconds INTEGER, -- How long they watched
  completed BOOLEAN DEFAULT false,

  CONSTRAINT unique_guide_view UNIQUE(guide_id, merchant_id, viewed_at)
);

-- Create guide_likes table
CREATE TABLE IF NOT EXISTS guide_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES installation_guides(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_guide_like UNIQUE(guide_id, merchant_id)
);

-- Create guide_comments table for merchant feedback
CREATE TABLE IF NOT EXISTS guide_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES installation_guides(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_helpful BOOLEAN, -- Did this help them?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample installation guides
INSERT INTO installation_guides (
  title, description, category, difficulty_level,
  car_brand, car_model, car_year_start, car_year_end,
  video_url, video_duration, thumbnail_url,
  estimated_time_minutes, is_published, search_keywords,
  tags, required_tools, required_materials, instructions_steps
) VALUES
  (
    'Android Player Installation - Toyota Vios',
    'Complete guide to installing an aftermarket Android head unit in Toyota Vios 2019-2023 models. Includes wiring harness setup and steering wheel control integration.',
    'Head Unit',
    'Medium',
    'Toyota',
    'Vios',
    2019,
    2023,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '15:30',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    45,
    true,
    'toyota vios android player head unit installation 2019 2020 2021 2022 2023',
    '["android player", "toyota", "vios", "head unit", "steering control"]'::jsonb,
    '["Phillips screwdriver", "Panel removal tools", "Wire stripper", "Multimeter", "Electrical tape"]'::jsonb,
    '["Wiring harness adapter", "Mounting bracket", "GPS antenna", "USB extension cable"]'::jsonb,
    '[
      {"step": 1, "title": "Disconnect Battery", "description": "Safety first - disconnect the negative terminal", "duration": "2 min"},
      {"step": 2, "title": "Remove Factory Head Unit", "description": "Use panel tools to carefully remove trim and factory unit", "duration": "10 min"},
      {"step": 3, "title": "Connect Wiring Harness", "description": "Match wire colors and connect the harness adapter", "duration": "15 min"},
      {"step": 4, "title": "Install New Android Unit", "description": "Mount the new unit and secure with brackets", "duration": "10 min"},
      {"step": 5, "title": "Test All Functions", "description": "Reconnect battery and test audio, steering controls, and camera", "duration": "8 min"}
    ]'::jsonb
  ),
  (
    'Reverse Camera Installation - Honda City',
    'Step-by-step guide for installing a reverse camera in Honda City 2021-2024. Includes routing wires through the cabin.',
    'Camera',
    'Easy',
    'Honda',
    'City',
    2021,
    2024,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '8:45',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800',
    30,
    true,
    'honda city reverse camera backup camera installation',
    '["reverse camera", "honda", "city", "backup camera", "parking"]'::jsonb,
    '["Drill with 20mm hole saw", "Phillips screwdriver", "Wire fish tape", "Electrical tape"]'::jsonb,
    '["Reverse camera", "RCA cable", "Power cable", "Rubber grommet"]'::jsonb,
    '[
      {"step": 1, "title": "Choose Camera Location", "description": "Mark the spot on rear bumper or license plate area", "duration": "3 min"},
      {"step": 2, "title": "Drill Mounting Hole", "description": "Carefully drill hole for camera and wiring", "duration": "5 min"},
      {"step": 3, "title": "Route Wires", "description": "Fish wires from trunk to head unit location", "duration": "12 min"},
      {"step": 4, "title": "Connect to Head Unit", "description": "Connect RCA video cable and reverse trigger wire", "duration": "8 min"},
      {"step": 5, "title": "Test and Adjust", "description": "Test camera view and adjust angle if needed", "duration": "2 min"}
    ]'::jsonb
  ),
  (
    'Dashcam Hardwire Installation - Proton X50',
    'Professional hardwire installation guide for dashcam in Proton X50. Includes parking mode setup.',
    'Dashcam',
    'Medium',
    'Proton',
    'X50',
    2020,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '12:20',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
    40,
    true,
    'proton x50 dashcam hardwire installation parking mode',
    '["dashcam", "proton", "x50", "hardwire", "parking mode"]'::jsonb,
    '["Trim removal tools", "Wire tap connectors", "Multimeter", "Cable ties"]'::jsonb,
    '["Hardwire kit", "Fuse taps", "Cable clips"]'::jsonb,
    '[
      {"step": 1, "title": "Locate Fuse Box", "description": "Find the fuse box and identify ACC and constant power", "duration": "5 min"},
      {"step": 2, "title": "Install Fuse Taps", "description": "Install fuse taps for power connection", "duration": "8 min"},
      {"step": 3, "title": "Route Dashcam Cable", "description": "Hide cables behind headliner and A-pillar trim", "duration": "15 min"},
      {"step": 4, "title": "Ground Connection", "description": "Connect ground wire to chassis ground point", "duration": "5 min"},
      {"step": 5, "title": "Configure Parking Mode", "description": "Set up parking mode in dashcam settings", "duration": "7 min"}
    ]'::jsonb
  ),
  (
    'Component Speaker Upgrade - Perodua Myvi',
    'Upgrade factory speakers to component speakers in Perodua Myvi. Includes crossover wiring.',
    'Audio',
    'Medium',
    'Perodua',
    'Myvi',
    2018,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '20:15',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
    60,
    true,
    'perodua myvi speaker upgrade component speakers audio',
    '["speakers", "perodua", "myvi", "component", "audio upgrade"]'::jsonb,
    '["Panel removal tools", "Phillips screwdriver", "Wire crimper", "Electrical tape"]'::jsonb,
    '["Component speaker set", "Speaker wire", "Speaker adapters", "Sound deadening material"]'::jsonb,
    '[
      {"step": 1, "title": "Remove Door Panels", "description": "Carefully remove door panels to access speakers", "duration": "10 min"},
      {"step": 2, "title": "Install Tweeters", "description": "Mount tweeters in A-pillar or door mirror triangle", "duration": "15 min"},
      {"step": 3, "title": "Install Woofers", "description": "Mount woofers in door with adapter brackets", "duration": "20 min"},
      {"step": 4, "title": "Wire Crossovers", "description": "Connect crossovers according to diagram", "duration": "10 min"},
      {"step": 5, "title": "Sound Deadening", "description": "Apply sound deadening material to doors", "duration": "5 min"}
    ]'::jsonb
  ),
  (
    '360 Camera System - Toyota Hilux',
    'Complete 360-degree camera system installation for Toyota Hilux. Includes all 4 cameras and control box setup.',
    'Camera',
    'Hard',
    'Toyota',
    'Hilux',
    2020,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '25:00',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
    120,
    true,
    'toyota hilux 360 camera around view parking system',
    '["360 camera", "toyota", "hilux", "surround view", "parking assist"]'::jsonb,
    '["Drill", "Panel removal tools", "Wire fish tape", "Crimping tool", "Multimeter"]'::jsonb,
    '["360 camera kit", "Control box", "Trigger harness", "Mounting brackets", "RCA cables"]'::jsonb,
    '[
      {"step": 1, "title": "Plan Camera Positions", "description": "Mark positions for front, rear, and side cameras", "duration": "10 min"},
      {"step": 2, "title": "Install All Cameras", "description": "Mount and drill holes for all 4 cameras", "duration": "40 min"},
      {"step": 3, "title": "Route All Cables", "description": "Route cables from all cameras to control box location", "duration": "35 min"},
      {"step": 4, "title": "Install Control Box", "description": "Mount and wire control box behind head unit", "duration": "20 min"},
      {"step": 5, "title": "Calibrate System", "description": "Use calibration mode to align all camera views", "duration": "15 min"}
    ]'::jsonb
  ),
  (
    'Amplifier Installation - Honda Civic',
    'Install a 4-channel amplifier in Honda Civic. Includes power wiring, RCA routing, and speaker wire setup.',
    'Audio',
    'Hard',
    'Honda',
    'Civic',
    2016,
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '18:30',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
    90,
    true,
    'honda civic amplifier installation 4 channel power wiring',
    '["amplifier", "honda", "civic", "4 channel", "audio system"]'::jsonb,
    '["Wire stripper", "Crimping tool", "Drill", "Panel removal tools", "Multimeter"]'::jsonb,
    '["4-channel amplifier", "Power cable kit", "RCA cables", "Speaker wire", "Fuse holder", "Distribution block"]'::jsonb,
    '[
      {"step": 1, "title": "Plan Amplifier Location", "description": "Choose location in trunk with good ventilation", "duration": "5 min"},
      {"step": 2, "title": "Run Power Cable", "description": "Route power cable from battery through firewall to trunk", "duration": "25 min"},
      {"step": 3, "title": "Install Ground Wire", "description": "Connect ground to clean metal chassis ground point", "duration": "10 min"},
      {"step": 4, "title": "Run RCA and Remote", "description": "Route RCA cables and remote turn-on wire from head unit", "duration": "20 min"},
      {"step": 5, "title": "Connect Speakers", "description": "Wire speakers to amplifier outputs", "duration": "20 min"},
      {"step": 6, "title": "Tune Amplifier", "description": "Set gain, crossover, and EQ settings", "duration": "10 min"}
    ]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_guide_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE installation_guides
  SET views_count = views_count + 1
  WHERE id = NEW.guide_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for view counting
DROP TRIGGER IF EXISTS trigger_increment_guide_views ON guide_views;
CREATE TRIGGER trigger_increment_guide_views
  AFTER INSERT ON guide_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_guide_views();

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_guide_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE installation_guides
    SET likes_count = likes_count + 1
    WHERE id = NEW.guide_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE installation_guides
    SET likes_count = likes_count - 1
    WHERE id = OLD.guide_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like counting
DROP TRIGGER IF EXISTS trigger_update_guide_likes ON guide_likes;
CREATE TRIGGER trigger_update_guide_likes
  AFTER INSERT OR DELETE ON guide_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_guide_likes();

-- Enable RLS
ALTER TABLE installation_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for installation_guides
CREATE POLICY "Published guides visible to enterprise merchants"
  ON installation_guides FOR SELECT
  USING (
    is_published = true
    AND (
      -- Enterprise merchants can see all
      EXISTS (
        SELECT 1 FROM customer_profiles cp
        JOIN premium_partnerships pp ON cp.id = pp.merchant_id
        WHERE cp.user_id = auth.uid()
        AND pp.subscription_plan = 'enterprise'
        AND pp.subscription_status = 'ACTIVE'
        AND pp.admin_approved = true
      )
      -- Or admins
      OR EXISTS (
        SELECT 1 FROM customer_profiles
        WHERE user_id = auth.uid()
        AND customer_type = 'admin'
      )
    )
  );

CREATE POLICY "Admins can manage all guides"
  ON installation_guides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- RLS Policies for guide_views
CREATE POLICY "Merchants can log their own views"
  ON guide_views FOR INSERT
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can see their own views"
  ON guide_views FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can see all views"
  ON guide_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- RLS Policies for guide_likes
CREATE POLICY "Merchants can manage their own likes"
  ON guide_likes FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can see all likes"
  ON guide_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- RLS Policies for guide_comments
CREATE POLICY "Merchants can manage their own comments"
  ON guide_comments FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all comments"
  ON guide_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guides_category ON installation_guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_brand ON installation_guides(car_brand);
CREATE INDEX IF NOT EXISTS idx_guides_model ON installation_guides(car_model);
CREATE INDEX IF NOT EXISTS idx_guides_published ON installation_guides(is_published);
CREATE INDEX IF NOT EXISTS idx_guide_views_guide ON guide_views(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_views_merchant ON guide_views(merchant_id);
CREATE INDEX IF NOT EXISTS idx_guide_likes_guide ON guide_likes(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_comments_guide ON guide_comments(guide_id);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_guides_search ON installation_guides
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(search_keywords, '')));

-- Grant permissions
GRANT ALL ON installation_guides TO authenticated;
GRANT ALL ON guide_views TO authenticated;
GRANT ALL ON guide_likes TO authenticated;
GRANT ALL ON guide_comments TO authenticated;
```

**Expected Result**: ✅ "Success. No rows returned." (6 sample guides inserted)

---

## 📅 Script 3: Monthly Spending Update

**File**: `database/customer-tiers-monthly-update.sql`

Copy and paste this entire script into Supabase SQL Editor:

```sql
-- Update Customer Tiers System to use Monthly Spending
-- This migration changes from lifetime spending to monthly spending requirements

-- 1. Add monthly spending column to customer_profiles
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS current_month_spending DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_spending_reset_date DATE DEFAULT CURRENT_DATE;

-- 2. Update customer_tiers table - rename columns
DO $$
BEGIN
  -- Rename min_lifetime_spending to min_monthly_spending
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_tiers'
    AND column_name = 'min_lifetime_spending'
  ) THEN
    ALTER TABLE customer_tiers
      RENAME COLUMN min_lifetime_spending TO min_monthly_spending;
  END IF;

  -- Drop min_orders_count column as it's not needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_tiers'
    AND column_name = 'min_orders_count'
  ) THEN
    ALTER TABLE customer_tiers
      DROP COLUMN min_orders_count;
  END IF;
END $$;

-- 3. Update default tier values for monthly spending
UPDATE customer_tiers SET min_monthly_spending = 5000 WHERE tier_name = 'Platinum'; -- RM5,000/month
UPDATE customer_tiers SET min_monthly_spending = 3000 WHERE tier_name = 'Gold';     -- RM3,000/month
UPDATE customer_tiers SET min_monthly_spending = 1500 WHERE tier_name = 'Silver';   -- RM1,500/month
UPDATE customer_tiers SET min_monthly_spending = 500 WHERE tier_name = 'Bronze';    -- RM500/month
UPDATE customer_tiers SET min_monthly_spending = 0 WHERE tier_name = 'Standard';    -- RM0/month

-- 4. Create function to reset monthly spending (run monthly via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_spending()
RETURNS void AS $$
BEGIN
  -- Reset monthly spending for all customers at start of new month
  UPDATE customer_profiles
  SET current_month_spending = 0,
      last_spending_reset_date = CURRENT_DATE
  WHERE last_spending_reset_date < DATE_TRUNC('month', CURRENT_DATE);

  -- Log the reset
  RAISE NOTICE 'Monthly spending reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Update the tier upgrade function to use monthly spending
CREATE OR REPLACE FUNCTION check_and_upgrade_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
  eligible_tier RECORD;
  current_tier_level INTEGER;
BEGIN
  -- Check if monthly spending needs reset (in case cron job didn't run)
  IF NEW.last_spending_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    NEW.current_month_spending := 0;
    NEW.last_spending_reset_date := CURRENT_DATE;
  END IF;

  -- Get current tier level
  SELECT tier_level INTO current_tier_level
  FROM customer_tiers
  WHERE id = NEW.tier_id;

  -- Find the highest tier the customer qualifies for based on MONTHLY spending
  SELECT * INTO eligible_tier
  FROM customer_tiers
  WHERE is_active = true
    AND NEW.current_month_spending >= min_monthly_spending
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

-- 6. Update the trigger to watch current_month_spending instead
DROP TRIGGER IF EXISTS trigger_check_customer_tier ON customer_profiles;
CREATE TRIGGER trigger_check_customer_tier
  BEFORE UPDATE OF current_month_spending
  ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_upgrade_customer_tier();

-- 7. Create function to update monthly spending when order is completed
CREATE OR REPLACE FUNCTION update_customer_monthly_spending()
RETURNS TRIGGER AS $$
DECLARE
  customer_profile_id UUID;
  order_total DECIMAL(10,2);
BEGIN
  -- Only process when order is marked as completed or delivered
  IF NEW.status IN ('completed', 'delivered') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'delivered')) THEN

    -- Get customer profile ID
    SELECT id INTO customer_profile_id
    FROM customer_profiles
    WHERE user_id = NEW.user_id;

    -- Calculate order total
    order_total := NEW.total_amount;

    IF customer_profile_id IS NOT NULL THEN
      -- Update both monthly and lifetime spending
      UPDATE customer_profiles
      SET
        current_month_spending = current_month_spending + order_total,
        lifetime_spending = lifetime_spending + order_total,
        total_orders_count = total_orders_count + 1
      WHERE id = customer_profile_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger on orders table to update spending
DROP TRIGGER IF EXISTS trigger_update_monthly_spending ON orders;
CREATE TRIGGER trigger_update_monthly_spending
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_monthly_spending();

-- 9. Update all existing customers' monthly spending to 0 to start fresh
UPDATE customer_profiles
SET current_month_spending = 0,
    last_spending_reset_date = CURRENT_DATE
WHERE current_month_spending IS NULL;

COMMENT ON COLUMN customer_profiles.current_month_spending IS
  'Total spending in the current calendar month. Resets to 0 at the start of each month.';

COMMENT ON COLUMN customer_profiles.last_spending_reset_date IS
  'Date when monthly spending was last reset. Used to track monthly cycles.';

COMMENT ON FUNCTION reset_monthly_spending() IS
  'Resets all customers monthly spending to 0. Should be run at the start of each month via cron job.';

-- 10. Create a view to easily see customer tier eligibility
CREATE OR REPLACE VIEW customer_tier_status AS
SELECT
  cp.id,
  cp.user_id,
  cp.customer_type,
  cp.current_month_spending,
  cp.lifetime_spending,
  cp.total_orders_count,
  cp.last_spending_reset_date,

  -- Current tier info
  ct_current.tier_name AS current_tier_name,
  ct_current.tier_level AS current_tier_level,
  ct_current.discount_percentage AS current_discount,
  ct_current.points_multiplier AS current_points_multiplier,

  -- Next tier info (if any)
  ct_next.tier_name AS next_tier_name,
  ct_next.tier_level AS next_tier_level,
  ct_next.min_monthly_spending AS next_tier_monthly_requirement,

  -- How much more they need to spend this month to reach next tier
  GREATEST(0, COALESCE(ct_next.min_monthly_spending, 0) - cp.current_month_spending) AS amount_needed_for_next_tier,

  -- Tier achievement date
  cp.tier_achieved_at

FROM customer_profiles cp
LEFT JOIN customer_tiers ct_current ON cp.tier_id = ct_current.id
LEFT JOIN LATERAL (
  SELECT *
  FROM customer_tiers ct
  WHERE ct.is_active = true
    AND ct.tier_level < COALESCE(ct_current.tier_level, 999)
    AND ct.min_monthly_spending > cp.current_month_spending
  ORDER BY ct.tier_level DESC
  LIMIT 1
) ct_next ON true
WHERE cp.customer_type = 'customer';

GRANT SELECT ON customer_tier_status TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Customer Tiers Monthly Update Completed!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Added current_month_spending column';
  RAISE NOTICE '2. Changed to monthly spending requirements';
  RAISE NOTICE '3. Removed order count requirements';
  RAISE NOTICE '4. Created monthly reset function';
  RAISE NOTICE '5. Updated tier upgrade logic';
  RAISE NOTICE '6. Created customer_tier_status view';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Set up a cron job to run reset_monthly_spending() on the 1st of each month!';
  RAISE NOTICE '===========================================';
END $$;
```

**Expected Result**: ✅ Success message with notice about monthly reset

---

## ⚙️ Script 4: Monthly Reset Cron Job (IMPORTANT!)

After running the above scripts, **immediately set up the monthly reset**:

```sql
-- Option A: Using pg_cron (if available in Supabase)
SELECT cron.schedule(
  'reset-monthly-spending',
  '0 0 1 * *',  -- Runs at midnight on the 1st of each month
  'SELECT reset_monthly_spending();'
);
```

**OR manually run this on the 1st of each month:**

```sql
SELECT reset_monthly_spending();
```

---

## ✅ Verification Steps

After running all scripts, verify everything works:

### 1. Check Tables Exist
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('customer_tiers', 'installation_guides', 'tier_upgrade_history', 'guide_views')
ORDER BY table_name;
```
**Expected**: 4 rows returned

### 2. Check Default Tiers
```sql
SELECT tier_name, tier_level, min_monthly_spending, discount_percentage, points_multiplier
FROM customer_tiers
ORDER BY tier_level;
```
**Expected**: 5 tiers (Platinum, Gold, Silver, Bronze, Standard)

### 3. Check Installation Guides
```sql
SELECT COUNT(*) as total_guides FROM installation_guides;
```
**Expected**: 6 guides

### 4. Check Columns Added
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'customer_profiles'
AND column_name IN ('current_month_spending', 'last_spending_reset_date', 'tier_id')
ORDER BY column_name;
```
**Expected**: 3 columns

### 5. Test Monthly Reset Function
```sql
SELECT reset_monthly_spending();
```
**Expected**: "NOTICE: Monthly spending reset completed at..."

---

## 🎯 Summary

You need to run **3 main SQL scripts** in Supabase:

1. ✅ **customer-tiers-system.sql** → Creates tiers system
2. ✅ **installation-guides-system.sql** → Creates guides system
3. ✅ **customer-tiers-monthly-update.sql** → Switches to monthly model

Then:
4. ⚙️ **Set up monthly cron job** → Auto-reset spending

**Total Execution Time**: ~2-3 minutes

After this, your admin panel at `/admin/customer-tiers` and `/admin/installation-guides` will be fully functional! 🚀
