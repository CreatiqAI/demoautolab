# AutoLab E-Commerce Feature Roadmap

## Current Status: ~65% Complete (64 Done, 19 Partial, 34 Missing)

Last Updated: 2026-02-02

---

## 🟡 PARTIAL FEATURES (19) - Need Completion

### Customer Features (8)

| # | Feature | Current State | What's Needed |
|---|---------|---------------|---------------|
| P1 | Related Products | Basic implementation | AI-powered recommendations, "Customers also bought" |
| P2 | Real Payment Processing | Demo mode with mock success/fail | Integrate Stripe/PayPal/Billplz for real transactions |
| P3 | Shipping Cost Calculator | Backend exists | Show shipping cost to customer BEFORE checkout |
| P4 | Order Cancellation | Admin-only | Allow customers to cancel within time window |
| P5 | Referral Program | Salesman codes exist | Customer-to-customer referral with rewards |
| P6 | In-app Notifications | Framework exists | Wire up real-time notification display |
| P7 | WhatsApp Integration | Webhook SQL prepared | Connect to n8n → 2ndu.ai (Phase 4) |
| P8 | Contact Form | Basic form exists | Add to footer, proper submission handling |

### Admin Features (6)

| # | Feature | Current State | What's Needed |
|---|---------|---------------|---------------|
| P9 | Export Reports | Limited download | Full CSV/Excel export for all reports |
| P10 | Order Edit | Status only | Allow editing order items, quantities, prices |
| P11 | Shipping Label Print | Framework in courier-service.ts | Generate printable labels |
| P12 | Customer Notes | Basic | Rich text notes, note history |
| P13 | Promo Code Analytics | Usage count only | Revenue impact, conversion rates |
| P14 | Staff Management | Basic CRUD | Shift scheduling, performance tracking |

### Merchant Features (2)

| # | Feature | Current State | What's Needed |
|---|---------|---------------|---------------|
| P15 | Merchant Analytics | Basic sales | Detailed reports, trends, comparisons |
| P16 | Payout Management | Structure exists | Withdrawal requests, payout history |

### Integrations (3)

| # | Feature | Current State | What's Needed |
|---|---------|---------------|---------------|
| P17 | Payment Gateway | Demo mode | Production keys for Stripe/Billplz |
| P18 | Courier APIs | Mock responses | Real J&T/Lalamove API credentials |
| P19 | Real-time Subscriptions | Supabase available | Use for live dashboard, notifications |

---

## ❌ MISSING FEATURES (34) - Need Implementation

### 🔴 CRITICAL: Returns & Refunds (7)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| M1 | Return Request Form | Customer submits return with reason, photos | CRITICAL |
| M2 | Return Reasons | Defective, wrong item, changed mind, not as described | CRITICAL |
| M3 | Return Authorization (RMA) | Generate RMA number, approve/reject returns | CRITICAL |
| M4 | Return Shipping | Generate return shipping label | CRITICAL |
| M5 | Refund Processing | Process refunds to original payment method | CRITICAL |
| M6 | Store Credit | Issue store credit as alternative to refund | CRITICAL |
| M7 | Return Policy Page | Display return/refund policy | CRITICAL |

### 🟠 HIGH: Customer Experience (14)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| M8 | Wishlist/Favorites | Save products, wishlist page, heart icon | HIGH |
| M9 | Product Comparison | Compare 2-4 products side by side | HIGH |
| M10 | Recently Viewed | Show last 10 viewed products | HIGH |
| M11 | Save for Later | Move cart items to wishlist | HIGH |
| M12 | Abandoned Cart Email | Send reminder after 1hr, 24hr, 72hr | HIGH |
| M13 | Express Checkout | "Buy Now" button skipping cart | HIGH |
| M14 | Reorder Function | One-click reorder from order history | HIGH |
| M15 | Seller Response to Reviews | Admin can reply to customer reviews | HIGH |
| M16 | Points Expiry System | Auto-expire points after 12 months | HIGH |
| M17 | Flash Sales | Time-limited deals with countdown timer | HIGH |
| M18 | Bundle Deals | Buy together & save X% | HIGH |
| M19 | Bulk Discounts | Buy 3+ get 10% off, etc. | HIGH |
| M20 | Email Notifications | Order confirm, shipped, delivered emails | HIGH |
| M21 | SMS Notifications | OTP, delivery alerts via Twilio | HIGH |

