-- =====================================================
-- FIX EXPIRED SUBSCRIPTION
-- =====================================================
-- This extends the subscription_end_date to make the partnership visible again

-- Update the expired partnership to extend subscription for 1 year
UPDATE premium_partnerships
SET
  subscription_end_date = NOW() + INTERVAL '1 year',
  next_billing_date = NOW() + INTERVAL '1 month',
  updated_at = NOW()
WHERE subscription_status = 'ACTIVE'
  AND admin_approved = true
  AND subscription_end_date < NOW(); -- Only update expired ones

-- Show the updated record
SELECT
  id,
  business_name,
  subscription_status,
  admin_approved,
  subscription_start_date,
  subscription_end_date,
  next_billing_date
FROM premium_partnerships
WHERE subscription_status = 'ACTIVE';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Subscription dates updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'The partnership should now appear on the Find Shops page.';
END $$;
