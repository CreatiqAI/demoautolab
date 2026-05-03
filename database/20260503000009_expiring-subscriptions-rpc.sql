-- ============================================================================
-- get_expiring_subscriptions RPC for n8n
-- ============================================================================
-- The n8n workflow polls this on a schedule (e.g. daily) to find merchants
-- whose subscription expires within `p_days_ahead` days, then sends WhatsApp
-- and email reminders. Two subscription types are returned:
--   - b2b   (RM99/year)   — from customer_profiles.subscription_end_date
--   - panel (RM350/month) — from premium_partnerships.subscription_end_date
--
-- Usage from n8n / SQL:
--   SELECT * FROM get_expiring_subscriptions(30);   -- expiring in <= 30 days
--   SELECT * FROM get_expiring_subscriptions(7);    -- last-week reminder
--   SELECT * FROM get_expiring_subscriptions(0);    -- already expired
--
-- Or via Supabase REST:
--   POST /rest/v1/rpc/get_expiring_subscriptions
--   { "p_days_ahead": 30 }
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_expiring_subscriptions(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  email TEXT,
  phone TEXT,
  subscription_type TEXT,
  subscription_end_date TIMESTAMPTZ,
  days_remaining INTEGER,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- B2B (yearly RM99)
  SELECT
    cp.id AS customer_id,
    cp.full_name AS customer_name,
    cp.email,
    cp.phone,
    'b2b'::TEXT AS subscription_type,
    cp.subscription_end_date,
    EXTRACT(DAY FROM (cp.subscription_end_date - NOW()))::INTEGER AS days_remaining,
    (cp.subscription_end_date < NOW()) AS is_expired
  FROM public.customer_profiles cp
  WHERE cp.customer_type = 'merchant'
    AND cp.is_active = true
    AND cp.subscription_end_date IS NOT NULL
    AND cp.subscription_end_date <= NOW() + (p_days_ahead || ' days')::INTERVAL

  UNION ALL

  -- Panel (monthly RM350)
  SELECT
    pp.merchant_id AS customer_id,
    cp.full_name AS customer_name,
    cp.email,
    cp.phone,
    'panel'::TEXT AS subscription_type,
    pp.subscription_end_date,
    EXTRACT(DAY FROM (pp.subscription_end_date - NOW()))::INTEGER AS days_remaining,
    (pp.subscription_end_date < NOW()) AS is_expired
  FROM public.premium_partnerships pp
  JOIN public.customer_profiles cp ON cp.id = pp.merchant_id
  WHERE pp.subscription_status = 'ACTIVE'
    AND pp.subscription_plan = 'panel'
    AND pp.subscription_end_date IS NOT NULL
    AND pp.subscription_end_date <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND cp.is_active = true

  ORDER BY subscription_end_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_expiring_subscriptions(INTEGER) TO authenticated, anon, service_role;
