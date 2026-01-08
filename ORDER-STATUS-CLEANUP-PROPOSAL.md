# Order Status Cleanup Proposal

## Current Problem

Your orders table currently has TWO columns:
- `status` (TEXT) - Mixed payment AND fulfillment states
- `payment_state` (TEXT) - Separate payment tracking

**The confusion:** The `status` column is being used for BOTH payment-related states AND order fulfillment states, making it unclear what the actual order flow is.

### Current Status Values Found in Code:

**Payment-related (should be in `payment_state`):**
- PENDING_PAYMENT
- PAYMENT_PROCESSING
- PAYMENT_FAILED
- PENDING_PAYMENT_VERIFICATION
- PAYMENT_VERIFIED
- PAYMENT_REJECTED

**Order fulfillment (should be in `status`):**
- PLACED
- PROCESSING
- WAREHOUSE_ASSIGNED
- PICKING
- PACKING
- VERIFIED
- PENDING_VERIFICATION
- READY_FOR_DELIVERY
- OUT_FOR_DELIVERY
- DISPATCHED
- DELIVERED
- COMPLETED
- CANCELLED
- REJECTED

**Current payment_state values:**
- UNPAID
- SUBMITTED
- APPROVED
- REJECTED
- ON_CREDIT

---

## Recommended Solution: Clear Separation

### 1. `payment_state` Column - Payment Tracking Only
Tracks the payment verification process:

```
UNPAID → SUBMITTED → APPROVED
                  ↘ REJECTED

Special: ON_CREDIT (for B2B merchant orders)
```

**Values:**
- `UNPAID` - Customer hasn't submitted payment proof yet
- `SUBMITTED` - Payment proof uploaded, awaiting admin verification
- `APPROVED` - Payment verified and approved by admin
- `REJECTED` - Payment rejected by admin
- `ON_CREDIT` - B2B merchant order on credit terms (no upfront payment needed)

### 2. `status` Column - Order Fulfillment Only
Tracks the physical order lifecycle:

```
PLACED → PROCESSING → PICKING → PACKING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED

At any point: → CANCELLED
```

**Values:**
- `PLACED` - Order created by customer (initial state)
- `PROCESSING` - Payment approved, order moved to warehouse queue
- `PICKING` - Warehouse staff picking items from inventory
- `PACKING` - Items being packed for shipment
- `READY_FOR_DELIVERY` - Packed and ready for courier pickup
- `OUT_FOR_DELIVERY` - Dispatched with courier, in transit
- `DELIVERED` - Delivered to customer
- `COMPLETED` - Order completed and archived
- `CANCELLED` - Order cancelled (by customer or admin)

---

## Complete Order Flow (Start to End)

### A. B2C Customer Order Flow

```
1. Customer creates order
   status: PLACED
   payment_state: UNPAID

2. Customer uploads payment proof
   status: PLACED
   payment_state: SUBMITTED

3. Admin verifies payment in "Order Verification" page
   3a. If APPROVED:
       status: PROCESSING (moved to warehouse queue)
       payment_state: APPROVED

   3b. If REJECTED:
       status: PLACED (stays in place)
       payment_state: REJECTED
       → Customer must resubmit payment

4. Warehouse Operations Begin
   status: PICKING
   payment_state: APPROVED

5. Items packed
   status: PACKING
   payment_state: APPROVED

6. Ready for courier
   status: READY_FOR_DELIVERY
   payment_state: APPROVED

7. Courier picks up
   status: OUT_FOR_DELIVERY
   payment_state: APPROVED

8. Customer receives
   status: DELIVERED
   payment_state: APPROVED

9. After 7 days, auto-archive
   status: COMPLETED
   payment_state: APPROVED
```

### B. B2B Merchant Order Flow (Credit Terms)

```
1. Merchant creates order
   status: PLACED
   payment_state: ON_CREDIT

2. Admin approves order (no payment verification needed)
   status: PROCESSING
   payment_state: ON_CREDIT

3-8. Same warehouse flow as B2C
   (PICKING → PACKING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED)
   payment_state: ON_CREDIT (throughout)

9. Invoice sent to merchant for payment later
   (handled separately in accounting system)
```

### C. Cancelled Orders

```
Customer/Admin cancels order:
   status: CANCELLED
   payment_state: (keeps existing state - UNPAID/SUBMITTED/APPROVED/REJECTED/ON_CREDIT)
```

---

## Migration Strategy

### Phase 1: Clean Up Existing Data

Run this SQL to normalize existing orders:

