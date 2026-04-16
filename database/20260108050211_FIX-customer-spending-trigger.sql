-- Fix the customer spending trigger to use UPPERCASE status values
-- This trigger was causing the enum error during checkout

-- Drop and recreate the function with correct enum values
CREATE OR REPLACE FUNCTION update_customer_monthly_spending()
RETURNS TRIGGER AS $$
DECLARE
  customer_profile_id UUID;
  order_total DECIMAL(10,2);
BEGIN
  -- Only process when order is marked as completed or delivered
  -- FIXED: Changed to UPPERCASE to match the enum values
  IF NEW.status IN ('COMPLETED', 'DELIVERED') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('COMPLETED', 'DELIVERED')) THEN

    -- Get customer profile ID
    SELECT id INTO customer_profile_id
    FROM customer_profiles
    WHERE user_id = NEW.user_id;

    -- Calculate order total
    order_total := NEW.total;  -- Changed from total_amount to total

    IF customer_profile_id IS NOT NULL THEN
      -- Update both monthly and lifetime spending
      UPDATE customer_profiles
      SET
        current_month_spending = COALESCE(current_month_spending, 0) + order_total,
        lifetime_spending = COALESCE(lifetime_spending, 0) + order_total,
        total_orders_count = COALESCE(total_orders_count, 0) + 1
      WHERE id = customer_profile_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger is still active
SELECT
    'Trigger status:' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_monthly_spending'
AND event_object_table = 'orders';

SELECT 'Customer spending trigger has been fixed to use UPPERCASE status values!' as result;
