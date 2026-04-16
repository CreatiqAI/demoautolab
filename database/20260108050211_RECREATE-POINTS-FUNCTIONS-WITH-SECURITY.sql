-- Recreate Points RPC Functions with SECURITY DEFINER
-- This ensures the functions run with creator privileges and ignore RLS

-- Drop existing functions
DROP FUNCTION IF EXISTS get_customer_points_balance(UUID);
DROP FUNCTION IF EXISTS get_customer_lifetime_points(UUID);
DROP FUNCTION IF EXISTS get_customer_points_redeemed(UUID);

-- Function: Get customer's current points balance
CREATE OR REPLACE FUNCTION get_customer_points_balance(p_customer_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(points_amount), 0)::INTEGER
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get customer's lifetime points earned
CREATE OR REPLACE FUNCTION get_customer_lifetime_points(p_customer_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(points_amount), 0)::INTEGER
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND transaction_type = 'EARNED'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get customer's total points redeemed
CREATE OR REPLACE FUNCTION get_customer_points_redeemed(p_customer_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(ABS(SUM(points_amount)), 0)::INTEGER
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND transaction_type = 'REDEEMED'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_customer_points_balance(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_customer_lifetime_points(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_customer_points_redeemed(UUID) TO authenticated, anon;

-- Test with Ming Shun's ID
SELECT '=== Testing Fixed Functions ===' as step;
SELECT 'Balance:' as test, get_customer_points_balance('acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid) as result;
SELECT 'Lifetime:' as test, get_customer_lifetime_points('acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid) as result;
SELECT 'Redeemed:' as test, get_customer_points_redeemed('acc2ce9f-90b9-4974-a934-683e25dbc2d8'::uuid) as result;

SELECT '✅ Points RPC functions recreated with SECURITY DEFINER!' as result;
