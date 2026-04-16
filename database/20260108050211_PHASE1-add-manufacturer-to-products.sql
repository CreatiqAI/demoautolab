-- ============================================================================
-- PHASE 1: ADD MANUFACTURER FIELDS TO PRODUCTS
-- Purpose: Add manufacturer_id and manufacturer_brand to products for dual categorization
-- Date: 2025-12-07
-- ============================================================================

-- Add manufacturer fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS manufacturer_brand TEXT;

-- Add manufacturer fields to products_new table
ALTER TABLE products_new
ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS manufacturer_brand TEXT;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_id ON products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_brand ON products(manufacturer_brand);
CREATE INDEX IF NOT EXISTS idx_products_new_manufacturer_id ON products_new(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_products_new_manufacturer_brand ON products_new(manufacturer_brand);

-- Add comments
COMMENT ON COLUMN products.manufacturer_id IS 'Foreign key to manufacturers table';
COMMENT ON COLUMN products.manufacturer_brand IS 'Manufacturer/Factory brand name for display';
COMMENT ON COLUMN products_new.manufacturer_id IS 'Foreign key to manufacturers table';
COMMENT ON COLUMN products_new.manufacturer_brand IS 'Manufacturer/Factory brand name for display';

-- Update some example products with manufacturer data (optional - can be done via admin panel)
-- UPDATE products SET manufacturer_brand = 'Original Equipment Manufacturer (OEM)' WHERE brand = 'BMW' AND manufacturer_brand IS NULL LIMIT 5;
