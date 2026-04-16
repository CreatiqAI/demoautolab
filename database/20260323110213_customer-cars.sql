-- ============================================================================
-- CUSTOMER CARS TABLE
-- Purpose: Store multiple cars per customer (up to 5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  car_make_id UUID REFERENCES car_makes(id),
  car_model_id UUID REFERENCES car_models(id),
  car_make_name TEXT NOT NULL,
  car_model_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_cars_customer ON customer_cars(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_cars_primary ON customer_cars(customer_id, is_primary);

-- Enable RLS
ALTER TABLE customer_cars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own cars" ON customer_cars;
CREATE POLICY "Users can view own cars" ON customer_cars
  FOR SELECT
  USING (customer_id IN (SELECT id FROM customer_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own cars" ON customer_cars;
CREATE POLICY "Users can manage own cars" ON customer_cars
  FOR ALL
  USING (customer_id IN (SELECT id FROM customer_profiles WHERE user_id = auth.uid()));

-- Grant permissions
GRANT ALL ON customer_cars TO authenticated;
GRANT SELECT ON customer_cars TO anon;
