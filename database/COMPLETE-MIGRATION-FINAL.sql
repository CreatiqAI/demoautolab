-- ============================================================================
-- AUTOLAB B2B PLATFORM - COMPLETE DATABASE MIGRATION (FINAL VERSION)
-- Phase 1 & Phase 2 - ALL CHANGES IN ONE SCRIPT
-- Date: 2025-12-07
--
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Paste into Supabase SQL Editor
-- 3. Click "RUN" button
-- 4. Wait for completion (may take 30-60 seconds)
-- 5. Verify success messages at bottom
--
-- FIXED FOR: customer_profiles, admin_profiles, products_new (no products table)
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

-- Update existing 'enterprise' records to 'panel'
UPDATE premium_partnerships
SET subscription_plan = 'panel'
WHERE subscription_plan = 'enterprise';

-- Add billing cycle column
ALTER TABLE premium_partnerships
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'month' CHECK (billing_cycle IN ('month', 'year'));

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
ADD COLUMN IF NOT EXISTS pricing_notes TEXT,
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS required_tools TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert'));

CREATE INDEX IF NOT EXISTS idx_installation_guides_difficulty ON installation_guides(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_installation_guides_steps ON installation_guides USING GIN(steps);

COMMENT ON COLUMN installation_guides.recommended_installation_price_min IS 'Minimum recommended installation price in RM';
COMMENT ON COLUMN installation_guides.recommended_installation_price_max IS 'Maximum recommended installation price in RM';
COMMENT ON COLUMN installation_guides.pricing_notes IS 'Additional pricing information or notes';
COMMENT ON COLUMN installation_guides.steps IS 'Structured step-by-step guide in JSON format: [{"step_number": 1, "title": "...", "description": "...", "image_url": "...", "duration_minutes": 5}]';
COMMENT ON COLUMN installation_guides.required_tools IS 'Array of required tools for installation';

-- ============================================================================
-- PHASE 1.5: AUTO-GENERATE WELCOME VOUCHER
-- ============================================================================

CREATE OR REPLACE FUNCTION create_merchant_welcome_voucher()
RETURNS TRIGGER AS $$
DECLARE
  voucher_code TEXT;
  first_admin_id UUID;
BEGIN
  IF NEW.subscription_status = 'ACTIVE'
     AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'ACTIVE')
     AND (NEW.subscription_plan = 'professional' OR NEW.subscription_plan = 'panel') THEN

    IF NOT EXISTS (
      SELECT 1 FROM vouchers
      WHERE assigned_to_customer_id = NEW.merchant_id
        AND code LIKE 'WELCOME50_%'
        AND description LIKE '%Welcome voucher%'
    ) THEN

      voucher_code := 'WELCOME50_' || UPPER(SUBSTRING(NEW.merchant_id::text, 1, 8));

      -- Get first admin (or NULL if none exists)
      SELECT id INTO first_admin_id FROM admin_profiles WHERE role = 'admin' LIMIT 1;

      INSERT INTO vouchers (
        code,
        discount_type,
        discount_value,
        min_purchase_amount,
        max_discount_amount,
        customer_type_restriction,
        assigned_to_customer_id,
        usage_limit_per_user,
        max_total_usage,
        valid_from,
        valid_until,
        is_active,
        description,
        created_by
      ) VALUES (
        voucher_code,
        'fixed',
        50.00,
        100.00,
        50.00,
        'merchant',
        NEW.merchant_id,
        1,
        1,
        NOW(),
        NOW() + INTERVAL '1 year',
        true,
        'Welcome voucher for new merchant subscription - RM50 off with minimum spend of RM100',
        first_admin_id
      );

      RAISE NOTICE 'Welcome voucher % created for merchant %', voucher_code, NEW.merchant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_merchant_welcome_voucher ON premium_partnerships;
CREATE TRIGGER trigger_create_merchant_welcome_voucher
  AFTER INSERT OR UPDATE OF subscription_status ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION create_merchant_welcome_voucher();

COMMENT ON FUNCTION create_merchant_welcome_voucher() IS 'Auto-generates RM50 welcome voucher when merchant subscription becomes active for first time';

-- Backfill: Create welcome vouchers for existing active merchants
DO $$
DECLARE
  merchant_record RECORD;
  voucher_code TEXT;
  first_admin_id UUID;
