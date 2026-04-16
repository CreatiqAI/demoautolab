-- ============================================================================
-- FIX ALL TABLES RLS POLICIES - Resolves 406 "Not Acceptable" Errors
-- ============================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes car_makes, car_models, customer_profiles, and user_sessions
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX CAR_MAKES TABLE
-- ============================================================================

-- Check if car_makes exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_makes') THEN
    RAISE NOTICE 'car_makes table does not exist - please run car-makes-models.sql first';
  ELSE
    RAISE NOTICE 'car_makes table exists';
  END IF;
END $$;

-- Enable RLS on car_makes
ALTER TABLE car_makes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on car_makes
DROP POLICY IF EXISTS "Anyone can view car makes" ON car_makes;
DROP POLICY IF EXISTS "Public read access" ON car_makes;
DROP POLICY IF EXISTS "car_makes_select" ON car_makes;

-- Create public read policy for car_makes
CREATE POLICY "Anyone can view car makes" ON car_makes
  FOR SELECT
  USING (true);

-- Grant permissions on car_makes
GRANT SELECT ON car_makes TO anon;
GRANT SELECT ON car_makes TO authenticated;

-- ============================================================================
-- STEP 2: FIX CAR_MODELS TABLE
-- ============================================================================

-- Check if car_models exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_models') THEN
    RAISE NOTICE 'car_models table does not exist - please run car-makes-models.sql first';
  ELSE
    RAISE NOTICE 'car_models table exists';
  END IF;
END $$;

-- Enable RLS on car_models
ALTER TABLE car_models ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on car_models
DROP POLICY IF EXISTS "Anyone can view car models" ON car_models;
DROP POLICY IF EXISTS "Public read access" ON car_models;
DROP POLICY IF EXISTS "car_models_select" ON car_models;

-- Create public read policy for car_models
CREATE POLICY "Anyone can view car models" ON car_models
  FOR SELECT
  USING (true);

-- Grant permissions on car_models
GRANT SELECT ON car_models TO anon;
GRANT SELECT ON car_models TO authenticated;

-- ============================================================================
-- STEP 3: FIX CUSTOMER_PROFILES TABLE
-- ============================================================================

-- Enable RLS on customer_profiles
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON customer_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customer_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_select" ON customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_insert" ON customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_update" ON customer_profiles;

-- Create comprehensive policies for customer_profiles
-- SELECT: Users can view their own profile
CREATE POLICY "Users can view own profile" ON customer_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can create their own profile
CREATE POLICY "Users can create own profile" ON customer_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile" ON customer_profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant permissions on customer_profiles
GRANT ALL ON customer_profiles TO authenticated;
GRANT SELECT ON customer_profiles TO anon;

-- Make sure required columns are nullable for OAuth users
ALTER TABLE customer_profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE customer_profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE customer_profiles ALTER COLUMN username DROP NOT NULL;
ALTER TABLE customer_profiles ALTER COLUMN full_name DROP NOT NULL;

-- Set defaults
ALTER TABLE customer_profiles ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE customer_profiles ALTER COLUMN email SET DEFAULT '';
ALTER TABLE customer_profiles ALTER COLUMN customer_type SET DEFAULT 'normal';

-- ============================================================================
-- STEP 4: FIX USER_SESSIONS TABLE
-- ============================================================================

-- Check if user_sessions exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') THEN
    RAISE NOTICE 'user_sessions table does not exist - creating it now';

    -- Create user_sessions table
    CREATE TABLE user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      device_fingerprint TEXT NOT NULL,
      device_info JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_activity_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
    CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active);
    CREATE INDEX idx_user_sessions_fingerprint ON user_sessions(device_fingerprint);
  ELSE
    RAISE NOTICE 'user_sessions table exists';
  END IF;
END $$;

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_select" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_update" ON user_sessions;

-- Create policies for user_sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions" ON user_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions" ON user_sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON user_sessions TO authenticated;

-- ============================================================================
-- STEP 5: VERIFY EVERYTHING
-- ============================================================================

-- Check tables exist
SELECT 'Tables check:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('car_makes', 'car_models', 'customer_profiles', 'user_sessions')
ORDER BY table_name;

-- Check RLS is enabled
SELECT 'RLS Status:' as info;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('car_makes', 'car_models', 'customer_profiles', 'user_sessions');

-- Check policies
SELECT 'Policies check:' as info;
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('car_makes', 'car_models', 'customer_profiles', 'user_sessions')
ORDER BY tablename, policyname;

-- Check grants
SELECT 'Grants check:' as info;
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('car_makes', 'car_models', 'customer_profiles', 'user_sessions')
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- ============================================================================
-- STEP 6: REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================
-- This is CRITICAL! PostgREST caches the schema and may not see new tables/policies
-- without this refresh.

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- DONE! Now try the Google login flow again.
-- The 406 errors should be resolved.
--
-- If you still get 406 errors:
-- 1. Check that tables exist in the "public" schema (not a different schema)
-- 2. Go to Supabase Dashboard > Settings > API > Reload Schema
-- 3. Wait 30 seconds and try again
-- ============================================================================
