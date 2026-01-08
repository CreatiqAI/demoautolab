-- Check Vouchers Table Structure

SELECT '=== Vouchers table columns ===' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vouchers'
AND table_schema = 'public'
ORDER BY ordinal_position;
