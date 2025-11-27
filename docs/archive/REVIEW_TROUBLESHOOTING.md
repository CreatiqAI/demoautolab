# Review System Troubleshooting Guide

## Issue: Can't see submitted reviews in admin panel

### Diagnostic Steps

#### Step 1: Check if Database Migration was Run

Open Supabase Dashboard → SQL Editor and run:

```sql
-- Check if product_reviews table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'product_reviews'
);
```

**Expected Result:** `true`

If it returns `false`, you need to run the migration:
1. Open `database/product-reviews-migration.sql`
2. Copy the entire content
3. Paste into Supabase SQL Editor
4. Execute

---

#### Step 2: Check if Reviews Exist in Database

```sql
-- Check all reviews in database
SELECT
  id,
  product_id,
  customer_name,
  customer_email,
  rating,
  status,
  created_at
FROM product_reviews
ORDER BY created_at DESC;
```

**Expected Result:** You should see your submitted review(s)

---

#### Step 3: Check RLS Policies

```sql
-- Check if RLS is preventing access
SELECT * FROM product_reviews;
```

If this returns no results but Step 2 showed reviews, it's an RLS policy issue.

---

#### Step 4: Temporarily Disable RLS for Testing (Admin Access)

```sql
-- Grant admin access to view all reviews
CREATE POLICY "Admin can view all reviews"
  ON product_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Grant admin access to update all reviews
CREATE POLICY "Admin can update all reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant admin access to delete all reviews
CREATE POLICY "Admin can delete all reviews"
  ON product_reviews FOR DELETE
  TO authenticated
  USING (true);
```

---

#### Step 5: Check Foreign Key Relationship

The review form submits to `products_new` table, but check if your product exists:

```sql
-- Check if the product exists in products_new
SELECT id, name FROM products_new LIMIT 10;
```

---

#### Step 6: Test Direct Query

Run this in Supabase SQL Editor:

```sql
-- This is the exact query the admin panel uses
SELECT
  pr.*,
  pn.name as product_name
FROM product_reviews pr
LEFT JOIN products_new pn ON pr.product_id = pn.id
ORDER BY pr.created_at DESC;
```

---

### Common Issues and Solutions

#### Issue 1: Table Doesn't Exist
**Solution:** Run the migration file `database/product-reviews-migration.sql`

#### Issue 2: RLS Blocking Admin
**Solution:** Add admin-specific RLS policies (see Step 4)

#### Issue 3: Foreign Key Mismatch
**Problem:** Review references `products_new` but maybe should reference `products`
**Solution:** Check which products table is being used

```sql
-- Check which products table has data
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'products_new' as table_name, COUNT(*) as count FROM products_new;
```

#### Issue 4: Review Submitted to Wrong Product Table
If your ProductDetails page uses `products` but migration expects `products_new`, update the foreign key:

```sql
-- Drop existing constraint
ALTER TABLE product_reviews
DROP CONSTRAINT IF EXISTS product_reviews_product_id_fkey;

-- Add new constraint to products table instead
ALTER TABLE product_reviews
ADD CONSTRAINT product_reviews_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE;
```

---

### Quick Fix: Complete RLS Policy Set

If RLS is the issue, run this complete policy set:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON product_reviews;
DROP POLICY IF EXISTS "Anyone can submit reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can update their own pending reviews" ON product_reviews;

-- Recreate with admin access
CREATE POLICY "Public can view approved reviews"
  ON product_reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reviews"
  ON product_reviews FOR DELETE
  TO authenticated
  USING (true);
```

---

### Debug Mode: Check Browser Console

1. Open the Review Moderation page
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for any error messages
5. Common errors:
   - "permission denied for table product_reviews" → RLS issue
   - "relation product_reviews does not exist" → Migration not run
   - "foreign key violation" → Product doesn't exist

---

### Manual Review Insertion (For Testing)

If you want to manually insert a test review:

```sql
INSERT INTO product_reviews (
  product_id,
  customer_name,
  customer_email,
  rating,
  title,
  comment,
  status
) VALUES (
  (SELECT id FROM products_new LIMIT 1), -- Use first product
  'Test Customer',
  'test@example.com',
  5,
  'Test Review',
  'This is a test review to verify the system works.',
  'pending'
);
```

---

### Contact Information

If none of these steps work, please provide:
1. Screenshot of browser console errors
2. Result of Step 2 query (do reviews exist?)
3. Result of Step 6 query (can you see reviews with product names?)
4. Your Supabase project URL (without credentials)
