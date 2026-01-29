-- ============================================================================
-- ENABLE REALTIME FOR USER_SESSIONS TABLE
-- Purpose: Allow real-time session invalidation for single-device enforcement
-- ============================================================================

-- ============================================================================
-- 1. ENABLE REALTIME ON THE TABLE
-- ============================================================================

-- Add user_sessions to the realtime publication
-- This enables Postgres to broadcast changes to connected clients

ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;

-- ============================================================================
-- 2. VERIFICATION
-- ============================================================================

-- Verify the table is in the publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'user_sessions';

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- After running this SQL, you also need to enable Realtime in the Supabase Dashboard:
--
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to: Database > Replication
-- 3. Under "Realtime" section, find "supabase_realtime" publication
-- 4. Ensure "user_sessions" table is checked/enabled
--
-- Alternatively, you can enable it via the Table Editor:
-- 1. Go to: Table Editor > user_sessions
-- 2. Click on the table settings (gear icon)
-- 3. Enable "Realtime" toggle
--
-- ============================================================================
