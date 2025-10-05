# Quick Fix Instructions

## Issue 1: SQL Function Error ✅

**Run this SQL in Supabase:**
```sql
-- File: database/fix-voucher-function.sql
-- This drops and recreates the function with proper column references
```

**Copy and paste this directly into Supabase SQL Editor:**

```sql
DROP FUNCTION IF EXISTS get_available_vouchers_for_customer(UUID);

CREATE FUNCTION get_available_vouchers_for_customer(
  p_customer_id UUID
)
RETURNS TABLE(
  id UUID,
  code TEXT,
  name TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  max_discount_amount NUMERIC,
  min_purchase_amount NUMERIC,
  max_usage_per_user INTEGER,
  valid_until TIMESTAMP WITH TIME ZONE,
  times_used INTEGER,
  can_still_use BOOLEAN
) AS $$
DECLARE
  v_customer_type TEXT;
BEGIN
  -- Get customer type
  SELECT cp.customer_type INTO v_customer_type
  FROM customer_profiles cp
  WHERE cp.id = p_customer_id;

  -- Return available vouchers
  RETURN QUERY
  SELECT
    vouchers.id,
    vouchers.code,
    vouchers.name,
    vouchers.description,
    vouchers.discount_type,
    vouchers.discount_value,
    vouchers.max_discount_amount,
    vouchers.min_purchase_amount,
    vouchers.max_usage_per_user,
    vouchers.valid_until,
    (SELECT COUNT(*)::INTEGER
     FROM voucher_usage vu
     WHERE vu.voucher_id = vouchers.id
     AND vu.customer_id = p_customer_id) as times_used,
    ((SELECT COUNT(*)::INTEGER
      FROM voucher_usage vu
      WHERE vu.voucher_id = vouchers.id
      AND vu.customer_id = p_customer_id) < vouchers.max_usage_per_user) as can_still_use
  FROM vouchers
  WHERE vouchers.is_active = true
    AND vouchers.valid_from <= NOW()
    AND (vouchers.valid_until IS NULL OR vouchers.valid_until >= NOW())
    AND (
      vouchers.customer_type_restriction = 'ALL'
      OR (vouchers.customer_type_restriction = 'NORMAL' AND v_customer_type = 'normal')
      OR (vouchers.customer_type_restriction = 'MERCHANT' AND v_customer_type = 'merchant')
    )
    AND (
      vouchers.specific_customer_ids IS NULL
      OR p_customer_id = ANY(vouchers.specific_customer_ids)
    )
    AND (
      vouchers.max_usage_total IS NULL
      OR vouchers.current_usage_count < vouchers.max_usage_total
    )
  ORDER BY vouchers.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

## Issue 2: Navigation Still Showing Wallet/Promotions 🔄

**This is likely a browser cache issue. Try these steps:**

### Step 1: Hard Refresh Browser
- **Windows/Linux**: `Ctrl + F5` or `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### Step 2: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"

### Step 3: Restart Dev Server
```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Verify Changes
After restarting:
- **Normal user** should see: Catalog | My Orders | My Vouchers
- **Merchant user** should see: Catalog | My Orders | My Vouchers | Wallet | Promotions

## Verification Checklist

✅ **SQL Function Fixed:**
1. Run the SQL above in Supabase
2. Should see: "Function created successfully"
3. Refresh `/my-vouchers` page
4. Vouchers should load (no error)

✅ **Navigation Fixed:**
1. Hard refresh browser (Ctrl + F5)
2. Or restart dev server
3. Check navigation as normal user (no Wallet/Promotions)
4. Check navigation as merchant user (has Wallet/Promotions)

## If Still Not Working:

### Check Customer Type
Run this SQL to verify your customer type:
```sql
SELECT
  cp.user_id,
  cp.customer_type,
  cp.full_name
FROM customer_profiles cp
WHERE cp.user_id = auth.uid();
```

If you're logged in as merchant but navigation doesn't update:
- The `isMerchant` state might not be updating
- Hard refresh should fix it
- Or logout and login again

## Expected Behavior:

**Normal Customer (`customer_type = 'normal'`):**
- ✅ See: Catalog, My Orders, My Vouchers
- ❌ Don't see: Wallet, Promotions

**Merchant Customer (`customer_type = 'merchant'`):**
- ✅ See: Catalog, My Orders, My Vouchers, Wallet, Promotions
