# AUTOMOT-HUB USE CASE DIAGRAM & SCENARIOS

## Use Case Diagram Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AUTOMOT-HUB SYSTEM                                     │
│                   Auto Lab Sdn Bhd E-Commerce Platform                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐                                                  ┌───────────────┐
│               │                                                  │               │
│  GUEST USER   │◄─────────────────────────────────────────────────┤ NORMAL USER   │
│  (Anonymous)  │                                                  │  (Customer)   │
│               │                                                  │               │
└───────┬───────┘                                                  └───────┬───────┘
        │                                                                  │
        │  ┌──────────────────────────────────────────────────────────┐  │
        ├─►│ Browse Product Catalog                                   │◄─┤
        │  │ - Search by brand/model/year                             │  │
        │  │ - Filter by category                                     │  │
        │  │ - View product details                                   │  │
        │  │ - See product reviews                                    │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                                                                  │
        │  ┌──────────────────────────────────────────────────────────┐  │
        ├─►│ Find Partner Shops                                       │◄─┤
        │  │ - Browse shop directory                                  │  │
        │  │ - View shop profiles                                     │  │
        │  │ - Filter by location/services                            │  │
        │  │ - View shop photos/hours                                 │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                                                                  │
        │  ┌──────────────────────────────────────────────────────────┐  │
        ├─►│ Add to Cart (Guest Session)                              │◄─┤
        │  │ - Browse as guest                                        │  │
        │  │ - Temporary cart storage                                 │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                                                                  │
        │  ┌──────────────────────────────────────────────────────────┐  │
        └─►│ Register Account                                         │  │
           │ - Create customer account                                │  │
           │ - Phone verification (+60)                               │  │
           │ - Set username/password                                  │  │
           └──────────────────────────────────────────────────────────┘  │
                                                                           │
                                      CUSTOMER FEATURES                    │
           ┌───────────────────────────────────────────────────────────────┤
           │                                                               │
           │  ┌──────────────────────────────────────────────────────────┐│
           ├─►│ Manage Shopping Cart                                     ││
           │  │ - Add/remove items                                       ││
           │  │ - Update quantities                                      ││
           │  │ - See normal pricing                                     ││
           │  │ - Persistent cart (database)                             ││
           │  └──────────────────────────────────────────────────────────┘│
           │                                                               │
           │  ┌──────────────────────────────────────────────────────────┐│
           ├─►│ Checkout & Payment                                       ││
           │  │ - Select items to checkout                               ││
           │  │ - Apply voucher codes                                    ││
           │  │ - Enter shipping address                                 ││
           │  │ - Upload payment proof                                   ││
           │  │ - Track order status                                     ││
           │  └──────────────────────────────────────────────────────────┘│
           │                                                               │
           │  ┌──────────────────────────────────────────────────────────┐│
           ├─►│ Manage Orders                                            ││
           │  │ - View order history                                     ││
           │  │ - Track shipments                                        ││
           │  │ - Download invoices                                      ││
           │  │ - Cancel orders (if eligible)                            ││
           │  └──────────────────────────────────────────────────────────┘│
           │                                                               │
           │  ┌──────────────────────────────────────────────────────────┐│
           ├─►│ Submit Product Reviews                                   ││
           │  │ - Rate products (1-5 stars)                              ││
           │  │ - Write review text                                      ││
           │  │ - Upload review photos                                   ││
           │  │ - Edit own reviews                                       ││
           │  │ - Vote reviews helpful                                   ││
           │  └──────────────────────────────────────────────────────────┘│
           │                                                               │
           │  ┌──────────────────────────────────────────────────────────┐│
           ├─►│ Manage Vouchers                                          ││
           │  │ - View available vouchers                                ││
           │  │ - Copy voucher codes                                     ││
           │  │ - See usage history                                      ││
           │  └──────────────────────────────────────────────────────────┘│
           │                                                               │
           │  ┌──────────────────────────────────────────────────────────┐│
           └─►│ Profile Management                                       ││
              │ - Update personal info                                   ││
              │ - Manage addresses                                       ││
              │ - Change password                                        ││
              └──────────────────────────────────────────────────────────┘│
                                                                           │
                                                                           │
