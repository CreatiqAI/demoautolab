-- Fix the Points & Rewards trigger to use customer_profile_id instead of customer_id
-- This fixes the error: "record 'new' has no field 'customer_id'"

-- Drop and recreate the trigger function with the correct column name
DROP FUNCTION IF EXISTS award_points_on_order_success() CASCADE;

CREATE OR REPLACE FUNCTION award_points_on_order_success()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_points_to_award INTEGER;
BEGIN
  -- Only award points when order payment succeeds for the first time
  IF NEW.payment_state IN ('SUCCESS', 'APPROVED') AND
     (OLD.payment_state IS NULL OR OLD.payment_state NOT IN ('SUCCESS', 'APPROVED')) THEN

    -- Get customer_profile_id from order (FIXED: was customer_id)
    v_customer_id := NEW.customer_profile_id;

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

      RAISE NOTICE '✅ Awarded % points to customer % for order %', v_points_to_award, v_customer_id, NEW.order_no;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_award_points_on_order_success ON orders;

CREATE TRIGGER trigger_award_points_on_order_success
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_order_success();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION award_points_on_order_success() TO authenticated, anon;

SELECT '✅ Fixed points trigger to use customer_profile_id instead of customer_id!' as result;
