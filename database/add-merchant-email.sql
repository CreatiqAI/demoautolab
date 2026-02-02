-- ============================================================================
-- ADD EMAIL COLUMN TO MERCHANT_REGISTRATIONS
-- Purpose: Store merchant's email address for contact purposes
-- ============================================================================

-- Add email column to merchant_registrations table
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comment
COMMENT ON COLUMN merchant_registrations.email IS 'Merchant business email address';

-- Create index for email searches
CREATE INDEX IF NOT EXISTS idx_merchant_registrations_email
ON merchant_registrations(email);

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'merchant_registrations'
  AND column_name = 'email';
