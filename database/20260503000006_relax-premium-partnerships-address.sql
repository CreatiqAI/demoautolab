-- ============================================================================
-- Relax NOT NULL constraints on premium_partnerships address fields
-- ============================================================================
-- The original table was designed for a self-serve "register as premium
-- partner" form that asked the merchant for their full business address.
--
-- The admin "Promote to Panel" flow (Customers > B2B drawer) doesn't have
-- city/state/postcode info handy and shouldn't require admin to enter them
-- as a precondition for promoting a paid customer. Drop the NOT NULL on the
-- address-related columns so the promotion flow doesn't hit a 400.
--
-- The two fields kept NOT NULL — merchant_id and business_name — are always
-- set explicitly by the promotion code.
-- ============================================================================

ALTER TABLE public.premium_partnerships
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL,
  ALTER COLUMN postcode DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN contact_phone DROP NOT NULL,
  ALTER COLUMN contact_person DROP NOT NULL;
