-- ============================================================================
-- MERCHANT REGISTRATION ENHANCEMENTS
-- Purpose: Add salesmen table and new fields to merchant_registrations
-- ============================================================================

-- ============================================================================
-- 1. CREATE SALESMEN TABLE FOR REFERRAL TRACKING
-- ============================================================================

-- Create salesmen table
CREATE TABLE IF NOT EXISTS salesmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 5.00,
  is_active BOOLEAN DEFAULT true,
  total_referrals INTEGER DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE salesmen IS 'Sales representatives who refer merchants/workshops';
COMMENT ON COLUMN salesmen.referral_code IS 'Unique code for tracking merchant referrals';
COMMENT ON COLUMN salesmen.commission_rate IS 'Commission percentage (default 5%)';
COMMENT ON COLUMN salesmen.total_referrals IS 'Count of successful referrals';
COMMENT ON COLUMN salesmen.total_commission IS 'Total commission earned';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salesmen_referral_code ON salesmen(referral_code);
CREATE INDEX IF NOT EXISTS idx_salesmen_active ON salesmen(is_active);
CREATE INDEX IF NOT EXISTS idx_salesmen_name ON salesmen(name);

-- Enable RLS
ALTER TABLE salesmen ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view active salesmen (for referral code validation)
DROP POLICY IF EXISTS "Anyone can view active salesmen" ON salesmen;
CREATE POLICY "Anyone can view active salesmen" ON salesmen
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all salesmen
DROP POLICY IF EXISTS "Admins can manage salesmen" ON salesmen;
CREATE POLICY "Admins can manage salesmen" ON salesmen
  FOR ALL
  USING (true);

-- Grant permissions
GRANT SELECT ON salesmen TO anon;
GRANT SELECT ON salesmen TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_salesmen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_salesmen_updated_at ON salesmen;
CREATE TRIGGER trigger_update_salesmen_updated_at
  BEFORE UPDATE ON salesmen
  FOR EACH ROW
  EXECUTE FUNCTION update_salesmen_updated_at();

-- ============================================================================
-- 2. ADD NEW FIELDS TO MERCHANT_REGISTRATIONS
-- ============================================================================

-- Add company profile URL
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS company_profile_url TEXT;

-- Add social media links (JSONB array)
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '[]'::jsonb;

-- Add SSM document URL
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS ssm_document_url TEXT;

-- Add bank proof URL
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS bank_proof_url TEXT;

-- Add workshop photos (JSONB array of URLs)
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS workshop_photos JSONB DEFAULT '[]'::jsonb;

-- Add referral code used
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Add salesman reference
ALTER TABLE merchant_registrations
ADD COLUMN IF NOT EXISTS referred_by_salesman_id UUID REFERENCES salesmen(id);

-- Add comments
COMMENT ON COLUMN merchant_registrations.company_profile_url IS 'Company website or Facebook page URL';
COMMENT ON COLUMN merchant_registrations.social_media_links IS 'Array of social media links [{platform, url}]';
COMMENT ON COLUMN merchant_registrations.ssm_document_url IS 'URL to uploaded SSM document';
COMMENT ON COLUMN merchant_registrations.bank_proof_url IS 'URL to uploaded bank statement/proof';
COMMENT ON COLUMN merchant_registrations.workshop_photos IS 'Array of workshop photo URLs';
COMMENT ON COLUMN merchant_registrations.referral_code IS 'Salesman referral code used during registration';
COMMENT ON COLUMN merchant_registrations.referred_by_salesman_id IS 'Salesman who referred this merchant';

-- Create index for referral tracking
CREATE INDEX IF NOT EXISTS idx_merchant_registrations_salesman
ON merchant_registrations(referred_by_salesman_id);

CREATE INDEX IF NOT EXISTS idx_merchant_registrations_referral_code
ON merchant_registrations(referral_code);

-- ============================================================================
-- 3. CREATE FUNCTION TO UPDATE SALESMAN STATS ON APPROVAL
-- ============================================================================

-- Function to increment salesman referral count when merchant is approved
CREATE OR REPLACE FUNCTION update_salesman_on_merchant_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to APPROVED
  IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
    -- If this merchant was referred by a salesman
    IF NEW.referred_by_salesman_id IS NOT NULL THEN
      UPDATE salesmen
      SET total_referrals = total_referrals + 1,
          updated_at = NOW()
      WHERE id = NEW.referred_by_salesman_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for salesman stats update
DROP TRIGGER IF EXISTS trigger_update_salesman_on_approval ON merchant_registrations;
CREATE TRIGGER trigger_update_salesman_on_approval
  AFTER UPDATE ON merchant_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_salesman_on_merchant_approval();

-- ============================================================================
-- 4. CREATE FUNCTION TO VALIDATE REFERRAL CODE
-- ============================================================================

-- Function to validate and get salesman by referral code
CREATE OR REPLACE FUNCTION validate_referral_code(p_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  salesman_id UUID,
  salesman_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS valid,
    s.id AS salesman_id,
    s.name AS salesman_name
  FROM salesmen s
  WHERE s.referral_code = p_code
    AND s.is_active = true;

  -- If no rows returned, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_referral_code TO anon;
GRANT EXECUTE ON FUNCTION validate_referral_code TO authenticated;

-- ============================================================================
-- 5. SEED SAMPLE SALESMEN DATA
-- ============================================================================

-- Insert sample salesmen (for testing)
INSERT INTO salesmen (name, phone, email, referral_code, commission_rate, notes) VALUES
('Ahmad Salesman', '+60123456001', 'ahmad@autolab.my', 'AHMAD001', 5.00, 'Senior salesman - KL region'),
('Ali Salesman', '+60123456002', 'ali@autolab.my', 'ALI002', 5.00, 'Salesman - Selangor region'),
('Muthu Salesman', '+60123456003', 'muthu@autolab.my', 'MUTHU003', 5.00, 'Salesman - Penang region'),
('Tan Salesman', '+60123456004', 'tan@autolab.my', 'TAN004', 5.00, 'Salesman - Johor region'),
('Company Referral', NULL, 'sales@autolab.my', 'AUTOLAB2024', 3.00, 'Default company referral code')
ON CONFLICT (referral_code) DO NOTHING;

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

-- Verify salesmen table
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'salesmen'
ORDER BY ordinal_position;

-- Verify merchant_registrations new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'merchant_registrations'
  AND column_name IN (
    'company_profile_url',
    'social_media_links',
    'ssm_document_url',
    'bank_proof_url',
    'workshop_photos',
    'referral_code',
    'referred_by_salesman_id'
  );

-- Test referral validation
SELECT * FROM validate_referral_code('AUTOLAB2024');
