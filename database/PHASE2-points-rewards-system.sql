-- ============================================
-- PHASE 2: Points & Rewards System
-- ============================================
-- Purpose: Track customer spending, award loyalty points,
--          and enable redemption of vouchers and merchandise
-- Point Formula: 1 Point = RM1 Spent (on successful orders)
-- ============================================

BEGIN;

-- =============================================
-- STEP 1: Create Tables
-- =============================================

-- 1.1 Customer Points Ledger
-- Tracks all point transactions (earned, redeemed, adjusted)
CREATE TABLE IF NOT EXISTS customer_points_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL, -- 'EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED'
  points_amount INTEGER NOT NULL, -- Positive for earned, negative for redeemed

  -- Reference tracking
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  redemption_id UUID, -- References point_redemptions(id), added later
  reward_item_id UUID, -- References reward_items(id), added later

  -- Metadata
  description TEXT,
  expires_at TIMESTAMP, -- Points expiry (optional for future use)
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES admin_profiles(id), -- If manual adjustment

  CONSTRAINT valid_transaction CHECK (
    (transaction_type = 'EARNED' AND points_amount > 0) OR
    (transaction_type IN ('REDEEMED', 'EXPIRED') AND points_amount < 0) OR
    (transaction_type = 'ADJUSTED')
  )
);

-- 1.2 Reward Items (Redeemable Items)
-- Items customers can redeem with points (vouchers or merchandise)
CREATE TABLE IF NOT EXISTS reward_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Item details
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('VOUCHER', 'MERCHANDISE')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Point cost
  points_required INTEGER NOT NULL CHECK (points_required > 0),

  -- Voucher-specific fields (if item_type = 'VOUCHER')
  voucher_code_prefix VARCHAR(50), -- e.g., 'POINTS100' generates 'POINTS100-XXXX'
  voucher_discount_type VARCHAR(20) CHECK (voucher_discount_type IN ('PERCENTAGE', 'FIXED')),
  voucher_discount_value NUMERIC(10,2),
  voucher_min_purchase NUMERIC(10,2) DEFAULT 0,
  voucher_validity_days INTEGER DEFAULT 30,

  -- Merchandise-specific fields (if item_type = 'MERCHANDISE')
  stock_quantity INTEGER, -- Available quantity (NULL = unlimited)
  shipping_required BOOLEAN DEFAULT false,
  estimated_delivery_days INTEGER,

  -- Availability
  is_active BOOLEAN DEFAULT true,
  available_from TIMESTAMP,
  available_until TIMESTAMP,
  max_redemptions_per_customer INTEGER, -- NULL = unlimited
  total_redemption_limit INTEGER, -- NULL = unlimited
  total_redeemed INTEGER DEFAULT 0, -- Track redemptions

  -- Metadata
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES admin_profiles(id),
  updated_by UUID REFERENCES admin_profiles(id)
);

-- 1.3 Point Redemptions
-- Tracks customer redemptions of reward items
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Redemption details
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  reward_item_id UUID NOT NULL REFERENCES reward_items(id) ON DELETE RESTRICT,
  points_spent INTEGER NOT NULL,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),

  -- Generated outputs
  generated_voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  tracking_number VARCHAR(100),

  -- Fulfillment details
  shipping_address JSONB, -- {name, phone, address, city, state, postcode}
  fulfillment_notes TEXT,
  fulfilled_at TIMESTAMP,
  fulfilled_by UUID REFERENCES admin_profiles(id),
  cancelled_at TIMESTAMP,
  cancelled_by UUID REFERENCES admin_profiles(id),
  cancellation_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Now add foreign key constraints to customer_points_ledger
