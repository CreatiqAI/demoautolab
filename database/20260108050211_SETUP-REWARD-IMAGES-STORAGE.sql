-- Setup Supabase Storage for Reward Item Images

-- Create storage bucket for reward item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reward-images',
  'reward-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Allow public read access to reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete reward images" ON storage.objects;

-- Policy 1: Allow public read access to reward images
CREATE POLICY "Allow public read access to reward images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'reward-images');

-- Policy 2: Allow authenticated users (admins) to upload reward images
CREATE POLICY "Allow authenticated users to upload reward images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reward-images'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 3: Allow admins to update reward images
CREATE POLICY "Allow admins to update reward images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reward-images'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 4: Allow admins to delete reward images
CREATE POLICY "Allow admins to delete reward images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reward-images'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

SELECT '✅ Reward images storage bucket and policies created successfully!' as result;
