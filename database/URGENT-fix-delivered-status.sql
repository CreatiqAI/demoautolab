-- URGENT FIX: Add DELIVERED to order_status_enum
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click RUN

-- This will add DELIVERED to the order_status_enum type
-- The error you're seeing is because this value is missing

DO $$
BEGIN
    -- Try to add DELIVERED to order_status_enum
    BEGIN
        ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'DELIVERED';
        RAISE NOTICE 'Successfully added DELIVERED to order_status_enum';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'DELIVERED already exists in order_status_enum';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error adding DELIVERED: %', SQLERRM;
    END;

    -- Also try adding to public.order_status
    BEGIN
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'DELIVERED';
        RAISE NOTICE 'Successfully added DELIVERED to public.order_status';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'DELIVERED already exists in public.order_status';
        WHEN undefined_object THEN
            RAISE NOTICE 'public.order_status type does not exist, skipping';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error adding DELIVERED to public.order_status: %', SQLERRM;
    END;
END $$;

-- Verify what values exist now
SELECT 'Current values in order_status_enum:' as info;
SELECT e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'order_status_enum'
ORDER BY e.enumsortorder;

-- Show what type the orders.status column uses
SELECT
    'orders.status column uses type:' as info,
    udt_name
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
