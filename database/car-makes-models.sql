-- ============================================================================
-- CAR MAKES AND MODELS TABLES
-- Purpose: Store car brands and models for user registration
-- ============================================================================

-- Create car_makes table (brands)
CREATE TABLE IF NOT EXISTS car_makes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  country TEXT,
  sort_order INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create car_models table
CREATE TABLE IF NOT EXISTS car_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id UUID NOT NULL REFERENCES car_makes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year_start INTEGER,
  year_end INTEGER,
  body_type TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_make_model UNIQUE(make_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_car_makes_popular ON car_makes(is_popular, sort_order);
CREATE INDEX IF NOT EXISTS idx_car_makes_name ON car_makes(name);
CREATE INDEX IF NOT EXISTS idx_car_models_make ON car_models(make_id);
CREATE INDEX IF NOT EXISTS idx_car_models_name ON car_models(name);

-- Add comments
COMMENT ON TABLE car_makes IS 'Car brands/manufacturers for user vehicle registration';
COMMENT ON TABLE car_models IS 'Car models linked to their respective makes';

-- Enable RLS
ALTER TABLE car_makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access
DROP POLICY IF EXISTS "Anyone can view car makes" ON car_makes;
CREATE POLICY "Anyone can view car makes" ON car_makes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view car models" ON car_models;
CREATE POLICY "Anyone can view car models" ON car_models
  FOR SELECT USING (true);

-- Admin write access
DROP POLICY IF EXISTS "Admins can manage car makes" ON car_makes;
CREATE POLICY "Admins can manage car makes" ON car_makes
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins can manage car models" ON car_models;
CREATE POLICY "Admins can manage car models" ON car_models
  FOR ALL USING (true);

-- Grant permissions
GRANT SELECT ON car_makes TO anon;
GRANT SELECT ON car_models TO anon;
GRANT ALL ON car_makes TO authenticated;
GRANT ALL ON car_models TO authenticated;

-- ============================================================================
-- SEED DATA: Popular Malaysian Car Brands
-- ============================================================================

-- Insert car makes (brands)
INSERT INTO car_makes (name, country, is_popular, sort_order) VALUES
-- Malaysian brands first
('Proton', 'Malaysia', true, 1),
('Perodua', 'Malaysia', true, 2),
-- Japanese brands (most popular in Malaysia)
('Toyota', 'Japan', true, 3),
('Honda', 'Japan', true, 4),
('Nissan', 'Japan', true, 5),
('Mazda', 'Japan', true, 6),
('Mitsubishi', 'Japan', true, 7),
('Suzuki', 'Japan', false, 8),
('Isuzu', 'Japan', false, 9),
('Subaru', 'Japan', true, 10),
('Lexus', 'Japan', false, 11),
-- Korean brands
('Hyundai', 'South Korea', true, 12),
('Kia', 'South Korea', true, 13),
-- German brands
('BMW', 'Germany', true, 14),
('Mercedes-Benz', 'Germany', true, 15),
('Audi', 'Germany', true, 16),
('Volkswagen', 'Germany', true, 17),
('Porsche', 'Germany', false, 18),
('MINI', 'Germany', false, 19),
-- American brands
('Ford', 'USA', true, 20),
('Chevrolet', 'USA', false, 21),
('Jeep', 'USA', false, 22),
-- European brands
('Volvo', 'Sweden', false, 23),
('Peugeot', 'France', false, 24),
('Renault', 'France', false, 25),
-- Chinese brands (growing in Malaysia)
('Chery', 'China', false, 26),
('Geely', 'China', false, 27),
('BYD', 'China', false, 28),
('Great Wall', 'China', false, 29),
-- Other
('Land Rover', 'UK', false, 30),
('Jaguar', 'UK', false, 31),
('Tesla', 'USA', false, 32)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Popular Car Models
-- ============================================================================

-- Proton models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Saga', 2016, 2025, 'Sedan', 1 FROM car_makes WHERE name = 'Proton'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Persona', 2016, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'Proton'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Iriz', 2014, 2025, 'Hatchback', 3 FROM car_makes WHERE name = 'Proton'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'X50', 2020, 2025, 'SUV', 4 FROM car_makes WHERE name = 'Proton'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'X70', 2018, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Proton'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'X90', 2023, 2025, 'SUV', 6 FROM car_makes WHERE name = 'Proton'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Exora', 2009, 2025, 'MPV', 7 FROM car_makes WHERE name = 'Proton'
ON CONFLICT (make_id, name) DO NOTHING;

-- Perodua models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Myvi', 2005, 2025, 'Hatchback', 1 FROM car_makes WHERE name = 'Perodua'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Axia', 2014, 2025, 'Hatchback', 2 FROM car_makes WHERE name = 'Perodua'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Bezza', 2016, 2025, 'Sedan', 3 FROM car_makes WHERE name = 'Perodua'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Ativa', 2021, 2025, 'SUV', 4 FROM car_makes WHERE name = 'Perodua'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Aruz', 2019, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Perodua'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Alza', 2009, 2025, 'MPV', 6 FROM car_makes WHERE name = 'Perodua'
ON CONFLICT (make_id, name) DO NOTHING;

-- Toyota models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Vios', 2003, 2025, 'Sedan', 1 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Camry', 2002, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Corolla', 2000, 2025, 'Sedan', 3 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Yaris', 2006, 2025, 'Hatchback', 4 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Hilux', 2005, 2025, 'Pickup', 5 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Fortuner', 2005, 2025, 'SUV', 6 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Innova', 2004, 2025, 'MPV', 7 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Rush', 2018, 2025, 'SUV', 8 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Veloz', 2022, 2025, 'MPV', 9 FROM car_makes WHERE name = 'Toyota'
ON CONFLICT (make_id, name) DO NOTHING;

-- Honda models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'City', 2003, 2025, 'Sedan', 1 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Civic', 2001, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Accord', 2000, 2025, 'Sedan', 3 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Jazz', 2003, 2023, 'Hatchback', 4 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'HR-V', 2015, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'CR-V', 2002, 2025, 'SUV', 6 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'BR-V', 2016, 2025, 'SUV', 7 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'WR-V', 2023, 2025, 'SUV', 8 FROM car_makes WHERE name = 'Honda'
ON CONFLICT (make_id, name) DO NOTHING;

-- Nissan models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Almera', 2011, 2025, 'Sedan', 1 FROM car_makes WHERE name = 'Nissan'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'X-Trail', 2001, 2025, 'SUV', 2 FROM car_makes WHERE name = 'Nissan'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Navara', 2005, 2025, 'Pickup', 3 FROM car_makes WHERE name = 'Nissan'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Serena', 2004, 2025, 'MPV', 4 FROM car_makes WHERE name = 'Nissan'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Kicks', 2020, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Nissan'
ON CONFLICT (make_id, name) DO NOTHING;

-- Mazda models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Mazda 2', 2007, 2025, 'Hatchback', 1 FROM car_makes WHERE name = 'Mazda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Mazda 3', 2004, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'Mazda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Mazda 6', 2002, 2025, 'Sedan', 3 FROM car_makes WHERE name = 'Mazda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'CX-3', 2015, 2025, 'SUV', 4 FROM car_makes WHERE name = 'Mazda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'CX-5', 2012, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Mazda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'CX-8', 2018, 2025, 'SUV', 6 FROM car_makes WHERE name = 'Mazda'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'CX-30', 2019, 2025, 'SUV', 7 FROM car_makes WHERE name = 'Mazda'
ON CONFLICT (make_id, name) DO NOTHING;

-- Hyundai models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Elantra', 2001, 2025, 'Sedan', 1 FROM car_makes WHERE name = 'Hyundai'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Sonata', 2002, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'Hyundai'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Tucson', 2005, 2025, 'SUV', 3 FROM car_makes WHERE name = 'Hyundai'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Santa Fe', 2001, 2025, 'SUV', 4 FROM car_makes WHERE name = 'Hyundai'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Kona', 2018, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Hyundai'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Stargazer', 2022, 2025, 'MPV', 6 FROM car_makes WHERE name = 'Hyundai'
ON CONFLICT (make_id, name) DO NOTHING;

-- Kia models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Cerato', 2004, 2025, 'Sedan', 1 FROM car_makes WHERE name = 'Kia'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Optima', 2001, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'Kia'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Sportage', 2005, 2025, 'SUV', 3 FROM car_makes WHERE name = 'Kia'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Sorento', 2003, 2025, 'SUV', 4 FROM car_makes WHERE name = 'Kia'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Seltos', 2020, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Kia'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Carnival', 2006, 2025, 'MPV', 6 FROM car_makes WHERE name = 'Kia'
ON CONFLICT (make_id, name) DO NOTHING;

-- BMW models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, '3 Series', 2000, 2025, 'Sedan', 1 FROM car_makes WHERE name = 'BMW'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, '5 Series', 2000, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'BMW'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, '7 Series', 2000, 2025, 'Sedan', 3 FROM car_makes WHERE name = 'BMW'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'X1', 2009, 2025, 'SUV', 4 FROM car_makes WHERE name = 'BMW'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'X3', 2004, 2025, 'SUV', 5 FROM car_makes WHERE name = 'BMW'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'X5', 2000, 2025, 'SUV', 6 FROM car_makes WHERE name = 'BMW'
ON CONFLICT (make_id, name) DO NOTHING;

-- Mercedes-Benz models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'A-Class', 2013, 2025, 'Hatchback', 1 FROM car_makes WHERE name = 'Mercedes-Benz'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'C-Class', 2000, 2025, 'Sedan', 2 FROM car_makes WHERE name = 'Mercedes-Benz'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'E-Class', 2000, 2025, 'Sedan', 3 FROM car_makes WHERE name = 'Mercedes-Benz'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'S-Class', 2000, 2025, 'Sedan', 4 FROM car_makes WHERE name = 'Mercedes-Benz'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'GLA', 2014, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Mercedes-Benz'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'GLC', 2015, 2025, 'SUV', 6 FROM car_makes WHERE name = 'Mercedes-Benz'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'GLE', 2015, 2025, 'SUV', 7 FROM car_makes WHERE name = 'Mercedes-Benz'
ON CONFLICT (make_id, name) DO NOTHING;

-- Mitsubishi models
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Triton', 2005, 2025, 'Pickup', 1 FROM car_makes WHERE name = 'Mitsubishi'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Xpander', 2017, 2025, 'MPV', 2 FROM car_makes WHERE name = 'Mitsubishi'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Outlander', 2003, 2025, 'SUV', 3 FROM car_makes WHERE name = 'Mitsubishi'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'ASX', 2010, 2025, 'SUV', 4 FROM car_makes WHERE name = 'Mitsubishi'
ON CONFLICT (make_id, name) DO NOTHING;
INSERT INTO car_models (make_id, name, year_start, year_end, body_type, sort_order)
SELECT id, 'Pajero Sport', 2008, 2025, 'SUV', 5 FROM car_makes WHERE name = 'Mitsubishi'
ON CONFLICT (make_id, name) DO NOTHING;

-- Verify creation
SELECT 'Car Makes:' as info, COUNT(*) as count FROM car_makes;
SELECT 'Car Models:' as info, COUNT(*) as count FROM car_models;
