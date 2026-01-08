-- Check Vouchers Table Structure - Especially customer_type_restriction

SELECT '=== Voucher table column defaults ===' as step;
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vouchers'
AND table_schema = 'public'
AND column_name IN ('customer_type_restriction', 'max_usage_total', 'current_usage_count')
ORDER BY ordinal_position;

SELECT '=== Check recently created vouchers from points redemption ===' as step;
SELECT
  id,
  code,
  name,
  customer_type_restriction,
  specific_customer_ids,
  is_active,
  valid_from,
  valid_until,
  admin_notes
FROM vouchers
WHERE admin_notes = 'Generated from points redemption'
ORDER BY created_at DESC
LIMIT 5;
