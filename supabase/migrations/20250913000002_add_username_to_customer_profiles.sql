-- Add username field to customer_profiles if it doesn't exist
-- This is used by the authentication system for user identification

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_profiles_username
  ON public.customer_profiles(username)
  WHERE username IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.customer_profiles.username IS 'Unique username for customer login and identification';