┌───────────────┐                                                          │
│               │                                                          │
│ MERCHANT USER │◄─────────────────────────────────────────────────────────┘
│  (Partner)    │  (Inherits all NORMAL USER features + extended features)
│               │
└───────┬───────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Register as Merchant                                     │
        │  │ - Submit merchant application                            │
        │  │ - Enter merchant code                                    │
        │  │ - Provide business details                               │
        │  │ - Wait for admin approval                                │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Access Merchant Pricing                                  │
        │  │ - See 5% wholesale discount                              │
        │  │ - View merchant_price tier                               │
        │  │ - Bulk order benefits                                    │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Manage Merchant Wallet                                   │
        │  │ - View points balance                                    │
        │  │ - View credit balance                                    │
        │  │ - See transaction history                                │
        │  │ - Earn loyalty points                                    │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ View Merchant Promotions                                 │
        │  │ - Exclusive merchant deals                               │
        │  │ - Special offers                                         │
        │  │ - Seasonal promotions                                    │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        └─►│ Premium Partner Program                                  │
           │ - Upgrade to Premium Partner                             │
           │ - Create shop listing                                    │
           │ - Manage shop profile                                    │
           │ - Upload shop photos                                     │
           │ - Set operating hours                                    │
           │ - View analytics (views/clicks)                          │
           │ - Receive customer inquiries                             │
           │ - Featured placement (if subscribed)                     │
           └──────────────────────────────────────────────────────────┘


