# Voucher Checkout Filtering - Smart Availability ✅

## Issue:
Checkout voucher dropdown was showing ALL vouchers, including:
- ❌ Vouchers already used by the customer (max usage reached)
- ❌ Vouchers that don't meet the minimum purchase requirement
- ❌ Expired or inactive vouchers

## Solution:

### 1. ✅ Enhanced Database Function

**File:** `database/fix-available-vouchers-checkout.sql`

**New Functions Created:**

#### `get_available_vouchers_for_checkout(customer_id, order_amount)`
Smart function that filters vouchers based on:
- ✅ Active status only
- ✅ Currently valid (within date range)
- ✅ Matches customer type (ALL/NORMAL/MERCHANT)
- ✅ Customer hasn't exceeded personal usage limit
- ✅ Total usage limit not reached
- ✅ **Meets minimum purchase requirement for current order**
- ✅ Specific customer restrictions (if any)

#### `get_available_vouchers_for_customer(customer_id)`
Backward-compatible function for viewing all eligible vouchers (without order amount filter)

### 2. ✅ Updated Checkout Modal

**File:** `src/components/CheckoutModal.tsx`

**Changes:**
- Switched from `get_available_vouchers_for_customer` to `get_available_vouchers_for_checkout`
- Passes current order amount (subtotal + delivery fee)
- Re-fetches vouchers when delivery method changes (affects total)

**Smart Filtering:**
```typescript
// Calculates order amount
const subtotal = selectedItems.reduce(...);
const deliveryFee = deliveryMethods.find(...)?.price || 0;
const orderAmount = subtotal + deliveryFee;

// Fetches only applicable vouchers
const { data: vouchers } = await supabase.rpc('get_available_vouchers_for_checkout', {
  p_customer_id: profile.id,
  p_order_amount: orderAmount
});
```

## How to Apply:

**Run this SQL in Supabase SQL Editor:**
```
database/fix-available-vouchers-checkout.sql
```

## Testing:

### Test Case 1: Usage Limit Reached
1. Create voucher: `ONCE`, max_usage_per_user = 1
2. Use it in one order
3. Try to checkout again
4. ✅ Should NOT show `ONCE` in dropdown

### Test Case 2: Minimum Purchase Not Met
1. Create voucher: `BIG100`, min_purchase = RM 100
2. Add items totaling RM 50 to cart
3. Go to checkout
4. ✅ Should NOT show `BIG100` in dropdown
5. Add more items to reach RM 100+
6. Refresh checkout
7. ✅ Should NOW show `BIG100` in dropdown

### Test Case 3: Delivery Fee Changes Total
1. Cart total: RM 95
2. Select delivery: FREE (total still RM 95)
3. ✅ Vouchers requiring RM 100+ hidden
4. Change delivery: RM 10 fee (total now RM 105)
5. ✅ Vouchers requiring RM 100+ now appear

### Test Case 4: Customer Type Restriction
1. Login as normal customer
2. Create voucher: `MERCHANT10` for merchants only
3. Go to checkout
4. ✅ Should NOT show `MERCHANT10`

## Result:

**Before:**
- Shows 10 vouchers (including 2 already used)
- Shows vouchers requiring RM 500 even if cart is RM 100
- Confusing for customers

**After:**
- Shows only 5 applicable vouchers
- All shown vouchers are actually usable
- Clear and user-friendly experience

## Benefits:

✅ **No Confusion** - Only shows vouchers customer can actually use
✅ **Smart Filtering** - Considers order amount, usage limits, dates
✅ **Dynamic Updates** - Re-filters when delivery method changes
✅ **Better UX** - Customers see only relevant options
✅ **Prevents Errors** - No "voucher not valid" messages after selection

## Backward Compatibility:

The old function `get_available_vouchers_for_customer` still works for:
- My Vouchers page (shows all eligible vouchers)
- Admin voucher management
- Any other places that need to see all vouchers without order amount filter
