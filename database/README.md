# AutoLab Database - SQL Scripts

All SQL migration scripts are consolidated in this folder, organized by modification date (latest first).

## File Organization

Files are categorized into:

### 1. Timestamped Migrations (Core Setup)
Files starting with `20XXXXXX_` - Initial database setup and core migrations:
- `20250201000000_add_car_to_customer_profiles.sql` - Latest customer profile update
- `20250903122916_implement_inventory_deduction.sql` - Inventory deduction system
- `20250911000000_enhanced_commercial_kb.sql` - Knowledge base enhancements
- `20250913000001_merchant_system_updated.sql` - Merchant system
- `20250910000001_enhanced_knowledge_base_with_pdf.sql` - PDF support for KB
- And other initial migrations...

### 2. Feature Systems
Core system implementations:
- `voucher-system.sql` - Complete voucher/coupon system
- `premium-partner-system.sql` - Merchant partnership/subscription system
- `customer-tiers-system.sql` - 5-tier customer loyalty system
- `installation-guides-system.sql` - Product installation guides
- `product-reviews-migration.sql` - Product review system
- `COMPLETE-MIGRATION-FIXED-V2.sql` - Complete database migration script

### 3. Phase Migrations
Feature phases implemented:
- `PHASE1-manufacturers-table.sql` - Product manufacturers
- `PHASE1-auto-generate-welcome-voucher.sql` - Auto voucher generation
- `PHASE1-rename-enterprise-to-panel.sql` - Plan name updates
- `PHASE2-points-rewards-system.sql` - Points and rewards
- `PHASE2-secondhand-marketplace.sql` - 2nd hand marketplace
- `PHASE2-notification-system.sql` - Push notifications
- `PHASE2-order-history-access-pricing.sql` - Order pricing access

### 4. Recent Enhancements
- `merchant-registration-enhancements.sql` - Salesmen referral tracking
- `user-registration-enhancements.sql` - User registration with car selection
- `product-installation-guides.sql` - Per-product installation guides
- `car-makes-models.sql` - Malaysian car makes/models data
- `storage-merchant-documents.sql` - Merchant document storage

### 5. Fix Scripts
Bug fixes and corrections (run as needed):
- `FIX-vouchers-schema-mismatch.sql` - Latest voucher trigger fix
- `FIX-all-tables-rls.sql` - RLS policies for all tables
- `FIX-google-auth-COMPLETE.sql` - Google OAuth complete fix
- `FIX-ALL-POINTS-RLS-FINAL.sql` - Points system RLS
- `FIX-REDEEM-REWARD-FUNCTION.sql` - Reward redemption fix
- And other fixes...

## Quick Setup

### For New Installation
Run the timestamped migrations in order, then:
```sql
\i COMPLETE-MIGRATION-FIXED-V2.sql
\i RUN-ALL-POINTS-REWARDS-FIXES-V3.sql
```

### For Feature Updates
Run the relevant PHASE files for new features.

### For Bug Fixes
Check the FIX-* files for specific issues.

## Latest Changes (as of Feb 2025)

1. `FIX-vouchers-schema-mismatch.sql` - Fixed welcome voucher trigger
2. `merchant-registration-enhancements.sql` - Added salesmen referral system
3. `user-registration-enhancements.sql` - Enhanced user registration
4. `FIX-all-tables-rls.sql` - Comprehensive RLS fix
5. `FIX-google-auth-COMPLETE.sql` - Google OAuth fix

## Notes

- All SQL files from `/supabase/migrations/` have been moved here
- Old versions and diagnostic scripts have been removed
- Files are named by their creation/modification date for easy ordering
