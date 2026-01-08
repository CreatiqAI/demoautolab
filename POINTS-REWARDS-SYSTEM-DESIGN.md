# AutoLab Points & Rewards System - Complete Design Document

## System Overview

**Purpose:** Track customer spending, reward loyalty, and enable point-based redemptions for vouchers and merchandise.

**Core Formula:** 1 Point = RM1 Spent (on successful orders only)

---

## 1. DATABASE SCHEMA

### 1.1 Customer Points Ledger Table
```sql
CREATE TABLE customer_points_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id),

  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL, -- 'EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED'
  points_amount INTEGER NOT NULL, -- Positive for earned, negative for redeemed

  -- Reference tracking
  order_id UUID REFERENCES orders(id), -- If earned from order
  redemption_id UUID REFERENCES point_redemptions(id), -- If redeemed
  reward_item_id UUID REFERENCES reward_items(id), -- What was redeemed

  -- Metadata
  description TEXT,
  expires_at TIMESTAMP, -- Points expiry (optional)
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID, -- Admin who adjusted (if manual)

  CONSTRAINT valid_transaction CHECK (
    (transaction_type = 'EARNED' AND points_amount > 0) OR
    (transaction_type IN ('REDEEMED', 'EXPIRED') AND points_amount < 0) OR
    (transaction_type = 'ADJUSTED')
  )
);

-- Index for performance
CREATE INDEX idx_customer_points_customer ON customer_points_ledger(customer_id, created_at DESC);
CREATE INDEX idx_customer_points_order ON customer_points_ledger(order_id);
```

### 1.2 Reward Items Table (Redeemable Items)
```sql
CREATE TABLE reward_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Item details
  item_type VARCHAR(50) NOT NULL, -- 'VOUCHER', 'MERCHANDISE'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Point cost
  points_required INTEGER NOT NULL,

  -- Voucher-specific fields (if item_type = 'VOUCHER')
  voucher_code_prefix VARCHAR(50), -- e.g., 'POINTS100' generates 'POINTS100-XXXX'
  voucher_discount_type VARCHAR(20), -- 'PERCENTAGE', 'FIXED'
  voucher_discount_value NUMERIC(10,2),
  voucher_min_purchase NUMERIC(10,2),
  voucher_validity_days INTEGER DEFAULT 30,

  -- Merchandise-specific fields (if item_type = 'MERCHANDISE')
  stock_quantity INTEGER, -- Available quantity (NULL = unlimited)
  shipping_required BOOLEAN DEFAULT false,
  estimated_delivery_days INTEGER,

  -- Availability
  is_active BOOLEAN DEFAULT true,
  available_from TIMESTAMP,
  available_until TIMESTAMP,
  max_redemptions_per_customer INTEGER, -- NULL = unlimited
  total_redemption_limit INTEGER, -- NULL = unlimited

  -- Metadata
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reward_items_active ON reward_items(is_active, display_order);
CREATE INDEX idx_reward_items_type ON reward_items(item_type);
```

### 1.3 Point Redemptions Table
```sql
CREATE TABLE point_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Redemption details
  customer_id UUID NOT NULL REFERENCES customer_profiles(id),
  reward_item_id UUID NOT NULL REFERENCES reward_items(id),
  points_spent INTEGER NOT NULL,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  -- 'PENDING' -> voucher generation or merchandise prep
  -- 'COMPLETED' -> voucher issued or merchandise shipped
  -- 'CANCELLED' -> points refunded

  -- Generated outputs
  generated_voucher_id UUID REFERENCES vouchers(id), -- If voucher redeemed
  tracking_number VARCHAR(100), -- If merchandise with shipping

  -- Fulfillment details
  shipping_address JSONB, -- {name, phone, address, city, state, postcode}
  fulfillment_notes TEXT,
  fulfilled_at TIMESTAMP,
  fulfilled_by UUID REFERENCES admin_profiles(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_point_redemptions_customer ON point_redemptions(customer_id, created_at DESC);
CREATE INDEX idx_point_redemptions_status ON point_redemptions(status);
```

