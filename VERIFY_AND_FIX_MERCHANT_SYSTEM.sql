-- ============================================
-- VERIFY AND FIX MERCHANT SYSTEM
-- Run this to check if all tables/functions exist and fix issues
-- ============================================

-- Step 1: Check if merchant tables exist
DO $$
BEGIN
    RAISE NOTICE '=== CHECKING MERCHANT SYSTEM TABLES ===';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_codes') THEN
        RAISE NOTICE '✅ merchant_codes table exists';
    ELSE
        RAISE NOTICE '❌ merchant_codes table MISSING';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_registrations') THEN
        RAISE NOTICE '✅ merchant_registrations table exists';
    ELSE
        RAISE NOTICE '❌ merchant_registrations table MISSING';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_wallets') THEN
        RAISE NOTICE '✅ merchant_wallets table exists';
    ELSE
        RAISE NOTICE '❌ merchant_wallets table MISSING';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
        RAISE NOTICE '✅ wallet_transactions table exists';
    ELSE
        RAISE NOTICE '❌ wallet_transactions table MISSING';
    END IF;
END $$;

-- Step 2: Check if validate_merchant_code function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_merchant_code') THEN
        RAISE NOTICE '✅ validate_merchant_code() function exists';
    ELSE
        RAISE NOTICE '❌ validate_merchant_code() function MISSING';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_merchant_wallet') THEN
        RAISE NOTICE '✅ create_merchant_wallet() function exists';
    ELSE
        RAISE NOTICE '❌ create_merchant_wallet() function MISSING';
    END IF;
END $$;

-- Step 3: Check merchant codes
SELECT
    '=== MERCHANT CODES ===' as info,
    code,
    description,
    is_active,
    max_uses,
    current_uses
FROM merchant_codes;

-- Step 4: Check merchant registrations
SELECT
    '=== MERCHANT REGISTRATIONS ===' as info,
    id,
    customer_id,
    company_name,
    status,
    created_at
FROM merchant_registrations
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Check customer profiles for recently created merchants
SELECT
    '=== RECENT CUSTOMER PROFILES ===' as info,
    id,
    user_id,
    username,
    full_name,
    phone,
    customer_type,
    created_at
FROM customer_profiles
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- FIX: Add merchant columns to customer_profiles if missing
-- ============================================

DO $$
BEGIN
    -- Add merchant tier column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_profiles' AND column_name = 'merchant_tier'
    ) THEN
        ALTER TABLE public.customer_profiles ADD COLUMN merchant_tier TEXT DEFAULT 'BRONZE';
        RAISE NOTICE '✅ Added merchant_tier column to customer_profiles';
    END IF;

    -- Add pricing_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_profiles' AND column_name = 'pricing_type'
    ) THEN
        ALTER TABLE public.customer_profiles ADD COLUMN pricing_type TEXT DEFAULT 'retail';
        RAISE NOTICE '✅ Added pricing_type column to customer_profiles';
    END IF;
END $$;

-- ============================================
-- DIAGNOSTIC: Find orphaned customer profile
-- ============================================

-- Find customers without merchant registrations who might have tried to register
SELECT
    '=== POTENTIAL ORPHANED MERCHANT REGISTRATIONS ===' as info,
    cp.id,
    cp.user_id,
    cp.username,
    cp.full_name,
    cp.phone,
    cp.customer_type,
    cp.created_at,
    CASE
        WHEN mr.id IS NULL THEN 'NO REGISTRATION FOUND'
        ELSE 'HAS REGISTRATION'
    END as registration_status
FROM customer_profiles cp
LEFT JOIN merchant_registrations mr ON mr.customer_id = cp.id
WHERE cp.created_at > NOW() - INTERVAL '1 day'
ORDER BY cp.created_at DESC;
