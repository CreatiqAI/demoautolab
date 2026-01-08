# AutoLab Order System - Final Structure (Shopee-Style)

## Complete Order Flow

### User Journey

```
1. Browse products → Add to cart
2. Click Checkout
3. Select delivery method (J&T Express / Lalamove)
4. Select payment method
5. Submit payment via Payment Gateway

   If Payment Gateway Returns SUCCESS:
   ✅ Order created with status=PLACED, payment_state=SUCCESS
   ✅ User sees "Order Placed Successfully"
   ✅ Admin receives notification in Order Verification page

   If Payment Gateway Returns FAILED:
   ❌ Order created with status=PLACED, payment_state=FAILED
   ❌ User sees "Payment Failed - Please Try Again"
   ❌ User can retry payment on the same order
```

### Admin Journey

```
1. ORDER VERIFICATION PAGE
   - See new orders with payment_state=SUCCESS
   - Review order details, customer info, items
   - Click "Approve Order" → status changes to PROCESSING
   - Order moves to Warehouse Operations

2. WAREHOUSE OPERATIONS PAGE - PROCESSING TAB
   - Orders waiting to be picked
   - Click "Start Picking" → status changes to PICKING
   - Generate Picking List PDF

3. WAREHOUSE OPERATIONS PAGE - PICKING TAB
   - Items being picked from inventory
   - Click "Start Packing" → status changes to PACKING

4. WAREHOUSE OPERATIONS PAGE - PACKING TAB
   - Items being packed
   - Generate Packing List PDF
   - Click "Mark Ready" → status changes to READY_FOR_DELIVERY

5. WAREHOUSE OPERATIONS PAGE - READY_FOR_DELIVERY TAB
   - Orders ready for courier pickup
   - Click "Arrange Courier" → Select J&T or Lalamove
   - System creates shipment via courier API
   - Receives tracking number
   - status changes to OUT_FOR_DELIVERY

6. WAREHOUSE OPERATIONS PAGE - OUT_FOR_DELIVERY TAB
   - Orders in transit with courier
   - System polls courier API for status updates
   - When courier delivers and uploads proof:
     - Courier API returns delivery_proof_url
     - System auto-updates status to DELIVERED
     - delivery_proof stored in database

7. WAREHOUSE OPERATIONS PAGE - DELIVERED TAB
   - Orders delivered, awaiting final verification
   - Admin views delivery proof (photo from courier)
   - Admin reviews: "Did customer receive it properly?"
   - Click "Complete Order" → status changes to COMPLETED
   - Order moves to Archived Orders page

8. ARCHIVED ORDERS PAGE
   - All COMPLETED orders stored here
   - Read-only view
   - Historical records
```

---

## Database Schema

### `orders` Table Structure

#### Keep These Columns:

```sql
-- Core order info
id                    UUID PRIMARY KEY
order_no              TEXT UNIQUE NOT NULL
user_id               UUID REFERENCES profiles(id)
created_at            TIMESTAMP DEFAULT NOW()
updated_at            TIMESTAMP DEFAULT NOW()

-- Customer details
customer_name         TEXT NOT NULL
customer_phone        TEXT NOT NULL
customer_email        TEXT

-- Delivery
delivery_method       TEXT NOT NULL  -- 'jnt_express' | 'lalamove' | 'pickup'
delivery_address      JSONB
delivery_fee          DECIMAL(10,2)

-- Payment
payment_method        TEXT NOT NULL  -- 'online_banking' | 'credit_card' | 'fpx' | etc.
payment_state         TEXT NOT NULL  -- NEW ENUM (see below)
payment_gateway_response JSONB       -- Store full response from gateway

-- Pricing
subtotal              DECIMAL(10,2)
tax                   DECIMAL(10,2)
discount              DECIMAL(10,2)
shipping_fee          DECIMAL(10,2)
total                 DECIMAL(10,2)
voucher_code          TEXT
voucher_discount      DECIMAL(10,2)

-- Order status
status                TEXT NOT NULL  -- NEW ENUM (see below)

-- Notes
notes                 TEXT          -- Customer notes
internal_notes        TEXT          -- Admin private notes
processing_notes      TEXT          -- Warehouse notes

-- Timestamps for each stage
approved_at           TIMESTAMP     -- When admin approved
processing_started_at TIMESTAMP     -- When moved to PROCESSING
picked_at             TIMESTAMP     -- When PICKING completed
packed_at             TIMESTAMP     -- When PACKING completed
ready_at              TIMESTAMP     -- When READY_FOR_DELIVERY
dispatched_at         TIMESTAMP     -- When OUT_FOR_DELIVERY
delivered_at          TIMESTAMP     -- When DELIVERED
completed_at          TIMESTAMP     -- When COMPLETED (archived)
cancelled_at          TIMESTAMP     -- If cancelled

-- Warehouse
warehouse_assigned_to UUID          -- Which staff member
estimated_delivery_date DATE

-- Courier Integration (Phase 3)
courier_provider      TEXT          -- 'jnt_express' | 'lalamove'
courier_tracking_number TEXT
courier_shipment_id   TEXT          -- Courier's internal shipment ID
courier_cost          DECIMAL(10,2)
courier_label_url     TEXT          -- Shipping label PDF
courier_status        TEXT          -- Real-time status from courier API
courier_created_at    TIMESTAMP
delivery_proof_url    TEXT          -- Photo proof from courier
```

