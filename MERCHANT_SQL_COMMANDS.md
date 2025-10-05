# Merchant System - SQL Commands Reference

This guide provides SQL commands for managing the merchant system with your `customer_profiles` schema.

## 1. Apply the Migration

```bash
# Using Supabase CLI
npx supabase db push

# Or connect to your database and run:
psql -U postgres -d your_database -f supabase/migrations/20250913000001_merchant_system_updated.sql
```

## 2. View Pending Merchant Applications

```sql
SELECT
  mr.id,
  mr.company_name,
  mr.business_type,
  mr.status,
  mr.created_at,
  cp.full_name,
  cp.phone,
  cp.email,
  mc.code as access_code_used
FROM merchant_registrations mr
JOIN customer_profiles cp ON cp.id = mr.customer_id
JOIN merchant_codes mc ON mc.id = mr.code_id
WHERE mr.status = 'PENDING'
ORDER BY mr.created_at DESC;
```

## 3. Approve Merchant Application

```sql
-- This will automatically:
-- 1. Update customer_type to 'merchant'
-- 2. Set pricing_type to 'wholesale'
-- 3. Create merchant wallet
UPDATE merchant_registrations
SET status = 'APPROVED',
    approved_at = now(),
    approved_by = 'admin_customer_profile_id_here'
WHERE id = 'registration_id_here';
```

**Example with specific registration:**
```sql
-- Approve by company name
UPDATE merchant_registrations
SET status = 'APPROVED',
    approved_at = now()
WHERE company_name = 'ABC Auto Parts Sdn Bhd';
```

## 4. Reject Merchant Application

```sql
UPDATE merchant_registrations
SET status = 'REJECTED',
    rejection_reason = 'Incomplete business documentation'
WHERE id = 'registration_id_here';
```

## 5. View All Merchants

```sql
SELECT
  cp.id,
  cp.full_name,
  cp.phone,
  cp.email,
  cp.customer_type,
  cp.pricing_type,
  cp.merchant_tier,
  cp.credit_limit,
  cp.points_rate,
  mr.company_name,
  mr.business_type,
  mr.business_registration_no,
  mw.points_balance,
  mw.credit_balance
FROM customer_profiles cp
LEFT JOIN merchant_registrations mr ON mr.customer_id = cp.id
LEFT JOIN merchant_wallets mw ON mw.customer_id = cp.id
WHERE cp.customer_type = 'merchant'
ORDER BY cp.created_at DESC;
```

## 6. Create Merchant Access Code

```sql
-- General merchant code (unlimited uses)
INSERT INTO merchant_codes (code, description, is_active)
VALUES ('MERCHANT2025', 'General merchant registration for 2025', true);

-- Limited use code
INSERT INTO merchant_codes (code, description, max_uses, is_active)
VALUES ('SPECIAL100', 'Limited offer - 100 merchants', 100, true);

-- Time-limited code
INSERT INTO merchant_codes (code, description, valid_until, is_active)
VALUES (
  'PROMO2024Q1',
  'Q1 2024 Promotion',
  '2024-03-31 23:59:59',
  true
);
```

## 7. Add Points to Merchant Wallet

```sql
-- Method 1: Simple update (manual bonus)
DO $$
DECLARE
  v_customer_id UUID := 'customer_profile_id_here';
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_bonus_amount NUMERIC := 100.00;
BEGIN
  -- Get wallet
  SELECT id, points_balance INTO v_wallet_id, v_new_balance
  FROM merchant_wallets
  WHERE customer_id = v_customer_id;

  -- Calculate new balance
  v_new_balance := v_new_balance + v_bonus_amount;

  -- Update wallet
  UPDATE merchant_wallets
  SET points_balance = v_new_balance,
      total_earned_points = total_earned_points + v_bonus_amount
  WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    customer_id,
    type,
    amount,
    balance_after,
    description
  ) VALUES (
    v_wallet_id,
    v_customer_id,
    'EARN_BONUS',
    v_bonus_amount,
    v_new_balance,
    'Welcome bonus - 100 points'
  );
END $$;
```

