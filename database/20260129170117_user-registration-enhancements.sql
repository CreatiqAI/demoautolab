-- ============================================================================
-- USER REGISTRATION ENHANCEMENTS
-- Purpose: Add new fields to customer_profiles and create user_sessions table
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW FIELDS TO CUSTOMER_PROFILES
-- ============================================================================

-- Add date of birth field
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add car make and model references
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS car_make_id UUID REFERENCES car_makes(id);

ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS car_model_id UUID REFERENCES car_models(id);

-- Add comments
COMMENT ON COLUMN customer_profiles.date_of_birth IS 'User date of birth for promotions';
COMMENT ON COLUMN customer_profiles.car_make_id IS 'User primary vehicle brand';
COMMENT ON COLUMN customer_profiles.car_model_id IS 'User primary vehicle model';

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_customer_profiles_car_make
ON customer_profiles(car_make_id);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_car_model
ON customer_profiles(car_model_id);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_dob
ON customer_profiles(date_of_birth);

-- ============================================================================
-- 2. CREATE USER_SESSIONS TABLE FOR SINGLE DEVICE ENFORCEMENT
-- ============================================================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS user_sessions CASCADE;

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

-- Add comments
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for single-device enforcement';
COMMENT ON COLUMN user_sessions.device_fingerprint IS 'Unique identifier for the device/browser';
COMMENT ON COLUMN user_sessions.device_info IS 'Browser, OS, and other device metadata';
COMMENT ON COLUMN user_sessions.is_active IS 'Whether this session is currently active';

-- Create indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_fingerprint ON user_sessions(device_fingerprint);

-- Unique constraint: Only one active session per user
-- This prevents having multiple active sessions
CREATE UNIQUE INDEX idx_user_sessions_unique_active
ON user_sessions(user_id)
WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON user_sessions;
CREATE POLICY "Users can create own sessions" ON user_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own sessions
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
CREATE POLICY "Users can delete own sessions" ON user_sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON user_sessions TO authenticated;

-- ============================================================================
-- 3. CREATE FUNCTION TO INVALIDATE OLD SESSIONS
-- ============================================================================

-- Function to deactivate all other sessions when a new one is created
CREATE OR REPLACE FUNCTION invalidate_other_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Deactivate all other sessions for this user
  UPDATE user_sessions
  SET is_active = false,
      last_activity_at = NOW()
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to invalidate old sessions when new session is created
DROP TRIGGER IF EXISTS trigger_invalidate_other_sessions ON user_sessions;
CREATE TRIGGER trigger_invalidate_other_sessions
  AFTER INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_other_sessions();

-- ============================================================================
-- 4. ENABLE REALTIME FOR SESSION CHANGES
-- ============================================================================

-- Note: Run this in Supabase Dashboard if not auto-enabled
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

-- Verify customer_profiles columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_profiles'
  AND column_name IN ('date_of_birth', 'car_make_id', 'car_model_id');

-- Verify user_sessions table
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;
