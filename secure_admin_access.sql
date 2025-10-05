-- Re-enable RLS and create proper admin access policy
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop the overly permissive policy if it exists
DROP POLICY IF EXISTS "Admins can view all customer profiles" ON customer_profiles;

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

-- Also allow users to view their own profiles (keep existing functionality)
CREATE POLICY "Users can view own customer profile"
ON customer_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Check current policies
SELECT 'Current RLS policies:' as info;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'customer_profiles';

-- Test admin access (you'll need to be logged in as admin for this to work)
SELECT 'Admin test - customer count:' as test, COUNT(*) as total
FROM customer_profiles;