**Simpler version for quick bonus:**
```sql
-- Find customer by phone and add 100 points
WITH customer AS (
  SELECT id FROM customer_profiles WHERE phone = '+60123456789'
),
wallet AS (
  SELECT id, points_balance FROM merchant_wallets WHERE customer_id = (SELECT id FROM customer)
)
UPDATE merchant_wallets
SET points_balance = points_balance + 100,
    total_earned_points = total_earned_points + 100
WHERE customer_id = (SELECT id FROM customer);
```

## 8. Deduct Points from Wallet

```sql
DO $$
DECLARE
  v_customer_id UUID := 'customer_profile_id_here';
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_deduct_amount NUMERIC := 50.00;
BEGIN
  -- Get wallet
  SELECT id, points_balance INTO v_wallet_id, v_new_balance
  FROM merchant_wallets
  WHERE customer_id = v_customer_id;

  -- Check sufficient balance
  IF v_new_balance < v_deduct_amount THEN
    RAISE EXCEPTION 'Insufficient points balance';
  END IF;

  -- Calculate new balance
  v_new_balance := v_new_balance - v_deduct_amount;

  -- Update wallet
  UPDATE merchant_wallets
  SET points_balance = v_new_balance,
      total_spent_points = total_spent_points + v_deduct_amount
  WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    customer_id,
    type,
    amount,
    balance_after,
    description
  ) VALUES (
    v_wallet_id,
    v_customer_id,
    'SPEND_DEDUCTION',
    -v_deduct_amount,
    v_new_balance,
    'Administrative deduction'
  );
END $$;
```

## 9. Upgrade Merchant Tier

```sql
-- Upgrade to GOLD tier with 1.5x points rate and RM10,000 credit limit
UPDATE customer_profiles
SET merchant_tier = 'GOLD',
    points_rate = 1.5,
    credit_limit = 10000.00
WHERE id = 'customer_profile_id_here'
  AND customer_type = 'merchant';
```

**Tier reference:**
- BRONZE: 1.0x points, RM 5,000 credit
- SILVER: 1.25x points, RM 15,000 credit
- GOLD: 1.5x points, RM 30,000 credit
- PLATINUM: 2.0x points, RM 50,000+ credit

## 10. Create Bulk Pricing Tier

```sql
-- Add 3-tier bulk pricing for a product
-- Example: Brake pads with bulk discounts

-- Tier 1: 10-49 units = 5% off merchant price
INSERT INTO bulk_pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage, is_active)
SELECT
  id,
  10,
  49,
  price_merchant * 0.95,
  5.00,
  true
FROM products
WHERE sku = 'BRK-001';

-- Tier 2: 50-99 units = 10% off
INSERT INTO bulk_pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage, is_active)
SELECT
  id,
  50,
  99,
  price_merchant * 0.90,
  10.00,
  true
FROM products
WHERE sku = 'BRK-001';

-- Tier 3: 100+ units = 15% off
INSERT INTO bulk_pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage, is_active)
SELECT
  id,
  100,
  NULL, -- NULL means unlimited
  price_merchant * 0.85,
  15.00,
  true
FROM products
WHERE sku = 'BRK-001';
```

## 11. Create Merchant Promotion