#### NEW: payment_state Values

```sql
-- Remove old payment_state type if exists
DROP TYPE IF EXISTS payment_state_enum CASCADE;

-- Create new payment_state type
CREATE TYPE payment_state_enum AS ENUM (
  'PENDING',      -- Order created, awaiting payment submission
  'PROCESSING',   -- Payment being processed by gateway
  'SUCCESS',      -- Payment successful (gateway approved)
  'FAILED'        -- Payment failed (can retry)
);

-- Apply to orders table
ALTER TABLE orders
ALTER COLUMN payment_state TYPE payment_state_enum
USING payment_state::payment_state_enum;

-- Set default
ALTER TABLE orders
ALTER COLUMN payment_state SET DEFAULT 'PENDING';
```

**Payment State Flow:**
```
PENDING → PROCESSING → SUCCESS
                    ↘ FAILED → (user can retry) → PROCESSING → SUCCESS/FAILED
```

#### NEW: status Values

```sql
-- Remove old status constraints
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;

-- Define allowed values (will enforce via CHECK constraint)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'PLACED',              -- Order created, payment successful, awaiting admin approval
  'PROCESSING',          -- Admin approved, ready for warehouse
  'PICKING',             -- Warehouse picking items
  'PACKING',             -- Warehouse packing items
  'READY_FOR_DELIVERY',  -- Ready for courier pickup
  'OUT_FOR_DELIVERY',    -- With courier, in transit
  'DELIVERED',           -- Delivered to customer (proof received)
  'COMPLETED',           -- Admin verified delivery, order archived
  'CANCELLED'            -- Cancelled by user/admin
));

-- Set default
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'PLACED';
```

**Order Status Flow:**
```
PLACED → PROCESSING → PICKING → PACKING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED

At any point before DELIVERED: → CANCELLED
```

#### Remove These Columns (Unused):

```sql
-- If you have these, remove them:
-- verification_notes
-- payment_verification_status
-- Any other unused payment-related columns
```

---

## Business Logic Rules

### 1. Order Creation (User Checkout)

```typescript
// When user clicks "Pay Now"
const createOrder = async () => {
  // 1. Create order with status=PLACED, payment_state=PENDING
  const order = await supabase.from('orders').insert({
    status: 'PLACED',
    payment_state: 'PENDING',
    // ... other fields
  });

  // 2. Redirect to payment gateway
  const paymentResult = await processPayment(order.id);

  // 3. Update based on payment gateway response
  if (paymentResult.status === 'SUCCESS') {
    await supabase.from('orders').update({
      payment_state: 'SUCCESS',
      payment_gateway_response: paymentResult,
      created_at: new Date()
    }).eq('id', order.id);

    // Send notification to admin
    // Show success to user
  } else {
    await supabase.from('orders').update({
      payment_state: 'FAILED',
      payment_gateway_response: paymentResult
    }).eq('id', order.id);

    // Show "Payment Failed - Retry?" to user
  }
};
```

### 2. Admin Approval (Order Verification Page)

```typescript
// Only show orders where payment_state = 'SUCCESS' AND status = 'PLACED'
const approveOrder = async (orderId: string) => {
  await supabase.from('orders').update({
    status: 'PROCESSING',
    approved_at: new Date(),
    processing_started_at: new Date()
  }).eq('id', orderId);
};
```

### 3. Warehouse Operations