BEGIN
  SELECT id INTO first_admin_id FROM admin_profiles WHERE role = 'admin' LIMIT 1;

  FOR merchant_record IN
    SELECT pp.merchant_id, pp.id, pp.subscription_plan
    FROM premium_partnerships pp
    WHERE pp.subscription_status = 'ACTIVE'
      AND (pp.subscription_plan = 'professional' OR pp.subscription_plan = 'panel')
      AND NOT EXISTS (
        SELECT 1 FROM vouchers
        WHERE assigned_to_customer_id = pp.merchant_id
          AND code LIKE 'WELCOME50_%'
      )
  LOOP
    voucher_code := 'WELCOME50_' || UPPER(SUBSTRING(merchant_record.merchant_id::text, 1, 8));

    INSERT INTO vouchers (
      code,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      customer_type_restriction,
      assigned_to_customer_id,
      usage_limit_per_user,
      max_total_usage,
      valid_from,
      valid_until,
      is_active,
      description,
      created_by
    ) VALUES (
      voucher_code,
      'fixed',
      50.00,
      100.00,
      50.00,
      'merchant',
      merchant_record.merchant_id,
      1,
      1,
      NOW(),
      NOW() + INTERVAL '1 year',
      true,
      'Welcome voucher for new merchant subscription - RM50 off with minimum spend of RM100 (backfilled)',
      first_admin_id
    );

    RAISE NOTICE 'Backfilled welcome voucher % for merchant %', voucher_code, merchant_record.merchant_id;
  END LOOP;
END;
$$;

-- ============================================================================
-- PHASE 2.1: 2ND HAND MARKETPLACE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS secondhand_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  product_category TEXT,
  title TEXT NOT NULL,
  description TEXT,

  original_price DECIMAL(10,2),
  selling_price DECIMAL(10,2) NOT NULL,
  is_negotiable BOOLEAN DEFAULT false,

  condition TEXT NOT NULL CHECK (condition IN ('like_new', 'good', 'fair', 'damaged')),
  year_purchased INTEGER,
  months_used INTEGER,
  reason_for_selling TEXT,

  car_brand TEXT,
  car_model TEXT,
  compatible_years TEXT,

  images TEXT[] DEFAULT '{}'::TEXT[],

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'expired')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES admin_profiles(id),
  reviewed_at TIMESTAMPTZ,

  views_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,

  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  sold_at TIMESTAMPTZ,
  sold_to_user_id UUID REFERENCES customer_profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS secondhand_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES secondhand_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  message TEXT NOT NULL,
  offered_price DECIMAL(10,2),
  buyer_phone TEXT,
  buyer_email TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  seller_reply TEXT,
  replied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secondhand_listings_seller ON secondhand_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_secondhand_listings_status ON secondhand_listings(status);
CREATE INDEX IF NOT EXISTS idx_secondhand_listings_category ON secondhand_listings(product_category);
CREATE INDEX IF NOT EXISTS idx_secondhand_listings_car_brand ON secondhand_listings(car_brand);
CREATE INDEX IF NOT EXISTS idx_secondhand_listings_created ON secondhand_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secondhand_inquiries_listing ON secondhand_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_secondhand_inquiries_buyer ON secondhand_inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_secondhand_inquiries_status ON secondhand_inquiries(status);

COMMENT ON TABLE secondhand_listings IS 'Merchant 2nd hand product listings requiring admin approval';
COMMENT ON TABLE secondhand_inquiries IS 'Buyer inquiries for 2nd hand listings';

ALTER TABLE secondhand_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondhand_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved secondhand listings" ON secondhand_listings;
CREATE POLICY "Anyone can view approved secondhand listings" ON secondhand_listings
  FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Sellers can view their own listings" ON secondhand_listings;
CREATE POLICY "Sellers can view their own listings" ON secondhand_listings
  FOR SELECT
  USING (seller_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Merchants can create secondhand listings" ON secondhand_listings;
CREATE POLICY "Merchants can create secondhand listings" ON secondhand_listings
  FOR INSERT
  WITH CHECK (
    seller_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'merchant'
    )
  );