```sql
-- Example 1: Percentage discount
INSERT INTO merchant_promotions (
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
  is_active
) VALUES (
  'BULK20',
  '20% Bulk Purchase Discount',
  'Get 20% off on orders above RM2000',
  'PERCENTAGE_DISCOUNT',
  20.00,
  2000.00,
  500.00, -- Max RM500 discount
  'ALL',
  now(),
  now() + INTERVAL '90 days',
  true
);

-- Example 2: Fixed amount discount
INSERT INTO merchant_promotions (
  code,
  name,
  description,
  type,
  discount_value,
  min_purchase_amount,
  applicable_to,
  valid_from,
  valid_until,
  max_uses_per_merchant,
  is_active
) VALUES (
  'WELCOME50',
  'New Merchant Welcome',
  'RM50 off your first order',
  'FIXED_AMOUNT',
  50.00,
  500.00,
  'ALL',
  now(),
  now() + INTERVAL '180 days',
  1, -- One time per merchant
  true
);

-- Example 3: Category-specific promotion
INSERT INTO merchant_promotions (
  code,
  name,
  description,
  type,
  discount_value,
  min_purchase_amount,
  applicable_to,
  category_ids,
  valid_until,
  is_active
) VALUES (
  'BRAKES15',
  'Brake Parts Special',
  '15% off all brake components',
  'PERCENTAGE_DISCOUNT',
  15.00,
  300.00,
  'SPECIFIC_CATEGORIES',
  ARRAY[(SELECT id FROM categories WHERE slug = 'brake-system')],
  now() + INTERVAL '30 days',
  true
);
```

## 12. View Merchant Analytics

```sql
-- Overall merchant statistics
SELECT
  COUNT(*) as total_merchants,
  COUNT(*) FILTER (WHERE merchant_tier = 'BRONZE') as bronze_count,
  COUNT(*) FILTER (WHERE merchant_tier = 'SILVER') as silver_count,
  COUNT(*) FILTER (WHERE merchant_tier = 'GOLD') as gold_count,
  COUNT(*) FILTER (WHERE merchant_tier = 'PLATINUM') as platinum_count,
  SUM(credit_limit) as total_credit_extended,
  AVG(credit_limit) as avg_credit_limit
FROM customer_profiles
WHERE customer_type = 'merchant';

-- Top spending merchants
SELECT
  cp.full_name,
  mr.company_name,
  cp.merchant_tier,
  COUNT(o.id) as total_orders,
  SUM(o.total) as total_spent,
  COALESCE(mw.points_balance, 0) as current_points
FROM customer_profiles cp
JOIN merchant_registrations mr ON mr.customer_id = cp.id
LEFT JOIN orders o ON o.user_id = cp.user_id
LEFT JOIN merchant_wallets mw ON mw.customer_id = cp.id
WHERE cp.customer_type = 'merchant'
GROUP BY cp.id, cp.full_name, mr.company_name, cp.merchant_tier, mw.points_balance
ORDER BY total_spent DESC NULLS LAST
LIMIT 20;

-- Merchant wallet summary
SELECT
  cp.full_name,
  mr.company_name,
  cp.merchant_tier,
  mw.points_balance,
  mw.credit_balance,
  mw.total_earned_points,
  mw.total_spent_points
FROM customer_profiles cp
JOIN merchant_registrations mr ON mr.customer_id = cp.id
JOIN merchant_wallets mw ON mw.customer_id = cp.id
WHERE cp.customer_type = 'merchant'
ORDER BY mw.points_balance DESC;
```

## 13. View Promotion Usage

```sql
-- Promotion usage statistics
SELECT
  mp.code,
  mp.name,
  mp.type,
  COUNT(pu.id) as times_used,
  COUNT(DISTINCT pu.customer_id) as unique_merchants,
  SUM(pu.discount_amount) as total_discount_given,
  AVG(pu.discount_amount) as avg_discount
FROM merchant_promotions mp
LEFT JOIN promotion_usage pu ON pu.promotion_id = mp.id
WHERE mp.is_active = true
GROUP BY mp.id, mp.code, mp.name, mp.type
ORDER BY times_used DESC;
```

## 14. Manually Convert Customer to Merchant

If you want to manually convert an existing customer to merchant:

