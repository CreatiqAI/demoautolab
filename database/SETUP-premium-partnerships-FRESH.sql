-- ============================================================================
-- PREMIUM PARTNERSHIPS - FRESH SETUP (CLEAN INSTALL)
-- ============================================================================
-- Run this if the premium_partnerships table does NOT exist yet.
-- This matches the current codebase schema (professional/panel plans,
-- yearly_fee, shop_photos, billing_cycle, etc.)
--
-- If the table ALREADY exists and you're getting function errors,
-- skip to the DROP FUNCTION section at the bottom.
-- ============================================================================


-- ============================================================================
-- 1. DROP EXISTING TRIGGERS + FUNCTIONS (triggers depend on functions)
-- ============================================================================
DROP TRIGGER IF EXISTS enforce_panel_limit ON premium_partnerships;
DROP TRIGGER IF EXISTS trigger_log_partnership_renewal ON premium_partnerships;

DROP FUNCTION IF EXISTS get_active_partnerships(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS has_active_partnership(UUID);
DROP FUNCTION IF EXISTS increment_partnership_views(UUID);
DROP FUNCTION IF EXISTS increment_partnership_clicks(UUID);
DROP FUNCTION IF EXISTS increment_partnership_inquiries(UUID);
DROP FUNCTION IF EXISTS check_panel_limit();
DROP FUNCTION IF EXISTS log_partnership_renewal();


-- ============================================================================
-- 2. CREATE premium_partnerships TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS premium_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Business Information
  business_name TEXT NOT NULL,
  business_registration_no TEXT,
  business_type TEXT,

  -- Contact Information
  contact_person TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,

  -- Shop identity (used by SecondhandMarketplace)
  shop_name TEXT,
  phone TEXT,

  -- Location Information
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),

  -- Business Details
  description TEXT,
  services_offered TEXT[],
  operating_hours JSONB,
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,

  -- Subscription Details
  subscription_status TEXT CHECK (subscription_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')) DEFAULT 'PENDING',
  subscription_plan TEXT CHECK (subscription_plan IN ('professional', 'panel')) DEFAULT 'professional',
  yearly_fee NUMERIC(10, 2) DEFAULT 99.00,
  billing_cycle TEXT DEFAULT 'year' CHECK (billing_cycle IN ('month', 'year')),

  -- Subscription Period
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,

  -- Payment Information
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_payment_amount NUMERIC(10, 2),
  payment_method TEXT,

  -- Admin Review
  admin_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Panel-specific fields
  is_admin_invited BOOLEAN DEFAULT false,
  panel_slot_number INTEGER,

  -- Display Settings
  is_featured BOOLEAN DEFAULT false,
  display_priority INTEGER DEFAULT 0,
  logo_url TEXT,
  cover_image_url TEXT,
  shop_photos TEXT[] DEFAULT '{}',

  -- Statistics
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_merchant ON premium_partnerships(merchant_id);
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_status ON premium_partnerships(subscription_status);
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_location ON premium_partnerships(state, city);
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_priority ON premium_partnerships(display_priority DESC, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_panel_slot ON premium_partnerships(panel_slot_number) WHERE panel_slot_number IS NOT NULL;

COMMENT ON TABLE premium_partnerships IS 'Merchant partnerships - Professional (RM99/year) or Panel (RM350/month, max 100, admin-invited only)';
COMMENT ON COLUMN premium_partnerships.shop_photos IS 'Array of shop photo URLs (max 4 photos)';
COMMENT ON COLUMN premium_partnerships.billing_cycle IS 'Billing cycle: month (RM350/month for Panel) or year (RM99/year for Professional)';
COMMENT ON COLUMN premium_partnerships.is_admin_invited IS 'True if Panel member was invited by admin (required for Panel tier)';
COMMENT ON COLUMN premium_partnerships.panel_slot_number IS 'Panel slot number (1-100) - only for Panel tier members';


-- ============================================================================
-- 3. CREATE subscription_payments TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES premium_partnerships(id) ON DELETE CASCADE,

  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',

  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  payment_date TIMESTAMP WITH TIME ZONE,
  transaction_reference TEXT,
  receipt_url TEXT,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_partnership ON subscription_payments(partnership_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(payment_status);


-- ============================================================================
-- 4. CREATE partner_inquiries TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS partner_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES premium_partnerships(id) ON DELETE CASCADE,

  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  message TEXT,
  inquiry_type TEXT,

  status TEXT CHECK (status IN ('NEW', 'CONTACTED', 'CLOSED')) DEFAULT 'NEW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_inquiries_partnership ON partner_inquiries(partnership_id);


-- ============================================================================
-- 5. CREATE partnership_renewal_history TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS partnership_renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES premium_partnerships(id) ON DELETE CASCADE,

  renewed_by UUID REFERENCES auth.users(id),
  renewal_type TEXT CHECK (renewal_type IN ('NEW', 'RENEWAL', 'EXTENSION', 'REACTIVATION')) NOT NULL,

  previous_end_date TIMESTAMP WITH TIME ZONE,
  new_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  months_extended INTEGER NOT NULL,

  amount_paid NUMERIC(10, 2),
  payment_method TEXT,
  payment_reference TEXT,

  previous_status TEXT,
  new_status TEXT NOT NULL,

  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewal_history_partnership ON partnership_renewal_history(partnership_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_date ON partnership_renewal_history(created_at DESC);


-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Check if merchant has active partnership
CREATE OR REPLACE FUNCTION has_active_partnership(p_merchant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM premium_partnerships
    WHERE merchant_id = p_merchant_id
    AND subscription_status = 'ACTIVE'
    AND admin_approved = true
    AND subscription_end_date > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Get active partnerships for public display
CREATE OR REPLACE FUNCTION get_active_partnerships(
  p_state TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_service_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  business_name TEXT,
  business_type TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  services_offered TEXT[],
  operating_hours JSONB,
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  subscription_plan TEXT,
  is_featured BOOLEAN,
  logo_url TEXT,
  cover_image_url TEXT,
  shop_photos TEXT[],
  total_views INTEGER,
  display_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.business_name,
    pp.business_type,
    pp.contact_phone,
    pp.contact_email,
    pp.address,
    pp.city,
    pp.state,
    pp.postcode,
    pp.latitude,
    pp.longitude,
    pp.description,
    pp.services_offered,
    pp.operating_hours,
    pp.website_url,
    pp.facebook_url,
    pp.instagram_url,
    pp.subscription_plan,
    pp.is_featured,
    pp.logo_url,
    pp.cover_image_url,
    pp.shop_photos,
    pp.total_views,
    pp.display_priority
  FROM premium_partnerships pp
  WHERE pp.subscription_status = 'ACTIVE'
    AND pp.admin_approved = true
    AND pp.subscription_end_date > NOW()
    AND (p_state IS NULL OR pp.state = p_state)
    AND (p_city IS NULL OR pp.city = p_city)
    AND (p_service_type IS NULL OR p_service_type = ANY(pp.services_offered))
  ORDER BY
    pp.is_featured DESC,
    pp.display_priority DESC,
    pp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Increment view count
CREATE OR REPLACE FUNCTION increment_partnership_views(p_partnership_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE premium_partnerships
  SET total_views = total_views + 1
  WHERE id = p_partnership_id;
END;
$$ LANGUAGE plpgsql;

-- Increment click count
CREATE OR REPLACE FUNCTION increment_partnership_clicks(p_partnership_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE premium_partnerships
  SET total_clicks = total_clicks + 1
  WHERE id = p_partnership_id;
END;
$$ LANGUAGE plpgsql;

-- Increment inquiry count
CREATE OR REPLACE FUNCTION increment_partnership_inquiries(p_partnership_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE premium_partnerships
  SET total_inquiries = total_inquiries + 1
  WHERE id = p_partnership_id;
END;
$$ LANGUAGE plpgsql;

-- Panel limit check (max 100 active Panel members)
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

CREATE TRIGGER enforce_panel_limit
  BEFORE INSERT OR UPDATE ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION check_panel_limit();

-- Renewal history auto-logger
CREATE OR REPLACE FUNCTION log_partnership_renewal()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date)
     OR (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN

    DECLARE
      months_diff INTEGER;
      renewal_type_val TEXT;
    BEGIN
      IF NEW.subscription_end_date IS NOT NULL AND OLD.subscription_end_date IS NOT NULL THEN
        months_diff := EXTRACT(MONTH FROM AGE(NEW.subscription_end_date, OLD.subscription_end_date))::INTEGER;
      ELSIF NEW.subscription_end_date IS NOT NULL THEN
        months_diff := EXTRACT(MONTH FROM AGE(NEW.subscription_end_date, NEW.subscription_start_date))::INTEGER;
      ELSE
        months_diff := 0;
      END IF;

      IF OLD.subscription_status = 'PENDING' AND NEW.subscription_status = 'ACTIVE' THEN
        renewal_type_val := 'NEW';
      ELSIF OLD.subscription_status IN ('CANCELLED', 'SUSPENDED', 'EXPIRED') AND NEW.subscription_status = 'ACTIVE' THEN
        renewal_type_val := 'REACTIVATION';
      ELSIF months_diff > 0 THEN
        renewal_type_val := 'EXTENSION';
      ELSE
        renewal_type_val := 'RENEWAL';
      END IF;

      INSERT INTO partnership_renewal_history (
        partnership_id, renewed_by, renewal_type,
        previous_end_date, new_end_date, months_extended,
        previous_status, new_status, admin_notes
      ) VALUES (
        NEW.id, auth.uid(), renewal_type_val,
        OLD.subscription_end_date, NEW.subscription_end_date,
        GREATEST(months_diff, 0),
        OLD.subscription_status, NEW.subscription_status,
        'Automatic log from subscription update'
      );
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_partnership_renewal
  AFTER UPDATE ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION log_partnership_renewal();


-- ============================================================================
-- 7. DISABLE RLS (admin uses localStorage auth, not Supabase Auth)
-- ============================================================================
ALTER TABLE premium_partnerships DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE partner_inquiries DISABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_renewal_history DISABLE ROW LEVEL SECURITY;

GRANT ALL ON premium_partnerships TO anon, authenticated;
GRANT ALL ON subscription_payments TO anon, authenticated;
GRANT ALL ON partner_inquiries TO anon, authenticated;
GRANT ALL ON partnership_renewal_history TO anon, authenticated;


-- ============================================================================
-- 8. VERIFY
-- ============================================================================
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN (
  'premium_partnerships',
  'subscription_payments',
  'partner_inquiries',
  'partnership_renewal_history'
)
ORDER BY tablename;

DO $$
BEGIN
  RAISE NOTICE '✅ Premium Partnerships system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables: premium_partnerships, subscription_payments, partner_inquiries, partnership_renewal_history';
  RAISE NOTICE 'Plans: professional (RM99/year), panel (RM350/month, max 100)';
  RAISE NOTICE 'RLS: DISABLED (app-level security via admin routes)';
  RAISE NOTICE 'Extra columns: yearly_fee, billing_cycle, shop_photos, is_admin_invited, panel_slot_number, shop_name, phone';
END $$;