```typescript
// PROCESSING → PICKING
const startPicking = async (orderId: string) => {
  await supabase.from('orders').update({
    status: 'PICKING'
  }).eq('id', orderId);
};

// PICKING → PACKING
const startPacking = async (orderId: string) => {
  await supabase.from('orders').update({
    status: 'PACKING',
    picked_at: new Date()
  }).eq('id', orderId);
};

// PACKING → READY_FOR_DELIVERY
const markReady = async (orderId: string) => {
  await supabase.from('orders').update({
    status: 'READY_FOR_DELIVERY',
    packed_at: new Date(),
    ready_at: new Date()
  }).eq('id', orderId);
};
```

### 4. Courier Integration (Phase 3)

```typescript
// READY_FOR_DELIVERY → OUT_FOR_DELIVERY
const arrangeCourier = async (orderId: string, provider: 'jnt' | 'lalamove') => {
  // Call courier API to create shipment
  const shipment = await courierAPI.createShipment({
    orderId,
    provider,
    // ... address, items, etc.
  });

  await supabase.from('orders').update({
    status: 'OUT_FOR_DELIVERY',
    courier_provider: provider,
    courier_tracking_number: shipment.tracking_number,
    courier_shipment_id: shipment.id,
    courier_cost: shipment.cost,
    courier_label_url: shipment.label_url,
    dispatched_at: new Date()
  }).eq('id', orderId);
};

// Webhook from courier: Delivery completed
const handleDeliveryWebhook = async (courierData: any) => {
  await supabase.from('orders').update({
    status: 'DELIVERED',
    courier_status: courierData.status,
    delivery_proof_url: courierData.proof_url,  // Photo from courier
    delivered_at: new Date()
  }).eq('courier_shipment_id', courierData.shipment_id);
};
```

### 5. Order Completion (Admin Final Verification)

```typescript
// DELIVERED → COMPLETED
const completeOrder = async (orderId: string) => {
  await supabase.from('orders').update({
    status: 'COMPLETED',
    completed_at: new Date()
  }).eq('id', orderId);

  // Order now appears in Archived Orders page
  // Removed from active Warehouse Operations
};
```

### 6. Status Transition Validation

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'PLACED': ['PROCESSING', 'CANCELLED'],
  'PROCESSING': ['PICKING', 'CANCELLED'],
  'PICKING': ['PACKING', 'CANCELLED'],
  'PACKING': ['READY_FOR_DELIVERY', 'CANCELLED'],
  'READY_FOR_DELIVERY': ['OUT_FOR_DELIVERY', 'CANCELLED'],
  'OUT_FOR_DELIVERY': ['DELIVERED'],  // Can't cancel once with courier
  'DELIVERED': ['COMPLETED'],
  'COMPLETED': [],  // Final state
  'CANCELLED': []   // Final state
};

const validateTransition = (currentStatus: string, newStatus: string): boolean => {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
};
```

---

## Page-Specific Queries

### Order Verification Page
```sql
-- Show orders needing approval
SELECT * FROM orders
WHERE payment_state = 'SUCCESS'
AND status = 'PLACED'
ORDER BY created_at ASC;
```

### Warehouse Operations Page
```sql
-- PROCESSING tab
SELECT * FROM orders WHERE status = 'PROCESSING';

-- PICKING tab
SELECT * FROM orders WHERE status = 'PICKING';

-- PACKING tab
SELECT * FROM orders WHERE status = 'PACKING';

-- READY_FOR_DELIVERY tab
SELECT * FROM orders WHERE status = 'READY_FOR_DELIVERY';

-- OUT_FOR_DELIVERY tab
SELECT * FROM orders WHERE status = 'OUT_FOR_DELIVERY';

-- DELIVERED tab (awaiting admin completion)
SELECT * FROM orders WHERE status = 'DELIVERED';
```

### Orders Page (All Active Orders)
```sql
-- Show all orders except COMPLETED
SELECT * FROM orders
WHERE status != 'COMPLETED'
ORDER BY created_at DESC;
```

### Archived Orders Page
```sql
-- Show only completed orders
SELECT * FROM orders
WHERE status = 'COMPLETED'
ORDER BY completed_at DESC;
```

### Customer Orders Page (My Orders)
```sql
-- Show customer's orders
SELECT * FROM orders
WHERE user_id = $1
ORDER BY created_at DESC;
```

---

## Migration SQL

### Complete Migration Script

```sql
-- ============================================
-- AUTOLAB ORDER STATUS CLEANUP MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- Step 1: Add new timestamp columns if they don't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Step 2: Add courier-related columns (for Phase 3)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;

-- Step 3: Show current status distribution
SELECT 'BEFORE MIGRATION - Current Status Distribution:' as info;
SELECT status, payment_state, COUNT(*) as count
FROM orders
GROUP BY status, payment_state
ORDER BY count DESC;

