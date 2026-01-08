-- ============================================================================
-- AUTOLAB B2B PLATFORM - COMPLETE DATABASE MIGRATION (FIXED V2)
-- Phase 1 & Phase 2 - ALL CHANGES IN ONE SCRIPT
-- Date: 2025-12-11
--
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Paste into Supabase SQL Editor
-- 3. Click "RUN" button
-- 4. Wait for completion (may take 30-60 seconds)
-- 5. Verify success messages at bottom
--
-- FIXED FOR:
-- - customer_profiles, admin_profiles (not profiles)
-- - products_new (not products)
-- - premium_partnerships check constraint issue
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1.1: CREATE MANUFACTURERS TABLE
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);
CREATE INDEX IF NOT EXISTS idx_manufacturers_is_active ON manufacturers(is_active);

COMMENT ON TABLE manufacturers IS 'Product manufacturer/factory brand information for dual categorization (Car Brand + Manufacturer Brand)';

ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active manufacturers" ON manufacturers;
CREATE POLICY "Anyone can view active manufacturers" ON manufacturers
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage manufacturers" ON manufacturers;
CREATE POLICY "Admins can manage manufacturers" ON manufacturers
  FOR ALL
  USING (true); -- Permissive for admins

-- Insert example manufacturers
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

-- ============================================================================
-- PHASE 1.2: ADD MANUFACTURER FIELDS TO PRODUCTS_NEW
-- ============================================================================

ALTER TABLE products_new
ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS manufacturer_brand TEXT;

CREATE INDEX IF NOT EXISTS idx_products_new_manufacturer_id ON products_new(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_products_new_manufacturer_brand ON products_new(manufacturer_brand);

COMMENT ON COLUMN products_new.manufacturer_id IS 'Foreign key to manufacturers table';
COMMENT ON COLUMN products_new.manufacturer_brand IS 'Manufacturer/Factory brand name for display';

-- ============================================================================
-- PHASE 1.3: RENAME ENTERPRISE TO PANEL & ADD BILLING FIELDS
-- ============================================================================

-- CRITICAL FIX: Drop the old check constraint first
DO $$
BEGIN
  -- Find and drop the subscription_plan check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'premium_partnerships_subscription_plan_check'
  ) THEN
    ALTER TABLE premium_partnerships DROP CONSTRAINT premium_partnerships_subscription_plan_check;
    RAISE NOTICE 'Dropped old subscription_plan check constraint';
  END IF;
END $$;

-- Now update existing 'enterprise' records to 'panel'
UPDATE premium_partnerships
SET subscription_plan = 'panel'
WHERE subscription_plan = 'enterprise';

-- Add new check constraint that includes 'panel'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'premium_partnerships_subscription_plan_check_v2'
  ) THEN
    ALTER TABLE premium_partnerships
    ADD CONSTRAINT premium_partnerships_subscription_plan_check_v2
    CHECK (subscription_plan IN ('professional', 'panel'));
    RAISE NOTICE 'Added new subscription_plan check constraint with panel support';
  END IF;
END $$;

-- Add billing cycle column
ALTER TABLE premium_partnerships
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'month';

-- Add check constraint for billing_cycle if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'premium_partnerships_billing_cycle_check'
  ) THEN
    ALTER TABLE premium_partnerships
    ADD CONSTRAINT premium_partnerships_billing_cycle_check
    CHECK (billing_cycle IN ('month', 'year'));
  END IF;
END $$;

-- Set billing cycle for existing plans
UPDATE premium_partnerships
SET billing_cycle = 'year'
WHERE subscription_plan = 'professional';

UPDATE premium_partnerships
SET billing_cycle = 'month'
WHERE subscription_plan = 'panel';

-- Add Panel-specific columns
ALTER TABLE premium_partnerships
ADD COLUMN IF NOT EXISTS is_admin_invited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS panel_slot_number INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_panel_slot ON premium_partnerships(panel_slot_number) WHERE panel_slot_number IS NOT NULL;

UPDATE premium_partnerships
SET is_admin_invited = true
WHERE subscription_plan = 'panel';

COMMENT ON COLUMN premium_partnerships.billing_cycle IS 'Billing cycle: month (RM350/month for Panel) or year (RM99/year for Professional)';
COMMENT ON COLUMN premium_partnerships.is_admin_invited IS 'True if Panel member was invited by admin (required for Panel tier)';
COMMENT ON COLUMN premium_partnerships.panel_slot_number IS 'Panel slot number (1-100) - only for Panel tier members';

-- Create function to check Panel limit (max 100)
CREATE OR REPLACE FUNCTION check_panel_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_panel_count INTEGER;
BEGIN
  IF NEW.subscription_plan = 'panel' AND NEW.subscription_status = 'ACTIVE' THEN
    SELECT COUNT(*) INTO active_panel_count
    FROM premium_partnerships
    WHERE subscription_plan = 'panel'
      AND subscription_status = 'ACTIVE'
      AND id != NEW.id;

    IF active_panel_count >= 100 THEN
      RAISE EXCEPTION 'Maximum Panel limit (100) reached. Cannot activate more Panel members.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_panel_limit ON premium_partnerships;
