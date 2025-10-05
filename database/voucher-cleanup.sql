-- =====================================================
-- VOUCHER SYSTEM - Clean Up (Remove All Vouchers)
-- =====================================================
-- Use this if you want to start fresh or remove test data

-- Option 1: Delete only the sample vouchers
DELETE FROM vouchers
WHERE code IN ('WELCOME10', 'SAVE50', 'MERCHANT20');

-- Option 2: Delete ALL vouchers (uncomment to use)
-- DELETE FROM voucher_usage;  -- Clear usage first
-- DELETE FROM vouchers;       -- Then clear vouchers

-- Show remaining vouchers
SELECT
  code,
  name,
  is_active,
  customer_type_restriction,
  current_usage_count,
  max_usage_total
FROM vouchers
ORDER BY created_at DESC;
