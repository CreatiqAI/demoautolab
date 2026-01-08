-- ============================================
-- PHASE 2: Order History Access Pricing System
-- ============================================
-- Allows customers to purchase extended access to order history older than 6 months
--
-- Pricing Tiers:
-- - Up to 1 year history: RM50
-- - Up to 2 years history: RM90
-- - Up to 5 years history: RM350

BEGIN;

-- =============================================
-- STEP 1: Create Pricing Plans Table
-- =============================================

CREATE TABLE IF NOT EXISTS order_history_access_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name TEXT NOT NULL,
  duration_months INTEGER, -- NULL means lifetime/unlimited
  price NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add display_order column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_history_access_pricing'
    AND column_name = 'display_order'
  ) THEN
    ALTER TABLE order_history_access_pricing ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create unique constraint on plan_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_history_access_pricing_plan_name_key'
  ) THEN
    ALTER TABLE order_history_access_pricing ADD CONSTRAINT order_history_access_pricing_plan_name_key UNIQUE (plan_name);
  END IF;
END $$;

-- Insert pricing tiers (using INSERT ... ON CONFLICT to prevent duplicates)
INSERT INTO order_history_access_pricing (plan_name, duration_months, price, description, display_order) VALUES
('1 Year History', 12, 50.00, 'Access order history up to 1 year old', 1),
('2 Year History', 24, 90.00, 'Access order history up to 2 years old', 2),
('5 Year History', 60, 350.00, 'Access order history up to 5 years old', 3)
ON CONFLICT (plan_name) DO UPDATE SET
  duration_months = EXCLUDED.duration_months,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- =============================================
-- STEP 2: Create Customer Access Records Table
-- =============================================

CREATE TABLE IF NOT EXISTS order_history_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pricing_plan_id UUID NOT NULL REFERENCES order_history_access_pricing(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL means no expiration (lifetime)
  payment_status TEXT DEFAULT 'PENDING',
  payment_amount NUMERIC(10, 2) NOT NULL,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add payment_status column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_history_access'
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE order_history_access ADD COLUMN payment_status TEXT DEFAULT 'PENDING';
  END IF;
END $$;

-- Drop old constraint if exists
ALTER TABLE order_history_access DROP CONSTRAINT IF EXISTS order_history_access_payment_status_check;

-- Add payment_status constraint
ALTER TABLE order_history_access ADD CONSTRAINT order_history_access_payment_status_check
CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'));

-- Create index for customer lookups (removed IMMUTABLE function NOW() from predicate)
-- Note: Application logic will handle checking if access is expired
DROP INDEX IF EXISTS idx_order_history_access_customer_active;
CREATE INDEX idx_order_history_access_customer_active
ON order_history_access(customer_id, payment_status, expires_at)
WHERE payment_status = 'PAID';

-- =============================================
-- STEP 3: Create Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_order_history_access_customer
ON order_history_access(customer_id);

CREATE INDEX IF NOT EXISTS idx_order_history_access_expires
ON order_history_access(expires_at)
WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_history_access_payment_status
ON order_history_access(payment_status);

-- =============================================
-- STEP 4: Enable RLS (Row Level Security)
-- =============================================

ALTER TABLE order_history_access_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Anyone can view active pricing plans" ON order_history_access_pricing;
DROP POLICY IF EXISTS "Customers can view their own access" ON order_history_access;
DROP POLICY IF EXISTS "Customers can purchase access" ON order_history_access;
DROP POLICY IF EXISTS "Customers can update their own access" ON order_history_access;

-- Pricing plans are viewable by everyone (public pricing)
CREATE POLICY "Anyone can view active pricing plans"
ON order_history_access_pricing
FOR SELECT
USING (is_active = true);

-- Customers can view their own access records
CREATE POLICY "Customers can view their own access"
ON order_history_access
FOR SELECT
USING (auth.uid() = customer_id);

-- Customers can insert their own access records (when purchasing)
CREATE POLICY "Customers can purchase access"
ON order_history_access
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own access records (for payment confirmation)
CREATE POLICY "Customers can update their own access"
ON order_history_access
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Note: Admin policies are intentionally omitted since admin_profiles table
-- doesn't link to auth.users. Admins can manage these tables through direct SQL
-- or by temporarily disabling RLS in admin contexts.
-- If needed, admins can be granted access through service role or custom authentication.

-- =============================================
-- STEP 5: Create Helper Functions
-- =============================================

-- Function to check if customer has valid extended access
CREATE OR REPLACE FUNCTION has_extended_order_history_access(p_customer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM order_history_access
    WHERE customer_id = p_customer_id
    AND payment_status = 'PAID'
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_access;

  RETURN COALESCE(v_has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer's access expiry date
CREATE OR REPLACE FUNCTION get_order_history_access_expiry(p_customer_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_expiry TIMESTAMPTZ;
BEGIN
  SELECT expires_at INTO v_expiry
  FROM order_history_access
  WHERE customer_id = p_customer_id
  AND payment_status = 'PAID'
  AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY COALESCE(expires_at, '9999-12-31'::TIMESTAMPTZ) DESC
  LIMIT 1;

  RETURN v_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase extended access
CREATE OR REPLACE FUNCTION purchase_order_history_access(
  p_customer_id UUID,
  p_pricing_plan_id UUID,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_access_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan
  FROM order_history_access_pricing
  WHERE id = p_pricing_plan_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or inactive pricing plan'
    );
  END IF;

  -- Check if customer already has active access
  IF has_extended_order_history_access(p_customer_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already have an active extended access plan'
    );
  END IF;

  -- Calculate expiry date
  IF v_plan.duration_months IS NULL THEN
    v_expires_at := NULL; -- Lifetime access
  ELSE
    v_expires_at := NOW() + (v_plan.duration_months || ' months')::INTERVAL;
  END IF;

  -- Create access record (payment pending)
  INSERT INTO order_history_access (
    customer_id,
    pricing_plan_id,
    expires_at,
    payment_status,
    payment_amount,
    payment_reference
  ) VALUES (
    p_customer_id,
    p_pricing_plan_id,
    v_expires_at,
    'PENDING',
    v_plan.price,
    p_payment_reference
  )
  RETURNING id INTO v_access_id;

  RETURN jsonb_build_object(
    'success', true,
    'access_id', v_access_id,
    'amount', v_plan.price,
    'expires_at', v_expires_at,
    'message', 'Access purchase initiated. Complete payment to activate.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to confirm payment and activate access
CREATE OR REPLACE FUNCTION confirm_order_history_access_payment(
  p_access_id UUID,
  p_payment_success BOOLEAN,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_payment_success THEN
    -- Mark as paid
    UPDATE order_history_access
    SET
      payment_status = 'PAID',
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      updated_at = NOW()
    WHERE id = p_access_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Extended access activated successfully!'
    );
  ELSE
    -- Mark as failed
    UPDATE order_history_access
    SET
      payment_status = 'FAILED',
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      updated_at = NOW()
    WHERE id = p_access_id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment failed. Please try again.'
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 6: Grant Permissions
-- =============================================

GRANT SELECT ON order_history_access_pricing TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON order_history_access TO authenticated;

GRANT EXECUTE ON FUNCTION has_extended_order_history_access(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_order_history_access_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_order_history_access(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_order_history_access_payment(UUID, BOOLEAN, TEXT) TO authenticated;

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT '✅ Order History Access Pricing System Created!' as status;

SELECT 'Available Plans:' as info;
SELECT plan_name, duration_months, price, description
FROM order_history_access_pricing
WHERE is_active = true
ORDER BY display_order;
