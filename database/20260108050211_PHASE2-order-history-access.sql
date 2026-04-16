-- ============================================================================
-- PHASE 2: ORDER HISTORY ACCESS CONTROL
-- Purpose: 6-month free history, paid access for older records
-- Date: 2025-12-07
-- ============================================================================

-- Create order_history_access table
CREATE TABLE IF NOT EXISTS order_history_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Access type
  access_type TEXT NOT NULL CHECK (access_type IN ('1_year', '3_years', 'lifetime')),

  -- Pricing
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,

  -- Access period
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL for lifetime access

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_order_history_access_merchant ON order_history_access(merchant_id);
CREATE INDEX idx_order_history_access_active ON order_history_access(is_active);
CREATE INDEX idx_order_history_access_expires ON order_history_access(expires_at);

-- Add comments
COMMENT ON TABLE order_history_access IS 'Paid access for merchants to view order history beyond 6 months';
COMMENT ON COLUMN order_history_access.access_type IS '1_year (RM50), 3_years (RM120), lifetime (RM200)';

-- Enable Row Level Security
ALTER TABLE order_history_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Merchants can view their own access records
CREATE POLICY "Merchants can view their own history access" ON order_history_access
  FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: System can insert access records (when purchased)
CREATE POLICY "System can create history access records" ON order_history_access
  FOR INSERT
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can manage all access records
CREATE POLICY "Admins can manage all history access" ON order_history_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Helper function to check if merchant has history access
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

-- Function to auto-deactivate expired access
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

-- This function can be called periodically via a cron job

-- Create pricing reference table (optional)
CREATE TABLE IF NOT EXISTS order_history_access_pricing (
  access_type TEXT PRIMARY KEY CHECK (access_type IN ('1_year', '3_years', 'lifetime')),
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  duration_days INTEGER, -- NULL for lifetime
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert pricing options
INSERT INTO order_history_access_pricing (access_type, price, description, duration_days, display_order) VALUES
  ('1_year', 50.00, 'Access order history for 1 year', 365, 1),
  ('3_years', 120.00, 'Access order history for 3 years', 1095, 2),
  ('lifetime', 200.00, 'Lifetime access to all order history', NULL, 3)
ON CONFLICT (access_type) DO NOTHING;

-- Add comment
COMMENT ON TABLE order_history_access_pricing IS 'Pricing options for extended order history access';

-- Enable RLS
ALTER TABLE order_history_access_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view pricing
CREATE POLICY "Anyone can view history access pricing" ON order_history_access_pricing
  FOR SELECT
  USING (is_active = true);

-- Policy: Admins can manage pricing
CREATE POLICY "Admins can manage history access pricing" ON order_history_access_pricing
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
