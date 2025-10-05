-- Diagnostic queries to check customer data visibility

-- 1. Check if data exists in customer_profiles
SELECT 'Records in customer_profiles:' as check_type, COUNT(*) as count
FROM customer_profiles;

-- 2. Check if data exists in customer_list view
SELECT 'Records in customer_list view:' as check_type, COUNT(*) as count
FROM customer_list;

-- 3. Sample data from customer_profiles
SELECT 'Sample from customer_profiles:' as info;
SELECT id, full_name, phone, email, customer_type, is_active, created_at, updated_at
FROM customer_profiles
LIMIT 3;

-- 4. Sample data from customer_list view
SELECT 'Sample from customer_list view:' as info;
SELECT id, full_name, phone, email, customer_type, is_active, created_at, updated_at
FROM customer_list
LIMIT 3;

-- 5. Check RLS policies on customer_profiles
SELECT 'RLS policies on customer_profiles:' as info;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'customer_profiles';

-- 6. Check current user and role
SELECT 'Current user info:' as info, current_user, current_setting('role');

-- 7. Test if authenticated role can see data
SET ROLE authenticated;
SELECT 'As authenticated - Records visible:' as test, COUNT(*) as count
FROM customer_profiles;

-- Reset role
RESET ROLE;

-- 8. Try inserting more test data to ensure table works
INSERT INTO customer_profiles (full_name, phone, email, customer_type, is_active)
VALUES
    ('Admin Test User', '+60123456789', 'admin@test.com', 'normal', true),
    ('Merchant Test User', '+60987654321', 'merchant@test.com', 'merchant', true)
ON CONFLICT DO NOTHING;

-- 9. Final count check
SELECT 'Final count check:' as info, COUNT(*) as total_records
FROM customer_profiles;

-- 10. Check if table has any constraints or triggers that might cause issues
SELECT 'Table constraints:' as info;
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'customer_profiles'::regclass;