ALTER TABLE customer_points_ledger
  ADD CONSTRAINT fk_redemption FOREIGN KEY (redemption_id) REFERENCES point_redemptions(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_reward_item FOREIGN KEY (reward_item_id) REFERENCES reward_items(id) ON DELETE SET NULL;

-- =============================================
-- STEP 2: Create Indexes
-- =============================================

-- Customer Points Ledger indexes
CREATE INDEX IF NOT EXISTS idx_points_ledger_customer ON customer_points_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_ledger_order ON customer_points_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_type ON customer_points_ledger(transaction_type);

-- Reward Items indexes
CREATE INDEX IF NOT EXISTS idx_reward_items_active ON reward_items(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_reward_items_type ON reward_items(item_type);

-- Point Redemptions indexes
CREATE INDEX IF NOT EXISTS idx_point_redemptions_customer ON point_redemptions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_status ON point_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_item ON point_redemptions(reward_item_id);

-- =============================================
-- STEP 3: Create Helper Functions
-- =============================================

-- Function: Get customer's current points balance
CREATE OR REPLACE FUNCTION get_customer_points_balance(p_customer_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(points_amount), 0)
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get customer's lifetime points earned
CREATE OR REPLACE FUNCTION get_customer_lifetime_points(p_customer_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(points_amount), 0)
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND transaction_type = 'EARNED'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get customer's total points redeemed
CREATE OR REPLACE FUNCTION get_customer_points_redeemed(p_customer_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(ABS(SUM(points_amount)), 0)
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND transaction_type = 'REDEEMED'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 4: Award Points on Order Success Trigger
-- =============================================

CREATE OR REPLACE FUNCTION award_points_on_order_success()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_points_to_award INTEGER;
BEGIN
  -- Only award points when order payment succeeds for the first time
  IF NEW.payment_state IN ('SUCCESS', 'APPROVED') AND
     (OLD.payment_state IS NULL OR OLD.payment_state NOT IN ('SUCCESS', 'APPROVED')) THEN

    -- Get customer_id from order
    v_customer_id := NEW.customer_id;

    -- Calculate points: 1 point per RM1 (rounded down)
    v_points_to_award := FLOOR(NEW.total);

    -- Award points
    IF v_points_to_award > 0 AND v_customer_id IS NOT NULL THEN
      INSERT INTO customer_points_ledger (
        customer_id,
        transaction_type,
        points_amount,
        order_id,
        description
      ) VALUES (
        v_customer_id,
        'EARNED',
        v_points_to_award,
        NEW.id,
        'Earned from Order #' || NEW.order_no
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_award_points_on_success ON orders;
CREATE TRIGGER trigger_award_points_on_success
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION award_points_on_order_success();

-- =============================================
-- STEP 5: Redeem Reward Item Function
-- =============================================

CREATE OR REPLACE FUNCTION redeem_reward_item(
  p_customer_id UUID,
  p_reward_item_id UUID,
  p_shipping_address JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_points_required INTEGER;
  v_item_type VARCHAR(50);
  v_item_name VARCHAR(255);
  v_stock_quantity INTEGER;
  v_max_redemptions INTEGER;
  v_customer_redemptions INTEGER;
  v_total_redemption_limit INTEGER;
  v_total_redeemed INTEGER;
  v_redemption_id UUID;
  v_voucher_id UUID;
  v_voucher_code VARCHAR(50);
  v_voucher_discount_type VARCHAR(20);
  v_voucher_discount_value NUMERIC;
  v_voucher_min_purchase NUMERIC;
  v_voucher_validity_days INTEGER;
  v_expiry_date TIMESTAMP;
BEGIN
  -- Get customer's current balance
  v_current_balance := get_customer_points_balance(p_customer_id);

  -- Get reward item details
  SELECT
    points_required, item_type, name, stock_quantity,
    max_redemptions_per_customer, total_redemption_limit, total_redeemed,
    voucher_code_prefix, voucher_discount_type, voucher_discount_value,
    voucher_min_purchase, voucher_validity_days
  INTO
    v_points_required, v_item_type, v_item_name, v_stock_quantity,
    v_max_redemptions, v_total_redemption_limit, v_total_redeemed,
    v_voucher_code, v_voucher_discount_type, v_voucher_discount_value,
    v_voucher_min_purchase, v_voucher_validity_days
  FROM reward_items
  WHERE id = p_reward_item_id
    AND is_active = true
    AND (available_from IS NULL OR available_from <= NOW())
    AND (available_until IS NULL OR available_until >= NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward item not found or not available');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < v_points_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient points',
      'required', v_points_required,
      'available', v_current_balance
    );
  END IF;

  -- Check stock for merchandise
  IF v_item_type = 'MERCHANDISE' AND v_stock_quantity IS NOT NULL AND v_stock_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item out of stock');
  END IF;

  -- Check per-customer redemption limit
  IF v_max_redemptions IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_redemptions
    FROM point_redemptions
    WHERE customer_id = p_customer_id
      AND reward_item_id = p_reward_item_id
      AND status IN ('PENDING', 'COMPLETED');

    IF v_customer_redemptions >= v_max_redemptions THEN
      RETURN jsonb_build_object('success', false, 'error', 'Maximum redemptions per customer reached');
    END IF;
  END IF;

  -- Check total redemption limit
  IF v_total_redemption_limit IS NOT NULL AND v_total_redeemed >= v_total_redemption_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'Total redemption limit reached');
  END IF;

  -- Create redemption record
  INSERT INTO point_redemptions (
    customer_id,
    reward_item_id,
    points_spent,
    status,
    shipping_address
  ) VALUES (
    p_customer_id,
    p_reward_item_id,
    v_points_required,
    'PENDING',
    p_shipping_address
  ) RETURNING id INTO v_redemption_id;

  -- Deduct points from ledger
  INSERT INTO customer_points_ledger (
    customer_id,
    transaction_type,
    points_amount,
    redemption_id,
    reward_item_id,
    description
  ) VALUES (
    p_customer_id,
    'REDEEMED',
    -v_points_required,
    v_redemption_id,
    p_reward_item_id,
    'Redeemed: ' || v_item_name
  );

  -- If voucher, auto-generate voucher code
  IF v_item_type = 'VOUCHER' THEN
    -- Generate unique voucher code
    v_voucher_code := v_voucher_code || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    v_expiry_date := NOW() + (v_voucher_validity_days || ' days')::INTERVAL;

    -- Create voucher
    INSERT INTO vouchers (
      code,
      discount_type,
      discount_value,
      min_purchase_amount,
      usage_limit,
      times_used,
      valid_from,
      valid_until,
      is_active,
      assigned_to_customer_id,
      created_by_system
    ) VALUES (
      v_voucher_code,
      v_voucher_discount_type,
      v_voucher_discount_value,
      v_voucher_min_purchase,
      1, -- Single use
      0,
      NOW(),
      v_expiry_date,
      true,
      p_customer_id,
      true
    ) RETURNING id INTO v_voucher_id;

    -- Update redemption with voucher
    UPDATE point_redemptions
    SET
      generated_voucher_id = v_voucher_id,
      status = 'COMPLETED',
      fulfilled_at = NOW()
    WHERE id = v_redemption_id;
  END IF;

  -- Deduct stock if merchandise
  IF v_item_type = 'MERCHANDISE' AND v_stock_quantity IS NOT NULL THEN
    UPDATE reward_items
    SET stock_quantity = stock_quantity - 1,
        total_redeemed = total_redeemed + 1,
        updated_at = NOW()
    WHERE id = p_reward_item_id;
  ELSE
    -- Just increment redemption counter
    UPDATE reward_items
    SET total_redeemed = total_redeemed + 1,
        updated_at = NOW()
    WHERE id = p_reward_item_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'voucher_code', v_voucher_code,
    'voucher_id', v_voucher_id,
    'new_balance', get_customer_points_balance(p_customer_id)
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 6: Cancel Redemption Function
-- =============================================

CREATE OR REPLACE FUNCTION cancel_point_redemption(
  p_redemption_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_points_spent INTEGER;
  v_status VARCHAR(50);
  v_reward_item_id UUID;
  v_voucher_id UUID;
BEGIN
  -- Get redemption details
  SELECT customer_id, points_spent, status, reward_item_id, generated_voucher_id
  INTO v_customer_id, v_points_spent, v_status, v_reward_item_id, v_voucher_id
  FROM point_redemptions
  WHERE id = p_redemption_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  IF v_status = 'CANCELLED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption already cancelled');
  END IF;

  -- Update redemption status
  UPDATE point_redemptions
  SET
    status = 'CANCELLED',
    cancelled_at = NOW(),
    cancelled_by = p_cancelled_by,
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_redemption_id;

  -- Refund points
  INSERT INTO customer_points_ledger (
    customer_id,
    transaction_type,
    points_amount,
    redemption_id,
    reward_item_id,
    description,
    created_by
  ) VALUES (
    v_customer_id,
    'ADJUSTED',
    v_points_spent, -- Return points (positive)
    p_redemption_id,
    v_reward_item_id,
    'Refund from cancelled redemption',
    p_cancelled_by
  );

  -- Deactivate voucher if it was generated
  IF v_voucher_id IS NOT NULL THEN
    UPDATE vouchers
    SET is_active = false
    WHERE id = v_voucher_id;
  END IF;

  -- Restore stock
  UPDATE reward_items
  SET
    stock_quantity = CASE WHEN stock_quantity IS NOT NULL THEN stock_quantity + 1 ELSE NULL END,
    total_redeemed = total_redeemed - 1,
    updated_at = NOW()
  WHERE id = v_reward_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded_points', v_points_spent,
    'new_balance', get_customer_points_balance(v_customer_id)
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 7: Enable RLS (Row Level Security)
-- =============================================

ALTER TABLE customer_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers can view their own points ledger" ON customer_points_ledger;
DROP POLICY IF EXISTS "Anyone can view active reward items" ON reward_items;
DROP POLICY IF EXISTS "Customers can view their own redemptions" ON point_redemptions;

-- Customers can view their own points ledger
CREATE POLICY "Customers can view their own points ledger"
ON customer_points_ledger
FOR SELECT
USING (auth.uid() = (SELECT user_id FROM customer_profiles WHERE id = customer_id));

-- Anyone can view active reward items
CREATE POLICY "Anyone can view active reward items"
ON reward_items
FOR SELECT
USING (is_active = true);

-- Customers can view their own redemptions
CREATE POLICY "Customers can view their own redemptions"
ON point_redemptions
FOR SELECT
USING (auth.uid() = (SELECT user_id FROM customer_profiles WHERE id = customer_id));

-- =============================================
-- STEP 8: Grant Permissions
-- =============================================

GRANT SELECT ON customer_points_ledger TO authenticated, anon;
GRANT SELECT ON reward_items TO authenticated, anon;
GRANT SELECT, INSERT ON point_redemptions TO authenticated;

GRANT EXECUTE ON FUNCTION get_customer_points_balance(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_customer_lifetime_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_points_redeemed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_reward_item(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_point_redemption(UUID, UUID, TEXT) TO authenticated;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

SELECT '✅ Points & Rewards System Created Successfully!' as status;

-- Show created tables
SELECT 'Created Tables:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('customer_points_ledger', 'reward_items', 'point_redemptions')
ORDER BY table_name;

-- Show created functions
SELECT 'Created Functions:' as info;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%point%' OR routine_name LIKE '%reward%'
ORDER BY routine_name;
