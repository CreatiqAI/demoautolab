-- Merchant System Implementation (Updated for customer_profiles schema)
-- Add merchant-specific features including registration codes, wallet, bulk pricing, promotions

-- ============================================
-- 1. UPDATE CUSTOMER_PROFILES FOR MERCHANT FEATURES
-- ============================================

-- Add merchant-specific columns to customer_profiles if they don't exist
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS merchant_tier TEXT DEFAULT 'BRONZE', -- BRONZE, SILVER, GOLD, PLATINUM
  ADD COLUMN IF NOT EXISTS points_rate NUMERIC(5,2) DEFAULT 1.00, -- Points earned per RM spent
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_approve_orders BOOLEAN DEFAULT false;

-- Update customer_type check constraint to ensure merchant is valid
ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_customer_type_check;

ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_customer_type_check
  CHECK (customer_type IN ('normal', 'merchant'));

-- ============================================
-- 2. MERCHANT REGISTRATION CODES
-- ============================================

-- Table to store merchant registration access codes
CREATE TABLE IF NOT EXISTS public.merchant_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.customer_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which merchants used which codes
CREATE TABLE IF NOT EXISTS public.merchant_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES public.merchant_codes(id),
  company_name TEXT NOT NULL,
  business_registration_no TEXT,
  tax_id TEXT,
  business_type TEXT, -- "Wholesaler", "Retailer", "Workshop", "Dealer"
  address TEXT,
  approved_by UUID REFERENCES public.customer_profiles(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- ============================================
-- 3. MERCHANT WALLET SYSTEM
-- ============================================

-- Merchant wallet for points/credit balance
CREATE TABLE IF NOT EXISTS public.merchant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  points_balance NUMERIC(12,2) DEFAULT 0 CHECK (points_balance >= 0),
  credit_balance NUMERIC(12,2) DEFAULT 0, -- Can be negative if using credit
  total_earned_points NUMERIC(12,2) DEFAULT 0,
  total_spent_points NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallet transaction history
CREATE TYPE public.wallet_transaction_type AS ENUM (
  'EARN_PURCHASE',      -- Earned from purchase
  'EARN_BONUS',         -- Bonus points
  'EARN_REFERRAL',      -- Referral bonus
  'SPEND_PURCHASE',     -- Used for purchase
  'SPEND_DEDUCTION',    -- Admin deduction
  'CREDIT_DEPOSIT',     -- Credit added
  'CREDIT_PAYMENT',     -- Payment made using credit
  'ADJUSTMENT'          -- Manual adjustment
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.merchant_wallets(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  type public.wallet_transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference_id UUID, -- order_id or other reference
  reference_type TEXT, -- "ORDER", "ADJUSTMENT", etc.
  description TEXT,
  created_by UUID REFERENCES public.customer_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. BULK PRICING TIERS
-- ============================================

-- Bulk purchase pricing rules
CREATE TABLE IF NOT EXISTS public.bulk_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  discount_percentage NUMERIC(5,2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, min_quantity)
);

-- ============================================
-- 5. MERCHANT PROMOTIONS
-- ============================================

CREATE TYPE public.promotion_type AS ENUM (
  'PERCENTAGE_DISCOUNT',
  'FIXED_AMOUNT',
  'BUY_X_GET_Y',
  'FREE_SHIPPING',
  'BUNDLE'
);

CREATE TABLE IF NOT EXISTS public.merchant_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type public.promotion_type NOT NULL,
  discount_value NUMERIC(12,2), -- Percentage or fixed amount
  min_purchase_amount NUMERIC(12,2),
  max_discount_amount NUMERIC(12,2),
  applicable_to TEXT DEFAULT 'ALL', -- ALL, SPECIFIC_PRODUCTS, SPECIFIC_CATEGORIES
  product_ids UUID[], -- Array of product IDs
  category_ids UUID[], -- Array of category IDs
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_merchant INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track promotion usage by merchants
CREATE TABLE IF NOT EXISTS public.promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.merchant_promotions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  discount_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. MERCHANT FAVORITES / QUICK REORDER
-- ============================================

CREATE TABLE IF NOT EXISTS public.merchant_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  custom_note TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

-- Track frequently purchased items
CREATE TABLE IF NOT EXISTS public.merchant_purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  last_purchase_date TIMESTAMPTZ,
  total_quantity INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  average_quantity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

-- ============================================
-- 7. EXTEND ORDERS TABLE
-- ============================================

-- Add fields to track wallet usage in orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_used NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_code TEXT,
  ADD COLUMN IF NOT EXISTS promotion_discount NUMERIC(12,2) DEFAULT 0;

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_merchant_codes_code ON public.merchant_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_merchant_registrations_customer ON public.merchant_registrations(customer_id);
CREATE INDEX IF NOT EXISTS idx_merchant_registrations_status ON public.merchant_registrations(status);
CREATE INDEX IF NOT EXISTS idx_merchant_wallets_customer ON public.merchant_wallets(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer ON public.wallet_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_pricing_product ON public.bulk_pricing_tiers(product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_merchant_promotions_code ON public.merchant_promotions(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_merchant_promotions_dates ON public.merchant_promotions(valid_from, valid_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotion_usage_customer ON public.promotion_usage(customer_id, promotion_id);
CREATE INDEX IF NOT EXISTS idx_merchant_favorites_customer ON public.merchant_favorites(customer_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_merchant_purchase_history_customer ON public.merchant_purchase_history(customer_id, last_purchase_date DESC);

-- ============================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.merchant_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_purchase_history ENABLE ROW LEVEL SECURITY;

-- Merchant codes: Admin manages, merchants can view active codes
CREATE POLICY "admin_manage_merchant_codes" ON public.merchant_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "merchants_view_active_codes" ON public.merchant_codes
  FOR SELECT USING (is_active = true);

-- Merchant registrations: Users manage own, admin manages all
CREATE POLICY "customers_manage_own_registration" ON public.merchant_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = merchant_registrations.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "admin_manage_all_registrations" ON public.merchant_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Wallets: Users view own, admin views all
CREATE POLICY "customers_view_own_wallet" ON public.merchant_wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = merchant_wallets.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "admin_manage_wallets" ON public.merchant_wallets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Wallet transactions: Users view own, admin manages all
CREATE POLICY "customers_view_own_transactions" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = wallet_transactions.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "admin_manage_transactions" ON public.wallet_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Bulk pricing: Everyone can view, admin manages
CREATE POLICY "public_view_bulk_pricing" ON public.bulk_pricing_tiers
  FOR SELECT USING (is_active = true);

CREATE POLICY "admin_manage_bulk_pricing" ON public.bulk_pricing_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Promotions: Merchants can view active, admin manages
CREATE POLICY "merchants_view_active_promotions" ON public.merchant_promotions
  FOR SELECT USING (
    is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE user_id = auth.uid()
      AND customer_type = 'merchant'
    )
  );

CREATE POLICY "admin_manage_promotions" ON public.merchant_promotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Promotion usage: Users view own, admin views all
CREATE POLICY "customers_view_own_promotion_usage" ON public.promotion_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = promotion_usage.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "customers_record_promotion_usage" ON public.promotion_usage
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = promotion_usage.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "admin_manage_promotion_usage" ON public.promotion_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Favorites: Users manage own
CREATE POLICY "customers_manage_own_favorites" ON public.merchant_favorites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = merchant_favorites.customer_id
      AND user_id = auth.uid()
    )
  );

-- Purchase history: Users view own, admin views all
CREATE POLICY "customers_view_own_purchase_history" ON public.merchant_purchase_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles
      WHERE id = merchant_purchase_history.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "admin_manage_purchase_history" ON public.merchant_purchase_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 10. TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_merchant_codes_updated_at
  BEFORE UPDATE ON public.merchant_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_merchant_registrations_updated_at
  BEFORE UPDATE ON public.merchant_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_merchant_wallets_updated_at
  BEFORE UPDATE ON public.merchant_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_bulk_pricing_tiers_updated_at
  BEFORE UPDATE ON public.bulk_pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_merchant_promotions_updated_at
  BEFORE UPDATE ON public.merchant_promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_merchant_favorites_updated_at
  BEFORE UPDATE ON public.merchant_favorites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_merchant_purchase_history_updated_at
  BEFORE UPDATE ON public.merchant_purchase_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================

-- Function to validate merchant registration code
CREATE OR REPLACE FUNCTION public.validate_merchant_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_code RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_code
  FROM public.merchant_codes
  WHERE code = p_code
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_code IS NULL THEN
    v_result := json_build_object(
      'valid', false,
      'message', 'Invalid or expired merchant code'
    );
  ELSE
    v_result := json_build_object(
      'valid', true,
      'code_id', v_code.id,
      'description', v_code.description
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get applicable price for customer (regular vs merchant vs bulk)
CREATE OR REPLACE FUNCTION public.get_product_price(
  p_product_id UUID,
  p_customer_id UUID,
  p_quantity INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
  v_customer_type TEXT;
  v_pricing_type TEXT;
  v_base_price NUMERIC;
  v_bulk_price NUMERIC;
BEGIN
  -- Get customer type and pricing type
  SELECT customer_type, pricing_type INTO v_customer_type, v_pricing_type
  FROM public.customer_profiles
  WHERE id = p_customer_id;

  -- Get base price (merchant or regular)
  IF v_customer_type = 'merchant' OR v_pricing_type = 'wholesale' THEN
    SELECT price_merchant INTO v_base_price
    FROM public.products
    WHERE id = p_product_id;
  ELSE
    SELECT price_regular INTO v_base_price
    FROM public.products
    WHERE id = p_product_id;
  END IF;

  -- Check for bulk pricing (only for merchants)
  IF v_customer_type = 'merchant' THEN
    SELECT price INTO v_bulk_price
    FROM public.bulk_pricing_tiers
    WHERE product_id = p_product_id
      AND is_active = true
      AND min_quantity <= p_quantity
      AND (max_quantity IS NULL OR max_quantity >= p_quantity)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF v_bulk_price IS NOT NULL THEN
      RETURN v_bulk_price;
    END IF;
  END IF;

  RETURN v_base_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create wallet when merchant is approved
CREATE OR REPLACE FUNCTION public.create_merchant_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    -- Update customer type to merchant
    UPDATE public.customer_profiles
    SET customer_type = 'merchant',
        pricing_type = 'wholesale'
    WHERE id = NEW.customer_id;

    -- Create wallet if doesn't exist
    INSERT INTO public.merchant_wallets (customer_id)
    VALUES (NEW.customer_id)
    ON CONFLICT (customer_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER merchant_approval_creates_wallet
  AFTER UPDATE ON public.merchant_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_merchant_wallet();

-- Function to update merchant code usage
CREATE OR REPLACE FUNCTION public.increment_merchant_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.merchant_codes
  SET current_uses = current_uses + 1
  WHERE id = NEW.code_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER increment_code_usage_on_registration
  AFTER INSERT ON public.merchant_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_merchant_code_usage();

-- ============================================
-- 12. SAMPLE DATA
-- ============================================

-- Insert sample merchant registration codes
INSERT INTO public.merchant_codes (code, description, max_uses, is_active) VALUES
  ('MERCHANT2024', 'General merchant registration code for 2024', NULL, true),
  ('DEALER100', 'Limited dealer registration - 100 slots', 100, true),
  ('WORKSHOP50', 'Workshop partner program', 50, true),
  ('VIP001', 'VIP merchant invitation', 10, true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample bulk pricing tiers (if products exist)
INSERT INTO public.bulk_pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage, is_active)
SELECT
  p.id,
  10,
  49,
  p.price_merchant * 0.95, -- 5% off
  5.00,
  true
FROM public.products p
WHERE p.sku = 'BRK-001'
ON CONFLICT (product_id, min_quantity) DO NOTHING;

INSERT INTO public.bulk_pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage, is_active)
SELECT
  p.id,
  50,
  99,
  p.price_merchant * 0.90, -- 10% off
  10.00,
  true
FROM public.products p
WHERE p.sku = 'BRK-001'
ON CONFLICT (product_id, min_quantity) DO NOTHING;

INSERT INTO public.bulk_pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage, is_active)
SELECT
  p.id,
  100,
  NULL,
  p.price_merchant * 0.85, -- 15% off
  15.00,
  true
FROM public.products p
WHERE p.sku = 'BRK-001'
ON CONFLICT (product_id, min_quantity) DO NOTHING;

-- Insert sample merchant promotion
INSERT INTO public.merchant_promotions (
  code,
  name,
  description,
  type,
  discount_value,
  min_purchase_amount,
  max_discount_amount,
  applicable_to,
  valid_from,
  valid_until,
  max_uses,
  is_active
) VALUES (
  'NEWMERCHANT50',
  'New Merchant Welcome Offer',
  'Get RM50 off your first order above RM500',
  'FIXED_AMOUNT',
  50.00,
  500.00,
  50.00,
  'ALL',
  now(),
  now() + INTERVAL '90 days',
  NULL,
  true
),
(
  'BULK20',
  'Bulk Purchase Discount',
  'Get 20% off on orders above RM2000',
  'PERCENTAGE_DISCOUNT',
  20.00,
  2000.00,
  500.00,
  'ALL',
  now(),
  now() + INTERVAL '180 days',
  NULL,
  true
)
ON CONFLICT (code) DO NOTHING;

-- Add comment documentation
COMMENT ON TABLE public.merchant_codes IS 'Access codes for merchant registration';
COMMENT ON TABLE public.merchant_registrations IS 'Merchant registration applications and business details';
COMMENT ON TABLE public.merchant_wallets IS 'Merchant wallet balances for points and credit';
COMMENT ON TABLE public.wallet_transactions IS 'Transaction history for merchant wallets';
COMMENT ON TABLE public.bulk_pricing_tiers IS 'Quantity-based pricing tiers for bulk purchases';
COMMENT ON TABLE public.merchant_promotions IS 'Promotional offers exclusive to merchants';
COMMENT ON TABLE public.promotion_usage IS 'Track promotion code usage by merchants';
COMMENT ON TABLE public.merchant_favorites IS 'Merchant favorite products for quick reorder';
COMMENT ON TABLE public.merchant_purchase_history IS 'Aggregated purchase history per product';
