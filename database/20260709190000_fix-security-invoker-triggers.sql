-- The RLS lockdown broke system trigger functions that write to now-RLS-protected
-- tables while running as SECURITY INVOKER — e.g. completing an order fired the
-- customer-tier chain which inserts into tier_upgrade_history and was blocked
-- ("new row violates row-level security policy for table tier_upgrade_history").
-- These are system side-effects that must run regardless of the acting user's
-- RLS, so make them SECURITY DEFINER (they run as the table owner and bypass RLS).

create or replace function public.check_and_upgrade_customer_tier()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $function$
DECLARE
  eligible_tier RECORD;
  current_tier_level INTEGER;
BEGIN
  IF NEW.last_spending_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    NEW.current_month_spending := 0;
    NEW.last_spending_reset_date := CURRENT_DATE;
  END IF;

  SELECT tier_level INTO current_tier_level FROM customer_tiers WHERE id = NEW.tier_id;

  SELECT * INTO eligible_tier
  FROM customer_tiers
  WHERE is_active = true
    AND NEW.current_month_spending >= min_monthly_spending
    AND tier_level < COALESCE(current_tier_level, 999)
  ORDER BY tier_level ASC
  LIMIT 1;

  IF eligible_tier.id IS NOT NULL AND (NEW.tier_id IS NULL OR eligible_tier.id != NEW.tier_id) THEN
    INSERT INTO tier_upgrade_history (customer_id, previous_tier_id, new_tier_id, triggered_by)
    VALUES (NEW.id, NEW.tier_id, eligible_tier.id, 'auto');
    NEW.tier_id := eligible_tier.id;
    NEW.tier_achieved_at := NOW();
  END IF;

  RETURN NEW;
END;
$function$;

alter function public.update_customer_monthly_spending() security definer set search_path = public, pg_temp;
alter function public.update_order_totals()             security definer set search_path = public, pg_temp;
alter function public.update_return_refund_amount()     security definer set search_path = public, pg_temp;
alter function public.log_partnership_renewal()         security definer set search_path = public, pg_temp;
alter function public.increment_guide_views()           security definer set search_path = public, pg_temp;
alter function public.update_guide_likes()              security definer set search_path = public, pg_temp;
