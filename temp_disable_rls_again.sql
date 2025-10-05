-- Temporarily disable RLS again for development
ALTER TABLE customer_profiles DISABLE ROW LEVEL SECURITY;

-- Verify it's working
SELECT 'RLS disabled - customer count:' as info, COUNT(*) as total
FROM customer_profiles;

-- Note: You can re-enable later with proper admin authentication setup