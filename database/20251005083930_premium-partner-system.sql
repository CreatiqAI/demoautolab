-- =====================================================
-- PREMIUM PARTNER / AUTHORIZED RESELLER SYSTEM
-- =====================================================
-- Allows merchant customers to become premium partners with monthly subscription
-- Provides exposure on "Find Authorized Shops" page for customers

-- Create premium_partnerships table
CREATE TABLE IF NOT EXISTS premium_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Business Information
  business_name TEXT NOT NULL,
  business_registration_no TEXT,
  business_type TEXT, -- Workshop, Accessories Shop, Service Center, etc.

  -- Contact Information
  contact_person TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,

  -- Location Information
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),

  -- Business Details
  description TEXT,
  services_offered TEXT[], -- Array of services: Installation, Repair, Consultation, etc.
  operating_hours JSONB, -- {monday: "9AM-6PM", tuesday: "9AM-6PM", ...}
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,

  -- Subscription Details
  subscription_status TEXT CHECK (subscription_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')) DEFAULT 'PENDING',
  subscription_plan TEXT CHECK (subscription_plan IN ('PREMIUM')) DEFAULT 'PREMIUM',
  monthly_fee NUMERIC(10, 2) DEFAULT 149.00,

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

  -- Display Settings
  is_featured BOOLEAN DEFAULT false,
  display_priority INTEGER DEFAULT 0, -- Higher = shown first
  logo_url TEXT,
  cover_image_url TEXT,

  -- Statistics
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_merchant ON premium_partnerships(merchant_id);
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_status ON premium_partnerships(subscription_status);
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_location ON premium_partnerships(state, city);
CREATE INDEX IF NOT EXISTS idx_premium_partnerships_priority ON premium_partnerships(display_priority DESC, created_at DESC);

-- Create subscription_payments table to track payment history
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

-- Create partner_inquiries table to track customer inquiries
CREATE TABLE IF NOT EXISTS partner_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES premium_partnerships(id) ON DELETE CASCADE,

  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  message TEXT,
  inquiry_type TEXT, -- Quote Request, Service Inquiry, General Question

  status TEXT CHECK (status IN ('NEW', 'CONTACTED', 'CLOSED')) DEFAULT 'NEW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_inquiries_partnership ON partner_inquiries(partnership_id);

-- Function to check if merchant has active partnership
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

-- Function to get active partnerships for public display
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

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_partnership_views(p_partnership_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE premium_partnerships
  SET total_views = total_views + 1
  WHERE id = p_partnership_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment click count
CREATE OR REPLACE FUNCTION increment_partnership_clicks(p_partnership_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE premium_partnerships
  SET total_clicks = total_clicks + 1
  WHERE id = p_partnership_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment inquiry count
CREATE OR REPLACE FUNCTION increment_partnership_inquiries(p_partnership_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE premium_partnerships
  SET total_inquiries = total_inquiries + 1
  WHERE id = p_partnership_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE premium_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for premium_partnerships

-- Admin users can view all partnerships
CREATE POLICY "Admins can view all partnerships"
  ON premium_partnerships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Admin users can update all partnerships
CREATE POLICY "Admins can update all partnerships"
  ON premium_partnerships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Merchants can view their own partnerships
CREATE POLICY "Merchants can view own partnerships"
  ON premium_partnerships FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Merchants can create partnerships
CREATE POLICY "Merchants can create partnerships"
  ON premium_partnerships FOR INSERT
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Merchants can update their own partnerships
CREATE POLICY "Merchants can update own partnerships"
  ON premium_partnerships FOR UPDATE
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Public can view active partnerships
CREATE POLICY "Public can view active partnerships"
  ON premium_partnerships FOR SELECT
  USING (
    subscription_status = 'ACTIVE'
    AND admin_approved = true
    AND subscription_end_date > NOW()
  );

-- RLS Policies for subscription_payments

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON subscription_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Admins can insert payments
CREATE POLICY "Admins can insert payments"
  ON subscription_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Merchants can view their own payments
CREATE POLICY "Merchants can view own payments"
  ON subscription_payments FOR SELECT
  USING (
    partnership_id IN (
      SELECT id FROM premium_partnerships
      WHERE merchant_id IN (
        SELECT id FROM customer_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for partner_inquiries

-- Admins can view all inquiries
CREATE POLICY "Admins can view all inquiries"
  ON partner_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Partners can view inquiries sent to them
CREATE POLICY "Partners can view own inquiries"
  ON partner_inquiries FOR SELECT
  USING (
    partnership_id IN (
      SELECT id FROM premium_partnerships
      WHERE merchant_id IN (
        SELECT id FROM customer_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Anyone can create inquiries
CREATE POLICY "Anyone can create inquiries"
  ON partner_inquiries FOR INSERT
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Premium Partner System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - premium_partnerships (main table)';
  RAISE NOTICE '  - subscription_payments (payment history)';
  RAISE NOTICE '  - partner_inquiries (customer inquiries)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - has_active_partnership(merchant_id)';
  RAISE NOTICE '  - get_active_partnerships(state, city, service_type)';
  RAISE NOTICE '  - increment_partnership_views(partnership_id)';
  RAISE NOTICE '  - increment_partnership_clicks(partnership_id)';
  RAISE NOTICE '  - increment_partnership_inquiries(partnership_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Subscription Plan:';
  RAISE NOTICE '';
  RAISE NOTICE '👑 PREMIUM PARTNER - RM 149/month';
  RAISE NOTICE '   ✓ Listed on Find Shops page';
  RAISE NOTICE '   ✓ TOP PRIORITY in search results';
  RAISE NOTICE '   ✓ Premium Partner badge';
  RAISE NOTICE '   ✓ Full contact details & location';
  RAISE NOTICE '   ✓ Customer inquiry form (generate leads)';
  RAISE NOTICE '   ✓ Social media links display';
  RAISE NOTICE '   ✓ Advanced analytics';
  RAISE NOTICE '   ✓ 5% discount on wholesale orders';
  RAISE NOTICE '   ✓ Exclusive partner promotions';
  RAISE NOTICE '   ✓ Social media promotion';
  RAISE NOTICE '   ✓ Priority support';
  RAISE NOTICE '   ✓ Early access to new products';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Single plan for all authorized partners';
END $$;