┌───────────────┐
│               │
│  ADMIN USER   │
│  (Staff/Full) │
│               │
└───────┬───────┘
        │
        │  PRODUCT MANAGEMENT
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Manage Products                                          │
        │  │ - Add/edit/delete products                               │
        │  │ - Set pricing (normal + merchant)                        │
        │  │ - Upload product images                                  │
        │  │ - Manage stock levels                                    │
        │  │ - Set SKU/barcode                                        │
        │  │ - Categorize products                                    │
        │  │ - Bulk operations                                        │
        │  │ - SEO optimization                                       │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Manage Component Library                                 │
        │  │ - Add automotive components                              │
        │  │ - Cross-reference system                                 │
        │  │ - Link products to components                            │
        │  │ - Component specifications                               │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Inventory Management                                     │
        │  │ - Monitor stock levels                                   │
        │  │ - Set reorder levels                                     │
        │  │ - View low stock alerts                                  │
        │  │ - Track stock movements                                  │
        │  │ - Stock adjustments                                      │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ORDER MANAGEMENT
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Process Orders                                           │
        │  │ - View all orders                                        │
        │  │ - Update order status                                    │
        │  │ - Generate invoices                                      │
        │  │ - Add processing notes                                   │
        │  │ - Cancel/reject orders                                   │
        │  │ - Archive completed orders                               │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Payment Verification                                     │
        │  │ - Review payment proofs                                  │
        │  │ - Approve/reject payments                                │
        │  │ - Add verification notes                                 │
        │  │ - Set estimated delivery                                 │
        │  │ - Process refunds                                        │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Warehouse Operations                                     │
        │  │ - Assign orders to staff                                 │
        │  │ - Generate picking lists                                 │
        │  │ - Create packing lists                                   │
        │  │ - Integrate with couriers                                │
        │  │   • Lalamove (same-day)                                  │
        │  │   • J&T Express (nationwide)                             │
        │  │ - Generate tracking numbers                              │
        │  │ - Print shipping labels                                  │
        │  │ - Update delivery status                                 │
        │  │ - Mark as dispatched                                     │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  CUSTOMER MANAGEMENT
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Manage Customers                                         │
        │  │ - View customer database                                 │
        │  │ - View customer orders                                   │
        │  │ - Change customer types                                  │
        │  │   • Normal → Merchant                                    │
        │  │   • Merchant → Normal                                    │
        │  │ - Reset passwords                                        │
        │  │ - Ban/unban accounts                                     │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Process Merchant Applications                            │
        │  │ - Review applications                                    │
        │  │ - Verify merchant codes                                  │
        │  │ - Approve/reject with reason                             │
        │  │ - Set merchant tier                                      │
        │  │ - Manage credit limits                                   │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Manage Premium Partners                                  │
        │  │ - Approve partner listings                               │
        │  │ - Set subscription tiers                                 │
        │  │ - Feature shops (priority)                               │
        │  │ - Manage shop analytics                                  │
        │  │ - Process inquiries                                      │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  REVIEW & VOUCHER MANAGEMENT
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Moderate Reviews                                         │
        │  │ - Review pending submissions                             │
        │  │ - Approve/reject reviews                                 │
        │  │ - View review images                                     │
        │  │ - Flag inappropriate content                             │
        │  │ - Delete spam reviews                                    │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Manage Vouchers                                          │
        │  │ - Create vouchers                                        │
        │  │ - Set discount types (%, fixed)                          │
        │  │ - Configure restrictions                                 │
        │  │   • Customer type targeting                              │
        │  │   • Usage limits                                         │
        │  │   • Minimum purchase                                     │
        │  │   • Validity period                                      │
        │  │ - Track redemptions                                      │
        │  │ - Deactivate vouchers                                    │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  KNOWLEDGE BASE & SUPPORT
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Manage Knowledge Base                                    │
        │  │ - Create KB articles                                     │
        │  │ - Upload PDF documents                                   │
        │  │ - AI-powered content extraction                          │
        │  │ - Categorize content                                     │
        │  │ - Tag articles                                           │
        │  │ - Set priority levels                                    │
        │  │ - Approve AI-generated entries                           │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  SYSTEM ADMINISTRATION
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ Dashboard & Analytics                                    │
        │  │ - View KPIs                                              │
        │  │   • Total revenue                                        │
        │  │   • Order count                                          │
        │  │   • Customer count                                       │
        │  │   • Product count                                        │
        │  │ - Recent orders summary                                  │
        │  │ - Sales trends                                           │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        ├─►│ User Management                                          │
        │  │ - Create admin accounts                                  │
        │  │ - Assign roles (Staff/Admin)                             │
        │  │ - Set permissions                                        │
        │  │ - Audit user activity                                    │
        │  └──────────────────────────────────────────────────────────┘
        │
        │  ┌──────────────────────────────────────────────────────────┐
        └─►│ System Settings                                          │
           │ - Configure payment gateway                              │
           │ - Set tax rates                                          │
           │ - Configure shipping fees                                │
           │ - Email templates                                        │
           │ - Site configuration                                     │
           └──────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SYSTEM INTEGRATIONS                          │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│  Supabase    │◄──────────│  Automot-Hub │──────────►│ Revenue      │
│  (Backend)   │           │              │           │ Monster      │
│  - Auth      │           │              │           │ (Payment)    │
│  - Database  │           │              │           │  [PLANNED]   │
│  - Storage   │           │              │           └──────────────┘
└──────────────┘           │              │
                           │              │           ┌──────────────┐
┌──────────────┐           │              │──────────►│  Lalamove    │
│  OpenAI      │◄──────────│              │           │  (Courier)   │
│  (AI KB)     │           │              │           │  [80% DONE]  │
│  [OPTIONAL]  │           │              │           └──────────────┘
└──────────────┘           │              │
                           │              │           ┌──────────────┐
┌──────────────┐           │              │──────────►│ J&T Express  │
│ Google Maps  │◄──────────│              │           │ (Courier)    │
│ (Addresses)  │           │              │           │ [80% DONE]   │
└──────────────┘           │              │           └──────────────┘
                           │              │
                           │              │           ┌──────────────┐
                           │              │──────────►│  AutoCount   │
                           │              │           │ (Accounting) │
                           └──────────────┘           │  [PLANNED]   │
                                                      └──────────────┘
