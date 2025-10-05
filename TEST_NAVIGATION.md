# Navigation Test Instructions

## The Problem:
You're still seeing Wallet and Promotions in the navbar even though the code has been updated.

## Why This Happens:
1. **Browser cache** - Old JavaScript is cached
2. **Dev server** - Not hot-reloading the changes
3. **Customer type** - User might actually be a merchant

## Steps to Fix:

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for this log: `User customer type: ... isMerchant: ...`
4. **If it says `isMerchant: true`** → You're logged in as a merchant (that's why you see Wallet/Promotions)
5. **If it says `isMerchant: false`** → Continue to Step 2

### Step 2: Hard Refresh Browser
**Windows/Linux:**
```
Ctrl + Shift + R
or
Ctrl + F5
```

**Mac:**
```
Cmd + Shift + R
```

### Step 3: Clear All Cache
1. Open DevTools (F12)
2. Right-click the refresh button (while DevTools is open)
3. Select "Empty Cache and Hard Reload"

### Step 4: Restart Dev Server
```bash
# In terminal, stop the server:
Ctrl + C

# Then restart:
npm run dev
```

### Step 5: Verify Customer Type in Database
Run this SQL in Supabase to check your account type:

```sql
SELECT
  cp.user_id,
  cp.customer_type,
  cp.full_name,
  cp.email
FROM customer_profiles cp
WHERE cp.user_id = auth.uid();
```

**Result should show:**
- `customer_type: 'normal'` → Should NOT see Wallet/Promotions
- `customer_type: 'merchant'` → SHOULD see Wallet/Promotions

### Step 6: Test With Different Account
If you want to test as a normal user:

1. **Option A**: Change your customer type in database:
```sql
UPDATE customer_profiles
SET customer_type = 'normal'
WHERE user_id = auth.uid();
```

2. **Option B**: Create a new normal user account
   - Logout
   - Register a new account (NOT merchant)
   - Login and check navigation

## Expected Behavior:

### Normal User (customer_type = 'normal'):
```
Header Navigation:
├── Catalog
├── My Orders
└── My Vouchers
```

### Merchant User (customer_type = 'merchant'):
```
Header Navigation:
├── Catalog
├── My Orders
├── My Vouchers
├── Wallet        ← Merchant only
└── Promotions    ← Merchant only
```

## Debug Checklist:

- [ ] Check console log for customer type
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Clear cache and hard reload
- [ ] Restart dev server
- [ ] Verify customer_type in database
- [ ] Test with different account if needed

## If Still Not Working:

The issue is likely one of these:
1. You ARE a merchant user (check database)
2. Browser aggressive caching (try incognito mode)
3. Dev server not picking up changes (restart it)

**Quick Test:**
Open browser in **Incognito/Private mode** and login → This will definitely use the new code!