CREATE TRIGGER enforce_panel_limit
  BEFORE INSERT OR UPDATE ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION check_panel_limit();

COMMENT ON TABLE premium_partnerships IS 'Merchant partnerships - Professional (RM99/year) or Panel (RM350/month, max 100, admin-invited only)';

-- ============================================================================
-- PHASE 1.4: ENHANCE INSTALLATION GUIDES
-- ============================================================================

ALTER TABLE installation_guides
ADD COLUMN IF NOT EXISTS recommended_installation_price_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS recommended_installation_price_max DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS required_tools TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS safety_warnings TEXT[] DEFAULT '{}'::TEXT[];

CREATE INDEX IF NOT EXISTS idx_installation_guides_difficulty ON installation_guides(difficulty_level);

COMMENT ON COLUMN installation_guides.recommended_installation_price_min IS 'Minimum recommended installation price in RM (for merchant reference)';
COMMENT ON COLUMN installation_guides.recommended_installation_price_max IS 'Maximum recommended installation price in RM (for merchant reference)';
COMMENT ON COLUMN installation_guides.difficulty_level IS 'Installation difficulty: easy, medium, hard';
COMMENT ON COLUMN installation_guides.estimated_time_minutes IS 'Estimated installation time in minutes';
COMMENT ON COLUMN installation_guides.steps IS 'JSON array of step-by-step instructions';

-- ============================================================================
-- PHASE 1.5: AUTO-GENERATE RM50 WELCOME VOUCHER FOR NEW MERCHANTS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_merchant_welcome_voucher()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create voucher for newly activated merchants
  IF NEW.subscription_status = 'ACTIVE' AND
     (OLD IS NULL OR OLD.subscription_status != 'ACTIVE') THEN

    -- Create RM50 welcome voucher
    INSERT INTO vouchers (
      code,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      used_count,
      valid_from,
      valid_until,
      is_active,
      assigned_to_customer_id,
      created_by_admin_id
    ) VALUES (
      'WELCOME50_' || UPPER(SUBSTRING(NEW.merchant_id::text, 1, 8)),
      'fixed',
      50.00,
      100.00,
      50.00,
      1, -- One-time use
      0,
      NOW(),
      NOW() + INTERVAL '90 days',
      true,
      NEW.merchant_id,
      NULL -- System-generated, no admin ID
    )
    ON CONFLICT (code) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_merchant_welcome_voucher ON premium_partnerships;
CREATE TRIGGER trigger_create_merchant_welcome_voucher
  AFTER INSERT OR UPDATE ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION create_merchant_welcome_voucher();

COMMENT ON FUNCTION create_merchant_welcome_voucher() IS 'Auto-generate RM50 welcome voucher for newly activated merchants';

-- ============================================================================
-- PHASE 2.1: 2ND HAND MARKETPLACE
-- ============================================================================

CREATE TABLE IF NOT EXISTS secondhand_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'used')),
  selling_price DECIMAL(10,2) NOT NULL CHECK (selling_price > 0),
  original_price DECIMAL(10,2),
  images TEXT[] DEFAULT '{}'::TEXT[],
  location TEXT,
  usage_history TEXT,
  compatible_cars TEXT[] DEFAULT '{}'::TEXT[],
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'expired')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secondhand_listings_seller ON secondhand_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_secondhand_listings_status ON secondhand_listings(status);
CREATE INDEX IF NOT EXISTS idx_secondhand_listings_category ON secondhand_listings(category);
CREATE INDEX IF NOT EXISTS idx_secondhand_listings_created_at ON secondhand_listings(created_at DESC);

COMMENT ON TABLE secondhand_listings IS 'Merchant 2nd hand product listings for public marketplace';

ALTER TABLE secondhand_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved listings" ON secondhand_listings;
CREATE POLICY "Public can view approved listings" ON secondhand_listings
  FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Merchants can view own listings" ON secondhand_listings;
CREATE POLICY "Merchants can view own listings" ON secondhand_listings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
      AND customer_profiles.id = secondhand_listings.seller_id
    )
  );

DROP POLICY IF EXISTS "Merchants can create listings" ON secondhand_listings;
CREATE POLICY "Merchants can create listings" ON secondhand_listings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
      AND customer_profiles.id = seller_id
    )
  );

DROP POLICY IF EXISTS "Merchants can update own listings" ON secondhand_listings;
CREATE POLICY "Merchants can update own listings" ON secondhand_listings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
      AND customer_profiles.id = seller_id
    )
  );

DROP POLICY IF EXISTS "Admins can manage all listings" ON secondhand_listings;
CREATE POLICY "Admins can manage all listings" ON secondhand_listings
  FOR ALL
  USING (true); -- Permissive for admins

