# Merchant Points System - Complete Guide

**Last Updated:** 2025-11-16
**Status:** Database Ready, Business Logic Needed

---

## 📊 Overview

Based on the database schema and existing code, here's what the **Merchant Points System** is designed to do:

---

## 🎯 What Points Can Do

### **1. EARNING POINTS** 💰

Points are earned through various activities:

| Activity | Transaction Type | How It Works |
|----------|-----------------|--------------|
| **Make a Purchase** | `EARN_PURCHASE` | Earn points on every order (based on points_rate) |
| **Bonus Points** | `EARN_BONUS` | Admin can award bonus points manually |
| **Referral Program** | `EARN_REFERRAL` | Earn points for referring new merchants |

**Points Rate System:**
- Each merchant has a `points_rate` (default: 1.00)
- Formula: `Points Earned = Total Purchase Amount × Points Rate`
- Example:
  - Purchase: RM 1,000
  - Points Rate: 1.0x
  - **Points Earned: 1,000 points**

**Merchant Tiers (affect points rate):**
- **BRONZE**: 1.0x points (default)
- **SILVER**: 1.2x points (20% bonus)
- **GOLD**: 1.5x points (50% bonus)
- **PLATINUM**: 2.0x points (100% bonus)

---

### **2. SPENDING/REDEEMING POINTS** 🎁

Points can be used as payment:

| Activity | Transaction Type | How It Works |
|----------|-----------------|--------------|
| **Use for Purchase** | `SPEND_PURCHASE` | Redeem points during checkout |
| **Admin Deduction** | `SPEND_DEDUCTION` | Admin can deduct points if needed |

**Redemption Value:**
- **1 Point = RM 1.00** (1:1 conversion)
- Example: 500 points = RM 500 discount

**Usage in Checkout:**
- Merchants can choose to pay with:
  - Full cash/bank transfer
  - Partial points + cash
  - Full points (if balance sufficient)

---

### **3. CREDIT SYSTEM** 💳

Separate from points, merchants have a **credit balance**:

| Field | Purpose |
|-------|---------|
| `credit_balance` | Current credit available |
| `credit_limit` | Maximum credit allowed (set by admin) |

**Credit Transactions:**
- `CREDIT_DEPOSIT` - Admin adds credit to merchant account
- `CREDIT_PAYMENT` - Merchant pays using credit

**How Credit Works:**
- Admin approves credit limit (e.g., RM 10,000)
- Merchant can "buy now, pay later" up to the limit
- Credit balance goes negative when used
- Admin tracks credit payback

**Example:**
```
Initial State:
- Credit Limit: RM 10,000
- Credit Balance: RM 0

After RM 5,000 Purchase on Credit:
- Credit Balance: -RM 5,000 (owes RM 5,000)
- Remaining Credit: RM 5,000

After Paying Back RM 2,000:
- Credit Balance: -RM 3,000 (owes RM 3,000)
- Remaining Credit: RM 7,000
```

---

## 🗄️ Database Structure

### **Merchant Wallet Table** (`merchant_wallets`)

