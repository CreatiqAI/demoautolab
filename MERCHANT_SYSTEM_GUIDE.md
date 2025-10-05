# Merchant System Implementation Guide

## Overview
This guide covers the complete merchant system implementation including registration with access codes, wallet/points system, bulk pricing, promotions, and differentiated dashboards.

## Database Changes

### 1. Run the Migration

Apply the merchant system migration:

```bash
# Using Supabase CLI
npx supabase db push

# Or apply the migration file directly
psql -U postgres -d your_database -f supabase/migrations/20250913000000_merchant_system.sql
```

### 2. Database Schema Created

The migration creates the following tables:

- **merchant_codes** - Access codes for merchant registration
- **merchant_registrations** - Merchant application details
- **merchant_wallets** - Points and credit balances
- **wallet_transactions** - Transaction history
- **bulk_pricing_tiers** - Quantity-based pricing
- **merchant_promotions** - Exclusive promotions
- **promotion_usage** - Promotion usage tracking
- **merchant_favorites** - Quick reorder items
- **merchant_purchase_history** - Purchase analytics

### 3. Sample Access Codes Created

The migration automatically creates these demo codes:
- `MERCHANT2024` - General merchant registration (unlimited uses)
- `DEALER100` - Dealer program (100 slots)
- `WORKSHOP50` - Workshop partner (50 slots)
- `VIP001` - VIP invitation (10 slots)

## Admin Tasks

### Create New Merchant Access Code

```sql
INSERT INTO public.merchant_codes (code, description, max_uses, is_active)
VALUES ('YOUR_CODE', 'Description of the code', 100, true);
```

### Approve Merchant Application

```sql
-- This will automatically:
-- 1. Update user role to 'merchant'
-- 2. Create merchant wallet
UPDATE public.merchant_registrations
SET status = 'APPROVED',
    approved_at = now(),
    approved_by = 'admin_user_id_here'
WHERE id = 'registration_id_here';
```

### Reject Merchant Application

```sql
UPDATE public.merchant_registrations
SET status = 'REJECTED',
    rejection_reason = 'Reason for rejection'
WHERE id = 'registration_id_here';
```

### View Pending Merchant Applications

```sql
SELECT
  mr.id,
  mr.company_name,
  mr.business_type,
  mr.status,
  mr.created_at,
  p.full_name,
  p.phone_e164,
  mc.code as access_code_used
FROM merchant_registrations mr
JOIN profiles p ON p.id = mr.user_id
JOIN merchant_codes mc ON mc.id = mr.code_id
WHERE mr.status = 'PENDING'
ORDER BY mr.created_at DESC;
```

### Add Points to Merchant Wallet

```sql
-- Add bonus points to a merchant
DO $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Get wallet ID and current balance
  SELECT id, points_balance INTO v_wallet_id, v_new_balance
  FROM merchant_wallets
  WHERE user_id = 'merchant_user_id_here';

  -- Calculate new balance
  v_new_balance := v_new_balance + 100.00;

  -- Update wallet
  UPDATE merchant_wallets
  SET points_balance = v_new_balance,
      total_earned_points = total_earned_points + 100.00
  WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    user_id,
    type,
    amount,
    balance_after,
    description
  ) VALUES (
    v_wallet_id,
    'merchant_user_id_here',
    'EARN_BONUS',
    100.00,
    v_new_balance,
    'Promotional bonus points'
  );
END $$;
```

### Create Bulk Pricing Tier

```sql
-- Example: Add bulk pricing for a product
-- 10-49 units: 5% off merchant price
-- 50-99 units: 10% off
-- 100+ units: 15% off

INSERT INTO public.bulk_pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage, is_active)
SELECT
  p.id,
  10,
  49,
  p.price_merchant * 0.95,
  5.00,
  true
FROM products p WHERE p.sku = 'YOUR-SKU'
UNION ALL
SELECT
  p.id,
  50,
  99,
  p.price_merchant * 0.90,
  10.00,
  true
FROM products p WHERE p.sku = 'YOUR-SKU'
UNION ALL
SELECT
  p.id,
  100,
  NULL, -- NULL means unlimited
  p.price_merchant * 0.85,
  15.00,
  true
FROM products p WHERE p.sku = 'YOUR-SKU';
```

### Create Merchant Promotion

```sql
-- Example: 20% off orders above RM2000
INSERT INTO public.merchant_promotions (
  code,
  name,
  description,
  type,
  discount_value,
  min_purchase_amount,
  max_discount_amount,
  applicable_to,
  valid_from,
  valid_until,
  max_uses,
  is_active
) VALUES (
  'BULK20',
  'Bulk Purchase Discount',
  'Get 20% off on orders above RM2000',
  'PERCENTAGE_DISCOUNT',
  20.00,
  2000.00,
  500.00, -- Max RM500 discount
  'ALL',
  now(),
  now() + INTERVAL '90 days',
  NULL, -- Unlimited uses
  true
);
```

### Update Merchant Tier

```sql
-- Upgrade merchant to GOLD tier with higher points rate
UPDATE public.profiles
SET merchant_tier = 'GOLD',
    points_rate = 1.5 -- Earn 1.5 points per RM
WHERE id = 'merchant_user_id_here'
  AND role = 'merchant';
```

### View Merchant Analytics

