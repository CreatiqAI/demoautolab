-- Check the actual customer profiles that have merchant registrations
SELECT
    cp.id,
    cp.user_id,
    cp.username,
    cp.full_name,
    cp.phone,
    cp.email,
    cp.customer_type,
    cp.created_at
FROM customer_profiles cp
WHERE cp.id IN (
    '74fa5e0d-b819-4a18-97e0-388c54e0eced',
    '44fa2b2d-d92e-4827-943c-ca73b9a10358'
);

-- Check if username column exists in customer_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customer_profiles'
  AND column_name = 'username';