```sql
CREATE TABLE merchant_wallets (
  id UUID PRIMARY KEY,
  customer_id UUID UNIQUE,              -- Links to customer_profiles
  points_balance NUMERIC(12,2),         -- Current points available
  credit_balance NUMERIC(12,2),         -- Current credit balance (can be negative)
  total_earned_points NUMERIC(12,2),    -- Lifetime points earned
  total_spent_points NUMERIC(12,2),     -- Lifetime points used
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### **Transaction Types** (Enum)

```sql
CREATE TYPE wallet_transaction_type AS ENUM (
  'EARN_PURCHASE',      -- Earned from completing an order
  'EARN_BONUS',         -- Bonus points from admin
  'EARN_REFERRAL',      -- Referral rewards
  'SPEND_PURCHASE',     -- Used points for discount
  'SPEND_DEDUCTION',    -- Admin removed points
  'CREDIT_DEPOSIT',     -- Admin added credit
  'CREDIT_PAYMENT',     -- Paid order with credit
  'ADJUSTMENT'          -- Manual adjustment
);
```

### **Transaction History** (`wallet_transactions`)

```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  wallet_id UUID,                    -- Links to merchant_wallets
  customer_id UUID,                  -- Links to customer_profiles
  type wallet_transaction_type,      -- Transaction type
  amount NUMERIC(12,2),              -- Amount changed (+/-)
  balance_after NUMERIC(12,2),       -- Balance after transaction
  reference_id UUID,                 -- Order ID or other reference
  reference_type TEXT,               -- "ORDER", "ADJUSTMENT", etc.
  description TEXT,                  -- Human-readable description
  created_by UUID,                   -- Admin who created (if manual)
  created_at TIMESTAMPTZ
);
```

---

## ✅ What's Already Built

### **Database:**
- ✅ `merchant_wallets` table created
- ✅ `wallet_transactions` table created
- ✅ Transaction types enum defined
- ✅ Indexes for performance
- ✅ Auto-create wallet on merchant approval (trigger)

### **Frontend (Dashboard):**
- ✅ Wallet tab shows points balance
- ✅ Transaction history display
- ✅ Points earned/spent stats
- ✅ Credit limit display
- ✅ Real-time balance updates

### **Customer Profile:**
- ✅ `points_rate` field (default 1.0x)
- ✅ `merchant_tier` field (BRONZE/SILVER/GOLD/PLATINUM)
- ✅ `credit_limit` field

---

## ❌ What's NOT Built Yet (Needs Implementation)

### **1. Points Earning Logic** ⚠️

**Missing:** Automatic points award on order completion

**What needs to be done:**
```typescript
// When order status changes to COMPLETED or DELIVERED:
async function awardPointsForOrder(orderId: string) {
  // 1. Get order details (total amount)
  // 2. Get customer's points_rate
  // 3. Calculate points: total × points_rate
  // 4. Create transaction: type = EARN_PURCHASE
  // 5. Update merchant_wallets.points_balance
  // 6. Update merchant_wallets.total_earned_points
  // 7. Send notification to merchant
}
```

**Where to add:**
- In admin Order Verification page when approving payment
- In Warehouse Operations when marking as "Delivered"
- Database trigger on orders table (status change)

---

### **2. Points Redemption in Checkout** ⚠️

**Missing:** Option to use points during checkout

**What needs to be done:**

**Step 1: Add to Cart/Checkout UI**
```tsx
// In Cart.tsx or CheckoutModal.tsx:
<div className="points-section">
  <h3>Use Points (Available: {merchantWallet.points_balance})</h3>
  <input
    type="number"
    max={merchantWallet.points_balance}
    value={pointsToUse}
    onChange={(e) => setPointsToUse(e.target.value)}
  />
  <p>Discount: RM {pointsToUse.toFixed(2)}</p>
</div>

// Updated calculation:
const subtotal = cartTotal;
const pointsDiscount = pointsToUse;
const finalTotal = subtotal - pointsDiscount;
```

**Step 2: Save in Order**
```typescript
// When creating order:
await supabase.from('orders').insert({
  user_id: userId,
  subtotal: cartTotal,
  points_used: pointsToUse,
  points_discount: pointsToUse, // 1:1 conversion
  final_total: cartTotal - pointsToUse,
  // ... other fields
});
```

**Step 3: Deduct Points**
```typescript
// After order is placed:
await createWalletTransaction({
  type: 'SPEND_PURCHASE',
  amount: -pointsToUse, // Negative = deduction
  reference_id: orderId,
  description: `Used ${pointsToUse} points for Order #${orderNo}`
});
```

---

### **3. Credit Payment System** ⚠️

**Missing:** "Pay with Credit" option in checkout

**What needs to be done:**

**Step 1: Add Payment Method Option**
```tsx
// In CheckoutModal.tsx:
<select value={paymentMethod} onChange={handlePaymentChange}>
  <option value="bank_transfer">Bank Transfer</option>
  <option value="credit" disabled={!hasCreditAvailable}>
    Pay with Credit (Available: RM {remainingCredit})
  </option>
  <option value="points" disabled={!hasPointsAvailable}>
    Pay with Points (Available: {pointsBalance} pts)
  </option>
</select>
```

**Step 2: Credit Validation**
```typescript
// Check if merchant has enough credit:
const remainingCredit = creditLimit - Math.abs(creditBalance);
const canUseCredit = remainingCredit >= orderTotal;

if (paymentMethod === 'credit' && !canUseCredit) {
  toast.error('Insufficient credit limit');
  return;
}
```

**Step 3: Process Credit Payment**
```typescript
// When order is placed with credit:
await supabase.from('orders').insert({
  payment_method: 'CREDIT',
  payment_state: 'ON_CREDIT',
  status: 'PAYMENT_VERIFIED', // Skip payment verification
  // ... other fields
});

