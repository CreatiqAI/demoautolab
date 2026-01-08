-- Fix Storage Policies for Reward Images (Version 2)
-- More permissive policies for admin uploads
-- Since admins use separate authentication, we allow both authenticated and anon

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from reward images" ON storage.objects;

-- Policy 1: Public can read images
CREATE POLICY "Allow public read access to reward images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reward-images');

-- Policy 2: Allow uploads (to both authenticated and anon)
CREATE POLICY "Allow uploads to reward images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'reward-images');

-- Policy 3: Allow updates
CREATE POLICY "Allow updates to reward images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'reward-images')
WITH CHECK (bucket_id = 'reward-images');

-- Policy 4: Allow deletes
CREATE POLICY "Allow deletes from reward images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'reward-images');

-- Make sure the bucket is properly configured
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'reward-images';

SELECT '✅ Storage policies updated with public access - uploads should now work!' as result;
SELECT '⚠️ Note: Access control relies on admin panel UI authentication.' as note;
