-- ============================================================================
-- MASTER MIGRATION SCRIPT
-- Purpose: Run all Phase 1 & Phase 2 database migrations
-- Date: 2025-12-07
--
-- INSTRUCTIONS:
-- 1. Review each migration file before running
-- 2. Run this file in your Supabase SQL Editor or via psql
-- 3. Check for errors after each step
-- 4. Backup your database before running!
-- ============================================================================

-- PHASE 1 MIGRATIONS (Critical Business Model Changes)
-- ============================================================================

\echo 'Starting Phase 1 Migrations...'

-- 1. Create manufacturers table
\echo '1/6 Creating manufacturers table...'
\i PHASE1-manufacturers-table.sql

-- 2. Add manufacturer fields to products
\echo '2/6 Adding manufacturer fields to products...'
\i PHASE1-add-manufacturer-to-products.sql

-- 3. Rename enterprise to panel and add billing cycle
\echo '3/6 Renaming enterprise to panel...'
\i PHASE1-rename-enterprise-to-panel.sql

-- 4. Enhance installation guides
\echo '4/6 Enhancing installation guides...'
\i PHASE1-installation-guides-enhancements.sql

\echo 'Phase 1 Migrations Complete!'
\echo ''

-- PHASE 2 MIGRATIONS (High-Value Features)
-- ============================================================================

\echo 'Starting Phase 2 Migrations...'

-- 5. Create 2nd hand marketplace tables
\echo '5/7 Creating 2nd hand marketplace tables...'
\i PHASE2-secondhand-marketplace.sql

-- 6. Create notification system tables
\echo '6/7 Creating notification system tables...'
\i PHASE2-notification-system.sql

-- 7. Create order history access tables
\echo '7/7 Creating order history access tables...'
\i PHASE2-order-history-access.sql

\echo 'Phase 2 Migrations Complete!'
\echo ''

-- VERIFICATION QUERIES
-- ============================================================================

\echo 'Running verification queries...'

-- Check manufacturers table
SELECT 'Manufacturers:' as table_name, COUNT(*) as row_count FROM manufacturers;

-- Check products have manufacturer fields
SELECT 'Products with manufacturer_brand:' as info, COUNT(*) as count
FROM products
WHERE manufacturer_brand IS NOT NULL;

-- Check panel subscriptions
SELECT 'Panel subscriptions:' as info, COUNT(*) as count
FROM premium_partnerships
WHERE subscription_plan = 'panel';

-- Check installation guides enhancements
SELECT 'Installation guides with pricing:' as info, COUNT(*) as count
FROM installation_guides
WHERE recommended_installation_price_min IS NOT NULL;

-- Check 2nd hand tables
SELECT 'Secondhand listings:' as table_name, COUNT(*) as row_count FROM secondhand_listings;
SELECT 'Secondhand inquiries:' as table_name, COUNT(*) as row_count FROM secondhand_inquiries;

-- Check notification tables
SELECT 'Notification preferences:' as table_name, COUNT(*) as row_count FROM notification_preferences;
SELECT 'Notification logs:' as table_name, COUNT(*) as row_count FROM notification_logs;

-- Check order history access
SELECT 'Order history access:' as table_name, COUNT(*) as row_count FROM order_history_access;
SELECT 'Order history pricing:' as table_name, COUNT(*) as row_count FROM order_history_access_pricing;

\echo ''
\echo '========================================='
\echo 'ALL MIGRATIONS COMPLETED SUCCESSFULLY!'
\echo '========================================='
\echo ''
\echo 'Next steps:'
\echo '1. Update TypeScript types in src/integrations/supabase/types.ts'
\echo '2. Update application code for new features'
\echo '3. Test all functionality thoroughly'
\echo '========================================='
