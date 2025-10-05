-- ============================================
-- FIX ORPHANED MERCHANT REGISTRATION
-- This creates merchant registration for customers who registered but have no application record
-- ============================================

-- First, let's find the customer and merchant code
DO $$
DECLARE
    v_customer_id UUID;
    v_code_id UUID;
    v_username TEXT := '12341234'; -- Change this to the actual username
BEGIN
    -- Find the customer profile
    SELECT id INTO v_customer_id
    FROM customer_profiles
    WHERE username = v_username;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer with username % not found', v_username;
    END IF;

    -- Find the MERCHANT2024 code
    SELECT id INTO v_code_id
    FROM merchant_codes
    WHERE code = 'MERCHANT2024';

    IF v_code_id IS NULL THEN
        RAISE EXCEPTION 'Merchant code MERCHANT2024 not found';
    END IF;

    -- Check if merchant registration already exists
    IF EXISTS (SELECT 1 FROM merchant_registrations WHERE customer_id = v_customer_id) THEN
        RAISE NOTICE 'Merchant registration already exists for this customer';
    ELSE
        -- Create merchant registration
        INSERT INTO merchant_registrations (
            customer_id,
            code_id,
            company_name,
            business_registration_no,
            tax_id,
            business_type,
            address,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_customer_id,
            v_code_id,
            'Test Company', -- You can update this later
            NULL,
            NULL,
            'Retailer',
            NULL,
            'PENDING',
            NOW(),
            NOW()
        );

        RAISE NOTICE '✅ Created merchant registration for customer: %', v_username;
    END IF;
END $$;

-- Verify the registration was created
SELECT
    'VERIFICATION' as status,
    mr.id,
    mr.company_name,
    mr.business_type,
    mr.status,
    mr.created_at,
    cp.username,
    cp.full_name,
    mc.code
FROM merchant_registrations mr
JOIN customer_profiles cp ON cp.id = mr.customer_id
JOIN merchant_codes mc ON mc.id = mr.code_id
WHERE cp.username = '12341234'; -- Change this to match your username
