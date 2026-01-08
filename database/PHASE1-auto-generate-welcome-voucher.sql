-- ============================================================================
-- PHASE 1: AUTO-GENERATE RM50 WELCOME VOUCHER
-- Purpose: Automatically create RM50 welcome voucher when merchant subscription activates
-- Date: 2025-12-07
-- ============================================================================

-- Function to create welcome voucher for new merchant
CREATE OR REPLACE FUNCTION create_merchant_welcome_voucher()
RETURNS TRIGGER AS $$
DECLARE
  voucher_code TEXT;
  merchant_profile_id UUID;
BEGIN
  -- Only create voucher when subscription becomes ACTIVE for the first time
  -- And only for 'professional' or 'panel' plans
  IF NEW.subscription_status = 'ACTIVE'
     AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'ACTIVE')
     AND (NEW.subscription_plan = 'professional' OR NEW.subscription_plan = 'panel') THEN

    -- Check if merchant already has a welcome voucher
    IF NOT EXISTS (
      SELECT 1 FROM vouchers
      WHERE assigned_to_customer_id = NEW.merchant_id
        AND code LIKE 'WELCOME50_%'
        AND description LIKE '%Welcome voucher%'
    ) THEN

      -- Generate unique voucher code: WELCOME50_[first 8 chars of merchant_id]
      voucher_code := 'WELCOME50_' || UPPER(SUBSTRING(NEW.merchant_id::text, 1, 8));

      -- Insert welcome voucher
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
        'fixed',                    -- Fixed amount discount
        50.00,                      -- RM50 discount
        100.00,                     -- Min spend RM100
        50.00,                      -- Max discount RM50
        'merchant',                 -- Only for merchants
        NEW.merchant_id,            -- Assigned to this specific merchant
        1,                          -- One-time use only
        1,                          -- Total usage limit of 1
        NOW(),                      -- Valid from now
        NOW() + INTERVAL '1 year', -- Valid for 1 year
        true,                       -- Active
        'Welcome voucher for new merchant subscription - RM50 off with minimum spend of RM100',
        (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) -- Created by system/admin
      );

      -- Log the voucher creation (optional)
      RAISE NOTICE 'Welcome voucher % created for merchant %', voucher_code, NEW.merchant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on premium_partnerships table
DROP TRIGGER IF EXISTS trigger_create_merchant_welcome_voucher ON premium_partnerships;
CREATE TRIGGER trigger_create_merchant_welcome_voucher
  AFTER INSERT OR UPDATE OF subscription_status ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION create_merchant_welcome_voucher();

-- Add comment
COMMENT ON FUNCTION create_merchant_welcome_voucher() IS 'Auto-generates RM50 welcome voucher when merchant subscription becomes active for first time';

-- Backfill: Create welcome vouchers for existing active merchants who don't have one
DO $$
DECLARE
  merchant_record RECORD;
  voucher_code TEXT;
BEGIN
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
    -- Generate voucher code
    voucher_code := 'WELCOME50_' || UPPER(SUBSTRING(merchant_record.merchant_id::text, 1, 8));

    -- Insert welcome voucher
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
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
    );

    RAISE NOTICE 'Backfilled welcome voucher % for merchant %', voucher_code, merchant_record.merchant_id;
  END LOOP;
END;
$$;
