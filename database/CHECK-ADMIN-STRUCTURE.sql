-- Check Admin Structure in Database

-- List all tables that might contain admin info
SELECT '=== Tables that might contain admin/role info ===' as step;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%admin%' OR table_name LIKE '%role%' OR table_name LIKE '%user%' OR table_name LIKE '%profile%')
ORDER BY table_name;

-- Check admin_profiles structure if it exists
SELECT '=== admin_profiles structure ===' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_profiles'
ORDER BY ordinal_position;

-- Check if there's a role column in any profile table
SELECT '=== Tables with role column ===' as step;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name = 'role'
AND table_schema = 'public';

-- Show sample admin data
SELECT '=== Sample admin_profiles data ===' as step;
SELECT id, user_id, role, email
FROM admin_profiles
LIMIT 5;