-- Step 4: Normalize payment_state values
-- Map old payment_state values to new ones
UPDATE orders SET payment_state = 'SUCCESS'
WHERE payment_state IN ('APPROVED', 'PAID', 'VERIFIED');

UPDATE orders SET payment_state = 'FAILED'
WHERE payment_state IN ('REJECTED', 'DECLINED');

UPDATE orders SET payment_state = 'PENDING'
WHERE payment_state IN ('UNPAID', 'AWAITING_PAYMENT');

UPDATE orders SET payment_state = 'PROCESSING'
WHERE payment_state IN ('SUBMITTED', 'VERIFYING');

-- Remove ON_CREDIT (no longer supported)
UPDATE orders SET payment_state = 'SUCCESS'
WHERE payment_state = 'ON_CREDIT';

-- Step 5: Normalize status values
-- Map old status values to new clean values

-- Orders waiting for admin approval
UPDATE orders SET status = 'PLACED'
WHERE status IN ('PENDING', 'PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'PENDING_VERIFICATION')
AND status NOT IN ('CANCELLED', 'COMPLETED');

-- Orders in warehouse
UPDATE orders SET status = 'PROCESSING'
WHERE status IN ('VERIFIED', 'WAREHOUSE_ASSIGNED', 'APPROVED')
AND status NOT IN ('CANCELLED', 'COMPLETED');

-- Orders being delivered
UPDATE orders SET status = 'OUT_FOR_DELIVERY'
WHERE status IN ('DISPATCHED', 'SHIPPED', 'IN_TRANSIT')
AND status NOT IN ('CANCELLED', 'COMPLETED');

-- Delivered orders
UPDATE orders SET status = 'DELIVERED'
WHERE status IN ('RECEIVED')
AND status NOT IN ('CANCELLED', 'COMPLETED');

-- Step 6: Apply new constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'PLACED',
  'PROCESSING',
  'PICKING',
  'PACKING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED'
));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_state_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_state_check
CHECK (payment_state IN (
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED'
));

-- Step 7: Set defaults
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'PLACED';
ALTER TABLE orders ALTER COLUMN payment_state SET DEFAULT 'PENDING';

-- Step 8: Show final distribution
SELECT 'AFTER MIGRATION - New Status Distribution:' as info;
SELECT status, payment_state, COUNT(*) as count
FROM orders
GROUP BY status, payment_state
ORDER BY status, payment_state;

-- Step 9: Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_state ON orders(payment_state);
CREATE INDEX IF NOT EXISTS idx_orders_status_payment ON orders(status, payment_state);
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at) WHERE status = 'COMPLETED';

COMMIT;

SELECT '✅ MIGRATION COMPLETED SUCCESSFULLY!' as result;
```

---

## Frontend Code Updates Needed

### 1. Order Verification Page
- Query: `payment_state = 'SUCCESS' AND status = 'PLACED'`
- Show only orders awaiting admin approval
- Remove payment verification logic (auto-handled by gateway)

### 2. Warehouse Operations Page
- Already mostly correct! ✅
- Just update status values to new enum
- Add DELIVERED tab for final verification

### 3. Orders Page
- Remove payment status filters (use payment_state column)
- Show all non-COMPLETED orders
- Update status badge colors

### 4. Archived Orders Page
- Query: `status = 'COMPLETED'`
- Read-only view

### 5. Dashboard
- Update stats queries to use new status values
- Separate payment issues (payment_state = 'FAILED') from order issues

### 6. Analytics Page
- Update revenue queries to only count payment_state = 'SUCCESS'
- Update order status distribution charts

---

## Summary of Changes

✅ **Removed:**
- ON_CREDIT payment state (no credit allowed)
- DISPATCHED status (use OUT_FOR_DELIVERY)
- All mixed payment/fulfillment statuses
- Manual payment verification (auto via gateway)

✅ **Added:**
- delivery_proof_url column
- Timestamp columns for each stage
- courier_status column
- Clear payment_state enum (4 values)
- Clear status enum (9 values)

✅ **Simplified:**
- Payment flow: Gateway handles everything
- Status flow: Linear progression, no confusion
- Admin workflow: Matches Shopee exactly

---

Ready to implement? I'll create:
1. ✅ Migration SQL (above)
2. Updated frontend components
3. Database trigger for auto-archiving COMPLETED orders
4. RPC functions for common queries

Let me know if you approve this structure!
