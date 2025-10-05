-- Option 1: Add missing columns to customer_profiles table
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'retail',
ADD COLUMN IF NOT EXISTS auth_email TEXT,
ADD COLUMN IF NOT EXISTS auth_phone TEXT,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phone_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have created_at and registered_at if they don't
UPDATE customer_profiles
SET
    created_at = COALESCE(created_at, updated_at, NOW()),
    registered_at = COALESCE(registered_at, updated_at, NOW())
WHERE created_at IS NULL OR registered_at IS NULL;

-- Option 2: Create a view called customer_list that maps to customer_profiles
-- This will make the old code work without changing anything
CREATE OR REPLACE VIEW customer_list AS
SELECT
    id,
    user_id,
    full_name,
    phone,
    email,
    customer_type,
    COALESCE(pricing_type, 'retail') as pricing_type,
    date_of_birth,
    gender,
    address,
    preferences,
    is_active,
    COALESCE(created_at, updated_at, NOW()) as created_at,
    updated_at,
    auth_email,
    auth_phone,
    email_confirmed_at,
    phone_confirmed_at,
    COALESCE(registered_at, created_at, updated_at, NOW()) as registered_at,
    last_sign_in_at
FROM customer_profiles;

-- Grant permissions on the view (views inherit RLS from underlying tables)
GRANT SELECT ON customer_list TO authenticated;
GRANT SELECT ON customer_list TO anon;

-- Insert some test data if table is empty
INSERT INTO customer_profiles (full_name, phone, email, customer_type, is_active)
SELECT 'Test Customer ' || generate_series,
       '+601234567' || LPAD(generate_series::text, 2, '0'),
       'customer' || generate_series || '@test.com',
       CASE WHEN generate_series % 2 = 0 THEN 'merchant' ELSE 'normal' END,
       true
FROM generate_series(1, 5)
WHERE NOT EXISTS (SELECT 1 FROM customer_profiles LIMIT 1);

-- Verify the results
SELECT 'customer_profiles table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customer_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '';
SELECT 'customer_list view structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_list' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '';
SELECT 'Sample data from customer_list view:' as info;
SELECT id, full_name, phone, email, customer_type, is_active, created_at
FROM customer_list
ORDER BY created_at DESC
LIMIT 3;

SELECT '';
SELECT 'Total records in customer_list:' as info, COUNT(*) as total_records
FROM customer_list;