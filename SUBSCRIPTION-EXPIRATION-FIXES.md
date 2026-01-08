# Subscription Expiration Access Control - Summary

## Overview
Implemented proper access control to prevent expired merchant subscriptions from accessing premium benefits.

## Changes Made

### 1. **FindShops.tsx** - Hide Expired Panel Shops
**File**: `src/pages/FindShops.tsx:118`

**Change**: Added expiration date filter to Find Shops query
```typescript
.gt('subscription_end_date', new Date().toISOString()) // Only active, non-expired subscriptions
```

**Impact**: Expired panel shops will no longer appear in the Find Shops directory

---

### 2. **MerchantConsole.tsx** - Block Installation Guides Access
**File**: `src/pages/MerchantConsole.tsx:70-74`

**Change**: Updated `hasGuidesAccess` to check subscription expiration
```typescript
const hasGuidesAccess = (partnership?.subscription_plan === 'professional' || partnership?.subscription_plan === 'panel') &&
                        partnership?.subscription_status === 'ACTIVE' &&
                        partnership?.admin_approved &&
                        partnership?.subscription_end_date &&
                        new Date(partnership.subscription_end_date) > new Date();
```

**Impact**: Merchants with expired subscriptions can no longer access Installation Guides

---

### 3. **Database Functions** - B2B Pricing Access Control

Created two database functions to enforce subscription expiration checks for pricing:

#### **CREATE-PRICING-CONTEXT-FUNCTION.sql**
**Purpose**: Determines if a merchant gets B2B pricing based on active, non-expired subscription

**Key Logic**:
- Checks if user is a merchant
- Verifies subscription is ACTIVE and admin_approved
- **Checks if subscription_end_date > NOW()**
- Returns B2B pricing only if all conditions met
- Returns B2C pricing for expired merchants

**Usage**: Called by `usePricing` hook in the frontend

#### **CREATE-COMPONENTS-WITH-PRICING-FUNCTION.sql**
**Purpose**: Returns component catalog with appropriate pricing based on subscription status

**Key Logic**:
- Checks merchant subscription status and expiration
- **Only shows merchant_price if subscription is active AND not expired**
- Falls back to normal_price for expired merchants

**Usage**: Called by `useComponentPricing` hook in Catalog page

---

## Database Migration Required

⚠️ **IMPORTANT**: You need to run these SQL files in Supabase SQL Editor:

1. Navigate to Supabase Dashboard → SQL Editor
2. Run these files in order:
   ```
   database/CREATE-PRICING-CONTEXT-FUNCTION.sql
   database/CREATE-COMPONENTS-WITH-PRICING-FUNCTION.sql
   ```

---

## How It Works Now

### **For Panel Subscription (RM350/month)**
When subscription expires:
- ❌ Shop no longer appears in Find Shops directory
- ❌ Cannot access Installation Guides
- ❌ Loses B2B merchant pricing → sees B2C prices
- ✅ Can still access Merchant Console to renew subscription

### **For Professional Subscription (RM99/year)**
When subscription expires:
- ✅ Shop was never in Find Shops (only Panel tier shows)
- ❌ Cannot access Installation Guides
- ❌ Loses B2B merchant pricing → sees B2C prices
- ✅ Can still access Merchant Console to renew subscription

---

## Testing Checklist

After running the SQL migrations, test the following:

### Test Expired Subscription:
1. ✅ Expired Panel shop should NOT appear in Find Shops
2. ✅ Expired merchant should see "Installation Guides" tab locked
3. ✅ Expired merchant should see normal (B2C) prices in Catalog
4. ✅ Expired merchant should see "Renew Now" button in Merchant Console
5. ✅ Clicking "Renew Now" should go to Payment Gateway (not old premium-partner page)

### Test Active Subscription:
1. ✅ Active Panel shop should appear in Find Shops
2. ✅ Active merchant should access Installation Guides
3. ✅ Active merchant should see merchant (B2B) prices in Catalog
4. ✅ Active merchant should see green "Active" badge in Merchant Console

---

## Files Modified

1. `src/pages/FindShops.tsx` - Added expiration filter
2. `src/pages/MerchantConsole.tsx` - Updated guides access check
3. `src/components/Header.tsx` - Fixed "Renew now" links to go to Merchant Console
4. `src/App.tsx` - Added `/merchant-console` route
5. `database/CREATE-PRICING-CONTEXT-FUNCTION.sql` - New database function
6. `database/CREATE-COMPONENTS-WITH-PRICING-FUNCTION.sql` - New database function

---

## Business Logic Summary

**Active Subscription Benefits** (requires all conditions):
1. ✅ `subscription_status = 'ACTIVE'`
2. ✅ `admin_approved = true`
3. ✅ `subscription_end_date > NOW()`
4. ✅ Plan is 'professional' or 'panel'

**If ANY condition fails** → Merchant loses premium benefits and sees B2C experience

---

## Next Steps

1. **Run the SQL migrations** in Supabase SQL Editor
2. **Test with expired merchant account** to verify access is blocked
3. **Test renewal flow** to ensure payment gateway works correctly
4. **Monitor logs** for any pricing context errors

---

Generated: 2026-01-02
