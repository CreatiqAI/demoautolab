-- ========================================
-- ADMIN AUTHENTICATION SETUP (Clean Version)
-- ========================================

-- Step 1: Enable password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Create admin_login function
CREATE OR REPLACE FUNCTION admin_login(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_admin RECORD;
  v_password_matches BOOLEAN;
BEGIN
  SELECT * INTO v_admin
  FROM admin_profiles
  WHERE username = p_username AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid username or password');
  END IF;

  IF v_admin.password_hash IS NULL THEN
    v_password_matches := false;
  ELSE
    v_password_matches := (v_admin.password_hash = crypt(p_password, v_admin.password_hash));
  END IF;

  IF NOT v_password_matches THEN
    RETURN json_build_object('success', false, 'message', 'Invalid username or password');
  END IF;

  UPDATE admin_profiles SET last_login_at = NOW(), updated_at = NOW() WHERE id = v_admin.id;

  RETURN json_build_object(
    'success', true,
    'admin', json_build_object(
      'id', v_admin.id,
      'username', v_admin.username,
      'full_name', v_admin.full_name,
      'role', v_admin.role
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create admin_register function
CREATE OR REPLACE FUNCTION admin_register(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'staff'
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF p_role NOT IN ('admin', 'manager', 'staff') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid role');
  END IF;

  IF EXISTS (SELECT 1 FROM admin_profiles WHERE username = p_username) THEN
    RETURN json_build_object('success', false, 'message', 'Username already exists');
  END IF;

  IF LENGTH(p_password) < 8 THEN
    RETURN json_build_object('success', false, 'message', 'Password must be at least 8 characters');
  END IF;

  INSERT INTO admin_profiles (username, password_hash, full_name, role, is_active)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_full_name, p_role, true)
  RETURNING id INTO v_admin_id;

  RETURN json_build_object('success', true, 'message', 'Admin account created', 'admin_id', v_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Fix product_reviews RLS policies
DROP POLICY IF EXISTS "View reviews based on status and role" ON product_reviews;
DROP POLICY IF EXISTS "Anyone can submit reviews" ON product_reviews;
DROP POLICY IF EXISTS "Admins and staff can update reviews" ON product_reviews;
DROP POLICY IF EXISTS "Admins and staff can delete reviews" ON product_reviews;
DROP POLICY IF EXISTS "Allow all to view reviews" ON product_reviews;
DROP POLICY IF EXISTS "Allow all to insert reviews" ON product_reviews;
DROP POLICY IF EXISTS "Allow all to update reviews" ON product_reviews;
DROP POLICY IF EXISTS "Allow all to delete reviews" ON product_reviews;

CREATE POLICY "Anyone can view reviews" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can submit reviews" ON product_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reviews" ON product_reviews FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete reviews" ON product_reviews FOR DELETE USING (true);

-- Step 5: Fix review_helpful_votes RLS policies
DROP POLICY IF EXISTS "Anyone can view helpful votes" ON review_helpful_votes;
DROP POLICY IF EXISTS "Anyone can submit helpful votes" ON review_helpful_votes;
DROP POLICY IF EXISTS "Allow all to view helpful votes" ON review_helpful_votes;
DROP POLICY IF EXISTS "Allow all to insert helpful votes" ON review_helpful_votes;
DROP POLICY IF EXISTS "Anyone can view votes" ON review_helpful_votes;
DROP POLICY IF EXISTS "Anyone can submit votes" ON review_helpful_votes;

CREATE POLICY "Anyone can view votes" ON review_helpful_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can submit votes" ON review_helpful_votes FOR INSERT WITH CHECK (true);

-- Step 6: Create default admin if none exist
DO $$
DECLARE
  v_admin_count INTEGER;
  v_result JSON;
BEGIN
  SELECT COUNT(*) INTO v_admin_count FROM admin_profiles;

  IF v_admin_count = 0 THEN
    SELECT admin_register('admin', 'admin123', 'Default Admin', 'admin') INTO v_result;
    RAISE NOTICE 'Created default admin: username=admin, password=admin123';
    RAISE NOTICE 'CHANGE PASSWORD IMMEDIATELY!';
  ELSE
    RAISE NOTICE 'Found % existing admin account(s)', v_admin_count;
  END IF;
END $$;

-- Step 7: Insert test review
INSERT INTO product_reviews (product_id, customer_name, customer_email, rating, title, comment, status, verified_purchase)
SELECT id, 'Test Customer', 'test@example.com', 5, 'Test Review', 'This is a test review to verify the system works!', 'pending', false
FROM products_new LIMIT 1
ON CONFLICT DO NOTHING;

-- Step 8: Verify setup
SELECT 'Setup Complete!' as status;
SELECT COUNT(*) as total_admins FROM admin_profiles;
SELECT COUNT(*) as total_reviews FROM product_reviews;
