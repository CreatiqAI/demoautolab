-- Merchant System Implementation (Updated for customer_profiles schema)
-- PASTE THIS ENTIRE FILE INTO YOUR SQL EDITOR

-- ============================================
-- 1. UPDATE CUSTOMER_PROFILES FOR MERCHANT FEATURES
-- ============================================

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS merchant_tier TEXT DEFAULT 'BRONZE',
  ADD COLUMN IF NOT EXISTS points_rate NUMERIC(5,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_approve_orders BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Update customer_type check constraint
ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_customer_type_check;

ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_customer_type_check
  CHECK (customer_type IN ('normal', 'merchant'));

-- Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_profiles_username
  ON public.customer_profiles(username)
  WHERE username IS NOT NULL;

-- ============================================
-- 2. MERCHANT REGISTRATION CODES
-- ============================================

CREATE TABLE IF NOT EXISTS public.merchant_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.customer_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES public.merchant_codes(id),
  company_name TEXT NOT NULL,
  business_registration_no TEXT,
  tax_id TEXT,
  business_type TEXT,
  address TEXT,
  approved_by UUID REFERENCES public.customer_profiles(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- ============================================
-- 3. MERCHANT WALLET SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.merchant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  points_balance NUMERIC(12,2) DEFAULT 0 CHECK (points_balance >= 0),
  credit_balance NUMERIC(12,2) DEFAULT 0,
  total_earned_points NUMERIC(12,2) DEFAULT 0,
  total_spent_points NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE public.wallet_transaction_type AS ENUM (
    'EARN_PURCHASE', 'EARN_BONUS', 'EARN_REFERRAL',
    'SPEND_PURCHASE', 'SPEND_DEDUCTION',
    'CREDIT_DEPOSIT', 'CREDIT_PAYMENT', 'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.merchant_wallets(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  type public.wallet_transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  created_by UUID REFERENCES public.customer_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. BULK PRICING TIERS
-- ============================================

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

DO $$ BEGIN
  CREATE TYPE public.promotion_type AS ENUM (
    'PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'BUNDLE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.merchant_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type public.promotion_type NOT NULL,
  discount_value NUMERIC(12,2),
  min_purchase_amount NUMERIC(12,2),
  max_discount_amount NUMERIC(12,2),
  applicable_to TEXT DEFAULT 'ALL',
  product_ids UUID[],
  category_ids UUID[],
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_merchant INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

DROP POLICY IF EXISTS "admin_manage_merchant_codes" ON public.merchant_codes;
CREATE POLICY "admin_manage_merchant_codes" ON public.merchant_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "merchants_view_active_codes" ON public.merchant_codes;
CREATE POLICY "merchants_view_active_codes" ON public.merchant_codes
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "customers_manage_own_registration" ON public.merchant_registrations;
CREATE POLICY "customers_manage_own_registration" ON public.merchant_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.customer_profiles WHERE id = merchant_registrations.customer_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_all_registrations" ON public.merchant_registrations;
CREATE POLICY "admin_manage_all_registrations" ON public.merchant_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_view_own_wallet" ON public.merchant_wallets;
CREATE POLICY "customers_view_own_wallet" ON public.merchant_wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customer_profiles WHERE id = merchant_wallets.customer_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_wallets" ON public.merchant_wallets;
CREATE POLICY "admin_manage_wallets" ON public.merchant_wallets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_view_own_transactions" ON public.wallet_transactions;
CREATE POLICY "customers_view_own_transactions" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customer_profiles WHERE id = wallet_transactions.customer_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_transactions" ON public.wallet_transactions;
CREATE POLICY "admin_manage_transactions" ON public.wallet_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "public_view_bulk_pricing" ON public.bulk_pricing_tiers;
CREATE POLICY "public_view_bulk_pricing" ON public.bulk_pricing_tiers
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_bulk_pricing" ON public.bulk_pricing_tiers;
CREATE POLICY "admin_manage_bulk_pricing" ON public.bulk_pricing_tiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "merchants_view_active_promotions" ON public.merchant_promotions;
CREATE POLICY "merchants_view_active_promotions" ON public.merchant_promotions
  FOR SELECT USING (
    is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
  );

DROP POLICY IF EXISTS "admin_manage_promotions" ON public.merchant_promotions;
CREATE POLICY "admin_manage_promotions" ON public.merchant_promotions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_view_own_promotion_usage" ON public.promotion_usage;
CREATE POLICY "customers_view_own_promotion_usage" ON public.promotion_usage
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customer_profiles WHERE id = promotion_usage.customer_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_record_promotion_usage" ON public.promotion_usage;
CREATE POLICY "customers_record_promotion_usage" ON public.promotion_usage
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.customer_profiles WHERE id = promotion_usage.customer_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_promotion_usage" ON public.promotion_usage;
CREATE POLICY "admin_manage_promotion_usage" ON public.promotion_usage
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_manage_own_favorites" ON public.merchant_favorites;
CREATE POLICY "customers_manage_own_favorites" ON public.merchant_favorites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.customer_profiles WHERE id = merchant_favorites.customer_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customers_view_own_purchase_history" ON public.merchant_purchase_history;
CREATE POLICY "customers_view_own_purchase_history" ON public.merchant_purchase_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customer_profiles WHERE id = merchant_purchase_history.customer_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_manage_purchase_history" ON public.merchant_purchase_history;
CREATE POLICY "admin_manage_purchase_history" ON public.merchant_purchase_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_merchant_codes_updated_at ON public.merchant_codes;
CREATE TRIGGER set_merchant_codes_updated_at BEFORE UPDATE ON public.merchant_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_merchant_registrations_updated_at ON public.merchant_registrations;
CREATE TRIGGER set_merchant_registrations_updated_at BEFORE UPDATE ON public.merchant_registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_merchant_wallets_updated_at ON public.merchant_wallets;
CREATE TRIGGER set_merchant_wallets_updated_at BEFORE UPDATE ON public.merchant_wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_bulk_pricing_tiers_updated_at ON public.bulk_pricing_tiers;
CREATE TRIGGER set_bulk_pricing_tiers_updated_at BEFORE UPDATE ON public.bulk_pricing_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_merchant_promotions_updated_at ON public.merchant_promotions;
CREATE TRIGGER set_merchant_promotions_updated_at BEFORE UPDATE ON public.merchant_promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_merchant_favorites_updated_at ON public.merchant_favorites;
CREATE TRIGGER set_merchant_favorites_updated_at BEFORE UPDATE ON public.merchant_favorites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_merchant_purchase_history_updated_at ON public.merchant_purchase_history;
CREATE TRIGGER set_merchant_purchase_history_updated_at BEFORE UPDATE ON public.merchant_purchase_history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validate merchant code function
CREATE OR REPLACE FUNCTION public.validate_merchant_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_code RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_code FROM public.merchant_codes
  WHERE code = p_code AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_code IS NULL THEN
    v_result := json_build_object('valid', false, 'message', 'Invalid or expired merchant code');
  ELSE
    v_result := json_build_object('valid', true, 'code_id', v_code.id, 'description', v_code.description);
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get product price function
CREATE OR REPLACE FUNCTION public.get_product_price(p_product_id UUID, p_customer_id UUID, p_quantity INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_customer_type TEXT;
  v_pricing_type TEXT;
  v_base_price NUMERIC;
  v_bulk_price NUMERIC;
BEGIN
  SELECT customer_type, pricing_type INTO v_customer_type, v_pricing_type
  FROM public.customer_profiles WHERE id = p_customer_id;

  IF v_customer_type = 'merchant' OR v_pricing_type = 'wholesale' THEN
    SELECT price_merchant INTO v_base_price FROM public.products WHERE id = p_product_id;
  ELSE
    SELECT price_regular INTO v_base_price FROM public.products WHERE id = p_product_id;
  END IF;

  IF v_customer_type = 'merchant' THEN
    SELECT price INTO v_bulk_price FROM public.bulk_pricing_tiers
    WHERE product_id = p_product_id AND is_active = true
      AND min_quantity <= p_quantity
      AND (max_quantity IS NULL OR max_quantity >= p_quantity)
    ORDER BY min_quantity DESC LIMIT 1;

    IF v_bulk_price IS NOT NULL THEN
      RETURN v_bulk_price;
    END IF;
  END IF;

  RETURN v_base_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create wallet on merchant approval
CREATE OR REPLACE FUNCTION public.create_merchant_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    UPDATE public.customer_profiles
    SET customer_type = 'merchant', pricing_type = 'wholesale'
    WHERE id = NEW.customer_id;

    INSERT INTO public.merchant_wallets (customer_id)
    VALUES (NEW.customer_id)
    ON CONFLICT (customer_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS merchant_approval_creates_wallet ON public.merchant_registrations;
CREATE TRIGGER merchant_approval_creates_wallet
  AFTER UPDATE ON public.merchant_registrations
  FOR EACH ROW EXECUTE FUNCTION public.create_merchant_wallet();

-- Increment code usage
CREATE OR REPLACE FUNCTION public.increment_merchant_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.merchant_codes SET current_uses = current_uses + 1 WHERE id = NEW.code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS increment_code_usage_on_registration ON public.merchant_registrations;
CREATE TRIGGER increment_code_usage_on_registration
  AFTER INSERT ON public.merchant_registrations
  FOR EACH ROW EXECUTE FUNCTION public.increment_merchant_code_usage();

-- ============================================
-- 11. SAMPLE DATA
-- ============================================

INSERT INTO public.merchant_codes (code, description, max_uses, is_active) VALUES
  ('MERCHANT2024', 'General merchant registration code for 2024', NULL, true),
  ('DEALER100', 'Limited dealer registration - 100 slots', 100, true),
  ('WORKSHOP50', 'Workshop partner program', 50, true),
  ('VIP001', 'VIP merchant invitation', 10, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.merchant_promotions (code, name, description, type, discount_value, min_purchase_amount, max_discount_amount, applicable_to, valid_from, valid_until, max_uses, is_active) VALUES
  ('NEWMERCHANT50', 'New Merchant Welcome Offer', 'Get RM50 off your first order above RM500', 'FIXED_AMOUNT', 50.00, 500.00, 50.00, 'ALL', now(), now() + INTERVAL '90 days', NULL, true),
  ('BULK20', 'Bulk Purchase Discount', 'Get 20% off on orders above RM2000', 'PERCENTAGE_DISCOUNT', 20.00, 2000.00, 500.00, 'ALL', now(), now() + INTERVAL '180 days', NULL, true)
ON CONFLICT (code) DO NOTHING;

-- Comments
COMMENT ON TABLE public.merchant_codes IS 'Access codes for merchant registration';
COMMENT ON TABLE public.merchant_registrations IS 'Merchant registration applications and business details';
COMMENT ON TABLE public.merchant_wallets IS 'Merchant wallet balances for points and credit';
COMMENT ON TABLE public.wallet_transactions IS 'Transaction history for merchant wallets';
COMMENT ON TABLE public.bulk_pricing_tiers IS 'Quantity-based pricing tiers for bulk purchases';
COMMENT ON TABLE public.merchant_promotions IS 'Promotional offers exclusive to merchants';
COMMENT ON TABLE public.promotion_usage IS 'Track promotion code usage by merchants';
COMMENT ON TABLE public.merchant_favorites IS 'Merchant favorite products for quick reorder';
COMMENT ON TABLE public.merchant_purchase_history IS 'Aggregated purchase history per product';
