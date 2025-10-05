-- ============================================
-- FIND RECENT CUSTOMERS AND MERCHANT DATA
-- This will help identify the customer who just registered
-- ============================================

-- Find all customers created in the last 24 hours
SELECT
    '=== RECENT CUSTOMERS (Last 24 hours) ===' as info,
    id as customer_id,
    user_id,
    username,
    full_name,
    phone,
    email,
    customer_type,
    created_at,
    updated_at
FROM customer_profiles
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check if merchant_codes table exists and show codes
SELECT
    '=== AVAILABLE MERCHANT CODES ===' as info,
    id as code_id,
    code,
    description,
    is_active,
    current_uses,
    max_uses
FROM merchant_codes
WHERE is_active = true;

-- Check all merchant registrations
SELECT
    '=== ALL MERCHANT REGISTRATIONS ===' as info,
    mr.id as registration_id,
    mr.customer_id,
    mr.code_id,
    mr.company_name,
    mr.business_type,
    mr.status,
    mr.created_at,
    cp.username,
    cp.full_name,
    cp.phone
FROM merchant_registrations mr
LEFT JOIN customer_profiles cp ON cp.id = mr.customer_id
ORDER BY mr.created_at DESC;

-- Find customers WITHOUT merchant registrations (orphaned)
SELECT
    '=== CUSTOMERS WITHOUT MERCHANT REGISTRATION (Potential Orphans) ===' as info,
    cp.id as customer_id,
    cp.user_id,
    cp.username,
    cp.full_name,
    cp.phone,
    cp.customer_type,
    cp.created_at
FROM customer_profiles cp
LEFT JOIN merchant_registrations mr ON mr.customer_id = cp.id
WHERE mr.id IS NULL
  AND cp.created_at > NOW() - INTERVAL '7 days'
ORDER BY cp.created_at DESC;
