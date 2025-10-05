-- Check what columns admin_profiles actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'admin_profiles'
ORDER BY ordinal_position;

-- Check what columns customer_profiles has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'customer_profiles'
ORDER BY ordinal_position;

-- Show your current admin and customer profile
SELECT
    'Your profiles' as info,
    cp.id as cp_id,
    cp.user_id,
    cp.username as cp_username,
    cp.full_name,
    cp.phone,
    cp.email,
    ap.id as ap_id,
    ap.username as ap_username
FROM customer_profiles cp
LEFT JOIN admin_profiles ap ON ap.username = cp.username
WHERE cp.user_id = auth.uid();
