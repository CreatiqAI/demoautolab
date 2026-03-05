-- Phone OTP Verifications table for server-side OTP storage
-- Used by send-otp-sms and verify-otp-sms Edge Functions

CREATE TABLE IF NOT EXISTS phone_otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups by phone
CREATE INDEX IF NOT EXISTS idx_phone_otp_phone ON phone_otp_verifications(phone);

-- RLS: only service_role can access (Edge Functions use service_role key)
ALTER TABLE phone_otp_verifications ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service_role can read/write (which is what we want)

-- Auto-cleanup: delete expired OTPs older than 1 hour
-- Run this periodically via pg_cron or manually
-- DELETE FROM phone_otp_verifications WHERE expires_at < now() - interval '1 hour';
