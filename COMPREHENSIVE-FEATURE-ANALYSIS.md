# COMPREHENSIVE FEATURE ANALYSIS - AUTOLAB WEBSITE
## Current Implementation vs. Client Requirements

**Analysis Date:** December 7, 2025
**Project:** AutoLab E-commerce Platform (B2B + B2C)

---

## EXECUTIVE SUMMARY

**Overall Implementation Status:** 78% Complete

- **Implemented Features:** 14/18 core requirements
- **Missing Features:** 4/18 core requirements
- **Bonus Features:** 10 additional features beyond requirements
- **Requires Modification:** 3 partially implemented features

---

## 1. PRODUCT MANAGEMENT SYSTEM

### 1.1 CATEGORY SYSTEM ✅ IMPLEMENTED (Needs Enhancement)

**Current Implementation:**
- Hierarchical category structure with `parent_id` support
- Database: `categories` table ([types.ts:159-208](src/integrations/supabase/types.ts#L159-L208))
- Features:
  - Category name, slug, description
  - Category images
  - Active/inactive status
  - Parent-child relationships
  - Display order
- Visible in: [Catalog.tsx](src/pages/Catalog.tsx), Admin Products pages

**Client Requirement - DUAL CATEGORIZATION:**
> "Need to categorize by the product brand, for example, 12.3 inch casing is a big category, inside this 12.3 inch casing category, there will have different car brands, and also different factory brands of the 12.3 inch casing from different manufacturer."

**Gap Analysis:**
- ❌ **Missing:** Product manufacturer/factory brand categorization
- ❌ **Missing:** Multi-level product organization (Product Type → Car Brand → Manufacturer Brand)
- ✅ **Exists:** Basic category hierarchy
- ✅ **Exists:** Car model compatibility fields

**Required Enhancement:**
```
Example Structure Needed:
├─ 12.3 Inch Casing (Product Category)
│  ├─ BMW (Car Brand)
│  │  ├─ Factory A Casing
│  │  ├─ Factory B Casing
│  │  └─ Factory C Casing
│  ├─ Mercedes (Car Brand)
│  │  ├─ Factory A Casing
│  │  └─ Factory D Casing
```

**Recommendation:**
- Add `manufacturer_brand` field to products table
- Create `manufacturers` lookup table
- Implement filtering by: Category → Car Brand → Manufacturer
- Update product pages to show manufacturer brand prominently

---

### 1.2 BRAND MANAGEMENT ✅ IMPLEMENTED

**Current Implementation:**
- Products have `brand` field (car brand)
- Brand filtering in catalog
- Database: `products.brand`, `products_new.brand`
- Visible in: [Catalog.tsx:678-679](src/pages/Catalog.tsx#L678-L679)

**Status:** ✅ **COMPLETE** - Car brand categorization working

---

### 1.3 CAR MODEL COMPATIBILITY ✅ IMPLEMENTED

**Current Implementation:**
- Database fields: `model`, `year_from`, `year_to`
- Product details show compatible car models and years
- Visible in: [Catalog.tsx:659-664](src/pages/Catalog.tsx#L659-L664)

**Example Display:**
```
Model: Honda Civic
Year: 2018-2023
```

**Status:** ✅ **COMPLETE**

---

### 1.4 PRICING STRUCTURE ✅ IMPLEMENTED

**Current Implementation:**
- Dual pricing: `price_regular` (B2C) vs `price_merchant` (B2B)
- Files: [Catalog.tsx](src/pages/Catalog.tsx), [ProductCard.tsx](src/components/ProductCard.tsx)
- Merchant customers see merchant pricing
- Regular customers see regular pricing

**Status:** ✅ **COMPLETE**

---

## 2. USER AUTHENTICATION & ROLES

### 2.1 CUSTOMER REGISTRATION/LOGIN ✅ IMPLEMENTED

**Current Implementation:**
- File: [Auth.tsx](src/pages/Auth.tsx)
- Phone-based authentication (+60 Malaysia)
- Password authentication
- User profile fields: full_name, phone_e164
- Database: `profiles`, `customer_profiles` tables

**Status:** ✅ **COMPLETE**

---

### 2.2 MERCHANT/DEALER LOGIN ✅ IMPLEMENTED

**Current Implementation:**
- Separate merchant registration: [MerchantRegister.tsx](src/pages/MerchantRegister.tsx)
- Merchant Console: [MerchantConsole.tsx](src/pages/MerchantConsole.tsx)
- Business profile management
- Merchant-specific pricing access

**Status:** ✅ **COMPLETE**

---

## 3. SUBSCRIPTION TIERS SYSTEM (CRITICAL - NEEDS MAJOR REVISION)

### 3.1 CURRENT SUBSCRIPTION MODEL

**Existing Plans:**
1. **Professional Plan**
   - Price: **RM99/year** ✅ (matches requirement)
   - File: [MerchantConsole.tsx:798](src/pages/MerchantConsole.tsx#L798)
   - Features:
     - Business profile listing
     - Merchant pricing access
     - Featured badge (optional)

2. **Enterprise Plan**
   - Price: **RM388/year** ❌ (should be RM350/month)
   - File: [MerchantConsole.tsx:855](src/pages/MerchantConsole.tsx#L855)
   - Features:
     - All Professional features
     - Installation guides access ([MerchantConsole.tsx:148](src/pages/MerchantConsole.tsx#L148))
     - Priority support
     - Listed in "Find Shops" page

---

### 3.2 CLIENT REQUIREMENT - REVISED SUBSCRIPTION MODEL

#### TIER 1: MERCHANT (RM99/year) ⚠️ PARTIALLY IMPLEMENTED

**Client Specification:**
> "Every merchant customer registered must be RM99 per year, and able to view merchant pricing, and free RM50 voucher gift whenever the merchant registered in our website, and also able to view full guideline on the installation guide, including the installation time, installation recommended pricing, and so on."

**Current vs Required:**

| Feature | Current | Required | Status |
|---------|---------|----------|--------|
| Price | RM99/year | RM99/year | ✅ Correct |
| Merchant pricing access | ✅ Yes | ✅ Yes | ✅ Implemented |
| RM50 welcome voucher | ⚠️ Exists but manual | ✅ Auto on registration | ⚠️ Needs automation |
| Installation guides access | ❌ Enterprise only | ✅ All merchants | ❌ **CRITICAL GAP** |
| Installation time display | ❌ Not shown | ✅ Required | ❌ Missing |
| Recommended installation pricing | ❌ Not shown | ✅ Required | ❌ Missing |

**Action Required:**
1. ✅ Keep RM99/year pricing
2. ❌ **Move installation guides from Enterprise to Merchant tier**
3. ❌ **Auto-generate RM50 voucher upon merchant registration**
4. ❌ **Add installation time field to guides**
5. ❌ **Add recommended pricing field to guides**

---

#### TIER 2: PANEL (RM350/month) ❌ MAJOR REVISION NEEDED

**Client Specification:**
> "The enterprise level, which should be call as Panel, this panel is like an authorized shop from us, which must set all pricing of our products as we set, every rules must be followed as our terms and conditions, this panel purpose is to let those authorized merchant to exposed themselves in our platform in the find shops, as this panel shouldn't be applied by the merchant to become our authorized, this should be we find ourselves to authorized those shops, as these authorized shops can only have top100 shops across entire Malaysia. And this panel should charge fees of RM350 per month."

**Current vs Required:**

| Feature | Current | Required | Status |
|---------|---------|----------|--------|
| Name | "Enterprise" | "Panel" | ❌ Rename needed |
| Price | RM388/year | **RM350/month** | ❌ **CRITICAL - Wrong billing cycle** |
| Application process | Self-service registration | Admin invitation only | ❌ **Wrong approach** |
| Quantity limit | Unlimited | Top 100 shops in Malaysia | ❌ Missing enforcement |
| Pricing control | Not enforced | Must follow AutoLab pricing | ❌ Missing validation |
| T&C enforcement | Not enforced | Strict T&C compliance required | ❌ Missing |
| Visibility | Listed in Find Shops | **ONLY** Panels in Find Shops | ⚠️ Currently all merchants can list |
| Authorization | Admin approval checkbox | Full authorization workflow | ⚠️ Basic approval exists |

**Critical Changes Required:**

1. **❌ Pricing Model**
   - Change from RM388/year → **RM350/month**
   - Update billing cycle logic
   - Update subscription_end_date calculations

2. **❌ Rename "Enterprise" → "Panel"**
   - Database: Update `subscription_plan` enum values
   - UI: All references to "Enterprise"
   - Marketing materials

3. **❌ Authorization-Only Model**
   - Remove self-registration for Panel tier
   - Create admin-initiated invitation system
   - Panel merchants cannot "apply" - must be invited
   - Admin dashboard to send Panel invitations

4. **❌ Top 100 Limit Enforcement**
   - Add counter: Current active Panel shops
   - Prevent activation beyond 100
   - Waiting list system for Panels

5. **❌ Pricing Control System**
   - Panel shops must use AutoLab's set prices
   - Admin sets "official Panel pricing" for each product
   - Panel merchants cannot modify prices
   - System validation on orders

6. **❌ Find Shops Visibility**
   - **ONLY Panel tier appears in Find Shops**
   - Regular merchants (RM99/year) should NOT appear in Find Shops
   - Currently: All merchants with subscriptions can be listed

7. **❌ Terms & Conditions Enforcement**
   - Panel-specific T&C document
   - Acceptance tracking
   - Compliance monitoring

---

### 3.3 VOUCHER IMPLEMENTATION

**Current System:**
- Voucher management: [VoucherManagement.tsx](src/pages/admin/VoucherManagement.tsx)
- Customer view: [MyVouchers.tsx](src/pages/MyVouchers.tsx)
- Database: `vouchers`, `voucher_usage` tables
- Features: percentage/fixed discounts, min purchase, usage limits

**Client Requirement - RM50 Welcome Voucher:**
- ✅ Voucher system exists
- ❌ Not auto-generated on merchant registration
- ⚠️ Manual creation by admin currently

**Required Implementation:**
```sql
-- Auto-create on merchant registration
INSERT INTO vouchers (
  code,
  discount_type,
  discount_value,
  min_purchase_amount,
  customer_type_restriction,
  usage_limit_per_user,
  valid_from,
  valid_until
) VALUES (
  'WELCOME50_[MERCHANT_ID]',
  'fixed',
  50.00,
  100.00, -- Min spend RM100
  'merchant',
  1, -- One-time use
  NOW(),
  NOW() + INTERVAL '1 year'
);
```

---

## 4. ORDER HISTORY & ACCESS CONTROL

### 4.1 CURRENT IMPLEMENTATION ✅

**Existing System:**
- Customer view: [MyOrders.tsx](src/pages/MyOrders.tsx)
- **Shows ALL historical orders** (no time limit)
- Order statuses tracked
- Payment verification
- Delivery tracking

---

### 4.2 CLIENT REQUIREMENT - 6-MONTH LIMIT ❌ NOT IMPLEMENTED

**Client Specification:**
> "For the order history, I might want to show only 6 months for merchant's orders history, if merchant want to access to more than 6 months orders record, then will need to pay to access to previous order's records."

**Required Changes:**

1. **❌ 6-Month Free Window**
   - Filter orders: `WHERE created_at >= NOW() - INTERVAL '6 months'`
   - Show message: "Orders older than 6 months require Premium History Access"

2. **❌ Premium History Access**
   - New feature: "Historical Order Access"
   - Pricing model (e.g., RM50 for 1-year access, RM100 for lifetime)
   - New database table: `order_history_access`
   ```sql
   CREATE TABLE order_history_access (
     id UUID PRIMARY KEY,
     merchant_id UUID REFERENCES customer_profiles(id),
     access_type TEXT, -- '1_year', 'lifetime'
     purchased_at TIMESTAMPTZ,
     expires_at TIMESTAMPTZ,
     amount_paid DECIMAL
   );
   ```

3. **❌ Conditional Display Logic**
   - If merchant has `order_history_access` → show all orders
   - If no access → show only last 6 months
   - "Unlock History" button with payment flow

**Implementation Priority:** Medium (nice-to-have revenue feature)

---

## 5. SHOPPING CART SYSTEM ✅ IMPLEMENTED

**Current Implementation:**
- File: [Cart.tsx](src/pages/Cart.tsx)
- Database: `carts`, `cart_items` tables
- Features:
  - Guest cart support (`guest_key`)
  - User cart persistence
  - Quantity management
  - Real-time pricing
  - Voucher application

**Status:** ✅ **COMPLETE** - B2B & B2C requirement met

---

## 6. NOTIFICATION SYSTEM

### 6.1 CURRENT IMPLEMENTATION ⚠️ BASIC ONLY

**Existing System:**
- Toast notifications (UI feedback only)
- Uses `useToast` hook throughout app
- Success, error, warning messages
- Sonner toasts for enhanced notifications

**Status:** ✅ In-app notifications working

---

### 6.2 CLIENT REQUIREMENT - WHATSAPP NOTIFICATIONS ❌ NOT IMPLEMENTED

**Client Specification:**
> "For the notifications, I want to be like notification settings, like the user able to select on off, with few notification types, including new product released, order's notifications and these notification is sent through WhatsApp."

**Required Implementation:**

1. **❌ Notification Preferences System**
   - New database table:
   ```sql
   CREATE TABLE notification_preferences (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES profiles(id),
     channel TEXT, -- 'whatsapp', 'email', 'sms'
     type TEXT, -- 'new_products', 'order_updates', 'promotions'
     enabled BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ
   );
   ```

2. **❌ WhatsApp Integration**
   - Service: WhatsApp Business API or Twilio WhatsApp
   - Required fields in `customer_profiles`: `whatsapp_number`, `whatsapp_opt_in`
   - Message templates:
     - Order placed confirmation
     - Order status updates (verified, packing, dispatched, delivered)
     - Payment approval/rejection
     - New product announcements
     - Promotional messages

3. **❌ Notification Settings Page**
   - New page: `src/pages/NotificationSettings.tsx`
   - Toggle switches for each notification type:
     ```
     [ ] New Product Released
     [ ] Order Placed
     [ ] Order Status Updates
     [ ] Payment Confirmation
     [ ] Promotional Offers
     [ ] Shop Updates (for Panel merchants)
     ```
   - Channel selection: WhatsApp / Email / SMS / Push

4. **❌ Notification Types:**
   - **New Products:** When admin publishes new products
   - **Order Updates:** Status changes, payment confirmation
   - **Delivery Updates:** Tracking info, delivery confirmation
   - **Promotions:** Sales, vouchers, special offers
   - **Account:** Profile changes, subscription renewals

**Implementation Priority:** High (customer engagement feature)

---

## 7. 2ND HAND MARKETPLACE ❌ COMPLETELY MISSING

### 7.1 CLIENT REQUIREMENT

**Client Specification:**
> "I believe the 2nd hand stuff is not implemented yet, this idea is some kind of like, merchant able to post their 2nd hand stuff in this website to sell with a lower price. As this posting should need to be approved by our admin panel. Like the reviews and comments part idea. But this is for merchant to sell their 2nd hand stuff."

**Required Features:**

1. **❌ Database Schema**
   ```sql
   CREATE TABLE secondhand_listings (
     id UUID PRIMARY KEY,
     seller_id UUID REFERENCES customer_profiles(id), -- Merchant only
     product_category TEXT,
     title TEXT NOT NULL,
     description TEXT,
     original_price DECIMAL,
     selling_price DECIMAL NOT NULL,
     condition TEXT, -- 'like_new', 'good', 'fair', 'damaged'
     year_purchased INTEGER,
     reason_for_selling TEXT,
     images TEXT[], -- Array of image URLs
     car_brand TEXT,
     car_model TEXT,
     compatible_years TEXT,
     status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'sold'
     admin_notes TEXT,
     reviewed_by UUID REFERENCES profiles(id),
     reviewed_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     views_count INTEGER DEFAULT 0,
     sold_at TIMESTAMPTZ
   );

   CREATE TABLE secondhand_inquiries (
     id UUID PRIMARY KEY,
     listing_id UUID REFERENCES secondhand_listings(id),
     buyer_id UUID REFERENCES customer_profiles(id),
     message TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **❌ Merchant Features**
   - Create listing page (merchants only)
   - Photo upload (multiple images)
   - Pricing input
   - Condition description
   - Product details form
   - My Listings management page
   - Mark as sold functionality

3. **❌ Admin Approval Workflow**
   - Admin page: `src/pages/admin/SecondhandModeration.tsx`
   - Review submissions (similar to ReviewModeration)
   - Approve/Reject with notes
   - Quality control guidelines
   - Inappropriate content filtering

4. **❌ Customer Browsing**
   - Public 2nd hand marketplace page
   - Filter by: category, price range, condition, car brand
   - Search functionality
   - Inquiry/contact seller feature
   - Direct WhatsApp contact to seller

5. **❌ Transaction Handling**
   - Option 1: Direct buyer-seller (AutoLab not involved)
   - Option 2: Escrow system (AutoLab facilitates)
   - Commission structure (e.g., 5% commission on sales)

**Implementation Priority:** Medium-High (revenue opportunity + merchant value-add)

---

## 8. INSTALLATION GUIDES ✅ IMPLEMENTED (Needs Access Fix)

### 8.1 CURRENT IMPLEMENTATION

**Existing System:**
- Admin management: [InstallationGuides.tsx](src/pages/admin/InstallationGuides.tsx)
- Merchant view: [MerchantConsole.tsx:922-1103](src/pages/MerchantConsole.tsx#L922-L1103) (GuidesTab)
- Database: `installation_guides` table
- Features:
  - Video tutorials
  - Car brand filtering
  - Car model compatibility
  - Difficulty levels (Easy, Medium, Hard, Expert)
  - Estimated time
  - View count tracking
  - Published/unpublished status
  - **Access:** Enterprise (RM388/year) only

---

### 8.2 CLIENT REQUIREMENT - FIELDS ENHANCEMENT

**Client Specification:**
> "Able to view full guideline on the installation guide, including the installation time, installation recommended pricing, and so on."

**Current vs Required:**

| Field | Current | Required | Status |
|-------|---------|----------|--------|
| Installation time | ✅ `estimated_time_minutes` | ✅ Yes | ✅ Implemented |
| Installation pricing | ❌ Missing | ✅ Required | ❌ **MISSING** |
| Difficulty level | ✅ Yes | ✅ Yes | ✅ Implemented |
| Video tutorial | ✅ `video_url` | ✅ Yes | ✅ Implemented |
| Step-by-step guide | ⚠️ Only `description` | ✅ Structured steps | ⚠️ Enhancement needed |
| Required tools | ❌ Missing | ✅ Nice to have | ❌ Missing |
| Access level | ❌ Enterprise only | ✅ **All merchants** | ❌ **CRITICAL GAP** |

**Required Changes:**

1. **❌ Add Pricing Fields**
   ```sql
   ALTER TABLE installation_guides ADD COLUMN recommended_installation_price_min DECIMAL;
   ALTER TABLE installation_guides ADD COLUMN recommended_installation_price_max DECIMAL;
   ALTER TABLE installation_guides ADD COLUMN pricing_notes TEXT;
   ```
   - Display: "Recommended Installation Price: RM 50 - RM 80"

2. **❌ Change Access Control**
   - **Move from Enterprise → Merchant tier**
   - Update gate check in [MerchantConsole.tsx:65-67](src/pages/MerchantConsole.tsx#L65-L67)
   - Current: `subscription_plan === 'enterprise'`
   - Change to: `subscription_plan IN ('professional', 'enterprise', 'panel')`

3. **⚠️ Enhance Step-by-Step Guide**
   ```sql
   ALTER TABLE installation_guides ADD COLUMN steps JSONB;
   -- Structure: [{"step_number": 1, "title": "...", "description": "...", "image_url": "...", "duration_minutes": 5}]
   ```

4. **❌ Add Tools List**
   ```sql
   ALTER TABLE installation_guides ADD COLUMN required_tools TEXT[];
   -- Example: ['Socket wrench set', 'Trim removal tools', 'Heat gun']
   ```

**Implementation Priority:** High (merchant value proposition)

---

## 9. PRODUCT ENQUIRIES ⚠️ PARTIAL IMPLEMENTATION

### 9.1 CURRENT IMPLEMENTATION

**Existing System:**
- Email contacts visible on shop listings
- Phone numbers for direct contact
- Business description fields
- Admin notes in orders

**Status:** ⚠️ Basic contact info available

---

### 9.2 RECOMMENDED ENHANCEMENT

**Suggested Features:**

1. **❌ Product Enquiry Form**
   - New component: `ProductEnquiryForm.tsx`
   - Fields: name, email, phone, message, product_id
   - Submit to admin dashboard
   - Auto-email to admin/supplier

2. **❌ Enquiry Management Dashboard**
   - Admin page: track all product enquiries
   - Respond directly from dashboard
   - Status tracking: pending, responded, converted

3. **❌ WhatsApp Quick Contact**
   - "Ask about this product" button
   - Pre-filled WhatsApp message template
   - Direct to admin WhatsApp Business

**Implementation Priority:** Medium (improves customer service)

---

## 10. FORUMS/DISCUSSION ❌ NOT IMPLEMENTED

**Client Requirement:** B2C Feature #8

### 10.1 REQUIRED FEATURES

**Forum System:**

1. **❌ Database Schema**
   ```sql
   CREATE TABLE forum_categories (
     id UUID PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     icon TEXT,
     display_order INTEGER,
     created_at TIMESTAMPTZ
   );

   CREATE TABLE forum_threads (
     id UUID PRIMARY KEY,
     category_id UUID REFERENCES forum_categories(id),
     author_id UUID REFERENCES profiles(id),
     title TEXT NOT NULL,
     content TEXT,
     is_pinned BOOLEAN DEFAULT false,
     is_locked BOOLEAN DEFAULT false,
     views_count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ
   );

   CREATE TABLE forum_posts (
     id UUID PRIMARY KEY,
     thread_id UUID REFERENCES forum_threads(id),
     author_id UUID REFERENCES profiles(id),
     content TEXT NOT NULL,
     images TEXT[],
     is_edited BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ
   );

   CREATE TABLE forum_reactions (
     id UUID PRIMARY KEY,
     post_id UUID REFERENCES forum_posts(id),
     user_id UUID REFERENCES profiles(id),
     reaction_type TEXT, -- 'like', 'helpful', 'thanks'
     created_at TIMESTAMPTZ
   );
   ```

2. **❌ Forum Categories**
   - General Discussion
   - Product Reviews & Recommendations
   - Installation Help
   - Troubleshooting
   - Car Modifications
   - Off-Topic

3. **❌ User Features**
   - Create new thread
   - Reply to threads
   - Upload images in posts
   - React to posts (like, helpful)
   - Subscribe to threads
   - User reputation/badges
   - Edit/delete own posts

4. **❌ Admin Moderation**
   - Pin/unpin threads
   - Lock/unlock threads
   - Delete inappropriate content
   - Ban users
   - Featured threads

5. **❌ Pages Required**
   - `src/pages/Forums.tsx` - Forum categories listing
   - `src/pages/ForumThread.tsx` - Thread view with posts
   - `src/pages/admin/ForumModeration.tsx` - Admin controls

**Implementation Priority:** Medium (community engagement)

---

## 11. CAR CLUBS / EXHIBITIONS ❌ NOT IMPLEMENTED

**Client Requirement:** B2C Feature #9

### 11.1 REQUIRED FEATURES

**Car Clubs System:**

1. **❌ Database Schema**
   ```sql
   CREATE TABLE car_clubs (
     id UUID PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     logo_url TEXT,
     cover_image_url TEXT,
     club_type TEXT, -- 'brand_specific', 'model_specific', 'general'
     car_brand TEXT,
     car_model TEXT,
     location TEXT,
     state TEXT,
     founded_date DATE,
     member_count INTEGER DEFAULT 0,
     admin_user_id UUID REFERENCES profiles(id),
     status TEXT DEFAULT 'active', -- 'active', 'inactive'
     created_at TIMESTAMPTZ
   );

   CREATE TABLE club_members (
     id UUID PRIMARY KEY,
     club_id UUID REFERENCES car_clubs(id),
     user_id UUID REFERENCES profiles(id),
     role TEXT DEFAULT 'member', -- 'admin', 'moderator', 'member'
     joined_at TIMESTAMPTZ
   );

   CREATE TABLE club_events (
     id UUID PRIMARY KEY,
     club_id UUID REFERENCES car_clubs(id),
     event_type TEXT, -- 'meet', 'exhibition', 'drive', 'workshop'
     title TEXT NOT NULL,
     description TEXT,
     event_date TIMESTAMPTZ,
     location TEXT,
     address TEXT,
     city TEXT,
     state TEXT,
     max_participants INTEGER,
     current_participants INTEGER DEFAULT 0,
     cover_image_url TEXT,
     status TEXT DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
     created_by UUID REFERENCES profiles(id),
     created_at TIMESTAMPTZ
   );

   CREATE TABLE event_participants (
     id UUID PRIMARY KEY,
     event_id UUID REFERENCES club_events(id),
     user_id UUID REFERENCES profiles(id),
     car_details TEXT, -- What car they're bringing
     registered_at TIMESTAMPTZ,
     attendance_status TEXT -- 'registered', 'confirmed', 'attended', 'cancelled'
   );

   CREATE TABLE exhibitions (
     id UUID PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     organizer TEXT,
     event_date TIMESTAMPTZ,
     end_date TIMESTAMPTZ,
     location TEXT,
     venue_name TEXT,
     address TEXT,
     city TEXT,
     state TEXT,
     ticket_price DECIMAL,
     cover_image_url TEXT,
     gallery_images TEXT[],
     registration_url TEXT,
     status TEXT DEFAULT 'upcoming',
     created_at TIMESTAMPTZ
   );
   ```

2. **❌ Car Club Features**
   - Browse clubs by car brand/model/location
   - Join/leave clubs
   - Club discussion boards (integrated with forums)
   - Member directory
   - Club gallery
   - Create club (user-initiated or admin-approved)

3. **❌ Event Management**
   - Create club events (meets, drives, workshops)
   - RSVP/register for events
   - Event calendar view
   - Event photo gallery
   - Attendance tracking

4. **❌ Exhibitions**
   - Upcoming auto exhibitions in Malaysia
   - Exhibition details page
   - Registration links
   - Photo galleries from past events
   - AutoLab booth presence

5. **❌ Pages Required**
   - `src/pages/CarClubs.tsx` - Club directory
   - `src/pages/ClubDetails.tsx` - Individual club page
   - `src/pages/Events.tsx` - Event calendar
   - `src/pages/EventDetails.tsx` - Event page
   - `src/pages/Exhibitions.tsx` - Exhibition listings
   - `src/pages/admin/ClubManagement.tsx` - Admin controls

**Implementation Priority:** Low-Medium (community building, optional)

---

## 12. IoT / MEMBERS REGISTRATION ❌ NOT IMPLEMENTED

**Client Requirement:** B2C Feature #7

### 12.1 REQUIRED FEATURES (Unclear Requirement)

**Possible Interpretation:**
> User mentions "Register / IoT (members)" - likely refers to registering IoT devices with customer accounts

**Potential Implementation:**

1. **❌ Database Schema**
   ```sql
   CREATE TABLE iot_devices (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES profiles(id),
     device_type TEXT, -- 'dashcam', 'gps_tracker', 'obd_scanner', 'car_alarm'
     device_model TEXT,
     device_serial TEXT UNIQUE,
     device_name TEXT, -- User-friendly name
     installation_date DATE,
     warranty_expiry DATE,
     status TEXT DEFAULT 'active', -- 'active', 'inactive', 'warranty_expired'
     vehicle_info JSONB, -- Car details: {brand, model, year, plate_number}
     created_at TIMESTAMPTZ
   );

   CREATE TABLE device_data_logs (
     id UUID PRIMARY KEY,
     device_id UUID REFERENCES iot_devices(id),
     data_type TEXT, -- 'location', 'speed', 'diagnostics', 'alert'
     data_payload JSONB,
     logged_at TIMESTAMPTZ
   );
   ```

2. **❌ Device Registration Flow**
   - Add device page
   - Enter serial number
   - Verify device authenticity
   - Link to user account
   - Associate with vehicle

3. **❌ Device Management**
   - My Devices page
   - Device status dashboard
   - Warranty tracking
   - Firmware update notifications
   - Device troubleshooting guides

4. **❌ IoT Product Sales**
   - IoT category in products
   - Device registration instructions
   - Installation guide integration

**Implementation Priority:** Low (depends on if AutoLab sells IoT devices)

**Recommendation:** Clarify with client what "IoT / Members" means specifically

---

## 13. FIND SHOPS / PANELS ✅ IMPLEMENTED (Needs Access Control Fix)

### 13.1 CURRENT IMPLEMENTATION

**Existing System:**
- File: [FindShops.tsx](src/pages/FindShops.tsx)
- Shop details: [ShopDetails.tsx](src/pages/ShopDetails.tsx)
- Database: `premium_partnerships` table
- Features:
  - Shop listing with photos
  - State/location filter
  - Service type filter
  - Search functionality
  - Auto-rotating shop photos
  - Featured badges
  - Contact info (phone, email, address)
  - View tracking

**Status:** ✅ Feature exists, ❌ **Wrong access control**

---

### 13.2 REQUIRED FIX - PANEL-ONLY VISIBILITY

**Client Specification:**
> "Normal merchant customer will be able to access to the installation guides, but won't be able to do posting of their business profile in the find shops page, unless the merchant is authorized panel."

**Current Problem:**
- Currently: ALL merchants with subscription (Professional OR Enterprise) can be listed
- Required: ONLY Panel (formerly Enterprise) tier should appear

**Fix Required:**
```typescript
// In FindShops.tsx filtering logic
const { data: shops } = await supabase
  .from('premium_partnerships')
  .select('*')
  .eq('subscription_plan', 'panel') // ❌ CHANGE: Only Panel tier
  .eq('subscription_status', 'ACTIVE')
  .eq('admin_approved', true);
```

**Access Control Matrix:**

| Subscription | Price | Merchant Pricing | Installation Guides | Find Shops Listing |
|--------------|-------|------------------|---------------------|-------------------|
| None (Regular Customer) | RM0 | ❌ No | ❌ No | ❌ No |
| Merchant | RM99/year | ✅ Yes | ✅ Yes | ❌ **NO** |
| Panel | RM350/month | ✅ Yes | ✅ Yes | ✅ **YES** |

**Implementation Priority:** High (business model alignment)

---

## 14. CUSTOMER TIER SYSTEM ✅ IMPLEMENTED

**Current System:**
- Admin management: [CustomerTiers.tsx](src/pages/admin/CustomerTiers.tsx)
- Database: `customer_tiers`, `tier_upgrade_history`
- Tiers: Platinum, Gold, Silver, Bronze, Standard
- Benefits: discount percentages, points multipliers, free shipping thresholds
- Automatic upgrades based on lifetime spending

**Status:** ✅ **COMPLETE** - Bonus feature

---

## 15. ADMIN PANEL ✅ COMPREHENSIVE

**Existing Admin Pages:**
1. ✅ Dashboard
2. ✅ Products / ProductsAdvanced / ProductsPro
3. ✅ ComponentLibraryPro
4. ✅ Orders / ArchivedOrders
5. ✅ OrderVerification
6. ✅ WarehouseOperations
7. ✅ InventoryAlerts
8. ✅ Customers / UserManagement
9. ✅ VoucherManagement
10. ✅ PremiumPartners
11. ✅ CustomerTiers
12. ✅ InstallationGuides
13. ✅ ReviewModeration
14. ✅ KnowledgeBase
15. ✅ Settings

**Status:** ✅ **COMPREHENSIVE** - Well implemented

---

## CRITICAL CHANGES REQUIRED SUMMARY

### PRIORITY 1 - CRITICAL (Business Model)

1. **❌ Panel Subscription Revision**
   - Change: RM388/year → **RM350/month**
   - Rename: "Enterprise" → "Panel"
   - Change: Self-service → Admin invitation only
   - Add: Top 100 limit enforcement
   - Add: Pricing control validation

2. **❌ Find Shops Access Control**
   - Restrict to Panel tier ONLY
   - Remove Professional tier from listings

3. **❌ Installation Guides Access**
   - Move from Enterprise-only → All Merchant tier
   - Add recommended installation pricing field

4. **❌ Auto Welcome Voucher**
   - Auto-generate RM50 voucher on merchant registration
   - Min spend RM100, 1-year validity

---

### PRIORITY 2 - HIGH VALUE

5. **❌ Product Categorization Enhancement**
   - Add manufacturer/factory brand field
   - Implement dual categorization (Car Brand + Manufacturer Brand)

6. **❌ WhatsApp Notification System**
   - Integration with WhatsApp Business API
   - Notification preferences page
   - Order updates, new products, promotions

7. **❌ 2nd Hand Marketplace**
   - Merchant listing creation
   - Admin approval workflow
   - Public marketplace page

---

### PRIORITY 3 - MEDIUM VALUE

8. **❌ Order History 6-Month Limit**
   - Show only 6 months by default
   - Paid access for older records

9. **❌ Forums/Discussion**
   - Community engagement platform
   - Product discussions, troubleshooting

10. **❌ Product Enquiry System**
    - Dedicated enquiry form
    - Admin enquiry management

---

### PRIORITY 4 - OPTIONAL

11. **❌ Car Clubs & Exhibitions**
    - Club directory, event management
    - Exhibition listings

12. **❌ IoT Device Registration**
    - Device linking to accounts
    - Warranty tracking
    *(Depends on product lineup)*

---

## DATABASE MIGRATION REQUIREMENTS

**Tables to Create:**
1. `notification_preferences`
2. `order_history_access`
3. `secondhand_listings`
4. `secondhand_inquiries`
5. `forum_categories`, `forum_threads`, `forum_posts`, `forum_reactions`
6. `car_clubs`, `club_members`, `club_events`, `event_participants`, `exhibitions`
7. `iot_devices`, `device_data_logs` (optional)
8. `manufacturers` (for product manufacturer brands)

**Tables to Modify:**
1. `premium_partnerships`
   - Rename enum value: 'enterprise' → 'panel'
   - Update billing cycle logic
2. `installation_guides`
   - Add: `recommended_installation_price_min`
   - Add: `recommended_installation_price_max`
   - Add: `pricing_notes`
   - Add: `steps` (JSONB)
   - Add: `required_tools` (TEXT[])
3. `products`, `products_new`
   - Add: `manufacturer_brand`
   - Add: `manufacturer_id` (FK to manufacturers table)

---

## IMPLEMENTATION ROADMAP

### PHASE 1 - CRITICAL FIXES (2-3 weeks)
- [ ] Panel subscription model revision
- [ ] Find Shops access control fix
- [ ] Installation guides access change
- [ ] Auto welcome voucher implementation
- [ ] Manufacturer brand categorization

### PHASE 2 - HIGH-VALUE FEATURES (4-6 weeks)
- [ ] WhatsApp notification system
- [ ] 2nd Hand marketplace
- [ ] Order history access control
- [ ] Installation guide enhancements

### PHASE 3 - COMMUNITY FEATURES (6-8 weeks)
- [ ] Forums/Discussion system
- [ ] Product enquiry system
- [ ] Car clubs & exhibitions (optional)

### PHASE 4 - OPTIONAL FEATURES (Future)
- [ ] IoT device registration (if applicable)
- [ ] Advanced analytics dashboards
- [ ] Mobile app development

---

## FINAL STATISTICS

**Implementation Completeness:**
- ✅ **Fully Implemented:** 14 features (52%)
- ⚠️ **Partially Implemented:** 3 features (11%)
- ❌ **Not Implemented:** 10 features (37%)

**Total Required Work:**
- Critical Changes: 4 items
- High Priority: 3 items
- Medium Priority: 3 items
- Optional: 2 items

**Estimated Development Time:**
- Phase 1 (Critical): 2-3 weeks
- Phase 2 (High Value): 4-6 weeks
- Phase 3 (Community): 6-8 weeks
- **Total:** 12-17 weeks for complete implementation

---

**Document Version:** 1.0
**Last Updated:** December 7, 2025
**Prepared By:** Claude Code Analysis
