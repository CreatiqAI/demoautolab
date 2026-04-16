-- =====================================================
-- PREMIUM PARTNERSHIP RENEWAL HISTORY
-- =====================================================
-- Tracks all subscription renewals and extensions for audit trail

-- Create renewal_history table
CREATE TABLE IF NOT EXISTS partnership_renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES premium_partnerships(id) ON DELETE CASCADE,

  -- Renewal Details
  renewed_by UUID REFERENCES auth.users(id), -- Admin who processed the renewal
  renewal_type TEXT CHECK (renewal_type IN ('NEW', 'RENEWAL', 'EXTENSION', 'REACTIVATION')) NOT NULL,

  -- Date Changes
  previous_end_date TIMESTAMP WITH TIME ZONE,
  new_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  months_extended INTEGER NOT NULL,

  -- Payment Details
  amount_paid NUMERIC(10, 2),
  payment_method TEXT,
  payment_reference TEXT,

  -- Status Changes
  previous_status TEXT,
  new_status TEXT NOT NULL,

  -- Notes
  admin_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_renewal_history_partnership ON partnership_renewal_history(partnership_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_date ON partnership_renewal_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_renewal_history_renewed_by ON partnership_renewal_history(renewed_by);

-- Create a function to log renewals automatically
CREATE OR REPLACE FUNCTION log_partnership_renewal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if subscription_end_date or subscription_status changed
  IF (OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date)
     OR (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN

    -- Calculate months extended
    DECLARE
      months_diff INTEGER;
      renewal_type_val TEXT;
    BEGIN
      -- Calculate month difference
      IF NEW.subscription_end_date IS NOT NULL AND OLD.subscription_end_date IS NOT NULL THEN
        months_diff := EXTRACT(MONTH FROM AGE(NEW.subscription_end_date, OLD.subscription_end_date))::INTEGER;
      ELSIF NEW.subscription_end_date IS NOT NULL THEN
        months_diff := EXTRACT(MONTH FROM AGE(NEW.subscription_end_date, NEW.subscription_start_date))::INTEGER;
      ELSE
        months_diff := 0;
      END IF;

      -- Determine renewal type
      IF OLD.subscription_status = 'PENDING' AND NEW.subscription_status = 'ACTIVE' THEN
        renewal_type_val := 'NEW';
      ELSIF OLD.subscription_status IN ('CANCELLED', 'SUSPENDED', 'EXPIRED') AND NEW.subscription_status = 'ACTIVE' THEN
        renewal_type_val := 'REACTIVATION';
      ELSIF months_diff > 0 THEN
        renewal_type_val := 'EXTENSION';
      ELSE
        renewal_type_val := 'RENEWAL';
      END IF;

      -- Insert renewal history record
      INSERT INTO partnership_renewal_history (
        partnership_id,
        renewed_by,
        renewal_type,
        previous_end_date,
        new_end_date,
        months_extended,
        previous_status,
        new_status,
        admin_notes
      ) VALUES (
        NEW.id,
        auth.uid(), -- Current user
        renewal_type_val,
        OLD.subscription_end_date,
        NEW.subscription_end_date,
        GREATEST(months_diff, 0),
        OLD.subscription_status,
        NEW.subscription_status,
        'Automatic log from subscription update'
      );
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log renewals
DROP TRIGGER IF EXISTS trigger_log_partnership_renewal ON premium_partnerships;
CREATE TRIGGER trigger_log_partnership_renewal
  AFTER UPDATE ON premium_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION log_partnership_renewal();

-- Enable Row Level Security
ALTER TABLE partnership_renewal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for renewal history

-- Admins can view all renewal history
CREATE POLICY "Admins can view all renewal history"
  ON partnership_renewal_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Admins can insert renewal history
CREATE POLICY "Admins can insert renewal history"
  ON partnership_renewal_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- Merchants can view their own renewal history
CREATE POLICY "Merchants can view own renewal history"
  ON partnership_renewal_history FOR SELECT
  USING (
    partnership_id IN (
      SELECT id FROM premium_partnerships
      WHERE merchant_id IN (
        SELECT id FROM customer_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Renewal history tracking system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Table created:';
  RAISE NOTICE '  - partnership_renewal_history';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Automatic logging of subscription changes';
  RAISE NOTICE '  ✓ Tracks date extensions and status changes';
  RAISE NOTICE '  ✓ Records admin who made changes';
  RAISE NOTICE '  ✓ Payment reference tracking';
  RAISE NOTICE '  ✓ Full audit trail';
END $$;