### 🟡 MEDIUM: Admin & Operations (12)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| M22 | Real-time Dashboard | Live updating metrics via WebSocket | MEDIUM |
| M23 | Bulk Product Import/Export | CSV upload/download for products | MEDIUM |
| M24 | Product Bundles | Create bundled products in admin | MEDIUM |
| M25 | Partial Fulfillment | Ship order items separately | MEDIUM |
| M26 | Backorder Management | Handle out-of-stock orders | MEDIUM |
| M27 | Bin/Location Tracking | Warehouse storage locations | MEDIUM |
| M28 | Auto Tracking Updates | Fetch courier status automatically | MEDIUM |
| M29 | Delivery Zones/Rates | Zone-based shipping pricing | MEDIUM |
| M30 | Customer Groups | Segment customers (VIP, wholesale, etc.) | MEDIUM |
| M31 | Auto-generate Voucher Codes | Bulk code generation | MEDIUM |
| M32 | Permission Matrix | Granular admin permissions | MEDIUM |
| M33 | Activity Logs | Track all admin actions | MEDIUM |

### 🟢 LOW: Nice to Have (7)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| M34 | Live Chat Widget | Real-time customer support | LOW |
| M35 | Support Tickets | Track customer issues | LOW |
| M36 | XML Sitemap | For SEO indexing | LOW |
| M37 | Google Analytics | Traffic & conversion tracking | LOW |
| M38 | Offer System (2ndHand) | Make/accept price offers | LOW |
| M39 | In-app Chat (2ndHand) | Buyer-seller messaging | LOW |
| M40 | PWA Support | Install as mobile app | LOW |

---

## Implementation Phases

### Phase 1: Legal Compliance (Returns/Refunds) ⚠️
**Must have before public launch**
- [ ] M1: Return Request Form
- [ ] M2: Return Reasons
- [ ] M3: Return Authorization (RMA)
- [ ] M4: Return Shipping
- [ ] M5: Refund Processing
- [ ] M6: Store Credit
- [ ] M7: Return Policy Page

### Phase 2: Core Customer Experience
**Significantly improves conversion**
- [ ] M8: Wishlist/Favorites
- [ ] M10: Recently Viewed
- [ ] M14: Reorder Function
- [ ] M20: Email Notifications
- [ ] P2: Real Payment Processing

### Phase 3: Sales & Marketing
**Increases average order value**
- [ ] M17: Flash Sales
- [ ] M18: Bundle Deals
- [ ] M19: Bulk Discounts
- [ ] M12: Abandoned Cart Email
- [ ] M16: Points Expiry System

### Phase 4: Advanced Operations
**Improves efficiency**
- [ ] M22: Real-time Dashboard
- [ ] M23: Bulk Product Import/Export
- [ ] M28: Auto Tracking Updates
- [ ] M33: Activity Logs
- [ ] P7: WhatsApp Integration (chatbot)

### Phase 5: Polish & Scale
**Nice to have**
- [ ] M9: Product Comparison
- [ ] M34: Live Chat Widget
- [ ] M37: Google Analytics
- [ ] M40: PWA Support

---

## Database Tables Needed

