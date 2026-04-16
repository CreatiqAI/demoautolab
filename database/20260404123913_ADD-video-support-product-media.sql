-- Add video support to product_images_new table
-- Allows storing both images and videos as product media

-- Add media_type column (defaults to 'image' for backward compatibility)
ALTER TABLE product_images_new ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';

-- Add thumbnail_url for video thumbnails
ALTER TABLE product_images_new ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add constraint to ensure valid media types (drop first if exists)
ALTER TABLE product_images_new DROP CONSTRAINT IF EXISTS valid_media_type;
ALTER TABLE product_images_new ADD CONSTRAINT valid_media_type
  CHECK (media_type IN ('image', 'video'));

-- Create product-videos storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-videos',
  'product-videos',
  true,
  104857600, -- 100MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime'];

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read access for product videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to product videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to product videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from product videos" ON storage.objects;

-- Policy 1: Public can view videos
CREATE POLICY "Public read access for product videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-videos');

-- Policy 2: Allow uploads (admin uses localStorage auth, so TO public)
CREATE POLICY "Allow uploads to product videos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-videos');

-- Policy 3: Allow updates
CREATE POLICY "Allow updates to product videos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'product-videos')
WITH CHECK (bucket_id = 'product-videos');

-- Policy 4: Allow deletes
CREATE POLICY "Allow deletes from product videos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'product-videos');

SELECT '✅ product-videos bucket created with public access and 100MB limit' as result;
