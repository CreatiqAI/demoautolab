-- ============================================================
-- COMPLETE POINTS & REWARDS FIX (Version 2)
-- Run this file to fix all Points & Rewards issues
-- Uses admin_profiles table instead of user_roles
-- ============================================================

-- ====================
-- FIX 1: Reward Items RLS
-- ====================

ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to reward items" ON reward_items;
DROP POLICY IF EXISTS "Allow admin full access to reward items" ON reward_items;

CREATE POLICY "Allow public read access to reward items"
ON reward_items FOR SELECT TO public
USING (is_active = true);

CREATE POLICY "Allow admin full access to reward items"
ON reward_items FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
);

GRANT SELECT ON reward_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reward_items TO authenticated;

-- ====================
-- FIX 2: Points Ledger RLS
-- ====================

ALTER TABLE customer_points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own points history" ON customer_points_ledger;
DROP POLICY IF EXISTS "Admins can view all points data" ON customer_points_ledger;
DROP POLICY IF EXISTS "System can insert points" ON customer_points_ledger;

CREATE POLICY "Users can view their own points history"
ON customer_points_ledger FOR SELECT TO authenticated
USING (
  customer_id IN (SELECT id FROM customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all points data"
ON customer_points_ledger FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
);

CREATE POLICY "System can insert points"
ON customer_points_ledger FOR INSERT TO authenticated
WITH CHECK (true);

GRANT SELECT ON customer_points_ledger TO authenticated;
GRANT INSERT ON customer_points_ledger TO authenticated;

-- ====================
-- FIX 3: Redemptions RLS
-- ====================

ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Users can create redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Admins can update redemptions" ON point_redemptions;

CREATE POLICY "Users can view their own redemptions"
ON point_redemptions FOR SELECT TO authenticated
USING (
  customer_id IN (SELECT id FROM customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all redemptions"
ON point_redemptions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
);

CREATE POLICY "Users can create redemptions"
ON point_redemptions FOR INSERT TO authenticated
WITH CHECK (
  customer_id IN (SELECT id FROM customer_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update redemptions"
ON point_redemptions FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
);

GRANT SELECT, INSERT ON point_redemptions TO authenticated;
GRANT UPDATE ON point_redemptions TO authenticated;

-- ====================
-- FIX 4: Storage Bucket for Images
-- ====================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reward-images',
  'reward-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Allow public read access to reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update reward images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete reward images" ON storage.objects;

CREATE POLICY "Allow public read access to reward images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'reward-images');

CREATE POLICY "Allow authenticated users to upload reward images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reward-images'
  AND EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
);

CREATE POLICY "Allow admins to update reward images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'reward-images'
  AND EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
);

CREATE POLICY "Allow admins to delete reward images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'reward-images'
  AND EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid())
);

SELECT '✅ All Points & Rewards RLS policies and storage setup completed successfully!' as result;
