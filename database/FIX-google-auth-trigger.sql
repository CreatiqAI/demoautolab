-- ============================================================================
-- FIX GOOGLE AUTH - HANDLE NEW USER PROFILE CREATION
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Drop any problematic triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_create_profile ON auth.users;

-- STEP 2: Check what columns exist (run this first to see your table structure)
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'customer_profiles' AND table_schema = 'public';

-- STEP 3: Make columns nullable for Google OAuth users
-- Only run the ones that exist in your table

-- Make phone nullable (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'phone') THEN
    ALTER TABLE customer_profiles ALTER COLUMN phone DROP NOT NULL;
    ALTER TABLE customer_profiles ALTER COLUMN phone SET DEFAULT '';
  END IF;
END $$;

-- Make phone_e164 nullable (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'phone_e164') THEN
    ALTER TABLE customer_profiles ALTER COLUMN phone_e164 DROP NOT NULL;
    ALTER TABLE customer_profiles ALTER COLUMN phone_e164 SET DEFAULT '';
  END IF;
END $$;

-- Make email nullable (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'email') THEN
    ALTER TABLE customer_profiles ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE customer_profiles ALTER COLUMN email SET DEFAULT '';
  END IF;
END $$;

-- Make username nullable (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'username') THEN
    ALTER TABLE customer_profiles ALTER COLUMN username DROP NOT NULL;
  END IF;
END $$;

-- STEP 4: Update RLS policies
DROP POLICY IF EXISTS "Users can create own profile" ON customer_profiles;
CREATE POLICY "Users can create own profile" ON customer_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON customer_profiles;
CREATE POLICY "Users can update own profile" ON customer_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

-- STEP 5: Verify - show current triggers on auth.users
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- DONE! Now try Google login again.
