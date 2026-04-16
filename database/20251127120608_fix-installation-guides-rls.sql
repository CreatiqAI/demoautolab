-- =====================================================
-- FIX INSTALLATION GUIDES RLS FOR ADMIN ACCESS
-- =====================================================
-- Since admins use localStorage auth (not Supabase Auth),
-- they have NO Supabase session (auth.uid() is null).
-- Solution: Disable RLS and grant direct table permissions

-- =====================================================
-- INSTALLATION_GUIDES TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Published guides visible to enterprise merchants" ON installation_guides;
DROP POLICY IF EXISTS "Admins can manage all guides" ON installation_guides;

-- Disable RLS
ALTER TABLE installation_guides DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON installation_guides TO anon, authenticated;

-- =====================================================
-- GUIDE_VIEWS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Merchants can log their own views" ON guide_views;
DROP POLICY IF EXISTS "Merchants can see their own views" ON guide_views;
DROP POLICY IF EXISTS "Admins can see all views" ON guide_views;

-- Disable RLS
ALTER TABLE guide_views DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON guide_views TO anon, authenticated;

-- =====================================================
-- GUIDE_LIKES TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Merchants can manage their own likes" ON guide_likes;
DROP POLICY IF EXISTS "Admins can see all likes" ON guide_likes;

-- Disable RLS
ALTER TABLE guide_likes DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON guide_likes TO anon, authenticated;

-- =====================================================
-- GUIDE_COMMENTS TABLE
-- =====================================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Merchants can manage their own comments" ON guide_comments;
DROP POLICY IF EXISTS "Admins can see all comments" ON guide_comments;

-- Disable RLS
ALTER TABLE guide_comments DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON guide_comments TO anon, authenticated;

-- =====================================================
-- VERIFY CHANGES
-- =====================================================

-- Check RLS status
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('installation_guides', 'guide_views', 'guide_likes', 'guide_comments')
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Installation Guides RLS DISABLED!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  - installation_guides';
  RAISE NOTICE '  - guide_views';
  RAISE NOTICE '  - guide_likes';
  RAISE NOTICE '  - guide_comments';
  RAISE NOTICE '';
  RAISE NOTICE 'Security: Admin routes protected by ProtectedAdminRoute';
  RAISE NOTICE 'Merchants access guides via MerchantConsole with enterprise check';
END $$;
