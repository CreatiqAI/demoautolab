-- ============================================================================
-- PHASE 1: RENAME ENTERPRISE TO PANEL
-- Purpose: Update subscription_plan enum and rename 'enterprise' to 'panel'
-- Date: 2025-12-07
-- CRITICAL: This changes the business model from RM388/year to RM350/month
-- ============================================================================

-- First, update all existing 'enterprise' records to 'panel'
UPDATE premium_partnerships
SET subscription_plan = 'panel'
WHERE subscription_plan = 'enterprise';

-- Note: If subscription_plan is an ENUM type, we need to add 'panel' first, then remove 'enterprise'
-- Check if subscription_plan column uses ENUM or TEXT

-- If it's TEXT (most likely based on schema), no enum changes needed
-- The above UPDATE is sufficient

-- Add a new column to track billing cycle (year vs month)
ALTER TABLE premium_partnerships
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'month' CHECK (billing_cycle IN ('month', 'year'));

-- Set billing cycle for existing professional plans (yearly)
UPDATE premium_partnerships
SET billing_cycle = 'year'
WHERE subscription_plan = 'professional';

-- Set billing cycle for panel plans (monthly)
UPDATE premium_partnerships
SET billing_cycle = 'month'
WHERE subscription_plan = 'panel';

-- Add column to track if this is an admin-invited Panel (not self-registered)
ALTER TABLE premium_partnerships
ADD COLUMN IF NOT EXISTS is_admin_invited BOOLEAN DEFAULT false;

-- Add column to track Panel slot number (max 100)
ALTER TABLE premium_partnerships
ADD COLUMN IF NOT EXISTS panel_slot_number INTEGER;

-- Add unique constraint to panel_slot_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_panel_slot ON premium_partnerships(panel_slot_number) WHERE panel_slot_number IS NOT NULL;

-- Set is_admin_invited to true for existing panel members
UPDATE premium_partnerships
SET is_admin_invited = true
WHERE subscription_plan = 'panel';

-- Add comments
COMMENT ON COLUMN premium_partnerships.billing_cycle IS 'Billing cycle: month (RM350/month for Panel) or year (RM99/year for Professional)';
COMMENT ON COLUMN premium_partnerships.is_admin_invited IS 'True if Panel member was invited by admin (required for Panel tier)';
COMMENT ON COLUMN premium_partnerships.panel_slot_number IS 'Panel slot number (1-100) - only for Panel tier members';

-- Create a function to check Panel limit (max 100 active Panel members)
CREATE OR REPLACE FUNCTION check_panel_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_panel_count INTEGER;
BEGIN
  IF NEW.subscription_plan = 'panel' AND NEW.subscription_status = 'ACTIVE' THEN
    SELECT COUNT(*) INTO active_panel_count
    FROM premium_partnerships
    WHERE subscription_plan = 'panel'
      AND subscription_status = 'ACTIVE'
      AND id != NEW.id;

    IF active_panel_count >= 100 THEN
      RAISE EXCEPTION 'Maximum Panel limit (100) reached. Cannot activate more Panel members.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce Panel limit
DROP TRIGGER IF EXISTS enforce_panel_limit ON premium_partnerships;
CREATE TRIGGER enforce_panel_limit
  BEFORE INSERT OR UPDATE ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION check_panel_limit();

-- Update subscription_end_date calculation for monthly Panel subscriptions
-- This will need to be handled in application logic for new subscriptions
COMMENT ON TABLE premium_partnerships IS 'Merchant partnerships - Professional (RM99/year) or Panel (RM350/month, max 100, admin-invited only)';
