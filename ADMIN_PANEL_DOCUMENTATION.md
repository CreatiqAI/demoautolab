# Admin Panel Documentation
**Project: Automot Hub - Automotive Parts E-Commerce Platform**
**Generated: January 2025**
**Version: 1.0**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Admin Panel Overview](#admin-panel-overview)
3. [Feature Breakdown](#feature-breakdown)
4. [Database Integration](#database-integration)
5. [User Access & Authentication](#user-access--authentication)
6. [Current Progress & Implementation Status](#current-progress--implementation-status)

---

## Executive Summary

The Automot Hub admin panel is a comprehensive management system for an automotive parts e-commerce platform. This documentation provides a complete overview of all implemented features, their functionality, and current implementation status.

### Key Statistics
- **Total Admin Pages**: 18 modules
- **Core Features**: 15+ major features
- **Integration Points**: Supabase PostgreSQL database, real-time updates
- **User Interface**: Modern React-based UI with responsive design

---

## Admin Panel Overview

### Access Information
- **Route**: `/admin`
- **Authentication**: Required (Supabase Auth)
- **Layout**: Side navigation with collapsible menu
- **Responsive**: Desktop and mobile support

### Navigation Structure
The admin panel features a left sidebar with the following sections:
1. Dashboard
2. Product Management
3. Order Management
4. Warehouse Operations
5. Customer Management
6. Review Moderation
7. Voucher Management
8. Premium Partners
9. Staff Management
10. Knowledge Base
11. Settings

---

## Feature Breakdown

### 1. Dashboard (Main Analytics)
**Location**: `/admin`
**File**: `src/pages/admin/Dashboard.tsx`

#### Features:
- **Overview Cards**:
  - Total Revenue (MYR currency)
  - Total Orders count
  - Active Customers count
  - Total Products in inventory

- **Recent Orders Display**:
  - Last 5 orders with quick view
  - Order status badges (color-coded)
  - Customer information
  - Payment method display
  - Click to expand for full details

#### Data Sources:
- `orders` table
- `component_library` table
- `customer_profiles` table

---

### 2. Product Management (Products Pro)
**Location**: `/admin/products-enhanced`
**File**: `src/pages/admin/ProductsPro.tsx`

#### Core Capabilities:

##### Product Creation System
- **Multi-tab Form**:
  - Tab 1: Basic product information
  - Tab 2: Component selection from library
  - Tab 3: Product images (up to 4 images)

- **Product Fields**:
  - Name (required)
  - Auto-generated URL slug
  - Brand & Model (required)
  - Category assignment
  - Year range (from/to)
  - Screen size options (9", 10", 12.5")
  - Description (rich text)
  - SEO keywords (max 5)
  - Active/Featured toggles

##### Component Library Integration
- **Smart Component Search**:
  - Real-time SKU search
  - Component type filtering
  - Stock level display
  - Pricing information (normal & merchant)

- **Component Selection**:
  - Visual component picker
  - Image preview support
  - Multi-component assignment
  - Default component marking
  - Display order control

##### Product Management Features
- **Filtering & Search**:
  - Search by name, brand, model
  - Filter by brand
  - Filter by screen size
  - Filter by status (active/inactive/featured)

- **Product Actions**:
  - Edit product details
  - Preview customer view
  - Delete with confirmation
  - Activate/deactivate toggle

#### Preview Modal
- Complete customer-facing view
- Image gallery with lightbox
- Component list with pricing
- Add to cart simulation
- Screen size selection preview

#### Technical Features:
- Auto-slug generation from product name
- Image upload with alt text
- Component relationship management
- Real-time inventory checking

---

### 3. Component Library
**Location**: `/admin/component-library`
**File**: `src/pages/admin/ComponentLibraryPro.tsx`

#### Capabilities:
- Create individual automotive components
- SKU generation and management
- Component categorization
- Stock level tracking
- Pricing management (normal & merchant pricing)
- Image upload for components
- Active/inactive status control

---

### 4. Order Management System
**Location**: `/admin/orders`
**File**: `src/pages/admin/Orders.tsx`

#### Order Display Features:
- **Expandable Order List**:
  - Order number display
  - Customer information (name, phone, email)
  - Order date and time
  - Total amount (MYR)
  - Payment status
  - Order status (color-coded badges)

- **Order Status Types**:
  - Pending Payment
  - Payment Processing
  - Payment Failed
  - Pending Payment Verification
  - Payment Verified
  - Payment Rejected
  - Placed
  - Processing
  - Packing
  - Dispatched
  - Delivered
  - Cancelled
  - Rejected

#### Order Details (Expanded View):
- **Customer Information Section**:
  - Full name and contact details
  - Email address
  - Phone number
  - Payment method

- **Delivery Information**:
  - Delivery method (standard/express/self-pickup)
  - Delivery fee
  - Complete delivery address
  - Special delivery notes

- **Order Summary**:
  - Itemized list of components
  - SKU codes
  - Quantities
  - Unit prices
  - Subtotal
  - Voucher discount (if applied)
  - Delivery fee
  - SST (6% tax)
  - Grand total

#### Advanced Features:

##### Multi-Select Functionality
- Select multiple orders via checkboxes
- Bulk actions on selected orders
- Select all toggle

##### Picking List Generation
- **Purpose**: Warehouse item picking
- **Format**: Aggregated by SKU
- Shows total quantity needed per component
- Lists all order IDs requiring each component
- Print-ready format
- PDF download capability
- Professional layout with company header

##### Invoice Generation
- **Professional Invoice Layout**:
  - Company information (AUTO LABS SDN BHD)
  - Customer billing details
  - Order ID and date
  - Itemized component list with SKU
  - Pricing breakdown
  - Amount in words (e.g., "ONE HUNDRED FIFTY ONLY")
  - Terms and conditions
  - Signature sections

- **Invoice Actions**:
  - Print directly
  - Download as PDF
  - Professional A4 format

##### Order Actions:
- Mark as complete → moves to archived orders
- Delete order (with confirmation)
- Generate invoice
- View full details

#### Filtering & Search:
- Search by order number
- Search by customer name/phone
- Filter by order status
- Filter by payment status

---

### 5. Archived Orders
**Location**: `/admin/archived-orders`
**File**: `src/pages/admin/ArchivedOrders.tsx`

#### Features:
- View all completed orders
- Historical order data
- Same detailed view as active orders
- Cannot be modified (read-only)
- Searchable and filterable
- Export capabilities

---

### 6. Order Verification
**Location**: `/admin/order-verification`
**File**: `src/pages/admin/OrderVerification.tsx`

#### Purpose:
Payment verification for manual payment methods (bank transfer, etc.)

#### Features:
- Review submitted payment proofs
- Verify payment screenshots
- Approve/reject payments
- Update order status after verification
- Payment amount confirmation
- Transaction reference tracking

---

### 7. Warehouse Operations
**Location**: `/admin/warehouse-operations`
**File**: `src/pages/admin/WarehouseOperations.tsx`

#### Workflow Management:

##### Status Workflow:
1. **Processing** → Order approved, ready for warehouse
2. **Picking** → Items being picked from inventory
3. **Packing** → Items being packed for delivery
4. **Ready for Delivery** → Package ready for courier
5. **Out for Delivery** → Dispatched to customer
6. **Delivered** → Successfully delivered

##### Tab-Based Organization:
- Separate tab for each status
- Quick status overview cards
- Order count per status
- Color-coded status indicators

##### Multi-Select Operations:
- **Picking Tab**: Generate consolidated picking list
- **Packing Tab**: Generate packing list per order
- Bulk status updates
- Move multiple orders to next stage

##### Courier Integration:
- **Supported Courier Services**:
  - J&T Express
  - Lalamove
  - Own Delivery option

- **Courier Features**:
  - Rate comparison
  - Shipment creation
  - Tracking number generation
  - Shipping label download
  - Cost tracking
  - Delivery ETA estimation

- **Tracking System**:
  - Real-time shipment tracking
  - Status history
  - Location updates
  - Delivery confirmation
  - Recipient information

##### Order Detail View:
- Complete delivery address
- Picking list per order
- Component SKU with quantities
- Product context information
- Processing notes
- Internal notes

##### List Generation:

**Picking List Features**:
- Aggregated by SKU across multiple orders
- Shows which order needs each component
- Quantity breakdown per order
- Total quantity summary
- Print and PDF export

**Packing List Features**:
- Organized by order
- Shows all items per order
- Order number identification
- Component details
- Verification checklist format

---

### 8. Customer Management
**Location**: `/admin/customers`
**File**: `src/pages/admin/Customers.tsx`

#### Two Main Sections:

##### 1. Customer Directory
- **Customer Information Display**:
  - Full name
  - Email address
  - Phone number
  - Customer ID
  - Customer type (normal/merchant)
  - Registration date
  - Last updated timestamp
  - Active/Inactive status

- **Customer Details Modal**:
  - Personal information
  - Contact details
  - Address information
  - Account status
  - Customer metrics:
    - Total orders
    - Total amount spent
    - Account age

- **Customer Type Management**:
  - Normal customer
  - Merchant customer
  - Type assignment from admin
  - Pricing tier association

##### 2. Merchant Applications
- **Application Review System**:
  - Pending applications badge counter
  - Application submission date
  - Company details review
  - Business registration verification

- **Application Information**:
  - Applicant personal details
  - Company name
  - Business type
  - Business registration number
  - Tax ID
  - Business address
  - Registration code used
  - Code description/purpose

- **Application Actions**:
  - **Approve**:
    - Activate merchant status
    - Create merchant wallet automatically
    - Enable merchant pricing
  - **Reject**:
    - Require rejection reason
    - Notify applicant
    - Allow reapplication

- **Status Tracking**:
  - Pending (yellow badge)
  - Approved (green badge)
  - Rejected (red badge with reason)

#### Search & Filter:
- Search by customer name
- Search by email
- Search by phone number
- Search by customer ID

---

### 9. Review Moderation
**Location**: `/admin/review-moderation`
**File**: `src/pages/admin/ReviewModeration.tsx`

#### Review Management System:

##### Overview Statistics:
- Total pending reviews (needs attention)
- Total approved reviews (live)
- Total rejected reviews (hidden)

##### Three-Tab Interface:

**Tab 1: Pending Reviews**
- All new customer reviews
- Awaiting admin moderation
- Quick approve/reject buttons

**Tab 2: Approved Reviews**
- Currently visible on product pages
- Option to unapprove if needed
- Delete capability

**Tab 3: Rejected Reviews**
- Reviews that don't meet guidelines
- Can be approved if reconsidered
- Permanent delete option

##### Review Display Information:
- Customer name and email
- Star rating (1-5 stars, visual display)
- Review title (optional)
- Review comment/text
- Product being reviewed
- Verified purchase badge
- Submission date and time
- Helpful vote count

##### Image Support:
- **Review Images**:
  - Multiple image uploads per review
  - Image thumbnail grid
  - Click to view full size
  - Image gallery navigation
  - Lightbox modal viewer
  - Previous/Next navigation
  - Image counter display

##### Moderation Actions:
- **Approve**: Makes review visible to all customers
- **Reject**: Hides review from public view
- **Delete**: Permanently removes review
- **Unapprove**: Move approved back to rejected

##### Features:
- Real-time status updates
- Batch operations (future enhancement)
- Review quality indicators
- Spam detection (manual)

---

### 10. Voucher Management
**Location**: `/admin/vouchers`
**File**: `src/pages/admin/VoucherManagement.tsx`

#### Voucher Creation System:

##### Voucher Configuration:
- **Basic Information**:
  - Voucher code (auto-uppercase, e.g., "SAVE50")
  - Voucher name
  - Description (customer-facing)
  - Admin notes (internal only)

- **Discount Settings**:
  - Type: Percentage or Fixed Amount
  - Discount value
  - Max discount cap (for percentage)
  - Minimum purchase amount

- **Usage Limits**:
  - Total usage limit (unlimited option)
  - Per-user usage limit
  - Current usage tracking

- **Customer Restrictions**:
  - All customers
  - Normal customers only
  - Merchant customers only

- **Validity Period**:
  - Valid from date
  - Valid until date (optional for no expiry)
  - Auto-expiry handling

##### Voucher Management:
- **Active Voucher List**:
  - Code display with copy button
  - Name and description
  - Discount information
  - Usage statistics
  - Expiry date
  - Active/Inactive status badge

- **Quick Actions**:
  - Toggle active/inactive status
  - Edit voucher details
  - Delete voucher
  - Copy voucher code to clipboard

##### Usage Tracking:
- Real-time usage count
- Usage vs. limit display
- Per-user limit tracking
- Automatic deactivation when limit reached

##### Restrictions:
- Code cannot be changed after creation
- Discount type locked after creation
- Usage count cannot be reset

---

### 11. Premium Partners (Authorized Resellers)
**Location**: `/admin/premium-partners`
**File**: `src/pages/admin/PremiumPartners.tsx`

#### Partnership Management System:

##### Dashboard Statistics:
- Total partners count
- Pending review count (yellow highlight)
- Active partners count (green)
- Monthly revenue from partnerships

##### Partnership Application Review:
- **Business Information Display**:
  - Business name
  - Business type
  - Company registration details
  - Tax ID
  - Business address
  - Location (city, state)
  - Contact person details
  - Phone and email

##### Subscription Management:
- **Subscription Plans**:
  - Premium Partner tier
  - Monthly subscription fee (RM)
  - Billing cycle tracking
  - Next billing date

- **Status Options**:
  - Pending (awaiting admin approval)
  - Active (approved and paid)
  - Suspended (temporarily disabled)
  - Cancelled (terminated)
  - Expired (subscription ended)

##### Application Approval Process:
- **Review Dialog**:
  - Complete business details review
  - Registration code verification
  - Code description/purpose

- **Approval Actions**:
  - Set subscription duration (1, 3, 6, or 12 months)
  - Calculate end date automatically
  - Activate partnership
  - Make visible on Find Shops page

- **Rejection Process**:
  - Require rejection reason
  - Notify merchant
  - Allow reapplication

##### Partner Management Features:
- **Featured Partners**:
  - Mark/unmark as featured
  - Higher display priority
  - Crown icon indicator
  - Featured list on customer-facing pages

- **Performance Tracking**:
  - Total profile views
  - Total clicks/inquiries
  - Engagement metrics
  - ROI visibility

##### Admin Controls:
- Approve pending applications
- Reject applications with reason
- Suspend active partners
- Reactivate suspended partners
- Toggle featured status
- Monitor subscription status

##### Search & Filter:
- Search by business name
- Search by location
- Filter by status (all/pending/active/suspended/etc.)

---

### 12. Inventory Alerts
**Location**: `/admin/inventory-alerts`
**File**: `src/pages/admin/InventoryAlerts.tsx`

#### Features:
- Low stock warnings
- Out of stock alerts
- Reorder point notifications
- Stock level monitoring
- Component-wise alerts
- Email notifications (configurable)

---

### 13. Staff Management
**Location**: `/admin/users`
**File**: `src/pages/admin/UserManagement.tsx`

#### Capabilities:
- Add/remove admin users
- Role-based access control
- Permission management
- Activity logging
- Admin account status management

---

### 14. Knowledge Base
**Location**: `/admin/knowledge-base`
**File**: `src/pages/admin/KnowledgeBase.tsx`

#### Features:
- FAQ management
- Help article creation
- Category organization
- Search functionality
- Customer-facing knowledge base
- Internal documentation

---

### 15. Settings
**Location**: `/admin/settings`
**File**: `src/pages/admin/Settings.tsx`

#### Configuration Options:
- Store information
- Payment gateway settings
- Shipping configuration
- Email templates
- Tax settings (SST 6%)
- Currency settings (MYR)
- Business hours
- Contact information

---

## Database Integration

### Tables Used:
1. **orders** - Order management and tracking
2. **order_items** - Individual items per order
3. **products_new** - Product catalog
4. **component_library** - Component inventory
5. **product_components** - Product-component relationships
6. **product_images_new** - Product image storage
7. **customer_profiles** - Customer information
8. **vouchers** - Discount voucher system
9. **premium_partnerships** - Partner/reseller management
10. **merchant_registrations** - Merchant application tracking
11. **merchant_codes** - Registration code management
12. **product_reviews** - Customer review system
13. **review_images** - Review image attachments

### Database Functions:
- `get_admin_orders()` - Retrieve orders with enhanced data
- `search_components()` - Smart component search
- `generate_unique_slug()` - Auto-generate product URLs
- `get_active_partnerships()` - Active partner listings

---

## User Access & Authentication

### Authentication System:
- **Provider**: Supabase Auth
- **Login Route**: `/admin/login` or `/auth`
- **Protected Routes**: All admin routes require authentication
- **Session Management**: Token-based with auto-refresh

### Admin User Features:
- Secure login
- Password reset capability
- Session timeout
- Activity logging
- Role-based permissions

### Security Features:
- Row Level Security (RLS) on all tables
- Admin-only access policies
- Encrypted data transmission
- Audit trail for sensitive operations

---

## Current Progress & Implementation Status

### ✅ Fully Implemented Features:

#### Core E-Commerce:
- ✅ Product management system
- ✅ Component library management
- ✅ Order processing workflow
- ✅ Customer management
- ✅ Payment verification

#### Warehouse & Fulfillment:
- ✅ Warehouse operations dashboard
- ✅ Multi-stage order workflow
- ✅ Picking list generation
- ✅ Packing list generation
- ✅ Courier service integration (J&T Express, Lalamove)
- ✅ Shipment tracking system
- ✅ Shipping label generation

#### Marketing & Engagement:
- ✅ Voucher/discount system
- ✅ Premium partnership program
- ✅ Review moderation system
- ✅ Review image support
- ✅ Featured partner system

#### Analytics & Reporting:
- ✅ Dashboard with key metrics
- ✅ Order analytics
- ✅ Revenue tracking
- ✅ Partner performance metrics
- ✅ Review statistics

#### Business Management:
- ✅ Merchant application system
- ✅ Customer type management (normal/merchant)
- ✅ Multi-tier pricing
- ✅ Business verification workflow

### 🔄 Integration Features:

#### Third-Party Services:
- ✅ Supabase (Database & Auth)
- ✅ J&T Express API
- ✅ Lalamove API
- ✅ HTML2PDF (invoice/list generation)
- ✅ Image upload service

#### Payment Systems:
- ⚠️ Manual payment verification (implemented)
- ⏳ Automated payment gateway integration (pending)

### 📋 Additional Features Noted:

#### Admin Tools:
- ✅ Bulk operations (multi-select)
- ✅ Advanced search and filtering
- ✅ Print-ready documents
- ✅ PDF export functionality
- ✅ Real-time data updates

#### User Experience:
- ✅ Responsive design (desktop & mobile)
- ✅ Intuitive navigation
- ✅ Loading states
- ✅ Error handling
- ✅ Success/error notifications (toast messages)
- ✅ Confirmation dialogs for destructive actions

---

## Technical Implementation Details

### Frontend Stack:
- **Framework**: React 18+ with TypeScript
- **Routing**: React Router v6
- **UI Library**: Shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Forms**: Native React form handling
- **Icons**: Lucide React

### Backend Integration:
- **BaaS**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage (for images)

### Code Quality:
- TypeScript for type safety
- Component-based architecture
- Reusable UI components
- Consistent error handling
- Loading state management
- Responsive design patterns

---

## Key Workflows

### 1. Order Fulfillment Workflow:
```
New Order → Payment Verification → Processing →
Picking → Packing → Courier Assignment →
Out for Delivery → Delivered → Archived
```

### 2. Product Creation Workflow:
```
Create Product → Add Components → Upload Images →
Set Pricing → Activate → Visible to Customers
```

### 3. Merchant Onboarding:
```
Customer Applies → Admin Reviews Application →
Approve/Reject → Merchant Account Created →
Access to Merchant Pricing
```

### 4. Review Moderation Workflow:
```
Customer Submits Review → Pending Queue →
Admin Reviews → Approve/Reject →
Visible on Product Page (if approved)
```

---

## Performance Optimization

### Implemented Optimizations:
- Lazy loading for images
- Pagination for large lists
- Debounced search inputs
- Cached database queries
- Optimistic UI updates
- Efficient re-rendering strategies

---

## Mobile Responsiveness

All admin pages include:
- ✅ Mobile-friendly navigation (hamburger menu)
- ✅ Responsive tables (card view on mobile)
- ✅ Touch-friendly buttons
- ✅ Adaptive layouts
- ✅ Mobile-optimized dialogs/modals

---

## Future Enhancement Recommendations

### Potential Additions:
1. **Analytics Dashboard**: Advanced reporting and insights
2. **Automated Inventory Management**: Auto-reordering system
3. **Email Notifications**: Automated customer communications
4. **Multi-currency Support**: International expansion
5. **Advanced Search**: Elasticsearch integration
6. **Bulk Import/Export**: CSV/Excel operations
7. **API Documentation**: REST API for integrations
8. **Mobile App**: Native iOS/Android admin app

---

## Support & Maintenance

### Current Status:
- ✅ All core features operational
- ✅ Database schema stable
- ✅ Authentication system secure
- ✅ Error handling comprehensive
- ✅ User feedback mechanisms in place

### Monitoring:
- Console logging for debugging
- Error boundary components
- User action tracking
- Performance metrics

---

## Conclusion

The Automot Hub admin panel is a feature-complete, production-ready management system for automotive parts e-commerce. It provides comprehensive tools for:

- **Product Management**: Complete product lifecycle management
- **Order Processing**: From placement to delivery
- **Customer Service**: Review moderation and customer support
- **Business Operations**: Merchant partnerships and voucher marketing
- **Warehouse Management**: Efficient fulfillment operations

The system is built with modern technologies, follows best practices, and provides an excellent foundation for business growth and scaling.

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Prepared For**: Client Review
**Status**: Production Ready

---

## Appendix: Quick Reference

### Admin Panel URL Structure:
- Dashboard: `/admin`
- Products: `/admin/products-enhanced`
- Component Library: `/admin/component-library`
- Orders: `/admin/orders`
- Archived Orders: `/admin/archived-orders`
- Order Verification: `/admin/order-verification`
- Warehouse: `/admin/warehouse-operations`
- Customers: `/admin/customers`
- Reviews: `/admin/review-moderation`
- Vouchers: `/admin/vouchers`
- Premium Partners: `/admin/premium-partners`
- Inventory Alerts: `/admin/inventory-alerts`
- Staff: `/admin/users`
- Knowledge Base: `/admin/knowledge-base`
- Settings: `/admin/settings`

### Key Database Tables:
- Orders: `orders`, `order_items`
- Products: `products_new`, `component_library`, `product_components`
- Customers: `customer_profiles`, `merchant_registrations`
- Marketing: `vouchers`, `premium_partnerships`
- Reviews: `product_reviews`, `review_images`

### Environment Requirements:
- Node.js 16+
- React 18+
- Supabase account
- Modern web browser

---

*End of Documentation*
