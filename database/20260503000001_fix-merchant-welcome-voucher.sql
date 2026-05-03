-- ============================================================================
-- FIX: Merchant welcome voucher duplication + premature creation
-- ============================================================================
-- Bug 1 — Two duplicate "RM50 MERCHANT WELCOME VOUCHER" rows existed with
--   assigned_to_customer_id IS NULL and customer_type_restriction='MERCHANT'.
--   get_available_vouchers_for_customer matches MERCHANT-restricted vouchers
--   for every merchant customer, so every approved merchant saw both.
--
-- Bug 2 — User intent: welcome voucher should only appear AFTER admin
--   approval of the merchant registration. The previous trigger lived on
--   premium_partnerships (a separate feature) so it never fired on merchant
--   approval at all.
--
-- This migration:
--   1. Drops the misplaced premium_partnerships trigger
--   2. Repurposes orphan global vouchers — their codes already encode a
--      merchant customer_id (WELCOME-<8-chars>), so set assigned_to_customer_id
--      and specific_customer_ids to make them per-merchant. Any orphan with no
--      matching merchant gets deactivated (kept in DB to preserve FK refs from
--      orders).
--   3. Installs a new trigger on merchant_registrations that fires on
--      status flip to 'APPROVED' and creates ONE voucher per merchant,
--      properly assigned. ON CONFLICT DO NOTHING for idempotency.
--   4. Backfills welcome vouchers for any APPROVED merchants that don't
--      already have one.
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_merchant_welcome_voucher ON public.premium_partnerships;

UPDATE public.vouchers v
SET assigned_to_customer_id = mr.customer_id,
    specific_customer_ids = ARRAY[mr.customer_id]::UUID[],
    name = 'RM50 Merchant Welcome Voucher',
    description = 'Welcome voucher for newly approved merchant. RM50 off your purchase.'
FROM public.merchant_registrations mr
WHERE v.assigned_to_customer_id IS NULL
  AND v.customer_type_restriction = 'MERCHANT'
  AND v.code = 'WELCOME-' || UPPER(SUBSTRING(mr.customer_id::text, 1, 8))
  AND mr.status = 'APPROVED';

UPDATE public.vouchers
SET is_active = false,
    admin_notes = COALESCE(admin_notes, '') || E'\nDeactivated 2026-05-03: orphan global welcome voucher with no matching merchant.'
WHERE assigned_to_customer_id IS NULL
  AND customer_type_restriction = 'MERCHANT'
  AND (code LIKE 'WELCOME-%' OR code LIKE 'WELCOME50_%');

CREATE OR REPLACE FUNCTION public.create_merchant_welcome_voucher_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  voucher_code TEXT;
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vouchers
      WHERE assigned_to_customer_id = NEW.customer_id
        AND code LIKE 'WELCOME-%'
        AND is_active = true
    ) THEN
      voucher_code := 'WELCOME-' || UPPER(SUBSTRING(NEW.customer_id::text, 1, 8));

      INSERT INTO public.vouchers (
        code, name, description, discount_type, discount_value,
        min_purchase_amount, max_discount_amount, customer_type_restriction,
        assigned_to_customer_id, specific_customer_ids,
        max_usage_per_user, max_usage_total, current_usage_count,
        valid_from, valid_until, is_active
      ) VALUES (
        voucher_code,
        'RM50 Merchant Welcome Voucher',
        'Welcome voucher for newly approved merchant. RM50 off your purchase.',
        'FIXED_AMOUNT',
        50.00, 100.00, 50.00,
        'MERCHANT',
        NEW.customer_id,
        ARRAY[NEW.customer_id]::UUID[],
        1, 1, 0,
        NOW(), NOW() + INTERVAL '1 year', true
      )
      ON CONFLICT (code) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create welcome voucher for merchant %: %', NEW.customer_id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_merchant_welcome_voucher_on_approval
  ON public.merchant_registrations;
CREATE TRIGGER trigger_create_merchant_welcome_voucher_on_approval
  AFTER INSERT OR UPDATE OF status ON public.merchant_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_merchant_welcome_voucher_on_approval();

INSERT INTO public.vouchers (
  code, name, description, discount_type, discount_value,
  min_purchase_amount, max_discount_amount, customer_type_restriction,
  assigned_to_customer_id, specific_customer_ids,
  max_usage_per_user, max_usage_total, current_usage_count,
  valid_from, valid_until, is_active
)
SELECT DISTINCT
  'WELCOME-' || UPPER(SUBSTRING(mr.customer_id::text, 1, 8)),
  'RM50 Merchant Welcome Voucher',
  'Welcome voucher for newly approved merchant. RM50 off your purchase.',
  'FIXED_AMOUNT',
  50.00, 100.00, 50.00,
  'MERCHANT',
  mr.customer_id,
  ARRAY[mr.customer_id]::UUID[],
  1, 1, 0,
  NOW(), NOW() + INTERVAL '1 year', true
FROM public.merchant_registrations mr
WHERE mr.status = 'APPROVED'
  AND NOT EXISTS (
    SELECT 1 FROM public.vouchers v
    WHERE v.assigned_to_customer_id = mr.customer_id
      AND v.code LIKE 'WELCOME-%'
      AND v.is_active = true
  )
ON CONFLICT (code) DO NOTHING;