### For Returns/Refunds
```sql
-- returns table
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES profiles(id),
  rma_number TEXT UNIQUE,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, RECEIVED, REFUNDED
  reason TEXT, -- DEFECTIVE, WRONG_ITEM, CHANGED_MIND, NOT_AS_DESCRIBED, OTHER
  reason_details TEXT,
  refund_method TEXT, -- ORIGINAL_PAYMENT, STORE_CREDIT
  refund_amount DECIMAL(10,2),
  return_shipping_label_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- return_items table
CREATE TABLE return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id),
  order_item_id UUID REFERENCES order_items(id),
  quantity INTEGER,
  reason TEXT,
  condition TEXT, -- UNOPENED, OPENED, DAMAGED
  photos TEXT[]
);

-- store_credits table
CREATE TABLE store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2),
  balance DECIMAL(10,2),
  source TEXT, -- REFUND, PROMOTION, MANUAL
  source_id UUID, -- return_id or promotion_id
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### For Wishlist
```sql
-- wishlists table
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  variant_id UUID, -- optional
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id, variant_id)
);
```

### For Recently Viewed
```sql
-- recently_viewed table
CREATE TABLE recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
-- Keep only last 20 per customer via trigger
```

### For Flash Sales
```sql
-- flash_sales table
CREATE TABLE flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT, -- PERCENTAGE, FIXED
  discount_value DECIMAL(10,2),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- flash_sale_products table
CREATE TABLE flash_sale_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID REFERENCES flash_sales(id),
  product_id UUID REFERENCES products(id),
  sale_price DECIMAL(10,2),
  quantity_limit INTEGER,
  quantity_sold INTEGER DEFAULT 0
);
```

### For Bundle Deals
```sql
-- product_bundles table
CREATE TABLE product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  bundle_price DECIMAL(10,2),
  savings_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bundle_items table
CREATE TABLE bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES product_bundles(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1
);
```

---

## Files to Create/Modify

### New Pages
| File | Purpose |
|------|---------|
| `src/pages/Wishlist.tsx` | Customer wishlist page |
| `src/pages/ReturnRequest.tsx` | Submit return request |
| `src/pages/MyReturns.tsx` | View return history |
| `src/pages/admin/Returns.tsx` | Admin return management |
| `src/pages/admin/FlashSales.tsx` | Flash sale management |
| `src/pages/admin/Bundles.tsx` | Bundle management |

### New Components
| File | Purpose |
|------|---------|
| `src/components/WishlistButton.tsx` | Heart icon for products |
| `src/components/RecentlyViewed.tsx` | Recently viewed carousel |
| `src/components/FlashSaleTimer.tsx` | Countdown timer |
| `src/components/BundleDeal.tsx` | Bundle display card |
| `src/components/ReturnForm.tsx` | Return request form |

### New Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useWishlist.ts` | Wishlist management |
| `src/hooks/useRecentlyViewed.ts` | Track viewed products |
| `src/hooks/useReturns.ts` | Return operations |

### New Lib/Utils
| File | Purpose |
|------|---------|
| `src/lib/email-service.ts` | Email sending (Resend/SendGrid) |
| `src/lib/sms-service.ts` | SMS sending (Twilio) |

---

## Progress Tracking

### Completed
- [x] Warehouse Dashboard
- [x] QR Code Scanning
- [x] Invoice QR Codes
- [x] J&T CSV Export
- [x] Order Timeline (MyOrders)
- [x] Webhook SQL (prepared)

### In Progress
- [ ] _None currently_

### Up Next
- [ ] Returns/Refunds System (Phase 1)
- [ ] Wishlist/Favorites
- [ ] Email Notifications

---

## Notes

1. **Payment Gateway**: Currently using demo mode. For production:
   - Malaysia: Billplz, iPay88, or Stripe
   - Need to apply for merchant account

2. **Email Service**: Recommend Resend (free tier: 100 emails/day)
   - Alternative: SendGrid, Mailgun

3. **SMS Service**: Recommend Twilio
   - Malaysia: ~RM 0.15/SMS
   - Consider only for critical alerts (OTP, delivery)

4. **Returns Policy**: Malaysia Consumer Protection Act requires:
   - Clear return policy display
   - 7-day cooling-off period for online purchases
   - Full refund for defective products

---

## Quick Start Commands

```bash
# Install email service
npm install resend

# Install for flash sale countdown
npm install react-countdown

# Database migrations
# Run the SQL from "Database Tables Needed" section in Supabase
```