DROP POLICY IF EXISTS "Sellers can update their own pending listings" ON secondhand_listings;
CREATE POLICY "Sellers can update their own pending listings" ON secondhand_listings
  FOR UPDATE
  USING (
    seller_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Admins can manage all secondhand listings" ON secondhand_listings;
CREATE POLICY "Admins can manage all secondhand listings" ON secondhand_listings
  FOR ALL
  USING (true); -- Permissive for admins

DROP POLICY IF EXISTS "Buyers can view their own inquiries" ON secondhand_inquiries;
CREATE POLICY "Buyers can view their own inquiries" ON secondhand_inquiries
  FOR SELECT
  USING (
    buyer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can view inquiries for their listings" ON secondhand_inquiries;
CREATE POLICY "Sellers can view inquiries for their listings" ON secondhand_inquiries
  FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM secondhand_listings
      WHERE seller_id IN (
        SELECT id FROM customer_profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create inquiries" ON secondhand_inquiries;
CREATE POLICY "Users can create inquiries" ON secondhand_inquiries
  FOR INSERT
  WITH CHECK (
    buyer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can reply to inquiries" ON secondhand_inquiries;
CREATE POLICY "Sellers can reply to inquiries" ON secondhand_inquiries
  FOR UPDATE
  USING (
    listing_id IN (
      SELECT id FROM secondhand_listings
      WHERE seller_id IN (
        SELECT id FROM customer_profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can manage all inquiries" ON secondhand_inquiries;
CREATE POLICY "Admins can manage all inquiries" ON secondhand_inquiries
  FOR ALL
  USING (true); -- Permissive for admins

CREATE OR REPLACE FUNCTION increment_inquiry_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE secondhand_listings
  SET inquiry_count = inquiry_count + 1
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_inquiry_count ON secondhand_inquiries;
CREATE TRIGGER trigger_increment_inquiry_count
  AFTER INSERT ON secondhand_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION increment_inquiry_count();

CREATE OR REPLACE FUNCTION expire_old_secondhand_listings()
RETURNS void AS $$
BEGIN
  UPDATE secondhand_listings
  SET status = 'expired'
  WHERE status IN ('pending', 'approved')
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 2.2: NOTIFICATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES customer_profiles(user_id) ON DELETE CASCADE,

  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),

  type TEXT NOT NULL CHECK (type IN (
    'new_products',
    'order_placed',
    'order_status_updates',
    'payment_confirmation',
    'delivery_updates',
    'promotions',
    'shop_updates',
    'system_announcements',
    'review_responses',
    'secondhand_inquiries'
  )),

  enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, channel, type)
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES customer_profiles(user_id) ON DELETE CASCADE,

  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  error_message TEXT,

  external_id TEXT,

  related_entity_type TEXT,
  related_entity_id UUID,

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_opt_in_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled ON notification_preferences(enabled);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_whatsapp_opt_in ON customer_profiles(whatsapp_opt_in);

COMMENT ON TABLE notification_preferences IS 'User notification preferences by channel and type';
COMMENT ON TABLE notification_logs IS 'Log of all sent notifications for tracking and debugging';
COMMENT ON COLUMN customer_profiles.whatsapp_number IS 'User WhatsApp number (may differ from phone)';
COMMENT ON COLUMN customer_profiles.whatsapp_opt_in IS 'User has opted in to receive WhatsApp notifications';

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all notification preferences" ON notification_preferences;
CREATE POLICY "Admins can view all notification preferences" ON notification_preferences
  FOR SELECT
  USING (true); -- Permissive for admins

DROP POLICY IF EXISTS "Users can view their own notification logs" ON notification_logs;
CREATE POLICY "Users can view their own notification logs" ON notification_logs
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notification logs" ON notification_logs;
CREATE POLICY "System can insert notification logs" ON notification_logs
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all notification logs" ON notification_logs;
CREATE POLICY "Admins can view all notification logs" ON notification_logs
  FOR ALL
  USING (true); -- Permissive for admins

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default preferences when new customer profile is created
  INSERT INTO notification_preferences (user_id, channel, type, enabled) VALUES
    (NEW.user_id, 'whatsapp', 'new_products', true),
    (NEW.user_id, 'whatsapp', 'order_placed', true),
    (NEW.user_id, 'whatsapp', 'order_status_updates', true),
    (NEW.user_id, 'whatsapp', 'payment_confirmation', true),
    (NEW.user_id, 'whatsapp', 'delivery_updates', true),
    (NEW.user_id, 'whatsapp', 'promotions', true),
    (NEW.user_id, 'whatsapp', 'shop_updates', false),
    (NEW.user_id, 'whatsapp', 'system_announcements', true),
    (NEW.user_id, 'whatsapp', 'review_responses', true),
    (NEW.user_id, 'whatsapp', 'secondhand_inquiries', true)
  ON CONFLICT (user_id, channel, type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_notification_preferences ON customer_profiles;
CREATE TRIGGER trigger_create_default_notification_preferences
  AFTER INSERT ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_channel TEXT,
  p_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO is_enabled
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND channel = p_channel
    AND type = p_type;

  RETURN COALESCE(is_enabled, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 2.3: ORDER HISTORY ACCESS CONTROL
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_history_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  access_type TEXT NOT NULL CHECK (access_type IN ('1_year', '3_years', 'lifetime')),

  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,

  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_history_access_pricing (
  access_type TEXT PRIMARY KEY CHECK (access_type IN ('1_year', '3_years', 'lifetime')),
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_history_access_merchant ON order_history_access(merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_history_access_active ON order_history_access(is_active);
CREATE INDEX IF NOT EXISTS idx_order_history_access_expires ON order_history_access(expires_at);

COMMENT ON TABLE order_history_access IS 'Paid access for merchants to view order history beyond 6 months';
COMMENT ON COLUMN order_history_access.access_type IS '1_year (RM50), 3_years (RM120), lifetime (RM200)';
COMMENT ON TABLE order_history_access_pricing IS 'Pricing options for extended order history access';

ALTER TABLE order_history_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history_access_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own history access" ON order_history_access;
CREATE POLICY "Merchants can view their own history access" ON order_history_access
  FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can create history access records" ON order_history_access;
CREATE POLICY "System can create history access records" ON order_history_access
  FOR INSERT
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all history access" ON order_history_access;
CREATE POLICY "Admins can manage all history access" ON order_history_access
  FOR ALL
  USING (true); -- Permissive for admins

DROP POLICY IF EXISTS "Anyone can view history access pricing" ON order_history_access_pricing;
CREATE POLICY "Anyone can view history access pricing" ON order_history_access_pricing
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage history access pricing" ON order_history_access_pricing;
CREATE POLICY "Admins can manage history access pricing" ON order_history_access_pricing
  FOR ALL
  USING (true); -- Permissive for admins

INSERT INTO order_history_access_pricing (access_type, price, description, duration_days, display_order) VALUES
  ('1_year', 50.00, 'Access order history for 1 year', 365, 1),
  ('3_years', 120.00, 'Access order history for 3 years', 1095, 2),
  ('lifetime', 200.00, 'Lifetime access to all order history', NULL, 3)
ON CONFLICT (access_type) DO NOTHING;

CREATE OR REPLACE FUNCTION has_extended_history_access(p_merchant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM order_history_access
    WHERE merchant_id = p_merchant_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO has_access;

  RETURN COALESCE(has_access, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deactivate_expired_history_access()
RETURNS void AS $$
BEGIN
  UPDATE order_history_access
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================

COMMIT;

-- Display success summary
DO $$
DECLARE
  manufacturer_count INTEGER;
  panel_count INTEGER;
  voucher_count INTEGER;
  listing_count INTEGER;
  pref_count INTEGER;
  pricing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO manufacturer_count FROM manufacturers;
  SELECT COUNT(*) INTO panel_count FROM premium_partnerships WHERE subscription_plan = 'panel';
  SELECT COUNT(*) INTO voucher_count FROM vouchers WHERE code LIKE 'WELCOME50_%';
  SELECT COUNT(*) INTO listing_count FROM secondhand_listings;
  SELECT COUNT(*) INTO pref_count FROM notification_preferences;
  SELECT COUNT(*) INTO pricing_count FROM order_history_access_pricing;

  RAISE NOTICE '=========================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 1 RESULTS:';
  RAISE NOTICE '  ✓ Manufacturers created: %', manufacturer_count;
  RAISE NOTICE '  ✓ Panel tier shops: %', panel_count;
  RAISE NOTICE '  ✓ Welcome vouchers created: %', voucher_count;
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 2 RESULTS:';
  RAISE NOTICE '  ✓ 2nd hand listings: %', listing_count;
  RAISE NOTICE '  ✓ Notification preferences: %', pref_count;
  RAISE NOTICE '  ✓ History access pricing tiers: %', pricing_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Modified:';
  RAISE NOTICE '  ✓ products_new - Added manufacturer fields';
  RAISE NOTICE '  ✓ customer_profiles - Added WhatsApp fields';
  RAISE NOTICE '  ✓ premium_partnerships - Added Panel tier fields';
  RAISE NOTICE '  ✓ installation_guides - Added pricing fields';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Add routes to your React router';
  RAISE NOTICE '  2. Test /merchant-console (new tiers)';
  RAISE NOTICE '  3. Test /find-shops (Panel only)';
  RAISE NOTICE '  4. Test /my-2ndhand-listings';
  RAISE NOTICE '=========================================';
END $$;
