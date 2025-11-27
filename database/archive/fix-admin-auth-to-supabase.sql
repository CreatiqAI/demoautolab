-- ========================================
-- FIX ADMIN AUTHENTICATION TO USE SUPABASE AUTH
-- ========================================
-- This migrates admin authentication from localStorage to Supabase Auth
-- Run this in Supabase SQL Editor

-- Step 1: Verify profiles table has role column
SELECT 'Checking profiles table structure' as step;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public';

-- Step 2: Check existing admins in profiles table
SELECT 'Current admin users in profiles' as info,
       COUNT(*) as count
FROM profiles
WHERE role IN ('admin', 'staff');

-- If no admins exist, let's create a default admin account
-- IMPORTANT: Change these credentials after first login!
DO $$
DECLARE
  v_admin_count INTEGER;
  v_user_id UUID;
BEGIN
  -- Check if any admin users exist
  SELECT COUNT(*) INTO v_admin_count
  FROM profiles
  WHERE role IN ('admin', 'staff');

  IF v_admin_count = 0 THEN
    RAISE NOTICE 'No admin users found. You need to create an admin user manually.';
    RAISE NOTICE 'Use the admin registration page at /admin-register or /create-first-admin';
  ELSE
    RAISE NOTICE 'Found % admin user(s)', v_admin_count;
  END IF;
END $$;

-- Step 3: Update product_reviews RLS policies to work with Supabase Auth
-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all to view reviews" ON product_reviews;
DROP POLICY IF EXISTS "Allow all to insert reviews" ON product_reviews;
DROP POLICY IF EXISTS "Allow all to update reviews" ON product_reviews;
DROP POLICY IF EXISTS "Allow all to delete reviews" ON product_reviews;

-- Create new role-based policies

-- Anyone can view approved reviews, admins/staff can view all
CREATE POLICY "View reviews based on status and role"
  ON product_reviews FOR SELECT
  USING (
    status = 'approved'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Anyone can submit reviews (will be pending)
CREATE POLICY "Anyone can submit reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (true);

-- Only admins and staff can update reviews
CREATE POLICY "Admins and staff can update reviews"
  ON product_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Only admins and staff can delete reviews
CREATE POLICY "Admins and staff can delete reviews"
  ON product_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Step 4: Update review_helpful_votes policies (keep permissive)
DROP POLICY IF EXISTS "Allow all to view helpful votes" ON review_helpful_votes;
DROP POLICY IF EXISTS "Allow all to insert helpful votes" ON review_helpful_votes;

CREATE POLICY "Anyone can view helpful votes"
  ON review_helpful_votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit helpful votes"
  ON review_helpful_votes FOR INSERT
  WITH CHECK (true);

-- Step 5: Verify the policies
SELECT
  'Review RLS Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'product_reviews'
ORDER BY policyname;

-- Step 6: Test the admin check function
-- This shows what happens when you try to view reviews as different roles
SELECT
  'Testing admin access check' as test,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    ) THEN 'You are an admin/staff - can view all reviews'
    ELSE 'You are not admin/staff - can only view approved reviews'
  END as result;

-- ========================================
-- INSTRUCTIONS FOR COMPLETING THE FIX
-- ========================================

/*
1. Run this SQL script

2. Update Auth.tsx to use Supabase Auth for admin login
   (I'll provide the updated code)

3. Update ProtectedAdminRoute.tsx to remove localStorage fallback
   (I'll provide the updated code)

4. Create or verify admin user exists:

   a) If you don't have an admin user yet:
      - Go to /admin-register or /create-first-admin
      - OR manually create one in Supabase Dashboard:

        -- First create the auth user
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          created_at,
          updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          'admin@yoursite.com',
          crypt('YourSecurePassword123!', gen_salt('bf')),
          now(),
          now(),
          now()
        )
        RETURNING id;

        -- Then create the profile (use the ID from above)
        INSERT INTO profiles (
          id,
          full_name,
          phone_e164,
          role
        ) VALUES (
          'USER_ID_FROM_ABOVE',
          'Admin User',
          '+60123456789',
          'admin'
        );

5. Login via Supabase Auth (email/password or phone/password)

6. Test review moderation at /admin/review-moderation
*/

SELECT '✅ Database policies have been updated! Now update the frontend code.' as final_message;
