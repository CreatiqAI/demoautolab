-- Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS admin_login(text, text);

-- Create the admin_login RPC function that your auth system expects
CREATE OR REPLACE FUNCTION admin_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_record admin_profiles%ROWTYPE;
    result JSON;
BEGIN
    -- Find admin by username
    SELECT * INTO admin_record
    FROM admin_profiles
    WHERE username = p_username
    AND is_active = true;

    -- Check if admin exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid username or password'
        );
    END IF;

    -- For now, we'll do simple password comparison
    -- In production, you should use proper password hashing
    IF admin_record.password_hash = p_password OR admin_record.password_hash = crypt(p_password, admin_record.password_hash) THEN
        -- Update last login
        UPDATE admin_profiles
        SET last_login_at = NOW()
        WHERE id = admin_record.id;

        -- Return success with admin data
        RETURN json_build_object(
            'success', true,
            'message', 'Login successful',
            'admin', json_build_object(
                'id', admin_record.id,
                'username', admin_record.username,
                'full_name', admin_record.full_name,
                'role', admin_record.role,
                'email', admin_record.username || '@admin.local'  -- Fake email for compatibility
            )
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid username or password'
        );
    END IF;
END;
$$;

-- Create a test admin user if none exists
INSERT INTO admin_profiles (username, full_name, role, password_hash, is_active)
VALUES ('admin', 'System Administrator', 'admin', 'admin123', true)
ON CONFLICT (username) DO NOTHING;

-- Test the function
SELECT 'Testing admin login function:' as info;
SELECT admin_login('admin', 'admin123') as test_result;

-- Show existing admin users
SELECT 'Existing admin users:' as info;
SELECT id, username, full_name, role, is_active, created_at
FROM admin_profiles
ORDER BY created_at;