-- Re-enable RLS and create proper admin access policy
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all customer profiles" ON customer_profiles;
DROP POLICY IF EXISTS "Admin users can view all customer profiles" ON customer_profiles;
DROP POLICY IF EXISTS "Users can view own customer profile" ON customer_profiles;
DROP POLICY IF EXISTS "Public can view customer profiles" ON customer_profiles;

-- Create a secure admin policy that checks if user is in admin_profiles table
CREATE POLICY "Admin users can view all customer profiles"
ON customer_profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_profiles
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

-- Recreate the user policy to allow users to view their own profiles
CREATE POLICY "Users can view own customer profile"
ON customer_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Check current policies
SELECT 'Current RLS policies after update:' as info;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'customer_profiles'
ORDER BY policyname;

-- Test data access
SELECT 'Customer profiles count:' as test, COUNT(*) as total
FROM customer_profiles;

-- Show sample data structure
SELECT 'Sample customer data:' as info;
SELECT id, full_name, phone, email, customer_type, is_active
FROM customer_profiles
LIMIT 2;