### 1.4 Customer Points Summary (Materialized View/Function)
```sql
-- Function to get customer's current points balance
CREATE OR REPLACE FUNCTION get_customer_points_balance(p_customer_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(points_amount), 0)
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get customer's lifetime points earned
CREATE OR REPLACE FUNCTION get_customer_lifetime_points(p_customer_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(points_amount), 0)
    FROM customer_points_ledger
    WHERE customer_id = p_customer_id
      AND transaction_type = 'EARNED'
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 2. ADMIN FEATURES - Points & Rewards Page (`/admin/points-rewards`)

### 2.1 Page Structure (Tabs Layout)

**Tab 1: Reward Items Management**
- View all redeemable items (vouchers & merchandise)
- Create new reward items
- Edit existing items
- Enable/disable items
- Set stock quantities
- View redemption statistics per item

**Tab 2: Redemption History**
- View all customer redemptions
- Filter by status, item type, customer
- Mark merchandise as shipped/completed
- Cancel redemptions (with point refund)
- Export redemption reports

**Tab 3: Customer Points Overview**
- View all customers with point balances
- Sort by: highest balance, most active, recent activity
- Manually adjust points (with reason)
- View individual customer point history

**Tab 4: Points Analytics**
- Total points issued vs redeemed
- Most popular reward items
- Redemption trends over time
- Customer engagement metrics

### 2.2 Create/Edit Reward Item Form

**Common Fields:**
- Item Type: [Voucher | Merchandise]
- Name (required)
- Description (rich text editor)
- Image upload
- Points Required (required)
- Active status toggle
- Display order
- Availability dates (from/until)
- Max redemptions per customer
- Total redemption limit

**Voucher-Specific Fields:**
- Voucher Code Prefix
- Discount Type: [Percentage | Fixed Amount]
- Discount Value
- Minimum Purchase Amount
- Validity Days (default: 30)

**Merchandise-Specific Fields:**
- Stock Quantity
- Shipping Required: [Yes | No]
- Estimated Delivery Days
- Physical Description/Dimensions

### 2.3 Redemption Management Actions

**For Voucher Redemptions:**
- Auto-generate voucher code
- Auto-send email to customer
- Status: PENDING → COMPLETED (automatic)

**For Merchandise Redemptions:**
- View shipping address
- Add tracking number
- Upload fulfillment photos
- Mark as shipped
- Mark as completed
- Add internal notes
- Status: PENDING → COMPLETED (manual)

**For All Redemptions:**
- Cancel and refund points
- View customer contact info
- Resend confirmation email

---

## 3. CUSTOMER FEATURES

### 3.1 Points Dashboard (New Page: `/my-points`)

**Points Balance Card:**
- Current available points (large number)
- Lifetime points earned
- Points redeemed (all-time)
- Points expiring soon (if applicable)

**Points History:**
- Tabbed view: [All | Earned | Redeemed | Expired]
- Table showing:
  - Date
  - Transaction type (icon + label)
  - Description (e.g., "Order #ORD-20251231-0001" or "Redeemed: Demo Rack")
  - Points (+/-)
  - Balance after transaction

**Quick Stats Cards:**
- Orders this month
- Points earned this month
- Rank/Tier (if tiering implemented later)

### 3.2 Rewards Catalog (Tab in `/my-points` or separate page)

**Filter/Sort Options:**
- Item Type: [All | Vouchers | Merchandise]
- Sort by: [Points Low-High | Points High-Low | Newest | Popular]
- Search by name

**Item Card Display:**
```
┌─────────────────────────────────┐
│  [Image]                        │
│                                 │
│  Item Name                      │
│  Brief description...           │
│                                 │
│  💎 500 Points                  │
│                                 │
│  [Redeem Now] or [Not Enough]  │
│                                 │
│  ⓘ 50 left | ⏰ Expires in 5d  │
└─────────────────────────────────┘
```

**Item Details Modal:**
- Full image gallery
- Complete description
- Terms & conditions
- If voucher: discount details, min purchase, validity
- If merchandise: shipping info, stock status, delivery estimate
- Points required (highlighted)
- [Confirm Redemption] button

### 3.3 Redemption Confirmation Flow

**Step 1: Review Item**
- Show item details
- Confirm points cost
- "You will have X points remaining"

**Step 2: Additional Info (if merchandise with shipping)**
- Shipping address form (pre-filled from profile)
- Phone number
- Special delivery instructions

**Step 3: Confirm**
- Final confirmation
- Deduct points
- Create redemption record
- Show success message

**Step 4: Post-Redemption**
- If voucher: Show generated code immediately + email sent
- If merchandise: Show "Order received, we'll process soon" + email sent
- Redirect to "My Redemptions" page

### 3.4 My Redemptions Page

**List View:**
- All customer's redemptions
- Filter by: [All | Vouchers | Merchandise] and [Pending | Completed | Cancelled]
- Card layout showing:
  - Item image + name
  - Points spent
  - Date redeemed
  - Status badge
  - Action buttons based on type/status

**Voucher Redemption Card:**
```
┌──────────────────────────────────────┐
│ [Voucher Icon] 10% Off Voucher       │
│ Points: -500 | Status: ✅ COMPLETED  │
│ Redeemed: 2025-01-01                 │
│                                      │
│ Code: POINTS10-AB12CD                │
│ [Copy Code] [View Details]          │
│ Valid until: 2025-01-31              │
└──────────────────────────────────────┘
```

**Merchandise Redemption Card:**
```
┌──────────────────────────────────────┐
│ [Image] Demo Display Rack            │
│ Points: -2000 | Status: 🚚 SHIPPED   │
│ Redeemed: 2024-12-20                 │
│                                      │
│ Tracking: TT123456789MY              │
│ [Track Shipment]                     │
│ Est. Delivery: 3-5 business days     │
└──────────────────────────────────────┘
```

---

## 4. BUSINESS LOGIC & AUTOMATIONS

### 4.1 Point Earning Trigger

**Database Trigger on Orders Table:**
```sql
CREATE OR REPLACE FUNCTION award_points_on_order_success()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_points_to_award INTEGER;
BEGIN
  -- Only award points when order payment succeeds
  IF NEW.payment_state = 'SUCCESS' AND
     (OLD.payment_state IS NULL OR OLD.payment_state != 'SUCCESS') THEN

    -- Get customer_id from order
    SELECT customer_id INTO v_customer_id
    FROM orders
    WHERE id = NEW.id;

    -- Calculate points: 1 point per RM1 (rounded down)
    v_points_to_award := FLOOR(NEW.total);

    -- Award points
    IF v_points_to_award > 0 THEN
      INSERT INTO customer_points_ledger (
        customer_id,
        transaction_type,
        points_amount,
        order_id,
        description
      ) VALUES (
        v_customer_id,
        'EARNED',
        v_points_to_award,
        NEW.id,
        'Earned from Order #' || NEW.order_no
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_points_on_success
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION award_points_on_order_success();
```

### 4.2 Point Redemption Function

```sql
CREATE OR REPLACE FUNCTION redeem_reward_item(
  p_customer_id UUID,
  p_reward_item_id UUID,
  p_shipping_address JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_points_required INTEGER;
  v_item_type VARCHAR(50);
  v_stock_quantity INTEGER;
  v_redemption_id UUID;
  v_voucher_id UUID;
  v_voucher_code VARCHAR(50);
  v_result JSONB;
BEGIN
  -- Get customer's current balance
  v_current_balance := get_customer_points_balance(p_customer_id);

  -- Get reward item details
  SELECT points_required, item_type, stock_quantity
  INTO v_points_required, v_item_type, v_stock_quantity
  FROM reward_items
  WHERE id = p_reward_item_id
    AND is_active = true
    AND (available_from IS NULL OR available_from <= NOW())
    AND (available_until IS NULL OR available_until >= NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward item not found or not available');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < v_points_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  -- Check stock for merchandise
  IF v_item_type = 'MERCHANDISE' AND v_stock_quantity IS NOT NULL AND v_stock_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item out of stock');
  END IF;

  -- Create redemption record
  INSERT INTO point_redemptions (
    customer_id,
    reward_item_id,
    points_spent,
    status,
    shipping_address
  ) VALUES (
    p_customer_id,
    p_reward_item_id,
    v_points_required,
    'PENDING',
    p_shipping_address
  ) RETURNING id INTO v_redemption_id;

  -- Deduct points from ledger
  INSERT INTO customer_points_ledger (
    customer_id,
    transaction_type,
    points_amount,
    redemption_id,
    reward_item_id,
    description
  ) VALUES (
    p_customer_id,
    'REDEEMED',
    -v_points_required,
    v_redemption_id,
    p_reward_item_id,
    'Redeemed reward: ' || (SELECT name FROM reward_items WHERE id = p_reward_item_id)
  );

  -- If voucher, auto-generate voucher code
  IF v_item_type = 'VOUCHER' THEN
    -- Generate voucher (call voucher creation function)
    -- This would integrate with existing voucher system
    -- Set redemption status to COMPLETED
    UPDATE point_redemptions
    SET status = 'COMPLETED', fulfilled_at = NOW()
    WHERE id = v_redemption_id;
  END IF;

  -- Deduct stock if merchandise
  IF v_item_type = 'MERCHANDISE' AND v_stock_quantity IS NOT NULL THEN
    UPDATE reward_items
    SET stock_quantity = stock_quantity - 1
    WHERE id = p_reward_item_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'new_balance', get_customer_points_balance(p_customer_id)
  );
END;
$$ LANGUAGE plpgsql;
```

### 4.3 Voucher Auto-Generation

When a voucher reward is redeemed:
1. Generate unique voucher code: `{PREFIX}-{RANDOM}`
2. Create voucher in `vouchers` table with:
   - Code, discount_type, discount_value from reward_item
   - Valid from NOW(), valid until NOW() + validity_days
   - Usage limit: 1
   - Assigned to customer
3. Update redemption record with generated_voucher_id
4. Send email to customer with code

---

## 5. ADMIN UI DESIGN (Points-Rewards Page)

### Layout Structure:

```
┌─────────────────────────────────────────────────────────────┐
│  Points & Rewards Management                    [+ Create]  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Reward Items] [Redemptions] [Customers] [Analytics]  │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  REWARD ITEMS TAB:                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Filters: [All | Vouchers | Merchandise]  🔍 Search   │  │
│  │ Status: [All | Active | Inactive]                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Card Grid (2-3 columns):                             │  │
│  │                                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │[Image]     │  │[Image]     │  │[Image]     │    │  │
│  │  │10% Voucher │  │Demo Rack   │  │Free Ship   │    │  │
│  │  │500 pts     │  │2000 pts    │  │300 pts     │    │  │
│  │  │✅ Active   │  │⚠️ Low Stock│  │❌ Inactive  │    │  │
│  │  │52 redeemed │  │15/20 left  │  │120 redeemed│    │  │
│  │  │[Edit][📊]  │  │[Edit][📊]  │  │[Edit][📊]  │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Features:

**Reward Items Tab:**
- Grid card layout showing all reward items
- Each card shows: image, name, points, status, stock (if applicable), total redemptions
- Quick actions: Edit, View Stats, Enable/Disable
- Click card to edit
- [+ Create Reward Item] button (top right)

**Redemptions Tab:**
- Table view with columns:
  - Date | Customer | Item | Points | Status | Actions
- Status badges: 🟡 Pending, ✅ Completed, ❌ Cancelled
- Filter by status, date range, item type
- Actions: View Details, Mark Shipped, Cancel
- Bulk actions for merchandise shipping

**Customers Tab:**
- Table showing all customers with points:
  - Customer | Current Points | Lifetime Earned | Redemptions | Last Activity
- Sort by points (highest first)
- Click to view detailed point history
- [Manual Adjustment] button per customer

**Analytics Tab:**
- Summary cards:
  - Total Points Issued
  - Total Points Redeemed
  - Active Point Balance (total across all customers)
  - Redemption Rate
- Charts:
  - Points earned vs redeemed over time (line chart)
  - Top 10 reward items by redemptions (bar chart)
  - Customer point distribution (pie chart: 0-500, 501-1000, 1001+)
  - Monthly redemption trends

---

## 6. CUSTOMER UI DESIGN (My Points Page)

### Layout Structure:

```
┌─────────────────────────────────────────────────────────────┐
│  Header > My Account > My Points                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────┐  ┌────────────────┐  │
│  │  💎 Your Points Balance          │  │  Quick Stats   │  │
│  │                                  │  │                │  │
│  │          2,450                   │  │  Orders: 12    │  │
│  │      Available Points            │  │  This Month: 5 │  │
│  │                                  │  │  Redeemed: 3   │  │
│  │  Lifetime Earned: 5,200          │  └────────────────┘  │
│  │  Total Redeemed: 2,750           │                      │
│  │                                  │                      │
│  │  ⚠️ 200 points expiring in 15d   │                      │
│  └──────────────────────────────────┘                      │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ [Points History] [Rewards Catalog] [My Redemptions]   ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  REWARDS CATALOG TAB:                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [All] [Vouchers] [Merchandise]        🔍 Search      │  │
│  │ Sort: [Points: Low to High ▼]                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Grid (3-4 columns on desktop, 1-2 on mobile):        │  │
│  │                                                       │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │  │
│  │  │ [Image]     │ │ [Image]     │ │ [Image]     │   │  │
│  │  │ 10% Voucher │ │ Free Ship   │ │ Demo Rack   │   │  │
│  │  │             │ │             │ │             │   │  │
│  │  │ Save RM50+  │ │ No min buy  │ │ Display     │   │  │
│  │  │             │ │             │ │ Equipment   │   │  │
│  │  │ 💎 500 pts  │ │ 💎 300 pts  │ │ 💎 2000 pts │   │  │
│  │  │             │ │             │ │             │   │  │
│  │  │ [Redeem]    │ │ [Redeem]    │ │ 🔒 Need 450 │   │  │
│  │  │ ⏰ 5d left  │ │ ✨ Popular  │ │ 📦 10 left  │   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. NOTIFICATION SYSTEM

### Email Templates Needed:

**1. Points Earned Confirmation**
- Trigger: After successful order payment
- Subject: "You earned {points} points from your order!"
- Content: Order details, points awarded, new balance, link to rewards catalog

**2. Redemption Confirmation - Voucher**
- Trigger: Voucher redeemed
- Subject: "Your voucher is ready! Code: {voucher_code}"
- Content: Voucher details, code, how to use, expiry date

**3. Redemption Confirmation - Merchandise**
- Trigger: Merchandise redeemed
- Subject: "Your reward is on the way!"
- Content: Item details, estimated delivery, points spent

**4. Shipment Notification - Merchandise**
- Trigger: Admin adds tracking number
- Subject: "Your reward has been shipped!"
- Content: Tracking number, carrier, delivery estimate

**5. Points Expiry Warning**
- Trigger: 7 days before expiry
- Subject: "Your points are expiring soon!"
- Content: Points amount, expiry date, link to rewards catalog

---

## 8. MOBILE RESPONSIVENESS

### Breakpoints:
- **Mobile (< 640px):** Single column layout
- **Tablet (640px - 1024px):** 2 column grid
- **Desktop (> 1024px):** 3-4 column grid

### Mobile Optimizations:
- Stack cards vertically
- Hamburger menu for filters
- Swipeable tabs
- Bottom sheet modals for redemption
- Touch-friendly buttons (min 44px height)
- Lazy loading for images

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Database & Core Logic (Week 1)
- Create all database tables
- Implement point earning trigger
- Create redemption function
- Set up RLS policies

### Phase 2: Admin Interface (Week 2)
- Reward Items management (CRUD)
- Redemption history view
- Customer points overview
- Manual adjustment feature

### Phase 3: Customer Interface (Week 3)
- My Points dashboard
- Rewards catalog
- Redemption flow
- My Redemptions page

### Phase 4: Automation & Polish (Week 4)
- Email notifications
- Analytics dashboard
- Testing & bug fixes
- Mobile optimization

---

## 10. FUTURE ENHANCEMENTS (Post-MVP)

1. **Point Expiry System:** Points expire after 12 months
2. **Tiered Membership:** Bronze/Silver/Gold based on lifetime points
3. **Bonus Points Multipliers:** Double points on special items/days
4. **Referral Rewards:** Earn points for referring friends
5. **Birthday Bonus:** Extra points on customer's birthday
6. **Flash Redemptions:** Limited-time high-value rewards
7. **Point Transfer:** Send points to another customer
8. **Gamification:** Badges, streaks, challenges

---

## 11. ADMIN PERMISSIONS

**Points Manager Role:**
- Create/edit reward items
- View redemptions
- Fulfill merchandise orders
- View customer points (read-only)

**Finance Manager Role:**
- Manual point adjustments
- Export reports
- View analytics

**Super Admin:**
- Full access to all features

---

## 12. REPORTING CAPABILITIES

**Standard Reports:**
1. Monthly Points Activity Report
2. Redemption Summary by Item
3. Customer Engagement Report (who's earning/redeeming)
4. Point Liability Report (total outstanding points)
5. Expired Points Report

**Export Formats:** CSV, PDF

---

This comprehensive design covers all aspects of the Points & Rewards system. Would you like me to start implementing this system, beginning with the database schema?
