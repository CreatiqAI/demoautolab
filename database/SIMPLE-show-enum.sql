-- Simple query to show enum values
-- Copy and paste JUST THIS ONE into Supabase SQL Editor

SELECT enumlabel FROM pg_enum WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'order_status_enum'
) ORDER BY enumsortorder;
