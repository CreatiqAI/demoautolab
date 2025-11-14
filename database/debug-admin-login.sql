-- ========================================
-- DEBUG ADMIN LOGIN ISSUE
-- ========================================

-- Step 1: Check what admins exist
SELECT
  'Current Admin Accounts' as info,
  id,
  username,
  full_name,
  role,
  is_active,
  LENGTH(password_hash) as password_hash_length,
  SUBSTRING(password_hash, 1, 10) as password_hash_preview,
  created_at
FROM admin_profiles
ORDER BY created_at DESC;

-- Step 2: Test password hashing
SELECT
  'Test Password Hashing' as test,
  crypt('admin123', gen_salt('bf')) as hashed_password,
  LENGTH(crypt('admin123', gen_salt('bf'))) as hash_length;

-- Step 3: Create a test admin with known password
DELETE FROM admin_profiles WHERE username = 'testadmin';

INSERT INTO admin_profiles (username, password_hash, full_name, role, is_active)
VALUES (
  'testadmin',
  crypt('test123', gen_salt('bf')),
  'Test Admin',
  'admin',
  true
);

SELECT 'Created test admin: username=testadmin, password=test123' as result;

-- Step 4: Test password verification manually
DO $$
DECLARE
  v_stored_hash TEXT;
  v_password TEXT := 'test123';
  v_hash_result TEXT;
  v_matches BOOLEAN;
BEGIN
  -- Get the stored hash
  SELECT password_hash INTO v_stored_hash
  FROM admin_profiles
  WHERE username = 'testadmin';

  -- Hash the password with the stored hash (which contains the salt)
  v_hash_result := crypt(v_password, v_stored_hash);

  -- Compare
  v_matches := (v_hash_result = v_stored_hash);

  RAISE NOTICE 'Stored hash: %', v_stored_hash;
  RAISE NOTICE 'Hash result: %', v_hash_result;
  RAISE NOTICE 'Matches: %', v_matches;
END $$;

-- Step 5: Test the admin_login function
SELECT 'Testing admin_login with testadmin' as test;
SELECT admin_login('testadmin', 'test123');

SELECT 'Testing admin_login with wrong password' as test;
SELECT admin_login('testadmin', 'wrongpassword');

-- Step 6: Check if pgcrypto is properly installed
SELECT
  'Check pgcrypto extension' as check,
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pgcrypto';

-- Step 7: Recreate admin_login function with better error handling
CREATE OR REPLACE FUNCTION admin_login(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_admin RECORD;
  v_password_matches BOOLEAN;
  v_debug_hash TEXT;
BEGIN
  -- Find admin by username
  SELECT * INTO v_admin
  FROM admin_profiles
  WHERE username = p_username AND is_active = true;

  -- Check if admin exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password',
      'debug', 'User not found'
    );
  END IF;

  -- Check if password_hash is null
  IF v_admin.password_hash IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password',
      'debug', 'Password hash is null'
    );
  END IF;

  -- Verify password
  v_debug_hash := crypt(p_password, v_admin.password_hash);
  v_password_matches := (v_debug_hash = v_admin.password_hash);

  IF NOT v_password_matches THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid username or password',
      'debug', json_build_object(
        'stored_hash_length', LENGTH(v_admin.password_hash),
        'computed_hash_length', LENGTH(v_debug_hash),
        'hashes_match', v_password_matches
      )
    );
  END IF;

  -- Update last login time
  UPDATE admin_profiles
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE id = v_admin.id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'admin', json_build_object(
      'id', v_admin.id,
      'username', v_admin.username,
      'full_name', v_admin.full_name,
      'role', v_admin.role
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Test again with debug info
SELECT 'Testing with debug info' as test;
SELECT admin_login('testadmin', 'test123');
