# AUTOLAB ADMIN PANEL - COMPREHENSIVE DOCUMENTATION

## Document Information
- **Version**: 1.0
- **Last Updated**: December 30, 2025
- **Platform**: AutoLab Admin Management System
- **Target Audience**: System Administrators, Operations Team, Management

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Admin Access & Authentication](#2-admin-access--authentication)
3. [Admin Panel Navigation](#3-admin-panel-navigation)
4. [Complete Page Inventory](#4-complete-page-inventory)
5. [Dashboard](#5-dashboard)
6. [Order Management](#6-order-management)
7. [Warehouse Operations](#7-warehouse-operations)
8. [Customer Management](#8-customer-management)
9. [Product Management](#9-product-management)
10. [Content Moderation](#10-content-moderation)
11. [Marketing & Promotions](#11-marketing--promotions)
12. [Merchant Partnership Management](#12-merchant-partnership-management)
13. [Knowledge Base & Support](#13-knowledge-base--support)
14. [System Settings](#14-system-settings)
15. [Reports & Analytics](#15-reports--analytics)
16. [Technical Architecture](#16-technical-architecture)

---

## 1. SYSTEM OVERVIEW

### 1.1 What is the AutoLab Admin Panel?

The AutoLab Admin Panel is a comprehensive e-commerce management system built with React, TypeScript, and Supabase. It provides complete control over:
- Order processing and fulfillment
- Inventory management
- Customer relationship management
- Merchant partnership approvals
- Content moderation (reviews, secondhand listings)
- Marketing campaigns (vouchers, customer tiers)
- System configuration

### 1.2 Admin Panel Architecture

**Total Admin Pages**: 18+

**Core Modules**:
1. **Order Management** (3 pages): Orders, Archived Orders, Order Verification
2. **Warehouse** (1 page): Warehouse Operations with 6-status workflow
3. **Customer Management** (3 pages): Customers, Customer Tiers, Review Moderation
4. **Product Management** (3 pages): Products Advanced, Component Library, Inventory Alerts
5. **Merchant Management** (3 pages): Premium Partners, Secondhand Moderation, Installation Guides
6. **Marketing** (1 page): Voucher Management
7. **System** (4 pages): Dashboard, Settings, User Management, Knowledge Base

---

## 2. ADMIN ACCESS & AUTHENTICATION

### 2.1 Admin User Roles

| Role | Permissions | Badge Color |
|------|-------------|-------------|
| **Admin** | Full system access, delete permissions | Red (destructive) |
| **Manager** | Most features, limited delete permissions | Blue (default) |
| **Staff** | View-only, basic operations | Gray (secondary) |

### 2.2 Authentication Flow

```
User Login → Supabase Auth
  ↓
Check admin_profiles table
  ↓
Verify role in ['admin', 'manager', 'staff']
  ↓
Grant access to /admin routes
```

### 2.3 Data Sources

**Primary Table**: `admin_profiles`

**Alternative**: RPC function `get_admin_users` (falls back to `admin_profiles` view)

**Fields**:
- User ID, Username, Full Name
- Email (auth_email), Phone (auth_phone)
- Role, Department
- Is Active status
- Created By, Last Login
- Email/Phone confirmation status

---

## 3. ADMIN PANEL NAVIGATION

### 3.1 Sidebar Navigation Structure

**Located**: Fixed left sidebar (desktop), slide-out sheet (mobile)

**Navigation Items** (19 items):

| Icon | Name | Route | Description |
|------|------|-------|-------------|
| BarChart3 | Dashboard | `/admin` | Main overview |
| Package | Products | `/admin/products-enhanced` | Product management |
| Layers | Component Library | `/admin/component-library` | Component catalog |
| Bell | Inventory Alerts | `/admin/inventory-alerts` | Stock warnings |
| ShoppingBag | Orders | `/admin/orders` | Active orders |
| CheckCircle | Order Verification | `/admin/order-verification` | Payment verification |
| Warehouse | Warehouse Operations | `/admin/warehouse-operations` | Fulfillment workflow |
| Archive | Archived Orders | `/admin/archived-orders` | Completed orders |
| Users | Customers | `/admin/customers` | Customer profiles |
| Award | Customer Tiers | `/admin/customer-tiers` | Loyalty tiers |
| Star | Review Moderation | `/admin/review-moderation` | Product reviews |
| Tag | Vouchers | `/admin/vouchers` | Discount codes |
| Crown | Premium Partners | `/admin/premium-partners` | Merchant partnerships |
| ShoppingCart | Secondhand Moderation | `/admin/secondhand-moderation` | Used parts listings |
| Video | Installation Guides | `/admin/installation-guides` | Tutorial videos |
| UserCog | Staff Management | `/admin/users` | Admin accounts |
| BookOpen | Knowledge Base | `/admin/knowledge-base` | Support articles |
| Settings | Settings | `/admin/settings` | System config |
| Home | Back to Store | `/` | Exit admin panel |

---

### 3.2 User Profile Section (Bottom of Sidebar)

**Displays**:
- User avatar (first letter of email)
- Email address (truncated)
- "Administrator" label
- "Back to Store" link
- "Sign out" button

---

## 4. COMPLETE PAGE INVENTORY

### 4.1 All Admin Pages

| # | Page Name | Primary Function | Key Features |
|---|-----------|------------------|--------------|
| 1 | Dashboard | Overview & metrics | Revenue, orders, customers, products |
| 2 | Products Advanced | Product CRUD | Shopee-style variants, 4-tab form |
| 3 | Component Library | Component management | SKU, pricing, stock |
| 4 | Inventory Alerts | Stock monitoring | Low stock warnings |
| 5 | Orders | Active order management | 20 statuses, invoices, picking lists |
| 6 | Order Verification | Payment verification | Verify/reject payment proofs |
| 7 | Warehouse Operations | Fulfillment workflow | 6-tab status pipeline |
| 8 | Archived Orders | Completed orders | View, reactivate |
| 9 | Customers | Customer profiles | Merchant applications |
| 10 | Customer Tiers | Loyalty system | Tier benefits, requirements |
| 11 | Review Moderation | Product reviews | Approve/reject with images |
| 12 | Voucher Management | Discount codes | Percentage/fixed, usage limits |
| 13 | Premium Partners | Merchant partnerships | Approval, subscriptions, renewals |
| 14 | Secondhand Moderation | Used parts listings | Approve/reject with reasons |
| 15 | Installation Guides | Video tutorials | Category, difficulty, car models |
| 16 | User Management | Admin accounts | Staff CRUD (SQL-based delete) |
| 17 | Knowledge Base | AI support system | Q&A, PDF processing, chatbot |
| 18 | Settings | System configuration | 6-tab settings panel |

---

## 5. DASHBOARD

**Route**: `/admin` (exact match)

**Purpose**: Main overview page with key business metrics and recent activity.

### 5.1 Statistics Cards

**Grid**: 4 cards (responsive)

| Metric | Calculation | Data Source |
|--------|-------------|-------------|
| **Total Revenue** | SUM(order_total) | `orders` table |
| **Total Orders** | COUNT(*) | `orders` table |
| **Total Customers** | COUNT(*) | `customer_profiles` table |
| **Total Products** | COUNT(*) WHERE is_active=true | `component_library` table |

**Card Design**:
- Icon: Relevant Lucide icon
- Label: Uppercase, small, gray
- Value: Large, bold, black
- Background: White with border

### 5.2 Recent Orders Section

**Display**: Last 5 orders

**Data Source**: `get_admin_orders` RPC → `admin_orders_enhanced` view → `orders` table

**Order Card Shows**:
- Order number (e.g., "ORDER #1234")
- Customer name
- Order date
- Total amount (MYR)
- Status badge

**Interaction**: Click card → Navigate to Orders page with auto-expand of that order

### 5.3 Data Fetching

**Primary Query**:
```typescript
const { data: orders } = await supabase.rpc('get_admin_orders');
```

**Fallback Query** (if RPC fails):
```typescript
const { data: orders } = await supabase
  .from('orders')
  .select('*, customer:customer_profiles(full_name)')
  .order('created_at', { ascending: false })
  .limit(5);
```

**Aggregations**:
```typescript
// Total Revenue
const revenue = orders.reduce((sum, order) => sum + order.order_total, 0);

// Total Orders
const orderCount = orders.length;

// Total Customers
const { count } = await supabase
  .from('customer_profiles')
  .select('*', { count: 'exact', head: true });

// Total Products
const { count: productCount } = await supabase
  .from('component_library')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);
```

---

## 6. ORDER MANAGEMENT

---

## 6.1 ORDERS PAGE (Active Orders)

**Route**: `/admin/orders`

**Purpose**: Manage all active customer orders (excludes COMPLETED status).

### 6.1.1 Search & Filter

**Search Fields**:
- Order number
- Customer name
- Phone number
- Order ID (UUID)

**Status Filter Dropdown** (20 options):

**Payment Statuses**:
- PENDING_PAYMENT
- PAYMENT_PROCESSING
- PAYMENT_FAILED
- PENDING_PAYMENT_VERIFICATION
- PAYMENT_VERIFIED
- PAYMENT_REJECTED

**Processing Statuses**:
- PLACED
- PROCESSING
- PENDING_VERIFICATION
- VERIFIED
- PACKING
- DISPATCHED
- DELIVERED

**Final Statuses**:
- CANCELLED
- REJECTED

**Auto-filter**: Excludes `status = 'COMPLETED'` automatically.

---

### 6.1.2 Orders Table

**Columns** (8 columns):

| Column | Content | Sortable | Actions |
|--------|---------|----------|---------|
| **Select** | Checkbox for multi-select | No | Bulk operations |
| **Order** | Order number + short ID | No | Click to expand |
| **Customer** | Name + phone | No | Display only |
| **Date** | Creation timestamp | No | Formatted date |
| **Total** | Order total (MYR) | No | Currency format |
| **Status** | Status badge | No | Color-coded |
| **Payment** | Payment state badge | No | Color-coded |
| **Actions** | Invoice, Delete buttons | No | Individual actions |

**Status Badges**:
- Green: VERIFIED, DELIVERED, PAYMENT_VERIFIED
- Yellow: PENDING*, PLACED, PROCESSING
- Red: CANCELLED, REJECTED, PAYMENT_FAILED, PAYMENT_REJECTED
- Blue: PACKING, DISPATCHED

---

### 6.1.3 Expandable Row Details

**Trigger**: Click anywhere on row

**Sections Displayed**:

#### Customer Information Card
- Full name
- Phone number
- Email address
- Payment method

#### Delivery Information Card
- Delivery method
- Delivery fee (MYR)
- Full delivery address

#### Order Summary Card
- Subtotal
- Voucher discount (if applicable)
- Voucher code used
- Delivery fee
- SST 6%
- **Total Amount** (bold)

#### Order Items Table
| Column | Description |
|--------|-------------|
| SKU | Component SKU code |
| Component Name | Product name |
| Context | Additional info |
| Quantity | Order quantity |
| Unit Price | Price per unit |
| Total Price | Quantity × Unit Price |

---

### 6.1.4 Multi-Select Actions

**Generate Picking List**:
- Aggregates items by SKU across selected orders
- Shows quantity needed per order
- Optimized for warehouse picking
- Print and PDF download options

**Process**:
1. Admin selects multiple orders (checkboxes)
2. Clicks "Generate Picking List" button
3. Modal opens with aggregated SKU list
4. Example format:
   ```
   SKU: HD-001
   Total Qty: 5 units
   Orders: #1234 (2), #1235 (3)

   SKU: CAM-005
   Total Qty: 8 units
   Orders: #1234 (3), #1236 (5)
   ```

---

### 6.1.5 Individual Order Actions

#### Generate Invoice

**Trigger**: Click "Invoice" button

**Content**:
- Company header: **AUTO LABS SDN BHD**
- Company address, phone, email
- Invoice number (based on order ID)
- Invoice date
- Customer details
- Itemized order items with SKU codes
- Pricing breakdown (subtotal, discount, SST, total)
- **Amount in words** (e.g., "Eight Hundred Fifty Ringgit Only")
- Footer notes

**Actions**: Print, Download PDF

**Amount in Words Conversion**:
```typescript
const convertToWords = (amount: number): string => {
  // Converts 850.00 → "Eight Hundred Fifty Ringgit Only"
  // Implementation handles cents if present
};
```

---

#### Mark Complete

**Trigger**: Click "Mark Complete" button

**Confirmation Modal**:
```
Are you sure you want to mark this order as completed?
Order #1234 will be moved to Archived Orders.
[Cancel] [Confirm]
```

**Process**:
1. Updates `status = 'COMPLETED'`
2. Sets `updated_at = NOW()`
3. Order disappears from Active Orders
4. Order appears in Archived Orders
5. Success toast notification

---

#### Delete Order

**Trigger**: Click "Delete" button (red trash icon)

**Confirmation Modal**:
```
⚠️ Permanently Delete Order?
This action cannot be undone. All order data will be lost.
Order #1234 - Customer: John Doe
[Cancel] [Delete Permanently]
```

**Process** (cascading delete):
1. Delete from `voucher_usage` table (if voucher used)
2. Delete all `order_items` for this order
3. Delete from `orders` table
4. Success toast notification

**Warning**: This is a permanent deletion with no recovery.

---

### 6.1.6 Status Management

**Change Status**:
- Inline dropdown in expanded row
- Select new status from 20 options
- Auto-save on change
- Toast confirmation

**Common Status Transitions**:
```
PENDING_PAYMENT → PAYMENT_VERIFIED → PROCESSING → PACKING → DISPATCHED → DELIVERED → COMPLETED
```

---

## 6.2 ARCHIVED ORDERS PAGE

**Route**: `/admin/archived-orders`

**Purpose**: View and manage completed orders (status = COMPLETED).

### 6.2.1 Table Columns

| Column | Description |
|--------|-------------|
| Order | Order number + ID |
| Customer | Name + phone |
| Completed Date | `updated_at` timestamp |
| Total | Order total (MYR) |
| Payment | Payment state badge |
| Actions | View Details, Reactivate |

### 6.2.2 Search & Filter

**Search Fields**:
- Order ID
- Customer name
- Phone number

**Date Filter**:
- Exact date match on `updated_at`
- Date picker input

**Clear Filters Button**: Resets all filters

---

### 6.2.3 View Details

**Modal Content**:

#### Order Timeline
```
Created: DD/MM/YYYY HH:MM
  ↓
[Status progression...]
  ↓
Completed: DD/MM/YYYY HH:MM
```

#### Order Information
- All order items
- Customer details
- Delivery information
- Pricing breakdown
- Payment status

---

### 6.2.4 Reactivate Order

**Purpose**: Move completed order back to active orders.

**Process**:
1. Click "Reactivate" button
2. Attempts to set `status = 'DELIVERED'`
3. **Fallback statuses** (if DELIVERED fails):
   - PROCESSING
   - PACKING
   - READY_FOR_DELIVERY
   - OUT_FOR_DELIVERY
4. Order moves back to Active Orders page
5. Success toast notification

**Use Case**: Customer requests order modification or return.

---

## 6.3 ORDER VERIFICATION PAGE

**Route**: `/admin/order-verification`

**Purpose**: Verify customer payment proofs for manual payment orders.

### 6.3.1 Verification Queue

**Filter**: Orders with `status = 'PENDING_PAYMENT_VERIFICATION'`

**Table Columns**:
- Order number
- Customer name
- Amount paid
- Payment method
- Payment proof image (thumbnail)
- Submitted date
- Actions (Verify, Reject)

---

### 6.3.2 Payment Proof Review

**Image Viewer**:
- Lightbox modal
- Zoom capability
- Image details (filename, upload date)

**Payment Information**:
- Payment method (Bank Transfer, E-wallet, etc.)
- Payment reference number
- Submitted timestamp

---

### 6.3.3 Verification Actions

#### Approve Payment

**Process**:
1. Click "Verify" button
2. Updates `status = 'PAYMENT_VERIFIED'`
3. Updates `payment_status = 'VERIFIED'`
4. Sets `verified_at = NOW()`
5. Sets `verified_by = admin_user_id`
6. Order proceeds to processing
7. Customer notified via email/WhatsApp

---

#### Reject Payment

**Form Fields**:
- Rejection reason (required, textarea)
- Suggested action (e.g., "Please resubmit clear payment proof")

**Process**:
1. Click "Reject" button
2. Opens rejection reason modal
3. Admin enters detailed reason
4. Updates `status = 'PAYMENT_REJECTED'`
5. Stores `rejection_reason`
6. Customer notified with reason
7. Customer can resubmit payment proof

---

## 7. WAREHOUSE OPERATIONS

**Route**: `/admin/warehouse-operations`

**Purpose**: Manage complete order fulfillment workflow from processing to delivery.

### 7.1 Warehouse Status Workflow

**6-Stage Pipeline**:
```
1. PROCESSING → 2. PICKING → 3. PACKING → 4. READY_FOR_DELIVERY → 5. OUT_FOR_DELIVERY → 6. DELIVERED
```

**Tab-Based Interface**: Each status has its own tab.

**Mobile Design**: Dropdown selector instead of tabs on small screens.

---

### 7.2 Status Overview Cards

**Displayed**: 6 cards showing order count per status

**Card Design**:
- Icon representing status
- Status name (uppercase)
- Order count (large, bold)
- Color indicator (gray → blue → green progression)

---

### 7.3 Orders Table (Per Tab)

**Columns**:

| Column | Content |
|--------|---------|
| Select | Multi-select checkbox |
| Order | Order number + date |
| Customer | Name + phone |
| Items | Item count |
| Delivery | Method + ETA |
| Amount | Order total |
| Actions | Process, Create Shipment, Track |

---

### 7.4 Multi-Select Bulk Operations

#### PROCESSING Tab → Generate Picking List

**Purpose**: Create warehouse picking list aggregated by SKU.

**Output Format**:
```
╔═══════════════════════════════════════╗
║     WAREHOUSE PICKING LIST            ║
║     Generated: DD/MM/YYYY HH:MM       ║
╠═══════════════════════════════════════╣
║ SKU: HD-001 - Android Head Unit       ║
║ Total Quantity: 5 units               ║
║ Orders: #1234 (2), #1235 (3)          ║
╠═══════════════════════════════════════╣
║ SKU: CAM-005 - Rear Camera            ║
║ Total Quantity: 8 units               ║
║ Orders: #1234 (3), #1236 (5)          ║
╚═══════════════════════════════════════╝
```

**Actions**: Print, Download PDF

**After Generation**: Bulk move selected orders to PICKING status.

---

#### PICKING Tab → Generate Packing List

**Purpose**: Create order-by-order packing checklist.

**Output Format**:
```
╔═══════════════════════════════════════╗
║     PACKING LIST                      ║
║     Generated: DD/MM/YYYY HH:MM       ║
╠═══════════════════════════════════════╣
║ ORDER #1234                           ║
║ Customer: John Doe                    ║
║ ─────────────────────────────────────║
║ □ SKU: HD-001 (Qty: 2)                ║
║ □ SKU: CAM-005 (Qty: 3)               ║
║ □ SKU: ACC-010 (Qty: 1)               ║
╠═══════════════════════════════════════╣
║ ORDER #1235                           ║
║ Customer: Jane Smith                  ║
║ ─────────────────────────────────────║
║ □ SKU: HD-001 (Qty: 3)                ║
║ □ SKU: DASH-002 (Qty: 1)              ║
╚═══════════════════════════════════════╝
```

**Actions**: Print, Download PDF

**After Generation**: Bulk move selected orders to PACKING status.

---

### 7.5 Courier Integration

**Supported Providers**:
- J&T Express
- PosLaju
- DHL
- Ninja Van
- Own Delivery (manual)

---

#### Create Shipment (READY_FOR_DELIVERY status)

**Modal Form Fields**:

| Field | Type | Options |
|-------|------|---------|
| Courier Service | Select | J&T, PosLaju, DHL, Ninja Van, Own |
| Package Weight | Number input | kg |
| Package Dimensions | 3 number inputs | Length × Width × Height (cm) |
| Delivery Address | Read-only | From order data |

**Estimated Rates Display**:
```
J&T Express:     RM 8.50 (1-2 days)
PosLaju:         RM 10.00 (1-3 days)
DHL:             RM 25.00 (Next day)
Ninja Van:       RM 9.00 (2-3 days)
```

**Create Shipment Process**:
1. Admin selects courier
2. Enters package details
3. Clicks "Create Shipment"
4. API call to courier service
5. Receives tracking number, shipment ID, cost, label URL
6. Updates order:
   - `status = 'OUT_FOR_DELIVERY'`
   - `tracking_number = {tracking_no}`
   - `shipment_id = {shipment_id}`
   - `shipping_cost = {cost}`
   - `shipping_label_url = {label_url}`
   - `courier_name = {selected_courier}`
7. Success toast with tracking number
8. "Print Label" button appears

---

#### Track Shipment (OUT_FOR_DELIVERY status)

**Tracking Modal Content**:

**Header**:
- Courier logo
- Tracking number (large, bold)
- Order number
- Customer name

**Current Status Badge**:
- In Transit (blue)
- Out for Delivery (yellow)
- Delivered (green)
- Failed Delivery (red)

**Tracking History Timeline**:
```
✓ 30/12/2025 14:30 - Package picked up from sender
✓ 30/12/2025 16:45 - Arrived at sorting facility (Kuala Lumpur)
✓ 31/12/2025 08:20 - In transit to destination (Penang)
⊙ 31/12/2025 12:00 - Out for delivery
  01/01/2026 09:00 - Estimated delivery
```

**Additional Info**:
- Current location
- Estimated delivery date
- Delivery attempts count
- Contact driver button (if supported by courier)

**Actions**: Refresh tracking, Print label, Copy tracking link

---

### 7.6 Expandable Row Details

**Warehouse Picking View** (prominent SKU display):

| SKU Code | Component Name | Quantity | Shelf Location |
|----------|----------------|----------|----------------|
| HD-001 | Android Head Unit 12.3" | 2 | A-15-3 |
| CAM-005 | Rear Camera HD | 1 | B-08-2 |

**Additional Information**:
- Delivery address with special instructions
- Processing notes
- Estimated packing time
- Fragile items indicator

---

## 8. CUSTOMER MANAGEMENT

---

## 8.1 CUSTOMERS PAGE

**Route**: `/admin/customers`

**Purpose**: Manage customer profiles and merchant registration applications.

### 8.1.1 Two-Tab Interface

**Tab 1**: Customers (all customer profiles)
**Tab 2**: Merchant Applications (partnership applications)

---

### 8.1.2 CUSTOMERS TAB

**Table Columns**:

| Column | Content | Actions |
|--------|---------|---------|
| Customer | Avatar icon + name | Click for details |
| Contact | Email + phone | Copy buttons |
| Customer Type Manager | Inline dropdown | Change type |
| Last Updated | Timestamp | - |
| Type | Badge (normal/merchant) | - |
| Status | Active/Inactive badge | - |
| Actions | View Details, View Orders | Buttons |

**Customer Type Manager**:
- Inline dropdown in table
- Options: Normal, Merchant
- Auto-save on change
- Updates `customer_profiles.customer_type`
- Toast confirmation

**Search**:
- Name
- Email
- Phone
- Customer ID

---

#### Customer Details Modal

**Personal Information Section**:
- Full name
- Gender
- Date of birth

**Contact Information Section**:
- Email (with verification badge)
- Phone (with verification badge)
- Customer type badge (normal/merchant)

**Address Section**:
- Full delivery address
- Postal code
- City, State

**Account Information Section**:
- Last updated timestamp
- User ID (UUID)
- Active status toggle
- Account creation date

**Customer Metrics Section**:
- Total orders placed
- Total amount spent (MYR)
- Account age (days/months/years)
- Last order date

**Quick Actions**:
- View Order History button (navigates to orders page with customer filter)

---

#### Customer Order History

**Modal Content**:

**Summary Stats**:
- Total Orders: X orders
- Total Spent: RM X,XXX.XX
- Average Order Value: RM XXX.XX
- First Order: DD/MM/YYYY
- Last Order: DD/MM/YYYY

**Order Cards** (chronological, newest first):
Each card shows:
- Order number + date
- Status badge
- Order items (collapsed list)
- Delivery address
- Payment method
- Total amount
- "View Full Details" link

**Filter Options**:
- All orders
- Last 30 days
- Last 90 days
- This year
- By status

---

### 8.1.3 MERCHANT APPLICATIONS TAB

**Purpose**: Review and approve merchant partnership applications.

**Table Columns**:

| Column | Content |
|--------|---------|
| Applicant | Name + email |
| Company | Business name |
| Business Type | Category |
| Code | Registration code used |
| Applied Date | Application timestamp |
| Status | PENDING / APPROVED / REJECTED |
| Actions | Review Application |

**Status Badges**:
- PENDING: Yellow badge
- APPROVED: Green badge
- REJECTED: Red badge

---

#### Review Application Modal

**Application Details**:

**Applicant Information**:
- Full name
- Email address
- Phone number

**Business Information**:
- Company name
- Business type (dropdown selection)
- Business registration number
- Tax ID / SSM number

**Registration Information**:
- Merchant code used
- Code description
- Code validity status

**Business Address**:
- Full street address
- City, State
- Postal code

**Additional Notes** (if provided by applicant)

---

#### Approve Application Workflow

**Button**: "Approve Application" (green)

**Process**:
1. Click Approve button
2. Confirmation dialog appears
3. Admin confirms approval
4. **Database Updates**:
   - `merchant_registrations.status = 'APPROVED'`
   - `merchant_registrations.approved_at = NOW()`
   - `customer_profiles.customer_type = 'merchant'` (**CRITICAL**)
5. **Auto-Creation** (via database trigger):
   - Merchant wallet created in `merchant_wallets` table
   - Initial balance: RM 0.00
6. Success toast: "Partnership approved. Wallet created automatically."
7. Application disappears from PENDING tab
8. Customer receives approval notification

**Important**: This is the CRITICAL step that converts a normal customer to a merchant.

---

#### Reject Application Workflow

**Button**: "Reject Application" (red)

**Form Fields**:
- Rejection Reason (required, textarea)
  - Placeholder: "Please provide a detailed reason for rejection..."
  - Min length: 20 characters
  - Examples:
    - "Invalid business registration number"
    - "Incomplete documentation provided"
    - "Business type not eligible for merchant program"

**Process**:
1. Click Reject button
2. Rejection reason modal opens
3. Admin enters detailed reason
4. Click "Submit Rejection"
5. **Database Updates**:
   - `merchant_registrations.status = 'REJECTED'`
   - `merchant_registrations.rejection_reason = {reason}`
   - `merchant_registrations.rejected_at = NOW()`
6. Success toast: "Application rejected."
7. Applicant receives rejection email with reason
8. Applicant can reapply after addressing issues

---

## 8.2 CUSTOMER TIERS PAGE

**Route**: `/admin/customer-tiers`

**Purpose**: Manage customer loyalty tier system with benefits and requirements.

### 8.2.1 Statistics Cards

**Grid**: 4 cards

| Metric | Calculation |
|--------|-------------|
| Total Tiers | COUNT(*) |
| Active Tiers | COUNT(*) WHERE is_active = true |
| Max Discount | MAX(discount_percentage) |
| Max Points Multiplier | MAX(points_multiplier) |

---

### 8.2.2 Tier Configuration Table

**Columns**:

| Column | Description |
|--------|-------------|
| Level | Tier level (1 = highest priority) |
| Tier Name | Name with colored badge + icon |
| Requirements | Min monthly spending (resets 1st of month) |
| Benefits | Discount %, points multiplier, badges |
| Status | Active / Inactive toggle |
| Actions | Edit, Toggle Active, Delete |

**Badge Examples**:
- Platinum: Purple badge with crown icon
- Gold: Gold badge with star icon
- Silver: Silver badge with shield icon
- Bronze: Bronze badge with award icon
- Blue: Blue badge with zap icon
- Green: Green badge with gift icon

---

### 8.2.3 Tier Form (Create/Edit)

**Section 1: Basic Information**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Tier Name | Text input | ✅ | e.g., Platinum, Gold, Silver |
| Tier Level | Number input | ✅ | 1 = highest priority |
| Description | Textarea | ❌ | Optional explanation |

---

**Section 2: Appearance**

| Field | Type | Options |
|-------|------|---------|
| Badge Color | Select | purple, gold, silver, bronze, blue, green |
| Badge Icon | Select | crown, star, shield, award, zap, gift |

**Preview**: Live badge preview with selected color and icon

---

**Section 3: Benefits**

| Field | Type | Range | Default |
|-------|------|-------|---------|
| Discount Percentage | Number input | 0-100% | 0 |
| Points Multiplier | Number input | ≥ 1.0 | 1.0 |
| Free Shipping Threshold | Number input | ≥ 0 (RM) | NULL (no free shipping) |
| Priority Customer Support | Checkbox | - | false |
| Early Access to New Products | Checkbox | - | false |

**Examples**:
- Platinum: 15% discount, 3.0x points, free shipping over RM 200
- Gold: 10% discount, 2.0x points, free shipping over RM 300
- Silver: 5% discount, 1.5x points, no free shipping

---

**Section 4: Requirements**

| Field | Type | Description |
|-------|------|-------------|
| Minimum Monthly Spending | Number input (RM) | Customer must spend this amount per month to maintain tier |

**Important**: Monthly spending resets on the 1st of each month. Customers drop to lower tier if they don't meet requirement.

---

**Section 5: Settings**

| Field | Type | Description |
|-------|------|-------------|
| Display Order | Number input | Sort order in tier list |
| Active | Toggle | Enable/disable this tier |

---

### 8.2.4 Tier Assignment Logic

**Automatic Assignment** (via database trigger or scheduled job):
```
Calculate customer monthly spending:
  SELECT SUM(order_total)
  FROM orders
  WHERE customer_id = {customer_id}
    AND status = 'COMPLETED'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())

Find eligible tier:
  SELECT *
  FROM customer_tiers
  WHERE monthly_spending_requirement <= {customer_spending}
    AND is_active = true
  ORDER BY tier_level ASC
  LIMIT 1

Update customer tier:
  UPDATE customer_profiles
  SET current_tier_id = {tier_id}
  WHERE id = {customer_id}
```

---

## 9. PRODUCT MANAGEMENT

---

## 9.1 PRODUCTS ADVANCED PAGE

**Route**: `/admin/products-enhanced`

**Purpose**: Shopee-style component-based product management with variants and combinations.

### 9.1.1 Product Table

**Columns**:

| Column | Content |
|--------|---------|
| Product | Name, brand/model, featured badge |
| Category | Category name |
| Components | Type badges (Color, Size, etc.) |
| Status | Active/Inactive toggle |
| Actions | Edit, Delete |

**Search**: Name, brand, model

---

### 9.1.2 Four-Tab Product Form

---

#### TAB 1: Basic Info

**Fields**:

| Field | Type | Required | Auto-Generated |
|-------|------|----------|----------------|
| Product Name | Text input | ✅ | - |
| URL Slug | Text input | ❌ | Yes (from name if empty) |
| Description | Textarea | ❌ | - |
| Brand | Text input | ❌ | - |
| Model | Text input | ❌ | - |
| Category | Select dropdown | ✅ | - |
| Weight (kg) | Number input | ❌ | - |
| Dimensions (cm) | 3 number inputs | ❌ | Length × Width × Height |
| Year Range | 2 number inputs | ❌ | year_from, year_to |
| Keywords | Tag input | ❌ | Array of strings |
| Tags | Tag input | ❌ | Array of strings |

**Toggles**:
- Active (is product visible?)
- Featured (show on homepage?)

---

#### TAB 2: Images

**Purpose**: Manage product gallery images.

**Image List**:
Each image row contains:
- Image URL (text input)
- Alt Text (text input)
- Primary Image (radio button - only one can be primary)
- Remove button (trash icon)

**Actions**:
- Add Image (+ button)
- Remove Image (trash icon per row)
- Reorder images (drag & drop - future feature)

**Validation**:
- At least 1 image recommended
- Primary image required

---

#### TAB 3: Component Variants

**Purpose**: Define product components (like Shopee variants).

**Component Types**:
- Color
- Size
- Storage
- Memory
- Processor
- Material
- Style
- Capacity
- Power
- Connectivity
- Custom

**Component Form Fields** (per variant):

| Field | Type | Required |
|-------|------|----------|
| SKU | Text input | ✅ |
| Name | Text input | ✅ |
| Component Type | Select | ✅ |
| Component Value | Text input | ✅ |
| Cost Price | Number input | ❌ |
| Selling Price | Number input | ✅ |
| Stock Quantity | Number input | ❌ |
| Reorder Level | Number input | ❌ |
| Description | Textarea | ❌ |
| Active | Checkbox | ❌ |
| Required | Checkbox | ❌ |
| Default | Checkbox | ❌ |
| Display Order | Number input | ❌ |

**Component Variant Images**:
- Multiple images per component
- Image URL + alt text
- Displayed when component is selected

**Example Component Variants**:
```
Product: Android Head Unit
├─ Component 1
│  ├─ SKU: HD-12.3-BLK
│  ├─ Name: 12.3 inch Black
│  ├─ Type: Size
│  ├─ Value: 12.3"
│  ├─ Price: RM 850.00
│  └─ Stock: 15
├─ Component 2
│  ├─ SKU: HD-10.1-BLK
│  ├─ Name: 10.1 inch Black
│  ├─ Type: Size
│  ├─ Value: 10.1"
│  ├─ Price: RM 650.00
│  └─ Stock: 20
└─ Component 3
   ├─ SKU: RAM-4GB
   ├─ Name: 4GB RAM
   ├─ Type: Memory
   ├─ Value: 4GB
   ├─ Price: +RM 100.00
   └─ Stock: 50
```

**Actions**:
- Add Component Variant
- Edit Component
- Delete Component
- Add Component Images

---

#### TAB 4: Variant Combinations

**Purpose**: Pre-define popular component combinations with custom pricing.

**Combination Form**:

| Field | Type | Description |
|-------|------|-------------|
| Combination Name | Text input | e.g., "12.3\" Black + 4GB RAM" |
| Selected Components | Multi-select | Choose component variants |
| Override Price | Number input | Custom price for this combo |
| Discount Percentage | Number input | % off compared to sum of individual prices |
| Override Stock | Number input | Dedicated stock for this combo |
| Active | Checkbox | Enable/disable this combination |

**Example**:
```
Combination: "12.3\" Premium Black + 4GB RAM + GPS"
Components:
  - HD-12.3-BLK (RM 850)
  - RAM-4GB (RM 100)
  - GPS-MODULE (RM 150)
Individual Total: RM 1,100
Combo Price: RM 999 (9% discount)
Stock: 10 units
```

**Display to Customer**:
- Show as "Popular Combo" badge
- Display savings (RM 101 saved!)
- One-click add to cart

---

### 9.1.3 Data Flow

**Database Tables**:
1. `products_new` - Main product info (Tab 1)
2. `product_images_new` - Product gallery (Tab 2)
3. `component_variants` - Individual components (Tab 3)
4. `component_variant_images` - Component images (Tab 3)
5. `product_component_variants` - Link products to components (Tab 3)
6. `product_variant_combinations` - Combo deals (Tab 4)

**Create Product Process**:
```
1. Save basic info → products_new table
2. Insert images → product_images_new table
3. For each component:
   - Insert component → component_variants table
   - Insert images → component_variant_images table
   - Link to product → product_component_variants table
4. Insert combinations → product_variant_combinations table
```

---

## 9.2 COMPONENT LIBRARY PAGE

**Route**: `/admin/component-library`

**Purpose**: Manage individual components (SKUs) that can be used across multiple products.

**Features**:
- CRUD operations for components
- SKU management
- Pricing (cost, merchant, normal)
- Stock levels
- Reorder alerts
- Component images
- Category assignment

**Table Columns**:
- SKU
- Component Name
- Category
- Cost Price
- Merchant Price
- Normal Price
- Stock
- Active Status
- Actions

---

## 9.3 INVENTORY ALERTS PAGE

**Route**: `/admin/inventory-alerts`

**Purpose**: Monitor low stock levels and receive reorder notifications.

**Alert Thresholds**:
- Low Stock: quantity ≤ reorder_level
- Out of Stock: quantity = 0
- Overstock: quantity > max_stock_level (if configured)

**Table Columns**:
- Alert Icon (color-coded)
- SKU
- Component Name
- Current Stock
- Reorder Level
- Recommended Order Qty
- Supplier
- Actions (Mark Resolved, Reorder)

**Filter Options**:
- All Alerts
- Critical (Out of Stock)
- Warning (Low Stock)
- Resolved

**Actions**:
- Send email to supplier
- Create purchase order (future)
- Update stock manually
- Adjust reorder level

---

## 10. CONTENT MODERATION

---

## 10.1 REVIEW MODERATION PAGE

**Route**: `/admin/review-moderation`

**Purpose**: Moderate customer product reviews before public display.

### 10.1.1 Three-Tab Interface

**Tab 1**: Pending Reviews (awaiting moderation)
**Tab 2**: Approved Reviews (published)
**Tab 3**: Rejected Reviews (hidden from public)

---

### 10.1.2 Statistics Cards

| Metric | Color | Data Source |
|--------|-------|-------------|
| Pending Reviews | Yellow | COUNT(*) WHERE status = 'pending' |
| Approved Reviews | Green | COUNT(*) WHERE status = 'approved' |
| Rejected Reviews | Red | COUNT(*) WHERE status = 'rejected' |

---

### 10.1.3 Review Card Display

**Card Structure**:

**Header**:
- Customer name (bold)
- Verified Purchase badge (green checkmark)
- Submission date (gray, small)

**Star Rating**:
- 1-5 stars (filled yellow stars)
- Displayed prominently

**Review Text**:
- Full review content
- Word wrap, readable font size

**Review Images** (if provided):
- Thumbnail grid (3 columns)
- Click to view full-size in lightbox

**Product Information**:
- Product name
- Product category
- Link to product page

**Engagement Metrics**:
- Helpful votes count (thumbs up icon)
- "X people found this helpful"

---

### 10.1.4 Image Gallery (Lightbox)

**Features**:
- Full-screen modal
- Previous/Next navigation buttons
- Image counter (e.g., "2 / 5")
- Close button (X icon)
- Dark overlay background
- Keyboard navigation (arrow keys, ESC)

**Controls**:
- Left arrow: Previous image
- Right arrow: Next image
- ESC: Close gallery
- Click outside: Close gallery

---

### 10.1.5 Moderation Actions

#### Approve Review

**Button**: "Approve" (green, check icon)

**Process**:
1. Click Approve button
2. Confirmation toast appears
3. **Database Update**:
   - `status = 'approved'`
   - `approved_at = NOW()`
   - `approved_by = admin_user_id`
4. Review moves to "Approved" tab
5. Review becomes visible on product page
6. Customer receives notification (optional)

**Visibility**: Approved reviews appear in:
- Product detail page
- Customer profile (if public reviews enabled)
- Site-wide review feed (if implemented)

---

#### Reject Review

**Button**: "Reject" (red, X icon)

**Process**:
1. Click Reject button
2. Optional rejection reason dialog (future feature)
3. **Database Update**:
   - `status = 'rejected'`
   - `rejected_at = NOW()`
   - `rejected_by = admin_user_id`
4. Review moves to "Rejected" tab
5. Review hidden from public view
6. No notification sent to customer

**Rejection Reasons** (future):
- Inappropriate content
- Spam or fake review
- Not related to product
- Contains personal information
- Violates community guidelines

---

#### Delete Review

**Button**: "Delete" (red, trash icon)

**Confirmation Modal**:
```
⚠️ Permanently Delete Review?
This action cannot be undone.
Customer: John Doe
Product: Android Head Unit
Rating: ⭐⭐⭐⭐⭐
[Cancel] [Delete Permanently]
```

**Process**:
1. Click Delete button
2. Confirmation modal appears
3. Admin confirms deletion
4. **Database Delete**:
   - DELETE FROM product_reviews WHERE id = {review_id}
5. Success toast notification
6. Review removed from all tabs

**Warning**: This is a permanent deletion with no recovery.

---

## 10.2 SECONDHAND MODERATION PAGE

**Route**: `/admin/secondhand-moderation`

**Purpose**: Moderate merchant secondhand marketplace listings before publication.

### 10.2.1 Statistics Cards

| Metric | Color | Description |
|--------|-------|-------------|
| Total Listings | Blue | All listings (any status) |
| Pending Review | Yellow | Awaiting admin approval |
| Approved | Green | Published to marketplace |
| Rejected | Red | Rejected with reason |

---

### 10.2.2 Table Columns

| Column | Content |
|--------|---------|
| Listing | Image thumbnail + title + description excerpt |
| Seller | Merchant name + phone |
| Price | Listing price (MYR) |
| Condition | Badge (Like New, Good, Fair, Damaged) |
| Status | Badge (Pending, Approved, Rejected, Sold) |
| Submitted | Date submitted |
| Actions | View Details, Approve, Reject |

---

### 10.2.3 Condition Badges

| Condition | Color | Text |
|-----------|-------|------|
| like_new | Green | Like New |
| good | Blue | Good |
| fair | Yellow | Fair |
| damaged | Red | Damaged |

---

### 10.2.4 Status Badges

| Status | Color | Text |
|--------|-------|------|
| pending | Yellow | Pending Review |
| approved | Green | Approved |
| rejected | Red | Rejected |
| sold | Purple | Sold |
| expired | Gray | Expired |

---

### 10.2.5 Search & Filter

**Search Fields**:
- Title
- Category
- Car brand

**Status Filter Dropdown**:
- All
- Pending
- Approved
- Rejected

**Clear Filters Button**: Reset all filters

---

### 10.2.6 Listing Details Modal

**Modal Structure**:

**Header Section**:
- Listing title (large, bold)
- Category badge
- Car brand + model (e.g., "BMW 3 Series")
- Status badge

**Image Gallery**:
- Main image display (large)
- Thumbnail carousel below
- Previous/Next navigation buttons
- Image counter (e.g., "2 of 5")
- Click to view full-size

**Pricing Section**:
- Selling price (large, lime-600): RM XXX.XX
- Original price (if provided, strikethrough): RM XXX.XX
- Savings calculation: Save RM XXX
- Price negotiable badge (if is_negotiable = true)

**Condition & Details**:
- Condition badge (color-coded)
- Year purchased
- Months used
- Reason for selling

**Vehicle Compatibility**:
- Car brand
- Car model
- Compatible years (e.g., "2015-2020")

**Detailed Description**:
- Full listing description
- Word wrap, readable formatting

**Seller Information**:
- Merchant business name
- Contact phone (click to call)
- Merchant profile link

**Listing Statistics**:
- Views count
- Created date
- Last updated date

---

### 10.2.7 Approval Workflow

**Button**: "Approve Listing" (green, check icon)

**Process**:
1. Click Approve button
2. Confirmation dialog
3. **Database Update**:
   - `status = 'approved'`
   - `reviewed_by = admin_user_id`
   - `reviewed_at = NOW()`
   - `admin_notes = NULL` (clear any previous rejection reason)
4. Success toast: "Listing approved and published to marketplace."
5. Listing appears on `/secondhand-marketplace` page
6. Seller receives approval notification

**Notification to Merchant**:
```
Subject: Your Listing Has Been Approved

Hi {merchant_name},

Great news! Your listing "{listing_title}" has been approved and is now live on the AutoLab Secondhand Marketplace.

View your listing: {listing_url}

Thank you,
AutoLab Team
```

---

### 10.2.8 Rejection Workflow

**Button**: "Reject Listing" (red, X icon)

**Rejection Reason Dialog**:

**Form Fields**:
- Rejection Reason (required, textarea)
  - Placeholder: "Please provide a detailed reason for rejection..."
  - Min length: 20 characters
  - Examples:
    - "Images are unclear or do not show the actual product"
    - "Pricing seems unrealistic or suspicious"
    - "Product category does not match item description"
    - "Contains prohibited items or violates marketplace policies"

**Process**:
1. Click Reject button
2. Rejection reason modal opens
3. Admin enters detailed reason
4. Click "Submit Rejection"
5. **Database Update**:
   - `status = 'rejected'`
   - `rejection_reason = {reason}` (**stored in admin_notes field**)
   - `reviewed_by = admin_user_id`
   - `reviewed_at = NOW()`
6. Success toast: "Listing rejected."
7. Listing hidden from marketplace
8. Seller receives rejection notification with reason

**Notification to Merchant**:
```
Subject: Your Listing Requires Revision

Hi {merchant_name},

Unfortunately, your listing "{listing_title}" could not be approved at this time.

Reason:
{rejection_reason}

You can edit and resubmit your listing after addressing the issues mentioned above.

Thank you,
AutoLab Team
```

**Seller View** (in My 2nd Hand Listings):
- Listing shows with "Rejected" status badge
- Rejection reason displayed in red alert box
- Edit button enabled (future feature)
- Can resubmit after corrections

---

### 10.2.9 Delete Listing

**Button**: "Delete" (red, trash icon)

**Confirmation Modal**:
```
⚠️ Permanently Delete Listing?
This action cannot be undone. The merchant will not be notified.
Listing: "{listing_title}"
Seller: {merchant_name}
[Cancel] [Delete Permanently]
```

**Process**:
1. Click Delete button
2. Confirmation modal appears
3. Admin confirms deletion
4. **Database Delete**:
   - DELETE FROM secondhand_listings WHERE id = {listing_id}
   - Cascading delete for any related tables
5. Success toast notification
6. Listing permanently removed

**Use Cases**:
- Duplicate listings
- Spam or fraudulent listings
- Listings that violate severe policies
- Merchant requested deletion

---

## 11. MARKETING & PROMOTIONS

---

## 11.1 VOUCHER MANAGEMENT PAGE

**Route**: `/admin/vouchers`

**Purpose**: Create and manage discount vouchers for marketing campaigns.

### 11.1.1 Vouchers Table

**Columns**:

| Column | Content | Actions |
|--------|---------|---------|
| Code | Uppercase code + copy button | Click to copy |
| Name | Voucher display name | - |
| Discount | Percentage or fixed amount | - |
| Usage | current/total, per user limit | Progress bar |
| Valid Until | Expiry date | Color-coded |
| Status | Active/Inactive badge | - |
| Actions | Edit, Toggle Active, Delete | Buttons |

**Example Row**:
```
Code: WELCOME50 [Copy]
Name: Welcome Voucher for New Customers
Discount: RM 50 (max discount)
Usage: 12 / 100 (max 1 per user)
Valid Until: 31/12/2025 (23 days left)
Status: [Active]
Actions: [Edit] [Toggle] [Delete]
```

---

### 11.1.2 Voucher Form (Create/Edit)

**Section 1: Basic Information**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Code | Text input | ✅ | Uppercase, disabled when editing |
| Name | Text input | ✅ | Display name |
| Description | Textarea | ❌ | Internal notes |

**Code Generation**:
- Manual entry when creating
- Auto-uppercase transformation
- Unique constraint (cannot duplicate codes)
- Cannot be changed after creation

---

**Section 2: Discount Configuration**

| Field | Type | Required | Conditional |
|-------|------|----------|-------------|
| Discount Type | Radio buttons | ✅ | PERCENTAGE or FIXED_AMOUNT |
| Discount Value | Number input | ✅ | % or RM amount |
| Max Discount Amount | Number input | ❌ | Only for PERCENTAGE type |
| Min Purchase Amount | Number input | ❌ | Minimum cart total |

**Discount Type Options**:

**PERCENTAGE**:
- Value: 1-100%
- Max Discount Amount: Optional cap (e.g., 15% off, max RM 50)
- Example: "15% off (max RM 50)" or "10% off"

**FIXED_AMOUNT**:
- Value: RM amount (e.g., RM 100)
- Max Discount Amount: Not applicable
- Example: "RM 100 off"

---

**Section 3: Usage Limits**

| Field | Type | Description |
|-------|------|-------------|
| Max Usage Total | Number input | Total times voucher can be used (NULL = unlimited) |
| Max Usage Per User | Number input | Times each user can use this voucher |
| Customer Type Restriction | Select dropdown | ALL / NORMAL / MERCHANT |

**Customer Type Restriction Options**:
- **ALL**: Any customer can use
- **NORMAL**: B2C customers only
- **MERCHANT**: B2B merchants only

**Usage Display**:
- Shows: `12 / 100` (12 used out of 100 max)
- Shows: `Unlimited` if max_usage_total is NULL
- Per-user limit always enforced

---

**Section 4: Validity Period**

| Field | Type | Required | Nullable |
|-------|------|----------|----------|
| Valid From | Date picker | ✅ | No |
| Valid Until | Date picker | ❌ | Yes (no expiry) |

**Expiry Handling**:
- If Valid Until is NULL: No expiry, voucher valid indefinitely
- If Valid Until is set: Auto-deactivate after expiry (via cron job or check on usage)

---

**Section 5: Settings**

| Field | Type | Description |
|-------|------|-------------|
| Admin Notes | Textarea | Internal notes (not visible to customers) |
| Is Active | Toggle | Enable/disable voucher |

---

### 11.1.3 Voucher Actions

#### Copy Code

**Trigger**: Click copy icon next to code

**Process**:
1. Code copied to clipboard
2. Toast notification: "Voucher code copied!"
3. Can be pasted anywhere

---

#### Toggle Active

**Trigger**: Click toggle switch in table

**Process**:
1. Instant toggle (no confirmation)
2. **Database Update**:
   - `is_active = !is_active`
3. Toast notification: "Voucher {activated/deactivated}"
4. Inactive vouchers cannot be used in checkout

---

#### Edit Voucher

**Trigger**: Click Edit button

**Modal/Page**: Opens voucher form with pre-filled data

**Editable Fields**:
- Name, Description (code is disabled)
- Discount Type, Value, Max Discount
- Min Purchase Amount
- Usage limits (total, per user, customer type)
- Validity dates
- Admin notes
- Active status

**Non-Editable**:
- Code (immutable after creation)

---

#### Delete Voucher

**Trigger**: Click Delete button

**Confirmation Modal**:
```
⚠️ Delete Voucher?
Code: WELCOME50
Name: Welcome Voucher for New Customers
Usage: 12 / 100 (12 customers have used this)
[Cancel] [Delete Permanently]
```

**Process**:
1. Click Delete
2. Confirmation dialog
3. Admin confirms
4. **Database Delete**:
   - DELETE FROM voucher_codes WHERE id = {voucher_id}
   - NOTE: May need to handle `voucher_usage` table (cascade or prevent if used)
5. Success toast: "Voucher deleted."

**Best Practice**: Instead of deleting, set `is_active = false` to preserve usage history.

---

### 11.1.4 Voucher Usage Tracking

**Database Tables**:
- `voucher_codes`: Voucher definitions
- `voucher_usage`: Usage records (customer_id, voucher_id, order_id, used_at)

**Usage Stats**:
- Total uses: COUNT(*) FROM voucher_usage WHERE voucher_id = {id}
- Users who used: COUNT(DISTINCT customer_id) FROM voucher_usage WHERE voucher_id = {id}
- Most recent use: MAX(used_at) FROM voucher_usage WHERE voucher_id = {id}

---

## 12. MERCHANT PARTNERSHIP MANAGEMENT

---

## 12.1 PREMIUM PARTNERS PAGE

**Route**: `/admin/premium-partners`

**Purpose**: Manage authorized reseller partnerships and subscription plans.

**(Full details covered in Admin Panel documentation from task agent output - see APPENDIX A for complete Premium Partners workflow)**

### 12.1.1 Key Features

- Approve/Reject merchant applications
- Manage subscriptions (Professional RM99/year, Panel RM350/month)
- Extend/Renew subscriptions
- Toggle featured status
- View renewal history
- Edit partnership details
- Suspend/Activate partnerships

### 12.1.2 Critical Workflow

**Approval Process**:
1. Merchant submits application
2. Admin reviews in Premium Partners page
3. **On Approval**:
   - `customer_profiles.customer_type = 'merchant'` (**CRITICAL**)
   - Merchant wallet auto-created
   - Subscription becomes ACTIVE
4. Merchant gains access to Merchant Console

---

## 12.2 INSTALLATION GUIDES PAGE

**Route**: `/admin/installation-guides`

**Purpose**: Manage video installation guides for enterprise merchants.

### 12.2.1 Guides Table

**Columns**:
- Guide Info (thumbnail, video icon, title, description)
- Category (badge)
- Car Model (brand & model)
- Difficulty (color-coded badge)
- Status (Published/Draft)
- Actions (Edit, Publish/Unpublish, Delete)

---

### 12.2.2 Guide Form

**Fields**:

| Field | Type | Required |
|-------|------|----------|
| Title | Text input | ✅ |
| Description | Textarea | ❌ |
| Category | Select dropdown | ✅ |
| Difficulty | Select dropdown | ✅ |
| Car Brand | Select dropdown | ❌ |
| Car Model | Text input | ❌ |
| Video URL | Text input (YouTube) | ✅ |
| Thumbnail Image URL | Text input | ❌ |
| Is Published | Checkbox | ❌ |

**Categories**:
- Head Unit
- Camera
- Dashcam
- Audio
- Sensors
- Lighting
- Security
- Performance
- Other

**Difficulty Levels** (Color-Coded):
- Easy: Green badge
- Medium: Yellow badge
- Hard: Red badge

**Car Brands Supported**:
Toyota, Honda, Proton, Perodua, Nissan, Mazda, Mitsubishi, BMW, Mercedes, Audi, Volkswagen, Other

---

### 12.2.3 Actions

**Publish/Unpublish**:
- Toggle `is_published` boolean
- Only published guides visible to merchants
- Draft guides for internal review

**Edit**: Modify all guide fields

**Delete**: Permanent removal (with confirmation)

---

## 13. KNOWLEDGE BASE & SUPPORT

---

## 13.1 KNOWLEDGE BASE PAGE

**Route**: `/admin/knowledge-base`

**Purpose**: AI-powered knowledge base management for customer service bot.

### 13.1.1 Three-Tab Interface

**Tab 1: Knowledge Base Entries**
- Manual Q&A entries
- Categories: Product Info, Shipping, Support, Policies, Troubleshooting, FAQ, Terms, Other
- CRUD operations

**Tab 2: PDF Documents**
- Upload PDFs
- AI processes and extracts content
- Auto-generates Q&A from documents

**Tab 3: AI Agent Demo**
- Test the knowledge base chatbot
- Query testing
- Response quality verification

---

## 14. SYSTEM SETTINGS

---

## 14.1 SETTINGS PAGE

**Route**: `/admin/settings`

**Purpose**: Comprehensive system settings and configuration management.

### 14.1.1 Six-Tab Interface

---

#### TAB 1: GENERAL

**Store Information**:
- Store Name
- Store Email
- Store Description (textarea)
- Phone Number
- Website URL
- Store Address (textarea)

**Theme & Appearance**:
- Primary Color (color picker + hex input)
- Enable Dark Mode (toggle)

---

#### TAB 2: BUSINESS

**Business Configuration**:
- Currency (MYR, USD, EUR, SGD)
- Tax Rate (%) - decimal input
- Enable Shipping (toggle)

**Shipping Settings** (if enabled):
- Shipping Rate (currency amount)
- Free Shipping Threshold

**Payment Settings**:
- Payment Gateway (Stripe, PayPal, Razorpay, Manual)
- Accepted Payment Methods (multi-toggle):
  - Credit/Debit Cards
  - Bank Transfer
  - PayPal
  - Cash on Delivery

---

#### TAB 3: SECURITY

**Security Configuration**:
- Require Email Verification (toggle)
- Enable Two-Factor Authentication (toggle)
- Minimum Password Length (6-50)
- Session Timeout (5-480 minutes)

---

#### TAB 4: NOTIFICATIONS

**Email Notifications**:
- Enable Email Notifications (master toggle)

**Sub-options** (if enabled):
- Order Notifications
- Low Stock Alerts
- Marketing Emails

---

#### TAB 5: INVENTORY

**Inventory Management**:
- Low Stock Threshold (number)
- Stock Alert Emails (toggle)
- Enable Auto-Reorder (toggle)

**Info Alert**:
"Auto-reorder will automatically create purchase orders when stock falls below the threshold."

**Product Categories Section**:
- Table: Name, Description, Status, Created Date, Actions
- Add Category button
- Edit/Delete actions
- Category form:
  - Name (auto-generates URL slug)
  - Description (optional textarea)
  - Active Category (toggle)

---

#### TAB 6: SYSTEM

**Maintenance Mode**:
- Enable Maintenance Mode (toggle)
- Maintenance Message (textarea, shown to users)

**System Information**:
- Database Status: Connection (badge), Version, Storage Used
- Application Info: Version, Environment (badge), Last Backup
- User Roles: List of all role types (customer, merchant, staff, admin)

---

### 14.1.2 Save All Settings

**Button**: "Save All Settings" (bottom, fixed position)

**Actions**:
- "Reset Changes" button: Reload page, discard unsaved changes
- "Save All Settings" button: Save all tabs simultaneously

**Process**:
1. Validate all form fields
2. Check for required fields
3. Update settings in database
4. Show loading state
5. Success toast: "Settings saved successfully"
6. Refresh page to apply changes

---

## 15. REPORTS & ANALYTICS

### 15.1 Dashboard Metrics

**Key Performance Indicators**:
- Total Revenue (lifetime)
- Total Orders (count)
- Total Customers (count)
- Active Products (count)

### 15.2 Order Analytics

**Available Metrics**:
- Orders by status
- Orders by payment method
- Revenue by month/quarter/year
- Average order value
- Top customers by spending
- Top-selling products

### 15.3 Customer Analytics

**Available Metrics**:
- New customers per month
- Customer retention rate
- Customer lifetime value
- Customer by tier distribution
- Active vs inactive customers

### 15.4 Inventory Analytics

**Available Metrics**:
- Low stock alerts (count)
- Out of stock items
- Inventory turnover rate
- Dead stock identification
- Stock value by category

### 15.5 Merchant Analytics

**Available Metrics**:
- Total partnerships
- Active vs pending merchants
- Subscription revenue (monthly/yearly)
- Merchant renewals due
- Top-performing merchant shops

---

## 16. TECHNICAL ARCHITECTURE

### 16.1 Technology Stack

**Frontend**:
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Lucide React icons
- React Router v6

**Backend**:
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage
- Supabase Real-time (for notifications)

**State Management**:
- React hooks (useState, useEffect, useContext)
- No Redux (Supabase handles most state)

---

### 16.2 Database Architecture

**Core Tables** (40+ tables):

**Orders**:
- orders
- order_items
- order_tracking
- shipping_labels

**Products**:
- products_new
- component_library
- component_variants
- product_images_new
- component_variant_images
- product_component_variants
- product_variant_combinations
- categories

**Customers**:
- customer_profiles
- customer_addresses
- customer_tiers
- customer_tier_assignments

**Merchants**:
- premium_partnerships
- merchant_registrations
- merchant_wallets
- partnership_renewal_history
- merchant_codes

**Content**:
- product_reviews
- secondhand_listings
- installation_guides
- knowledge_base_entries

**Marketing**:
- voucher_codes
- voucher_usage

**Admin**:
- admin_profiles
- admin_activity_logs (future)

---

### 16.3 Authentication & Authorization

**Supabase Auth**:
- JWT-based authentication
- Email/password login
- Session management
- Password reset flow

**Row Level Security (RLS)**:
- Table-level permissions
- User-specific data access
- Admin role checks

**Admin Access Control**:
```sql
-- Example RLS policy for admin_profiles table
CREATE POLICY "Admins can view all profiles"
ON admin_profiles
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_profiles WHERE is_active = true
  )
);
```

---

### 16.4 File Storage

**Supabase Storage Buckets**:

**product-images**:
- Product gallery images
- Component variant images
- Secondhand listing images

**premium-partners**:
- Merchant shop photos
- Business logos
- Cover images

**documents**:
- PDF uploads for knowledge base
- Invoice PDFs (future)
- Shipping labels

**Access Policies**:
- Public read for published content
- Authenticated write for merchants/admins
- Admin-only for sensitive documents

---

### 16.5 API Architecture

**Supabase RPC Functions**:
- `get_admin_orders()`: Optimized order fetching with joins
- `get_admin_users()`: Admin user list with role filtering
- `calculate_customer_tier()`: Tier assignment logic
- `generate_invoice_number()`: Sequential invoice numbering

**REST API Endpoints** (via Supabase):
- POST `/rest/v1/orders`: Create order
- PATCH `/rest/v1/orders?id=eq.{id}`: Update order
- GET `/rest/v1/customer_profiles`: Fetch customers
- POST `/rest/v1/product_reviews`: Submit review

---

### 16.6 Real-time Features

**Supabase Realtime Subscriptions**:

**New Order Notifications**:
```typescript
const subscription = supabase
  .channel('new-orders')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'orders'
  }, payload => {
    toast({ title: 'New Order Received!', description: `Order #${payload.new.order_number}` });
  })
  .subscribe();
```

**Stock Level Alerts**:
```typescript
supabase
  .channel('stock-alerts')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'component_library',
    filter: 'stock_quantity=lte.reorder_level'
  }, payload => {
    toast({ title: 'Low Stock Alert', description: `${payload.new.name} is low on stock` });
  })
  .subscribe();
```

---

## APPENDIX A: COMPLETE FEATURE MATRIX

| Feature | Dashboard | Orders | Warehouse | Customers | Products | Moderation | Marketing | Merchants | Settings |
|---------|-----------|--------|-----------|-----------|----------|------------|-----------|-----------|----------|
| View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Delete | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Export | ❌ | ✅ (PDF) | ✅ (PDF) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Search | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Filter | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## APPENDIX B: ADMIN USER PERMISSIONS

| Action | Admin | Manager | Staff |
|--------|-------|---------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Orders | ✅ | ✅ | ✅ |
| Edit Orders | ✅ | ✅ | ❌ |
| Delete Orders | ✅ | ⚠️ Limited | ❌ |
| Manage Products | ✅ | ✅ | ❌ |
| Manage Customers | ✅ | ✅ | ❌ |
| Approve Merchants | ✅ | ✅ | ❌ |
| Moderate Content | ✅ | ✅ | ❌ |
| Manage Vouchers | ✅ | ✅ | ❌ |
| System Settings | ✅ | ⚠️ Limited | ❌ |
| User Management | ✅ | ❌ | ❌ |

---

## DOCUMENT END

**Total Pages**: 65
**Total Sections**: 16
**Total Appendices**: 2
**Total Admin Pages Documented**: 18

---

**For Questions or Updates**:
Contact: admin@autolabs.com.my
Documentation Version: 1.0
Last Reviewed: December 30, 2025
