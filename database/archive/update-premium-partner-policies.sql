-- =====================================================
-- UPDATE PREMIUM PARTNER RLS POLICIES
-- =====================================================
-- This script updates existing RLS policies to use admin_profiles table

-- Drop existing policies for premium_partnerships
DROP POLICY IF EXISTS "Admins can view all partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Admins can update all partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Merchants can view own partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Merchants can create partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Merchants can update own partnerships" ON premium_partnerships;
DROP POLICY IF EXISTS "Public can view active partnerships" ON premium_partnerships;

-- Drop existing policies for subscription_payments
DROP POLICY IF EXISTS "Admins can view all payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON subscription_payments;
DROP POLICY IF EXISTS "Merchants can view own payments" ON subscription_payments;

-- Drop existing policies for partner_inquiries
DROP POLICY IF EXISTS "Admins can view all inquiries" ON partner_inquiries;
DROP POLICY IF EXISTS "Partners can view own inquiries" ON partner_inquiries;
DROP POLICY IF EXISTS "Anyone can create inquiries" ON partner_inquiries;

-- =====================================================
-- RECREATE RLS POLICIES WITH CORRECT ADMIN TABLE
-- =====================================================

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
  RAISE NOTICE '✅ Premium Partner RLS policies updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated policies to use admin_profiles table';
  RAISE NOTICE 'Admin roles supported: admin, manager, staff';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins can now view and manage all partnership applications!';
END $$;
