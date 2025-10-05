# Merchant System - Quick Start Guide

## 1️⃣ Apply Database Migration (5 minutes)

```bash
cd automot-hub-main
npx supabase db push
```

**OR** run the SQL file directly:
```bash
psql -U postgres -d your_db -f supabase/migrations/20250913000001_merchant_system_updated.sql
```

---

## 2️⃣ Test Registration (2 minutes)

1. Go to: `http://localhost:5173/auth` (or your URL)
2. Click **Sign Up** tab
3. Click **"Register as a Merchant"** link
4. Enter access code: **MERCHANT2024**
5. Fill the form and submit

Demo codes available:
- `MERCHANT2024` - Unlimited uses
- `DEALER100` - 100 slots
- `WORKSHOP50` - 50 slots
- `VIP001` - 10 slots

---

## 3️⃣ Approve Merchant (1 minute)

Run in your database:

```sql
-- See pending applications
SELECT id, company_name FROM merchant_registrations WHERE status = 'PENDING';

-- Copy the ID and approve
UPDATE merchant_registrations
SET status = 'APPROVED', approved_at = now()
WHERE id = 'paste-the-id-here';
```

This automatically:
- ✅ Updates customer to 'merchant' type
- ✅ Creates wallet with 0 balance
- ✅ Grants merchant dashboard access
- ✅ Shows wholesale prices

---

## 4️⃣ View Dashboard (1 minute)

1. Log in as the approved merchant
2. Go to: `http://localhost:5173/merchant-dashboard`
3. Explore all features!

---

## 5️⃣ Common Admin Tasks

### Add Bonus Points
```sql
UPDATE merchant_wallets
SET points_balance = points_balance + 100,
    total_earned_points = total_earned_points + 100
WHERE customer_id = (
  SELECT id FROM customer_profiles WHERE phone = '+60123456789'
);
```

### Create New Access Code
```sql
INSERT INTO merchant_codes (code, description)
VALUES ('NEWCODE2024', 'Description here');
```

### Upgrade Merchant Tier
```sql
UPDATE customer_profiles
SET merchant_tier = 'GOLD',
    points_rate = 1.5,
    credit_limit = 30000
WHERE phone = '+60123456789';
```

### Create Promotion
```sql
INSERT INTO merchant_promotions (
  code, name, type, discount_value, min_purchase_amount, valid_until
) VALUES (
  'SAVE20', '20% Off', 'PERCENTAGE_DISCOUNT',
  20, 1000, now() + INTERVAL '30 days'
);
```

### View All Merchants
```sql
SELECT cp.full_name, mr.company_name, cp.merchant_tier,
       mw.points_balance
FROM customer_profiles cp
JOIN merchant_registrations mr ON mr.customer_id = cp.id
LEFT JOIN merchant_wallets mw ON mw.customer_id = cp.id
WHERE cp.customer_type = 'merchant';
```

---

## 📚 Documentation Files

- **MERCHANT_IMPLEMENTATION_SUMMARY.md** - Complete overview
- **MERCHANT_SQL_COMMANDS.md** - All SQL commands
- **MERCHANT_SYSTEM_GUIDE.md** - Detailed guide

---

## 🎯 Key Features

✅ **Access Code Registration** - Control who can register
✅ **Approval Workflow** - Admin reviews before activation
✅ **Wallet System** - Points as credits (1 point = RM 1)
✅ **Wholesale Pricing** - Automatic merchant prices
✅ **Bulk Discounts** - Quantity-based tiers
✅ **Exclusive Promotions** - Merchant-only offers
✅ **4 Tier Levels** - Bronze → Silver → Gold → Platinum
✅ **Credit Terms** - Configurable credit limits
✅ **Quick Reorder** - Favorite products
✅ **Analytics** - Order history and stats

---

## 🔧 Troubleshooting

**Migration fails?**
- Check if `customer_profiles` table exists
- Ensure `products` and `orders` tables exist

**Can't see merchant dashboard?**
- Check application is APPROVED
- Verify `customer_type` = 'merchant'
- Clear browser cache

**Prices not showing correctly?**
- Check `pricing_type` = 'wholesale'
- Verify `customer_type` = 'merchant'

**RLS policy errors?**
- Check user is authenticated
- Verify `customer_profiles.user_id` matches `auth.uid()`

---

## 🚀 You're Ready!

The merchant system is now live and ready to use. Merchants can:
- Register with access codes
- Get wholesale pricing
- Earn and use points
- Access exclusive promotions
- Reorder quickly
- Buy in bulk with discounts

Happy selling! 🎉
