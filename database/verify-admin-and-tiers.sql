-- Verify admin user and tiers exist

-- 1. Check if tiers exist in the database
SELECT
  id,
  tier_name,
  tier_level,
  min_monthly_spending,
  discount_percentage,
  points_multiplier,
  is_active
FROM customer_tiers
ORDER BY tier_level;

-- 2. Check your current user's customer_type (run this while logged in)
SELECT
  id,
  user_id,
  customer_type,
  email
FROM customer_profiles
WHERE user_id = auth.uid();

-- 3. Check all admin users
SELECT
  cp.id,
  cp.user_id,
  cp.customer_type,
  cp.email
FROM customer_profiles cp
WHERE cp.customer_type = 'admin';

-- 4. Test the RLS policy manually - this simulates what the SELECT query does
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "YOUR_USER_ID_HERE"}';

SELECT * FROM customer_tiers;

RESET ROLE;