```sql
-- Get merchant spending summary
SELECT
  p.id,
  p.full_name,
  mr.company_name,
  p.merchant_tier,
  COUNT(o.id) as total_orders,
  SUM(o.total) as total_spent,
  COALESCE(mw.points_balance, 0) as current_points,
  COALESCE(mw.total_earned_points, 0) as lifetime_points
FROM profiles p
LEFT JOIN merchant_registrations mr ON mr.user_id = p.id
LEFT JOIN orders o ON o.user_id = p.id
LEFT JOIN merchant_wallets mw ON mw.user_id = p.id
WHERE p.role = 'merchant'
GROUP BY p.id, p.full_name, mr.company_name, p.merchant_tier, mw.points_balance, mw.total_earned_points
ORDER BY total_spent DESC NULLS LAST;
```

## Features Included

### 1. Merchant Registration
- **Two-step registration process**
  - Step 1: Validate access code
  - Step 2: Complete registration form with business details
- **Access code validation** with expiry and usage limits
- **Application approval workflow** (Pending → Approved/Rejected)

### 2. Differentiated Pricing
- **Regular users** see `price_regular`
- **Merchants** see `price_merchant` (already in schema)
- **Bulk pricing** for quantity-based discounts
- **Helper function** `get_product_price(product_id, user_id, quantity)` calculates applicable price

### 3. Merchant Dashboard Features

#### Overview Tab
- Account information and merchant tier
- Quick action buttons
- Active promotions preview

#### Wallet Tab
- Points balance display
- Total earned and spent points
- Transaction history
- Points can be used as credits (1 point = RM 1)

#### Promotions Tab
- View all active merchant-exclusive promotions
- Promotion codes and discount details
- Validity and minimum purchase requirements

#### Quick Order Tab
- Favorite products for quick reordering
- Custom notes for each favorite
- One-click add to cart

#### Analytics Tab
- Order statistics (total, completed, pending)
- Total spending
- Membership benefits overview

### 4. Wallet & Points System
- **Earn points** from purchases (configurable rate per merchant tier)
- **Use points** as payment credits
- **Transaction types**:
  - EARN_PURCHASE - Earned from orders
  - EARN_BONUS - Admin bonuses
  - EARN_REFERRAL - Referral rewards
  - SPEND_PURCHASE - Used in orders
  - CREDIT_DEPOSIT - Credit added
  - CREDIT_PAYMENT - Payment with credit
  - ADJUSTMENT - Manual adjustments

### 5. Bulk Pricing Tiers
- Quantity-based pricing rules
- Multiple tiers per product
- Automatic price calculation based on order quantity

### 6. Promotions
- **Types**: Percentage discount, fixed amount, buy X get Y, free shipping, bundle
- **Restrictions**: Min purchase, max discount, specific products/categories
- **Validity**: Date range, usage limits (global and per merchant)
- **Tracking**: Usage history per merchant

## Routes Added

- `/merchant-register` - Merchant registration page
- `/merchant-dashboard` - Merchant dashboard (requires merchant role or pending application)

## Navigation Updates

- Auth page now shows "Register as a Merchant" link in signup tab
- Merchant dashboard accessible from user menu (when merchant role)

## User Journey

### For New Merchants:
1. Visit auth page and see "Register as a Merchant" link
2. Enter valid access code
3. Fill registration form with business details
4. Application submitted with PENDING status
5. Wait for admin approval
6. Once approved:
   - Role changed to 'merchant'
   - Wallet created automatically
   - Access to merchant dashboard
   - See merchant prices throughout the site

### For Regular Users:
1. Standard signup process unchanged
2. See regular prices
3. No access to merchant features

## Merchant Tiers

Four tier levels with different benefits:

- **BRONZE** (Default)
  - 1.0x points rate
  - Basic merchant pricing

- **SILVER**
  - 1.25x points rate
  - Additional promotions

- **GOLD**
  - 1.5x points rate
  - Premium promotions
  - Higher credit limit

- **PLATINUM**
  - 2.0x points rate
  - Exclusive promotions
  - Maximum credit limit
  - Priority support

## Security Features

- Access code validation prevents unauthorized merchant registration
- RLS policies ensure merchants only see their own data
- Admin approval required before merchant privileges activated
- Wallet transactions are audited and immutable
- Promotion usage tracking prevents abuse

## Admin Panel Integration

### Recommended Admin Pages (to be created):

1. **Merchant Applications** - Review and approve/reject applications
2. **Merchant Management** - View all merchants, update tiers, manage credit limits
3. **Merchant Codes** - Create and manage access codes
4. **Bulk Pricing Manager** - Set up bulk pricing tiers
5. **Promotion Manager** - Create and manage merchant promotions
6. **Wallet Management** - Add/deduct points, view transactions

## Next Steps

1. **Apply the migration** to create all tables and functions
2. **Test merchant registration** with demo codes
3. **Approve a test merchant** to see the full dashboard
4. **Create admin pages** for merchant management
5. **Integrate pricing logic** in product display and cart
6. **Implement points** earning on order completion
7. **Add promotion code** application in checkout

## SQL Quick Reference

```sql
-- Create access code
INSERT INTO merchant_codes (code, description) VALUES ('CODE123', 'Description');

-- Approve merchant
UPDATE merchant_registrations SET status = 'APPROVED', approved_at = now() WHERE id = 'xxx';

-- Add points
UPDATE merchant_wallets SET points_balance = points_balance + 100 WHERE user_id = 'xxx';

-- Create promotion
INSERT INTO merchant_promotions (code, name, type, discount_value, min_purchase_amount)
VALUES ('PROMO20', 'Special Offer', 'PERCENTAGE_DISCOUNT', 20, 500);

-- View all merchants
SELECT * FROM profiles WHERE role = 'merchant';

-- Merchant analytics
SELECT p.full_name, COUNT(o.id) as orders, SUM(o.total) as spent
FROM profiles p
LEFT JOIN orders o ON o.user_id = p.id
WHERE p.role = 'merchant'
GROUP BY p.id;
```
