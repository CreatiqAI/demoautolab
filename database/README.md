# Database Migration Scripts

This folder contains all SQL migration scripts for the AutoLab system.

## Setup Order (Run these in sequence)

### 1. Core System Setup
```sql
-- Admin authentication
\i setup-admin-auth-system.sql

-- Premium partnerships (merchant subscriptions)
\i premium-partner-system.sql

-- Customer tier system
\i customer-tiers-system.sql

-- Installation guides (for enterprise merchants)
\i installation-guides-system.sql

-- Product reviews with moderation
\i product-reviews-migration.sql

-- Voucher system
\i voucher-system.sql
```

### 2. RLS Policy Fixes (If admin features don't work)

Since admins use localStorage auth (not Supabase Auth), RLS needs to be disabled:

```sql
-- Fix customer tiers RLS
\i fix-customer-tiers-rls-NO-RLS.sql

-- Fix installation guides RLS
\i fix-installation-guides-rls.sql

-- Fix premium partnerships RLS
\i fix-premium-partnership-rls.sql

-- Fix subscription plan constraint
\i fix-subscription-plan-constraint-v3.sql
```

### 3. Additional Features (Optional)

```sql
-- Add shop photos feature
\i add-shop-photos.sql

-- Add review images support
\i add-review-images.sql

-- Add renewal history tracking
\i add-renewal-history.sql

-- Fix order status enum
\i fix-order-status-enum.sql
```

## File Descriptions

### Core Setup Files
- `setup-admin-auth-system.sql` - Admin login system (username/password)
- `premium-partner-system.sql` - Merchant subscription management
- `customer-tiers-system.sql` - 5-tier customer loyalty system
- `installation-guides-system.sql` - Video guides for enterprise merchants
- `product-reviews-migration.sql` - Product review system with moderation
- `voucher-system.sql` - Voucher creation and validation

### Fix/Update Files
- `fix-customer-tiers-rls-NO-RLS.sql` - Disables RLS for admin access
- `fix-installation-guides-rls.sql` - Disables RLS for guides
- `fix-premium-partnership-rls.sql` - Disables RLS for partnerships
- `fix-subscription-plan-constraint-v3.sql` - Updates plan constraint
- `fix-review-rls-policies.sql` - Updates review RLS policies
- `fix-order-status-enum.sql` - Fixes order status values
- `fix-expired-subscription.sql` - Handles expired subscriptions

### Enhancement Files
- `add-shop-photos.sql` - Shop photo gallery feature
- `add-review-images.sql` - Image uploads for reviews
- `add-renewal-history.sql` - Track subscription renewals
- `add-completed-status.sql` - Add completed order status
- `customer-tiers-monthly-update.sql` - Monthly spending reset

### Utility Files
- `verify-admin-and-tiers.sql` - Check admin and tier setup
- `sample-premium-partnerships.sql` - Sample partnership data
- `categories-rls-fix.sql` - Fix category RLS
- `orders-rls-fix.sql` - Fix orders RLS

## Archive Folder

Old, deprecated, and test files have been moved to `database/archive/`:
- Versioned files (v1, v2, etc.)
- Test files (test-*.sql)
- Debug scripts (debug-*.sql)
- Deprecated migrations

## Quick Commands

### Check if migrations ran successfully
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'admin_profiles',
  'customer_tiers',
  'installation_guides',
  'premium_partnerships',
  'product_reviews'
);

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Reset (if needed)
```sql
-- CAUTION: This will delete all data!
DROP TABLE IF EXISTS customer_tiers CASCADE;
DROP TABLE IF EXISTS installation_guides CASCADE;
-- etc...
```

## Troubleshooting

**Admin features not working?**
→ Run RLS fix scripts (see section 2 above)

**Subscription plan error?**
→ Run `fix-subscription-plan-constraint-v3.sql`

**Tiers not auto-upgrading?**
→ Check triggers exist: `SELECT * FROM pg_trigger WHERE tgname LIKE '%tier%';`

---

For detailed setup instructions, see `SETUP_GUIDE.md` in project root.
