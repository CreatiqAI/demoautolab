-- =====================================================
-- FIX SUBSCRIPTION PLAN CONSTRAINT
-- =====================================================
-- Update constraint to allow 'professional' and 'enterprise'
-- instead of just 'PREMIUM'

-- Drop the old constraint
ALTER TABLE premium_partnerships
  DROP CONSTRAINT IF EXISTS premium_partnerships_subscription_plan_check;

-- Add new constraint with correct values
ALTER TABLE premium_partnerships
  ADD CONSTRAINT premium_partnerships_subscription_plan_check
  CHECK (subscription_plan IN ('professional', 'enterprise'));

-- Update existing 'PREMIUM' values to 'professional' (default plan)
UPDATE premium_partnerships
SET subscription_plan = 'professional'
WHERE subscription_plan = 'PREMIUM' OR subscription_plan NOT IN ('professional', 'enterprise');

-- Also update the monthly_fee column name to yearly_fee if needed
-- Check if yearly_fee column exists
DO $$
BEGIN
  -- Rename monthly_fee to yearly_fee if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'premium_partnerships'
    AND column_name = 'monthly_fee'
  ) THEN
    ALTER TABLE premium_partnerships
      RENAME COLUMN monthly_fee TO yearly_fee;

    RAISE NOTICE 'Renamed monthly_fee to yearly_fee';
  END IF;
END $$;

-- Update default yearly_fee to 99 (professional plan default)
ALTER TABLE premium_partnerships
  ALTER COLUMN yearly_fee SET DEFAULT 99.00;

-- Verify the changes
SELECT
  subscription_plan,
  yearly_fee,
  COUNT(*) as count
FROM premium_partnerships
GROUP BY subscription_plan, yearly_fee
ORDER BY subscription_plan;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Subscription plan constraint updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'Allowed plans:';
  RAISE NOTICE '  - professional (RM99/year)';
  RAISE NOTICE '  - enterprise (RM388/year)';
  RAISE NOTICE '';
  RAISE NOTICE 'All existing PREMIUM subscriptions converted to professional';
END $$;
