-- FINAL FIX: Convert orders.status from ENUM to TEXT
-- This will allow any status value without enum constraints
-- Copy and paste this entire file into Supabase SQL Editor and RUN

-- First, show what we're starting with
SELECT 'BEFORE: Current status column type' as info;
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';

-- Convert the status column from enum to TEXT
ALTER TABLE orders
ALTER COLUMN status TYPE TEXT;

-- Show what we changed to
SELECT 'AFTER: New status column type' as info;
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';

-- Show current status values in the table
SELECT 'Current status values in orders:' as info;
SELECT DISTINCT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

SELECT 'SUCCESS: orders.status is now TEXT type and will accept any value!' as result;
