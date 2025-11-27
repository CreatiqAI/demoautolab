-- =====================================================
-- FIX SUBSCRIPTION PLAN CONSTRAINT (FIXED ORDER)
-- =====================================================
-- Update constraint to allow 'professional' and 'enterprise'
-- instead of just 'PREMIUM'

-- Step 1: Drop the old constraint first
ALTER TABLE premium_partnerships
  DROP CONSTRAINT IF EXISTS premium_partnerships_subscription_plan_check;

-- Step 2: Update existing data BEFORE adding new constraint
-- Convert all 'PREMIUM' values to 'professional' (default plan)
UPDATE premium_partnerships
SET subscription_plan = 'professional'
WHERE subscription_plan = 'PREMIUM' OR subscription_plan IS NULL;

-- Convert any other invalid values to 'professional'
UPDATE premium_partnerships
SET subscription_plan = 'professional'
WHERE subscription_plan NOT IN ('professional', 'enterprise');

-- Step 3: NOW add the new constraint (after data is clean)
ALTER TABLE premium_partnerships
  ADD CONSTRAINT premium_partnerships_subscription_plan_check
  CHECK (subscription_plan IN ('professional', 'enterprise'));

-- Step 4: Rename monthly_fee to yearly_fee if needed
DO $$
BEGIN
  -- Check if monthly_fee column exists and yearly_fee doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'premium_partnerships'
    AND column_name = 'monthly_fee'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'premium_partnerships'
    AND column_name = 'yearly_fee'
  ) THEN
    ALTER TABLE premium_partnerships
      RENAME COLUMN monthly_fee TO yearly_fee;

    RAISE NOTICE 'Renamed monthly_fee to yearly_fee';
  ELSE
    RAISE NOTICE 'Column already named yearly_fee or monthly_fee does not exist';
  END IF;
END $$;

-- Step 5: Update default yearly_fee to 99 (professional plan default)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'premium_partnerships'
    AND column_name = 'yearly_fee'
  ) THEN
    ALTER TABLE premium_partnerships
      ALTER COLUMN yearly_fee SET DEFAULT 99.00;
    RAISE NOTICE 'Set default yearly_fee to 99.00';
  END IF;
END $$;

-- Step 6: Verify the changes
SELECT
  subscription_plan,
  COALESCE(yearly_fee, monthly_fee) as fee,
  COUNT(*) as count
FROM premium_partnerships
GROUP BY subscription_plan, COALESCE(yearly_fee, monthly_fee)
ORDER BY subscription_plan;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Subscription plan constraint updated!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Allowed plans:';
  RAISE NOTICE '  - professional (RM99/year)';
  RAISE NOTICE '  - enterprise (RM388/year)';
  RAISE NOTICE '';
  RAISE NOTICE 'All existing PREMIUM subscriptions converted to professional';
  RAISE NOTICE '==============================================';
END $$;
