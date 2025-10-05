-- Check your admin username match
SELECT
    'Your admin check' as info,
    cp.id as customer_profile_id,
    cp.username as customer_username,
    cp.user_id,
    ap.id as admin_profile_id,
    ap.username as admin_username,
    ap.is_active as admin_is_active,
    CASE
        WHEN ap.username IS NULL THEN 'NO MATCH - Admin profile not found'
        WHEN cp.username IS NULL THEN 'NO USERNAME - customer_profiles.username is NULL'
        WHEN cp.username = ap.username THEN 'MATCH - Should work'
        ELSE 'MISMATCH - Usernames do not match'
    END as status
FROM customer_profiles cp
LEFT JOIN admin_profiles ap ON ap.username = cp.username
WHERE cp.user_id = auth.uid();

-- Also check if customer_profiles has username column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_profiles'
AND column_name = 'username';

-- Check all admin profiles
SELECT
    'All admins' as info,
    id,
    username,
    is_active
FROM admin_profiles
WHERE is_active = true;