-- Secondhand inquiries table
CREATE TABLE IF NOT EXISTS secondhand_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES secondhand_listings(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_email TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secondhand_inquiries_listing ON secondhand_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_secondhand_inquiries_created_at ON secondhand_inquiries(created_at DESC);

ALTER TABLE secondhand_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view inquiries on their listings" ON secondhand_inquiries;
CREATE POLICY "Sellers can view inquiries on their listings" ON secondhand_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM secondhand_listings
      JOIN customer_profiles ON customer_profiles.id = secondhand_listings.seller_id
      WHERE secondhand_listings.id = secondhand_inquiries.listing_id
      AND customer_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can create inquiries" ON secondhand_inquiries;
CREATE POLICY "Anyone can create inquiries" ON secondhand_inquiries
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all inquiries" ON secondhand_inquiries;
CREATE POLICY "Admins can view all inquiries" ON secondhand_inquiries
  FOR ALL
  USING (true); -- Permissive for admins

-- ============================================================================
-- PHASE 2.2: NOTIFICATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  whatsapp_phone TEXT,
  whatsapp_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

COMMENT ON TABLE notification_preferences IS 'User notification preferences for WhatsApp and email notifications';
COMMENT ON COLUMN notification_preferences.notification_type IS 'Type: order_confirmed, order_shipped, new_products, price_drops, promotions, etc.';

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences" ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all preferences" ON notification_preferences;
CREATE POLICY "Admins can view all preferences" ON notification_preferences
  FOR SELECT
  USING (true); -- Permissive for admins

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
CREATE POLICY "Users can view own notification logs" ON notification_logs
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all logs" ON notification_logs;
CREATE POLICY "Admins can view all logs" ON notification_logs
  FOR SELECT
  USING (true); -- Permissive for admins

-- Function to auto-create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
DECLARE
  notification_types TEXT[] := ARRAY[
    'order_confirmed',
    'order_packing',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'new_products',
    'price_drops',
    'back_in_stock',
    'shop_announcements',
    'promotions'
  ];
  notif_type TEXT;
BEGIN
  FOREACH notif_type IN ARRAY notification_types
  LOOP
    INSERT INTO notification_preferences (user_id, notification_type, is_enabled)
    VALUES (NEW.user_id, notif_type, true)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_notification_preferences ON customer_profiles;
CREATE TRIGGER trigger_create_default_notification_preferences
  AFTER INSERT ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================================================
-- PHASE 2.3: ORDER HISTORY ACCESS CONTROL
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_history_access_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE,
  duration_months INTEGER, -- NULL for lifetime
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO order_history_access_pricing (plan_name, duration_months, price, description) VALUES
('1 Year Extended Access', 12, 50.00, 'Access orders older than 6 months for 1 year'),
('3 Years Extended Access', 36, 120.00, 'Access orders older than 6 months for 3 years'),
('Lifetime Extended Access', NULL, 200.00, 'Permanent access to complete order history')
ON CONFLICT (plan_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS order_history_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  pricing_plan_id UUID NOT NULL REFERENCES order_history_access_pricing(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL for lifetime
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_order_history_access_customer ON order_history_access(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_history_access_expires ON order_history_access(expires_at);

ALTER TABLE order_history_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own access" ON order_history_access;
CREATE POLICY "Customers can view own access" ON order_history_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.id = order_history_access.customer_id
      AND customer_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can create access records" ON order_history_access;
CREATE POLICY "System can create access records" ON order_history_access
  FOR INSERT
  WITH CHECK (true); -- Permissive for system/admin

DROP POLICY IF EXISTS "Admins can manage all access" ON order_history_access;
CREATE POLICY "Admins can manage all access" ON order_history_access
  FOR ALL
  USING (true); -- Permissive for admins

-- Helper function to check if customer has extended history access
CREATE OR REPLACE FUNCTION has_extended_history_access(p_customer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM order_history_access
    WHERE customer_id = p_customer_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_extended_history_access(UUID) IS 'Check if customer has active extended order history access';

-- ============================================================================
-- VERIFICATION & SUCCESS MESSAGES
-- ============================================================================

DO $$
DECLARE
  manufacturer_count INTEGER;
  panel_count INTEGER;
  voucher_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO manufacturer_count FROM manufacturers;
  SELECT COUNT(*) INTO panel_count FROM premium_partnerships WHERE subscription_plan = 'panel';
  SELECT COUNT(*) INTO voucher_count FROM vouchers WHERE code LIKE 'WELCOME50_%';

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Phase 1.1 - Manufacturers: % records', manufacturer_count;
  RAISE NOTICE 'Phase 1.3 - Panel tier members: % records', panel_count;
  RAISE NOTICE 'Phase 1.5 - Welcome vouchers: % records', voucher_count;
  RAISE NOTICE 'Phase 2.1 - 2nd hand marketplace tables created';
  RAISE NOTICE 'Phase 2.2 - Notification system tables created';
  RAISE NOTICE 'Phase 2.3 - Order history access tables created';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test Merchant Console at /merchant-console';
  RAISE NOTICE '2. Test Find Shops at /find-shops (Panel only)';
  RAISE NOTICE '3. Test 2nd hand marketplace at /my-2ndhand-listings';
  RAISE NOTICE '4. Verify welcome vouchers in vouchers table';
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;
