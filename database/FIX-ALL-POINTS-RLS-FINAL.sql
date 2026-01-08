-- Fix ALL Points & Rewards RLS for Custom Admin Authentication
-- Complete fix for all tables with proper anon access

-- ====================
-- FIX 1: Reward Items
-- ====================

ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to reward items" ON reward_items;
DROP POLICY IF EXISTS "Allow authenticated users full access to reward items" ON reward_items;
DROP POLICY IF EXISTS "Allow full access to reward items" ON reward_items;

CREATE POLICY "Allow public read access to reward items"
ON reward_items FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Allow full access to reward items"
ON reward_items FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON reward_items TO anon, authenticated;

-- ====================
-- FIX 2: Points Ledger
-- ====================

ALTER TABLE customer_points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own points history" ON customer_points_ledger;
DROP POLICY IF EXISTS "Authenticated users can view all points data" ON customer_points_ledger;
DROP POLICY IF EXISTS "System can insert points" ON customer_points_ledger;
DROP POLICY IF EXISTS "Allow all access to points ledger" ON customer_points_ledger;

-- Allow read access to all (for admin analytics and customer views)
CREATE POLICY "Allow all access to points ledger"
ON customer_points_ledger FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT, INSERT ON customer_points_ledger TO anon, authenticated;

-- ====================
-- FIX 3: Point Redemptions
-- ====================

ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Authenticated users can view all redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Users can create redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Authenticated users can update redemptions" ON point_redemptions;
DROP POLICY IF EXISTS "Allow all access to redemptions" ON point_redemptions;

-- Allow full access (admin via UI, customers via UI)
CREATE POLICY "Allow all access to redemptions"
ON point_redemptions FOR ALL TO public USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON point_redemptions TO anon, authenticated;

SELECT '✅ All Points & Rewards RLS policies updated for custom admin auth!' as result;
SELECT '⚠️ Note: Access control relies on admin panel and customer UI authentication.' as note;
