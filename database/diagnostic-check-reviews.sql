-- ========================================
-- REVIEW SYSTEM DIAGNOSTIC SCRIPT
-- ========================================
-- Run this in Supabase SQL Editor to diagnose review issues

-- 1. Check if product_reviews table exists
SELECT
  'Table Exists?' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'product_reviews'
  )::text as result;

-- 2. Check review count
SELECT
  'Total Reviews' as check_name,
  COUNT(*)::text as result
FROM product_reviews;

-- 3. Show all reviews with status breakdown
SELECT
  'Reviews by Status' as info,
  status,
  COUNT(*) as count
FROM product_reviews
GROUP BY status;

-- 4. Show recent reviews
SELECT
  'Recent Reviews' as info,
  pr.id,
  pr.customer_name,
  pr.customer_email,
  pr.rating,
  pr.status,
  pr.created_at,
  pn.name as product_name
FROM product_reviews pr
LEFT JOIN products_new pn ON pr.product_id = pn.id
ORDER BY pr.created_at DESC
LIMIT 10;

-- 5. Check RLS policies
SELECT
  'RLS Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'product_reviews';

-- 6. Check if RLS is enabled
SELECT
  'RLS Enabled?' as check_name,
  relrowsecurity::text as result
FROM pg_class
WHERE relname = 'product_reviews';

-- 7. Check products_new table exists and has data
SELECT
  'Products in products_new' as check_name,
  COUNT(*)::text as result
FROM products_new;

-- 8. Check for orphaned reviews (reviews without valid product)
SELECT
  'Orphaned Reviews' as check_name,
  COUNT(*)::text as result
FROM product_reviews pr
WHERE NOT EXISTS (
  SELECT 1 FROM products_new pn WHERE pn.id = pr.product_id
);

-- ========================================
-- QUICK FIX: Add Admin RLS Policies
-- ========================================
-- Uncomment and run if you need to add admin access policies

/*
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON product_reviews;
DROP POLICY IF EXISTS "Anyone can submit reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can update their own pending reviews" ON product_reviews;

-- Create new policies with admin access
CREATE POLICY "Public can view approved reviews or authenticated can view all"
  ON product_reviews FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can insert reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all reviews"
  ON product_reviews FOR DELETE
  TO authenticated
  USING (true);
*/

-- ========================================
-- QUICK FIX: Insert Test Review
-- ========================================
-- Uncomment and run to insert a test review

/*
INSERT INTO product_reviews (
  product_id,
  customer_name,
  customer_email,
  rating,
  title,
  comment,
  status,
  verified_purchase
)
SELECT
  id,
  'Test Customer',
  'test@example.com',
  5,
  'Test Review from SQL',
  'This is a test review inserted directly via SQL to verify the system works properly.',
  'pending',
  false
FROM products_new
LIMIT 1;
*/
