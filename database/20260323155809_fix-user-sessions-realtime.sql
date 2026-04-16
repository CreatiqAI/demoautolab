-- ============================================================================
-- Fix: Enable Realtime for user_sessions table
-- Required for single-device login enforcement to work
-- ============================================================================

-- 1. Enable Realtime publication so clients receive UPDATE events
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;

-- 2. Set REPLICA IDENTITY to FULL so Realtime sends complete row data on UPDATE
-- (Without this, UPDATE events may not include the is_active column change)
ALTER TABLE user_sessions REPLICA IDENTITY FULL;

-- 3. Verify the trigger exists (should already be in place from user-registration-enhancements.sql)
-- This trigger auto-deactivates all other sessions when a new one is inserted
SELECT tgname, tgrelid::regclass, tgtype
FROM pg_trigger
WHERE tgname = 'trigger_invalidate_other_sessions';

-- 4. Verify RLS policies exist
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'user_sessions';