```sql
-- Show current status distribution
SELECT status, payment_state, COUNT(*)
FROM orders
GROUP BY status, payment_state
ORDER BY COUNT(*) DESC;

-- Update payment_state based on status values
UPDATE orders
SET payment_state = 'SUBMITTED'
WHERE status IN ('PENDING_PAYMENT_VERIFICATION', 'PAYMENT_PROCESSING')
AND payment_state = 'UNPAID';

UPDATE orders
SET payment_state = 'APPROVED'
WHERE status IN ('PAYMENT_VERIFIED', 'VERIFIED')
AND payment_state != 'ON_CREDIT';

UPDATE orders
SET payment_state = 'REJECTED'
WHERE status IN ('PAYMENT_REJECTED', 'REJECTED');

-- Update status to proper fulfillment states
UPDATE orders
SET status = 'PLACED'
WHERE status IN ('PENDING_PAYMENT', 'PENDING_PAYMENT_VERIFICATION', 'PAYMENT_PROCESSING')
AND status != 'CANCELLED';

UPDATE orders
SET status = 'PROCESSING'
WHERE status IN ('PAYMENT_VERIFIED', 'VERIFIED', 'WAREHOUSE_ASSIGNED')
AND status != 'CANCELLED';

-- Show result
SELECT 'After cleanup:' as info;
SELECT status, payment_state, COUNT(*)
FROM orders
GROUP BY status, payment_state
ORDER BY status, payment_state;
```

### Phase 2: Update Frontend Code

Update these files to use the clean separation:

1. **src/pages/admin/Orders.tsx** - Remove payment statuses from ORDER_STATUS_OPTIONS
2. **src/pages/admin/OrderVerification.tsx** - Use payment_state for verification flow
3. **src/pages/admin/WarehouseOperations.tsx** - Already uses clean status flow ✅
4. **src/pages/admin/Dashboard.tsx** - Update to query both columns separately
5. **src/pages/admin/Analytics.tsx** - Update to separate payment vs fulfillment metrics
6. **src/pages/MyOrders.tsx** - Show both payment_state AND status to customers

---

## Benefits of This Approach

1. **Clear Separation of Concerns**
   - Payment verification = `payment_state` column
   - Order fulfillment = `status` column

2. **Easier to Understand**
   - Customer knows: "My payment is APPROVED and my order is PACKING"
   - Not confusing: "My order is PAYMENT_VERIFIED_PACKING_READY"

3. **Better Reporting**
   - "How many orders have payment issues?" → Query payment_state
   - "How many orders are ready to ship?" → Query status
   - "Revenue from delivered orders?" → Query status = DELIVERED

4. **Flexible Workflows**
   - B2C: Payment must be APPROVED before PROCESSING
   - B2B: ON_CREDIT allows immediate PROCESSING
   - Clear rules for each flow

5. **Future-Proof**
   - Add new payment methods? → Update payment_state logic
   - Add new fulfillment steps? → Update status logic
   - They don't interfere with each other

---

## Validation Rules

### Business Logic to Enforce:

```typescript
// 1. Order can only move to PROCESSING if payment is verified
if (newStatus === 'PROCESSING') {
  if (payment_state !== 'APPROVED' && payment_state !== 'ON_CREDIT') {
    throw new Error('Payment must be approved before processing');
  }
}

// 2. Payment state transitions
const validPaymentTransitions = {
  'UNPAID': ['SUBMITTED', 'ON_CREDIT'],
  'SUBMITTED': ['APPROVED', 'REJECTED'],
  'REJECTED': ['SUBMITTED'], // allow resubmission
  'APPROVED': [], // final state
  'ON_CREDIT': [] // final state
};

// 3. Status transitions
const validStatusTransitions = {
  'PLACED': ['PROCESSING', 'CANCELLED'],
  'PROCESSING': ['PICKING', 'CANCELLED'],
  'PICKING': ['PACKING', 'CANCELLED'],
  'PACKING': ['READY_FOR_DELIVERY', 'CANCELLED'],
  'READY_FOR_DELIVERY': ['OUT_FOR_DELIVERY', 'CANCELLED'],
  'OUT_FOR_DELIVERY': ['DELIVERED'],
  'DELIVERED': ['COMPLETED'],
  'COMPLETED': [], // final state
  'CANCELLED': [] // final state
};
```

---

## Recommended Implementation Order

1. ✅ **Review this proposal** - Make sure you agree with the flow
2. **Run Phase 1 SQL** - Clean up existing data
3. **Update backend RPC functions** - Separate payment/fulfillment queries
4. **Update frontend components** - Use proper column for each use case
5. **Add validation** - Enforce business rules
6. **Test thoroughly** - Verify order flow works end-to-end
7. **Deploy** - Push to production

---

## Questions to Clarify

1. **Do you want COMPLETED status?**
   - Option A: Keep DELIVERED as final status, no COMPLETED needed
   - Option B: Use COMPLETED for orders archived after 7 days

2. **What about REJECTED orders?**
   - Current: status = REJECTED
   - Proposed: status stays PLACED, payment_state = REJECTED
   - This allows customer to fix payment and resubmit

3. **OUT_FOR_DELIVERY vs DISPATCHED?**
   - Are these the same? I recommend using OUT_FOR_DELIVERY consistently

4. **B2B credit payment tracking?**
   - Do you need to track when ON_CREDIT orders are actually paid later?
   - Or is that handled in a separate accounting system?

---

Let me know if you approve this structure, and I'll create the migration SQL and update all the frontend code to use this clean separation!
