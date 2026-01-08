-- ============================================================================
-- PHASE 2: 2ND HAND MARKETPLACE TABLES
-- Purpose: Allow merchants to post and sell used/2nd hand automotive parts
-- Date: 2025-12-07
-- ============================================================================

-- Create secondhand_listings table
CREATE TABLE IF NOT EXISTS secondhand_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Product information
  product_category TEXT,
  title TEXT NOT NULL,
  description TEXT,

  -- Pricing
  original_price DECIMAL(10,2),
  selling_price DECIMAL(10,2) NOT NULL,
  is_negotiable BOOLEAN DEFAULT false,

  -- Condition
  condition TEXT NOT NULL CHECK (condition IN ('like_new', 'good', 'fair', 'damaged')),
  year_purchased INTEGER,
  months_used INTEGER,
  reason_for_selling TEXT,

  -- Vehicle compatibility
  car_brand TEXT,
  car_model TEXT,
  compatible_years TEXT,

  -- Media
  images TEXT[] DEFAULT '{}'::TEXT[],

  -- Status and moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'expired')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Metrics
  views_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,

  -- Listing management
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  sold_at TIMESTAMPTZ,
  sold_to_user_id UUID REFERENCES customer_profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create secondhand_inquiries table
CREATE TABLE IF NOT EXISTS secondhand_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES secondhand_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Inquiry details
  message TEXT NOT NULL,
  offered_price DECIMAL(10,2),
  buyer_phone TEXT,
  buyer_email TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  seller_reply TEXT,
  replied_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_secondhand_listings_seller ON secondhand_listings(seller_id);
CREATE INDEX idx_secondhand_listings_status ON secondhand_listings(status);
CREATE INDEX idx_secondhand_listings_category ON secondhand_listings(product_category);
CREATE INDEX idx_secondhand_listings_car_brand ON secondhand_listings(car_brand);
CREATE INDEX idx_secondhand_listings_created ON secondhand_listings(created_at DESC);
CREATE INDEX idx_secondhand_inquiries_listing ON secondhand_inquiries(listing_id);
CREATE INDEX idx_secondhand_inquiries_buyer ON secondhand_inquiries(buyer_id);
CREATE INDEX idx_secondhand_inquiries_status ON secondhand_inquiries(status);

-- Add comments
COMMENT ON TABLE secondhand_listings IS 'Merchant 2nd hand product listings requiring admin approval';
COMMENT ON TABLE secondhand_inquiries IS 'Buyer inquiries for 2nd hand listings';

-- Enable Row Level Security
ALTER TABLE secondhand_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondhand_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secondhand_listings

-- Policy: Anyone can view approved listings
CREATE POLICY "Anyone can view approved secondhand listings" ON secondhand_listings
  FOR SELECT
  USING (status = 'approved');

-- Policy: Sellers can view their own listings
CREATE POLICY "Sellers can view their own listings" ON secondhand_listings
  FOR SELECT
  USING (seller_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  ));

-- Policy: Merchants can create listings
CREATE POLICY "Merchants can create secondhand listings" ON secondhand_listings
  FOR INSERT
  WITH CHECK (
    seller_id IN (
      SELECT id FROM customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'merchant'
    )
  );

-- Policy: Sellers can update their own pending listings
CREATE POLICY "Sellers can update their own pending listings" ON secondhand_listings
  FOR UPDATE
  USING (
    seller_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- Policy: Admins can manage all listings
CREATE POLICY "Admins can manage all secondhand listings" ON secondhand_listings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for secondhand_inquiries

-- Policy: Buyers can view their own inquiries
CREATE POLICY "Buyers can view their own inquiries" ON secondhand_inquiries
  FOR SELECT
  USING (
    buyer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Sellers can view inquiries for their listings
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

-- Policy: Users can create inquiries
CREATE POLICY "Users can create inquiries" ON secondhand_inquiries
  FOR INSERT
  WITH CHECK (
    buyer_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Sellers can reply to inquiries
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

-- Policy: Admins can manage all inquiries
CREATE POLICY "Admins can manage all inquiries" ON secondhand_inquiries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to increment inquiry count
CREATE OR REPLACE FUNCTION increment_inquiry_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE secondhand_listings
  SET inquiry_count = inquiry_count + 1
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inquiry count
DROP TRIGGER IF EXISTS trigger_increment_inquiry_count ON secondhand_inquiries;
CREATE TRIGGER trigger_increment_inquiry_count
  AFTER INSERT ON secondhand_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION increment_inquiry_count();

-- Create function to auto-expire old listings
CREATE OR REPLACE FUNCTION expire_old_secondhand_listings()
RETURNS void AS $$
BEGIN
  UPDATE secondhand_listings
  SET status = 'expired'
  WHERE status IN ('pending', 'approved')
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- This function can be called periodically via a cron job or scheduled task