// Update wallet:
await createWalletTransaction({
  type: 'CREDIT_PAYMENT',
  amount: -orderTotal, // Credit balance goes negative
  description: `Credit payment for Order #${orderNo}`
});
```

---

### **4. Admin Points Management** ⚠️

**Missing:** Admin UI to manage points/credit

**What needs to be done:**

**Add to Admin Panel:**
```tsx
// New page: /admin/merchant-wallets

<Table>
  <thead>
    <tr>
      <th>Merchant</th>
      <th>Points Balance</th>
      <th>Credit Balance</th>
      <th>Credit Limit</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {merchants.map(m => (
      <tr>
        <td>{m.company_name}</td>
        <td>{m.points_balance}</td>
        <td>{m.credit_balance}</td>
        <td>{m.credit_limit}</td>
        <td>
          <Button onClick={() => openAwardPointsModal(m)}>Award Points</Button>
          <Button onClick={() => openAdjustCreditModal(m)}>Adjust Credit</Button>
        </td>
      </tr>
    ))}
  </tbody>
</Table>

// Modal to award bonus points:
<Modal>
  <Input type="number" placeholder="Points to award" />
  <Textarea placeholder="Reason (e.g., Promotional bonus)" />
  <Button onClick={handleAwardPoints}>Award Points</Button>
</Modal>

// Modal to adjust credit limit:
<Modal>
  <Input type="number" placeholder="New credit limit" />
  <Button onClick={handleUpdateCreditLimit}>Update</Button>
</Modal>
```

---

### **5. Order Table Updates** ⚠️

**Missing:** Fields to track points/credit usage

**What needs to be added to `orders` table:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_used NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_discount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT; -- 'BANK_TRANSFER', 'CREDIT', 'POINTS', 'MIXED'
```

---

## 🎯 Implementation Priority

### **Phase 1: Basic Points** (Essential)
1. ✅ Database structure (already done)
2. ⚠️ Points earning on order completion
3. ⚠️ Display points in merchant dashboard (already done)
4. ⚠️ Admin panel to award bonus points

### **Phase 2: Points Redemption** (High Priority)
1. ⚠️ Add "Use Points" option in checkout
2. ⚠️ Points deduction logic
3. ⚠️ Order table updates
4. ⚠️ Transaction history tracking

### **Phase 3: Credit System** (Medium Priority)
1. ⚠️ "Pay with Credit" checkout option
2. ⚠️ Credit balance tracking
3. ⚠️ Credit limit enforcement
4. ⚠️ Admin credit management UI

### **Phase 4: Advanced Features** (Optional)
1. ⚠️ Referral system
2. ⚠️ Points expiry (time-limited points)
3. ⚠️ Tiered benefits (tier upgrades)
4. ⚠️ Points history export
5. ⚠️ Email notifications for points earned

---

## 💡 Business Logic Examples

### **Example 1: Merchant Makes Purchase**

**Scenario:** Workshop owner buys RM 5,000 worth of parts

**Before:**
- Points Balance: 1,200
- Points Rate: 1.0x (Bronze tier)

**Order Placed:**
- Order Total: RM 5,000
- Points to Earn: 5,000 × 1.0 = **5,000 points**

**After Order Completed:**
- Points Balance: 1,200 + 5,000 = **6,200**
- Transaction Created:
  ```
  Type: EARN_PURCHASE
  Amount: +5,000
  Balance After: 6,200
  Description: "Earned from Order #AH-2024-00123"
  ```

---

### **Example 2: Merchant Redeems Points**

**Scenario:** Merchant uses points for next purchase

**Before:**
- Points Balance: 6,200
- Next Order Total: RM 3,000

**Checkout Decision:**
- Use 2,000 points
- Discount: RM 2,000
- Cash Payment: RM 1,000

**After:**
- Points Balance: 6,200 - 2,000 = **4,200**
- Order Total: RM 1,000 (paid by bank transfer)
- Transaction Created:
  ```
  Type: SPEND_PURCHASE
  Amount: -2,000
  Balance After: 4,200
  Description: "Used 2,000 points for Order #AH-2024-00124"
  ```

---

### **Example 3: Credit Payment**

**Scenario:** Merchant uses credit line for emergency order