```

---

## DETAILED USE CASE SCENARIOS

### SCENARIO 1: Normal Customer Journey

**Actor:** Ahmad (Normal Customer)

**Flow:**
1. Ahmad visits automot-hub.com
2. Browses catalog → searches "brake pads for Honda Civic 2020"
3. Filters by brand → selects "Brembo"
4. Views product details → reads reviews (4.5★ average)
5. Adds to cart (sees normal pricing: RM450)
6. Continues shopping → adds brake fluid
7. Goes to checkout
8. Registers account:
   - Phone: +60123456789
   - Username: ahmad_auto
   - Password: ******
9. Enters shipping address (autocomplete with Google Maps)
10. Applies voucher code: NEWUSER10 (10% off)
11. Reviews order:
    - Subtotal: RM500
    - Discount: -RM50
    - Shipping: RM15
    - Tax (6%): RM27.90
    - **Total: RM492.90**
12. Uploads payment proof (online banking screenshot)
13. Order placed → Status: PENDING_PAYMENT_VERIFICATION
14. **Admin reviews payment** → Approves → Status: PAYMENT_VERIFIED
15. **Warehouse picks & packs** → Status: READY_FOR_DELIVERY
16. **Admin creates J&T shipment** → Tracking: JT1234567890MY
17. Ahmad receives notification → Tracks shipment
18. Order delivered → Status: DELIVERED
19. Ahmad submits review:
    - Rating: 5★
    - Comment: "Fast delivery, genuine parts!"
    - Uploads 2 photos of installed brakes
20. **Admin approves review** → Visible on product page

---

### SCENARIO 2: Merchant Partner Journey

**Actor:** Siti (Workshop Owner - "Siti Auto Service")

**Flow:**
1. Siti hears about Auto Lab wholesale program
2. Visits automot-hub.com → Clicks "Become a Merchant"
3. Fills merchant registration:
   - Business name: Siti Auto Service Sdn Bhd
   - Registration no: 202301234567
   - Tax ID: C12345678
   - **Merchant code: AUTOLAB2024** (received from Auto Lab sales team)
4. Submits application → Status: PENDING
5. **Admin reviews application**:
   - Verifies business registration
   - Checks merchant code validity
   - Approves with tier: STANDARD
6. Siti receives email → Account upgraded to MERCHANT
7. **Database automatically creates merchant wallet** (via trigger)
8. Logs in → Sees merchant pricing:
   - Same brake pads: ~~RM450~~ **RM427.50** (5% off)
9. Places bulk order (20 units) → Total: RM8,550
10. ⚠️ **Wallet feature exists but hidden** - points earned in background (855 points)
11. ⚠️ **No UI access to wallet/credit balance** - feature not in navigation
12. Explores premium partner program → Decides to upgrade
13. Goes to `/premium-partner` page
14. Subscribes to Premium Partner (RM149/month):
    - Creates shop listing
    - Uploads logo, cover photo, 10 gallery photos
    - Sets operating hours: Mon-Sat 9AM-6PM
    - Adds services: "Brake Service, Suspension, Oil Change"
    - Enables location on map
15. Shop goes live at /find-shops
16. Views analytics after 1 month:
    - Profile views: 450
    - Click-throughs: 87
    - Inquiries: 23
17. Receives customer inquiry notification
18. Responds to customer → Converts to walk-in customer

**Note:** Siti can manually visit `/merchant/wallet` by typing the URL to see wallet balance, but there's no link in the UI to guide her there.

---

### SCENARIO 3: Admin Daily Operations

**Actor:** Farah (Admin Staff)

**8:00 AM - Start of Day:**
1. Logs in to admin panel
2. Views dashboard:
   - 15 new orders overnight
   - 8 pending payment verifications
   - 3 low stock alerts

**8:15 AM - Payment Verification:**
3. Goes to /admin/order-verification
4. Reviews 8 payment proofs:
   - 7 approved (valid bank transfers)
   - 1 rejected (blurry image, wrong amount)
5. Sets estimated delivery dates
6. Sends rejection notification with reason

**9:00 AM - Warehouse Operations:**
7. Goes to /admin/warehouse-operations
8. PROCESSING tab (7 orders ready):
   - Assigns to warehouse staff "Azman"
   - Adds internal note: "Priority: 2 express orders"
9. PICKING tab:
   - Generates picking list (PDF)
   - Prints for warehouse team
10. PACKING tab (15 orders picked):
    - Multi-selects 10 orders
    - Bulk update to "Packing" status
11. READY FOR DELIVERY tab (10 orders packed):
    - Selects courier: J&T Express
    - Enters dimensions/weights
    - Creates bulk shipment
    - System generates tracking numbers
    - Downloads shipping labels
    - Prints labels → Hands to courier
12. Updates status to OUT_FOR_DELIVERY

**11:00 AM - Customer Support:**
13. Receives call from customer about delayed order
14. Searches order #AH-2024-00567
15. Views order timeline:
    - Placed: 5 days ago
    - Stuck in: PICKING
16. Calls warehouse → Item out of stock
17. Checks /admin/inventory-alerts
18. Sees brake caliper below reorder level
19. Contacts supplier → Places reorder
20. Updates customer → Offers refund or wait 3 days
21. Customer chooses to wait
22. Adds processing note: "Delayed - awaiting stock"

**2:00 PM - Review Moderation:**
23. Goes to /admin/review-moderation
24. Reviews 5 pending reviews:
    - 4 approved (genuine reviews)
    - 1 rejected (spam/promotional content)
25. Flags 1 review for investigation (possible fake)

**3:00 PM - Product Management:**
26. Goes to /admin/products-enhanced
27. Adds new product:
    - Name: "NGK Iridium Spark Plug (Set of 4)"
    - Brand: NGK
    - Model: ILTR6A13G
    - Year: 2018-2024
    - SKU: NGK-ILTR6A13G-4
    - Normal price: RM180
    - Merchant price: RM171
    - Stock: 50 sets
    - Category: Ignition System
    - Uploads 5 product images
    - Sets SEO keywords
28. Publishes product → Live on catalog

**4:00 PM - Merchant Application:**
29. Goes to /admin/customers
30. Reviews new merchant application:
    - Business: "Rapid Auto Garage"
    - Merchant code: AUTOLAB2024 ✓ (valid)
    - Documents: Complete
31. Approves application
32. Sets credit limit: RM10,000
33. Sends welcome email

**5:00 PM - End of Day:**
34. Views archived orders → 28 completed today
35. Checks dashboard stats:
    - Revenue today: RM45,890
    - Orders completed: 28
    - Average order value: RM1,639
36. Logs out

---

### SCENARIO 4: Premium Partner Shop Visibility

**Actor:** Kumar (Looking for brake service in Cheras)

**Flow:**
1. Kumar searches Google: "brake service near Cheras"
2. Finds Auto Lab website → Clicks "Find Shops"
3. Arrives at /find-shops
4. Filters by:
   - State: Kuala Lumpur
   - Service: Brake Service
5. Sees 12 results, sorted by:
   - **FEATURED** (premium partners first)
   - Standard listings
6. Top result: "Siti Auto Service" ⭐ FEATURED
7. Clicks on shop → Views profile:
   - 10 professional photos
   - 4.8★ rating (from inquiries)
   - Operating hours clearly displayed
   - Map showing 3.5km from Kumar's location
   - Services offered with icons
   - Contact: +60123456789, WhatsApp button
8. Clicks "Send Inquiry"
9. Fills form:
   - Name: Kumar
   - Phone: +60198765432
   - Car: Honda Accord 2021
   - Issue: "Brake pedal feels spongy, need inspection"
10. Submits inquiry
11. **Siti receives notification** (email + SMS)
12. Siti calls Kumar within 30 minutes
13. Books appointment for next day
14. **System tracks analytics**:
    - View count: +1
    - Click count: +1
    - Inquiry count: +1
15. Kumar becomes walk-in customer → Service completed
16. Kumar recommends shop to friends

---

### SCENARIO 5: AI Knowledge Base Usage (Future)

**Actor:** Lisa (Customer Support Agent)

**Flow:**
1. Customer emails: "What's your return policy for wrong parts?"
2. Lisa goes to /admin/knowledge-base
3. Searches: "return policy wrong parts"
4. KB returns article (AI-generated from PDF):
   - **Title:** Return & Exchange Policy
   - **Category:** Policies
   - **Content:**
     - Wrong parts: Full refund within 14 days
     - Original packaging required
     - Receipt/invoice needed
     - Process: Contact support → Get RMA number → Ship back
   - **Related:** Warranty policy, Shipping policy
5. Lisa copies formatted response
6. Sends to customer within 2 minutes
7. Customer satisfied → No escalation needed

**Admin later:**
8. Uploads new supplier catalog (PDF)
9. AI processes 50 pages
10. Extracts product specifications
11. Generates 50 KB entries automatically
12. Admin reviews & approves 48 (2 had errors)
13. Knowledge base updated with latest info

---

## SYSTEM INTERACTION MATRIX

| User Type | Products | Cart | Orders | Reviews | Vouchers | Wallet | Shop Listing | Admin Panel |
|-----------|----------|------|--------|---------|----------|--------|--------------|-------------|
| **Guest** | View | Add (temp) | ❌ | View only | ❌ | ❌ | View only | ❌ |
| **Customer** | View | Full CRUD | View own | Full CRUD | View/Apply | ❌ | View only | ❌ |
| **Merchant** | View (special $) | Full CRUD | View own | Full CRUD | View/Apply | View/Use | Create/Edit | ❌ |
| **Staff** | ❌ | ❌ | View all | Moderate | ❌ | ❌ | ❌ | Limited |
| **Admin** | Full CRUD | ❌ | Full CRUD | Moderate | Full CRUD | View all | Approve | Full Access |

---

## KEY WORKFLOWS SUMMARY

### 1. ORDER LIFECYCLE (from customer perspective)
```
Browse → Add to Cart → Checkout → Pay → Upload Proof →
[Wait for Admin] → Approved → Processing → Shipped →
Delivered → Review Product
```

### 2. ORDER PROCESSING (from admin perspective)
```
New Order → Verify Payment → Process Order → Pick Items →
Pack Items → Create Shipment → Print Label → Dispatch →
Mark Delivered → Archive
```

### 3. MERCHANT ONBOARDING
```
Apply → Submit Docs → [Admin Review] → Approved →
Access Merchant Pricing → [Optional] Upgrade to Premium Partner →
Create Shop Listing → Go Live → Receive Inquiries
```

### 4. REVIEW MODERATION
```
Customer Submits → Pending Status → [Admin Review] →
Approve/Reject → Published → Visible to Public →
Helpful Votes Tracked
```

### 5. INVENTORY MONITORING
```
Stock Movement → Update Levels → Check Reorder Point →
Alert Triggered → Admin Notified → Reorder Placed →
Stock Received → Update Inventory
```

---

## METRICS & ANALYTICS TRACKED

**Customer Metrics:**
- Total orders
- Order value
- Voucher usage
- Review submissions
- Account age

**Merchant Metrics:**
- Wallet balance (points + credit)
- Transaction history
- Order volume
- Loyalty tier

**Premium Partner Metrics:**
- Profile views
- Click-through rate
- Inquiry conversion
- Subscription status
- Featured duration

**System Metrics:**
- Daily/monthly revenue
- Order count by status
- Payment verification queue
- Low stock alerts
- Review moderation queue
- Customer growth rate
- Product performance
- Top-selling items

---

**End of Use Case Documentation**
**Generated:** 2025-11-16
**Total Scenarios:** 5 detailed workflows
**Total Use Cases:** 60+ distinct use cases
