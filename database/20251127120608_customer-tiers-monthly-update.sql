-- Update Customer Tiers System to use Monthly Spending
-- This migration changes from lifetime spending to monthly spending requirements

-- 1. Add monthly spending column to customer_profiles
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS current_month_spending DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_spending_reset_date DATE DEFAULT CURRENT_DATE;

-- 2. Update customer_tiers table - rename columns
DO $$
BEGIN
  -- Rename min_lifetime_spending to min_monthly_spending
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_tiers'
    AND column_name = 'min_lifetime_spending'
  ) THEN
    ALTER TABLE customer_tiers
      RENAME COLUMN min_lifetime_spending TO min_monthly_spending;
  END IF;

  -- Drop min_orders_count column as it's not needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_tiers'
    AND column_name = 'min_orders_count'
  ) THEN
    ALTER TABLE customer_tiers
      DROP COLUMN min_orders_count;
  END IF;
END $$;

-- 3. Update default tier values for monthly spending
UPDATE customer_tiers SET min_monthly_spending = 5000 WHERE tier_name = 'Platinum'; -- RM5,000/month
UPDATE customer_tiers SET min_monthly_spending = 3000 WHERE tier_name = 'Gold';     -- RM3,000/month
UPDATE customer_tiers SET min_monthly_spending = 1500 WHERE tier_name = 'Silver';   -- RM1,500/month
UPDATE customer_tiers SET min_monthly_spending = 500 WHERE tier_name = 'Bronze';    -- RM500/month
UPDATE customer_tiers SET min_monthly_spending = 0 WHERE tier_name = 'Standard';    -- RM0/month

-- 4. Create function to reset monthly spending (run monthly via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_spending()
RETURNS void AS $$
BEGIN
  -- Reset monthly spending for all customers at start of new month
  UPDATE customer_profiles
  SET current_month_spending = 0,
      last_spending_reset_date = CURRENT_DATE
  WHERE last_spending_reset_date < DATE_TRUNC('month', CURRENT_DATE);

  -- Log the reset
  RAISE NOTICE 'Monthly spending reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Update the tier upgrade function to use monthly spending
CREATE OR REPLACE FUNCTION check_and_upgrade_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
  eligible_tier RECORD;
  current_tier_level INTEGER;
BEGIN
  -- Check if monthly spending needs reset (in case cron job didn't run)
  IF NEW.last_spending_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    NEW.current_month_spending := 0;
    NEW.last_spending_reset_date := CURRENT_DATE;
  END IF;

  -- Get current tier level
  SELECT tier_level INTO current_tier_level
  FROM customer_tiers
  WHERE id = NEW.tier_id;

  -- Find the highest tier the customer qualifies for based on MONTHLY spending
  SELECT * INTO eligible_tier
  FROM customer_tiers
  WHERE is_active = true
    AND NEW.current_month_spending >= min_monthly_spending
    AND tier_level < COALESCE(current_tier_level, 999) -- Only upgrade, not downgrade
  ORDER BY tier_level ASC
  LIMIT 1;

  -- If found a better tier, upgrade
  IF eligible_tier.id IS NOT NULL AND (NEW.tier_id IS NULL OR eligible_tier.id != NEW.tier_id) THEN
    -- Log the upgrade
    INSERT INTO tier_upgrade_history (customer_id, previous_tier_id, new_tier_id, triggered_by)
    VALUES (NEW.id, NEW.tier_id, eligible_tier.id, 'auto');

    -- Update customer tier
    NEW.tier_id := eligible_tier.id;
    NEW.tier_achieved_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Update the trigger to watch current_month_spending instead
DROP TRIGGER IF EXISTS trigger_check_customer_tier ON customer_profiles;
CREATE TRIGGER trigger_check_customer_tier
  BEFORE UPDATE OF current_month_spending
  ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_upgrade_customer_tier();

-- 7. Create function to update monthly spending when order is completed
CREATE OR REPLACE FUNCTION update_customer_monthly_spending()
RETURNS TRIGGER AS $$
DECLARE
  customer_profile_id UUID;
  order_total DECIMAL(10,2);
BEGIN
  -- Only process when order is marked as completed or delivered
  IF NEW.status IN ('completed', 'delivered') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'delivered')) THEN

    -- Get customer profile ID
    SELECT id INTO customer_profile_id
    FROM customer_profiles
    WHERE user_id = NEW.user_id;

    -- Calculate order total
    order_total := NEW.total_amount;

    IF customer_profile_id IS NOT NULL THEN
      -- Update both monthly and lifetime spending
      UPDATE customer_profiles
      SET
        current_month_spending = current_month_spending + order_total,
        lifetime_spending = lifetime_spending + order_total,
        total_orders_count = total_orders_count + 1
      WHERE id = customer_profile_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger on orders table to update spending
