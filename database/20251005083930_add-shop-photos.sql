-- =====================================================
-- ADD SHOP PHOTOS SUPPORT
-- =====================================================
-- Allow premium partners to upload up to 4 shop photos

-- Add shop_photos column (array of image URLs)
ALTER TABLE premium_partnerships
ADD COLUMN IF NOT EXISTS shop_photos TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN premium_partnerships.shop_photos IS 'Array of shop photo URLs (max 4 photos)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Shop photos column added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Premium partners can now upload up to 4 shop photos';
  RAISE NOTICE 'Column: shop_photos (TEXT[])';
END $$;
