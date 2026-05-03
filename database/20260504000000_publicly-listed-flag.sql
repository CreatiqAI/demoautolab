-- ============================================================================
-- Merchant-controlled public listing toggle on premium_partnerships
-- ============================================================================
-- Until now, any merchant promoted to Panel automatically appeared on the
-- public /find-shops page. The merchant should decide whether their shop
-- is publicly listed or kept private (default: not listed).
--
-- Existing approved Panel merchants are NOT auto-listed by this migration
-- — they have to opt in from the Merchant Console > Profile tab. Admin
-- can change this manually in SQL if a merchant complains they vanished.
-- ============================================================================

ALTER TABLE public.premium_partnerships
  ADD COLUMN IF NOT EXISTS is_publicly_listed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.premium_partnerships.is_publicly_listed IS
  'Merchant-controlled flag: when true the shop appears on the public /find-shops listing. Default false (opt-in).';

CREATE INDEX IF NOT EXISTS idx_premium_partnerships_publicly_listed
  ON public.premium_partnerships(is_publicly_listed)
  WHERE is_publicly_listed = true;