**Before:**
- Credit Limit: RM 10,000
- Credit Balance: RM 0 (no debt)
- Order Total: RM 4,500

**Order with Credit:**
- Payment Method: Credit
- Payment State: ON_CREDIT
- Order immediately approved (no payment proof needed)

**After:**
- Credit Balance: -RM 4,500 (owes RM 4,500)
- Remaining Credit: RM 5,500
- Transaction Created:
  ```
  Type: CREDIT_PAYMENT
  Amount: -4,500
  Balance After: -4,500
  Description: "Credit payment for Order #AH-2024-00125"
  ```

**When Merchant Pays Back:**
- Admin records payment: RM 2,000
- Credit Balance: -RM 2,500
- Remaining Credit: RM 7,500

---

### **Example 4: Tier Upgrade Bonus**

**Scenario:** Merchant promoted from Bronze to Silver

**Admin Action:**
- Award 1,000 bonus points
- Transaction Created:
  ```
  Type: EARN_BONUS
  Amount: +1,000
  Description: "Congratulations on Silver tier upgrade!"
  ```

**New Benefits:**
- Points Rate: 1.0x → **1.2x**
- Future purchases earn 20% more points

---

## 📱 Merchant Dashboard - Points Features

### **Current Dashboard (Already Built):**

**Wallet Tab Shows:**
- Available Points Balance
- Total Earned (Lifetime)
- Total Spent (Lifetime)
- Recent Transactions (last 10)
- Transaction details (type, amount, date)

**What Merchants Can See:**
```
┌─────────────────────────────────────┐
│ 💰 Points Balance: 6,200           │
│ ↗️  Total Earned: 25,000            │
│ ↘️  Total Spent: 18,800             │
└─────────────────────────────────────┘

Recent Transactions:
✓ EARN_PURCHASE    +5,000  (Order #123)  Nov 15
✓ SPEND_PURCHASE   -2,000  (Order #124)  Nov 10
✓ EARN_BONUS       +1,000  (Tier upgrade) Nov 5
✓ EARN_PURCHASE    +3,500  (Order #122)  Nov 1
```

---

## 🚀 Quick Start Implementation

If you want to implement the points system, here's the quickest path:

### **Step 1: Order Completion Hook** (15 min)
Add to Warehouse Operations when marking as "Delivered":
```typescript
// After updating order status to DELIVERED:
await awardPointsForCompletedOrder(orderId);
```

### **Step 2: Checkout Points Option** (30 min)
Add to Cart.tsx:
```tsx
{isMerchant && walletPoints > 0 && (
  <div className="use-points">
    <Label>Use Points (Available: {walletPoints})</Label>
    <Input
      type="number"
      max={Math.min(walletPoints, cartTotal)}
      value={pointsToUse}
    />
  </div>
)}
```

### **Step 3: Admin Bonus Points** (20 min)
Add to Admin Customers page:
```tsx
<Button onClick={() => openAwardPointsModal(merchant)}>
  Award Bonus Points
</Button>
```

**Total Time:** ~1 hour for basic working points system!

---

## ❓ FAQ

**Q: Do points expire?**
A: Currently no expiry. Could add `expires_at` field if needed.

**Q: Can points be transferred between merchants?**
A: No, points are tied to individual merchant accounts.

**Q: What's the minimum redemption?**
A: No minimum - can use any amount up to available balance.

**Q: Can points and credit be used together?**
A: Yes, merchant could use points + credit + cash in same order.

**Q: Who can award bonus points?**
A: Only admins through the admin panel.

**Q: Can merchants see why points were awarded?**
A: Yes, transaction history shows description for each transaction.

---

## 📝 Summary

### **Points System = Loyalty Rewards**
- Earn 1 point per RM spent (adjustable by tier)
- Redeem 1 point = RM 1 discount
- Track lifetime earnings & spending
- Admin can award bonuses

### **Credit System = Buy Now, Pay Later**
- Admin sets credit limit
- Merchants order on credit (no upfront payment)
- Credit balance tracks debt
- Admin manages payback

### **Current Status:**
- 🟢 Database: 100% ready
- 🟢 Dashboard UI: 100% ready
- 🟡 Business Logic: 0% implemented
- 🔴 Checkout Integration: 0% implemented
- 🔴 Admin Management: 0% implemented

**Next Action:** Decide which features to implement first, and I can help you build them! 🚀

