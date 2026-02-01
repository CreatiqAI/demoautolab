-- ============================================================================
-- FIX: Vouchers Schema Mismatch
-- Issue: Trigger uses column names that don't exist in vouchers table
-- Error: "column "usage_limit" of relation "vouchers" does not exist"
-- ============================================================================

-- Step 1: Add missing columns to vouchers table
DO $$
BEGIN
  -- Add assigned_to_customer_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vouchers' AND column_name = 'assigned_to_customer_id'
  ) THEN
    ALTER TABLE vouchers ADD COLUMN assigned_to_customer_id UUID REFERENCES customer_profiles(id);
    RAISE NOTICE 'Added column: assigned_to_customer_id';
  END IF;
END $$;

-- Step 2: Recreate the trigger function with CORRECT column names
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

      -- Insert welcome voucher with CORRECT column names
      INSERT INTO vouchers (
        code,
        name,
        description,
        discount_type,
        discount_value,
        min_purchase_amount,
        max_discount_amount,
        customer_type_restriction,
        assigned_to_customer_id,
        specific_customer_ids,
        max_usage_per_user,
        max_usage_total,
        current_usage_count,
        valid_from,
        valid_until,
        is_active
      ) VALUES (
        voucher_code,
        'Welcome Voucher RM50',
        'Welcome voucher for new merchant subscription - RM50 off with minimum spend of RM100',
        'FIXED_AMOUNT',
        50.00,
        100.00,
        50.00,
        'MERCHANT',
        NEW.merchant_id,
        ARRAY[NEW.merchant_id]::UUID[],
        1,
        1,
        0,
        NOW(),
        NOW() + INTERVAL '1 year',
        true
      );

      RAISE NOTICE 'Welcome voucher % created for merchant %', voucher_code, NEW.merchant_id;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the partnership update
    RAISE WARNING 'Failed to create welcome voucher for merchant %: %', NEW.merchant_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_merchant_welcome_voucher ON premium_partnerships;
CREATE TRIGGER trigger_create_merchant_welcome_voucher
  AFTER INSERT OR UPDATE OF subscription_status ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION create_merchant_welcome_voucher();

-- Step 4: Add index for the new column
CREATE INDEX IF NOT EXISTS idx_vouchers_assigned_customer ON vouchers(assigned_to_customer_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fix applied successfully!';
  RAISE NOTICE 'The trigger now uses correct column names:';
  RAISE NOTICE '  - max_usage_per_user (was: usage_limit_per_user)';
  RAISE NOTICE '  - max_usage_total (was: max_total_usage)';
  RAISE NOTICE '  - assigned_to_customer_id (new column added)';
  RAISE NOTICE '';
  RAISE NOTICE 'Premium Partner reactivation should now work correctly.';
END $$;