DROP TRIGGER IF EXISTS trigger_update_monthly_spending ON orders;
CREATE TRIGGER trigger_update_monthly_spending
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_monthly_spending();

-- 9. Schedule monthly reset (PostgreSQL cron extension needed)
-- Note: Run this manually or set up a cron job outside database
-- SELECT cron.schedule('reset-monthly-spending', '0 0 1 * *', 'SELECT reset_monthly_spending();');

-- 10. Update all existing customers' monthly spending to 0 to start fresh
UPDATE customer_profiles
SET current_month_spending = 0,
    last_spending_reset_date = CURRENT_DATE
WHERE current_month_spending IS NULL;

COMMENT ON COLUMN customer_profiles.current_month_spending IS
  'Total spending in the current calendar month. Resets to 0 at the start of each month.';

COMMENT ON COLUMN customer_profiles.last_spending_reset_date IS
  'Date when monthly spending was last reset. Used to track monthly cycles.';

COMMENT ON FUNCTION reset_monthly_spending() IS
  'Resets all customers monthly spending to 0. Should be run at the start of each month via cron job.';

-- 11. Create a view to easily see customer tier eligibility
CREATE OR REPLACE VIEW customer_tier_status AS
SELECT
  cp.id,
  cp.user_id,
  cp.customer_type,
  cp.current_month_spending,
  cp.lifetime_spending,
  cp.total_orders_count,
  cp.last_spending_reset_date,

  -- Current tier info
  ct_current.tier_name AS current_tier_name,
  ct_current.tier_level AS current_tier_level,
  ct_current.discount_percentage AS current_discount,
  ct_current.points_multiplier AS current_points_multiplier,

  -- Next tier info (if any)
  ct_next.tier_name AS next_tier_name,
  ct_next.tier_level AS next_tier_level,
  ct_next.min_monthly_spending AS next_tier_monthly_requirement,

  -- How much more they need to spend this month to reach next tier
  GREATEST(0, COALESCE(ct_next.min_monthly_spending, 0) - cp.current_month_spending) AS amount_needed_for_next_tier,

  -- Tier achievement date
  cp.tier_achieved_at

FROM customer_profiles cp
LEFT JOIN customer_tiers ct_current ON cp.tier_id = ct_current.id
LEFT JOIN LATERAL (
  SELECT *
  FROM customer_tiers ct
  WHERE ct.is_active = true
    AND ct.tier_level < COALESCE(ct_current.tier_level, 999)
    AND ct.min_monthly_spending > cp.current_month_spending
  ORDER BY ct.tier_level DESC
  LIMIT 1
) ct_next ON true
WHERE cp.customer_type = 'customer';

GRANT SELECT ON customer_tier_status TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Customer Tiers Monthly Update Completed!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Added current_month_spending column';
  RAISE NOTICE '2. Changed to monthly spending requirements';
  RAISE NOTICE '3. Removed order count requirements';
  RAISE NOTICE '4. Created monthly reset function';
  RAISE NOTICE '5. Updated tier upgrade logic';
  RAISE NOTICE '6. Created customer_tier_status view';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Set up a cron job to run reset_monthly_spending() on the 1st of each month!';
  RAISE NOTICE '===========================================';
END $$;