```sql
-- Step 1: Update customer profile
UPDATE customer_profiles
SET customer_type = 'merchant',
    pricing_type = 'wholesale',
    merchant_tier = 'BRONZE',
    points_rate = 1.0,
    credit_limit = 5000.00
WHERE id = 'customer_profile_id_here';

-- Step 2: Create wallet
INSERT INTO merchant_wallets (customer_id)
VALUES ('customer_profile_id_here')
ON CONFLICT (customer_id) DO NOTHING;

-- Step 3: Create registration record (optional, for record-keeping)
INSERT INTO merchant_registrations (
  customer_id,
  code_id,
  company_name,
  business_type,
  status,
  approved_at
) VALUES (
  'customer_profile_id_here',
  (SELECT id FROM merchant_codes WHERE code = 'MERCHANT2024' LIMIT 1),
  'Company Name Here',
  'Retailer',
  'APPROVED',
  now()
);
```

## 15. Disable/Enable Merchant Code

```sql
-- Disable a code
UPDATE merchant_codes
SET is_active = false
WHERE code = 'OLD_CODE';

-- Re-enable a code
UPDATE merchant_codes
SET is_active = true
WHERE code = 'REACTIVATED_CODE';
```

## 16. View Wallet Transactions for a Merchant

```sql
SELECT
  wt.created_at,
  wt.type,
  wt.amount,
  wt.balance_after,
  wt.description,
  wt.reference_type,
  wt.reference_id
FROM wallet_transactions wt
JOIN customer_profiles cp ON cp.id = wt.customer_id
WHERE cp.phone = '+60123456789' -- or use customer_id
ORDER BY wt.created_at DESC
LIMIT 50;
```

## 17. Check Product Price for Merchant

Use the helper function to get the correct price:

```sql
-- Get price for 25 units of a product for a specific merchant
SELECT get_product_price(
  (SELECT id FROM products WHERE sku = 'BRK-001'),
  (SELECT id FROM customer_profiles WHERE phone = '+60123456789'),
  25
) as applicable_price;
```

## 18. Useful Queries for Admin Panel

```sql
-- Pending applications count
SELECT COUNT(*) as pending_applications
FROM merchant_registrations
WHERE status = 'PENDING';

-- Today's new merchant applications
SELECT COUNT(*) as todays_applications
FROM merchant_registrations
WHERE DATE(created_at) = CURRENT_DATE;

-- Active promotion codes
SELECT code, name, valid_until, current_uses, max_uses
FROM merchant_promotions
WHERE is_active = true
  AND (valid_until IS NULL OR valid_until >= now())
ORDER BY created_at DESC;

-- Merchants by tier distribution
SELECT
  merchant_tier,
  COUNT(*) as count,
  ROUND(AVG(credit_limit), 2) as avg_credit_limit,
  ROUND(AVG(points_rate), 2) as avg_points_rate
FROM customer_profiles
WHERE customer_type = 'merchant'
GROUP BY merchant_tier
ORDER BY
  CASE merchant_tier
    WHEN 'PLATINUM' THEN 1
    WHEN 'GOLD' THEN 2
    WHEN 'SILVER' THEN 3
    WHEN 'BRONZE' THEN 4
  END;
```

## Quick Reference

**Approve merchant:**
```sql
UPDATE merchant_registrations SET status = 'APPROVED', approved_at = now() WHERE id = 'xxx';
```

**Add 100 bonus points:**
```sql
UPDATE merchant_wallets SET points_balance = points_balance + 100, total_earned_points = total_earned_points + 100 WHERE customer_id = 'xxx';
```

**Create access code:**
```sql
INSERT INTO merchant_codes (code, description) VALUES ('NEWCODE', 'Description');
```

**Upgrade tier:**
```sql
UPDATE customer_profiles SET merchant_tier = 'GOLD', points_rate = 1.5, credit_limit = 30000 WHERE id = 'xxx';
```

**View all merchants:**
```sql
SELECT * FROM customer_profiles WHERE customer_type = 'merchant';
```
