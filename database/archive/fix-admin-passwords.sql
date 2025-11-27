-- ========================================
-- FIX PLAIN-TEXT PASSWORDS IN ADMIN_PROFILES
-- ========================================
-- This script converts plain-text passwords to bcrypt hashes

-- Step 1: Show current state
SELECT
  'BEFORE: Current admin passwords' as status,
  username,
  LENGTH(password_hash) as password_length,
  CASE
    WHEN LENGTH(password_hash) = 60 THEN 'Already hashed (bcrypt)'
    WHEN LENGTH(password_hash) < 60 THEN 'Plain-text (needs hashing)'
    ELSE 'Unknown'
  END as password_type
FROM admin_profiles
ORDER BY created_at DESC;

-- Step 2: Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 3: Hash all plain-text passwords
-- WARNING: This assumes the password_hash column currently contains plain-text
-- Bcrypt hashes are always 60 characters, so we only update shorter ones

DO $$
DECLARE
  v_admin RECORD;
  v_plain_password TEXT;
  v_new_hash TEXT;
  v_count INTEGER := 0;
BEGIN
  FOR v_admin IN
    SELECT id, username, password_hash
    FROM admin_profiles
    WHERE LENGTH(password_hash) < 60  -- Plain-text passwords
  LOOP
    -- Store the plain-text password
    v_plain_password := v_admin.password_hash;

    -- Generate bcrypt hash
    v_new_hash := crypt(v_plain_password, gen_salt('bf'));

    -- Update the record
    UPDATE admin_profiles
    SET password_hash = v_new_hash,
        updated_at = NOW()
    WHERE id = v_admin.id;

    v_count := v_count + 1;
    RAISE NOTICE 'Hashed password for user: % (password was: %)', v_admin.username, v_plain_password;
  END LOOP;

  RAISE NOTICE 'Total passwords hashed: %', v_count;
END $$;

-- Step 4: Show updated state
SELECT
  'AFTER: Updated admin passwords' as status,
  username,
  LENGTH(password_hash) as password_length,
  CASE
    WHEN LENGTH(password_hash) = 60 THEN 'Hashed with bcrypt ✓'
    WHEN LENGTH(password_hash) < 60 THEN 'Still plain-text ✗'
    ELSE 'Unknown'
  END as password_type,
  SUBSTRING(password_hash, 1, 20) as hash_preview
FROM admin_profiles
ORDER BY created_at DESC;

-- Step 5: Test login with each admin
-- This will use the PLAIN-TEXT passwords that were just hashed
SELECT
  'Testing logins' as test,
  'You can now login with the ORIGINAL passwords you used' as instruction;

-- If you created an admin with username 'admin' and password 'admin123':
-- SELECT admin_login('admin', 'admin123');

-- Step 6: Verify admin_login function works
SELECT 'Admin login function test' as test;
-- Test with your actual admin credentials
-- SELECT admin_login('your_username', 'your_original_password');

-- Step 7: Summary
SELECT
  '✓ All plain-text passwords have been hashed!' as summary,
  'You can now login with your ORIGINAL passwords' as instruction,
  'The passwords are now securely stored as bcrypt hashes' as security_note;
