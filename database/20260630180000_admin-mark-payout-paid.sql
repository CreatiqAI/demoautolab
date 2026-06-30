-- ============================================================================
-- Admin: mark a vendor payout as paid
-- ----------------------------------------------------------------------------
-- Admins are anon to Postgres (localStorage auth), so two things blocked the
-- "mark as paid" flow:
--   1. vendor_payouts has no UPDATE policy  -> the status update was RLS-denied
--   2. the vendor-payout-slips bucket only allowed `authenticated` uploads
--
-- (1) is fixed with a SECURITY DEFINER RPC. (2) is fixed by allowing anon/
-- authenticated uploads to that bucket, matching the existing product-images
-- bucket pattern (the bucket is already public-read).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_mark_vendor_payout_paid(
  p_payout_id uuid,
  p_reference text,
  p_slip_url text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_paid_by uuid DEFAULT NULL
)
RETURNS public.vendor_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_row public.vendor_payouts;
BEGIN
  UPDATE public.vendor_payouts
  SET status = 'PAID',
      paid_at = now(),
      paid_by = p_paid_by,
      payment_reference = p_reference,
      payment_slip_url = COALESCE(p_slip_url, payment_slip_url),
      notes = p_notes
  WHERE id = p_payout_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout % not found', p_payout_id;
  END IF;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_mark_vendor_payout_paid(uuid, text, text, text, uuid)
  TO anon, authenticated;

-- Storage: allow the admin (anon) client to upload/replace payout slips.
DROP POLICY IF EXISTS "Admin can upload payout slips" ON storage.objects;
CREATE POLICY "Admin can upload payout slips"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'vendor-payout-slips');

DROP POLICY IF EXISTS "Admin can update payout slips" ON storage.objects;
CREATE POLICY "Admin can update payout slips"
  ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'vendor-payout-slips');
