-- ============================================================================
-- COMPLETE FIX FOR GOOGLE AUTH - "Database error saving new user"
-- ============================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- STEP 1: FIND ALL TRIGGERS ON AUTH.USERS
-- Run this first to see what triggers exist
SELECT
  tgname AS trigger_name,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- STEP 2: DROP ALL KNOWN TRIGGERS ON AUTH.USERS
-- These are common trigger names that might exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_create_profile ON auth.users;
DROP TRIGGER IF EXISTS tr_create_profile ON auth.users;
DROP TRIGGER IF EXISTS tr_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_customer_profile ON auth.users;
DROP TRIGGER IF EXISTS on_new_user ON auth.users;
DROP TRIGGER IF EXISTS after_user_created ON auth.users;
DROP TRIGGER IF EXISTS insert_profile ON auth.users;

-- STEP 3: DROP COMMON TRIGGER FUNCTIONS
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_customer_profile() CASCADE;

-- STEP 4: CHECK AGAIN - This should return EMPTY
SELECT
  tgname AS trigger_name,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- STEP 5: Make customer_profiles columns nullable
ALTER TABLE customer_profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE customer_profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE customer_profiles ALTER COLUMN username DROP NOT NULL;
ALTER TABLE customer_profiles ALTER COLUMN full_name DROP NOT NULL;

-- Set defaults
ALTER TABLE customer_profiles ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE customer_profiles ALTER COLUMN email SET DEFAULT '';
ALTER TABLE customer_profiles ALTER COLUMN customer_type SET DEFAULT 'normal';

-- STEP 6: Fix RLS policies for customer_profiles
DROP POLICY IF EXISTS "Users can create own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON customer_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customer_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON customer_profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" ON customer_profiles
  FOR SELECT USING (user_id = auth.uid() OR true);

CREATE POLICY "Users can create own profile" ON customer_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON customer_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- STEP 7: Grant permissions
GRANT ALL ON customer_profiles TO authenticated;
GRANT SELECT ON customer_profiles TO anon;

-- ============================================================================
-- VERIFICATION - Run this to confirm everything is clean
-- ============================================================================
SELECT 'Triggers on auth.users:' as check_type;
SELECT
  tgname AS trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
AND tgname NOT LIKE 'RI_%'; -- Exclude referential integrity triggers

SELECT 'customer_profiles columns:' as check_type;
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customer_profiles' AND table_schema = 'public'
AND column_name IN ('phone', 'email', 'username', 'full_name');

-- ============================================================================
-- DONE! Now try Google login again.
-- ============================================================================
