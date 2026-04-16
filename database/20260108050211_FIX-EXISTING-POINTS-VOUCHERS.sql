-- Fix Existing Vouchers from Points Redemption
-- Sets customer_type_restriction to 'ALL' so they appear in My Vouchers

UPDATE vouchers
SET customer_type_restriction = 'ALL'
WHERE admin_notes = 'Generated from points redemption'
  AND customer_type_restriction IS NULL;

SELECT '✅ Fixed existing vouchers from points redemption!' as result;
SELECT '📋 Updated vouchers:' as info;
SELECT
  id,
  code,
  name,
  customer_type_restriction,
  specific_customer_ids,
  valid_until
FROM vouchers
WHERE admin_notes = 'Generated from points redemption'
ORDER BY created_at DESC;
