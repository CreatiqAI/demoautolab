-- Fix Storage Policies for Reward Images
-- Allow uploads without strict RLS since admins use separate authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete reward images" ON storage.objects;

-- Policy 1: Public can read images
CREATE POLICY "Allow public read access to reward images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reward-images');

-- Policy 2: Allow uploads to reward-images bucket (more permissive)
CREATE POLICY "Allow authenticated users to upload reward images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reward-images');

-- Policy 3: Allow updates to reward-images bucket
CREATE POLICY "Allow authenticated users to update reward images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reward-images')
WITH CHECK (bucket_id = 'reward-images');

-- Policy 4: Allow deletes from reward-images bucket
CREATE POLICY "Allow authenticated users to delete reward images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reward-images');

-- Make sure the bucket allows public access
UPDATE storage.buckets
SET public = true
WHERE id = 'reward-images';

SELECT '✅ Storage policies updated - uploads should now work!' as result;
