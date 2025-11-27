# Automot Hub - Project Overview

## Table of Contents
1. [Project Summary](#project-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [User Roles & Authentication](#user-roles--authentication)
5. [Admin Dashboard Features](#admin-dashboard-features)
6. [Customer/User Features](#customeruser-features)
7. [Merchant Features](#merchant-features)
8. [Database Schema](#database-schema)
9. [Key Features](#key-features)

---

## Project Summary

**Automot Hub** is a comprehensive automotive parts e-commerce platform built with React, TypeScript, and Supabase. The platform serves multiple user types including regular customers, merchants, staff, and administrators with a full-featured online shopping experience for automotive components.

**Business Focus:**
- Automotive parts and components retail
- B2C and B2B (merchant) operations
- Multi-tier customer management
- Advanced inventory and warehouse operations
- Payment verification system

---

## Technology Stack

### Frontend
- **Framework:** React 18.3.1
- **Language:** TypeScript 5.8.3
- **Build Tool:** Vite 5.4.19
- **UI Library:** shadcn/ui + Radix UI components
- **Styling:** Tailwind CSS 3.4.17
- **Routing:** React Router DOM 6.30.1
- **State Management:** @tanstack/react-query 5.83.0
- **Forms:** React Hook Form 7.61.1 + Zod 3.25.76
- **Animations:** Framer Motion 12.23.12

### Backend & Database
- **Backend:** Supabase 2.56.1
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage

### Additional Tools
- **AI Integration:** OpenAI 5.20.0
- **PDF Processing:** pdf-parse 1.1.1
- **Charts:** Recharts 2.15.4
- **Notifications:** Sonner 1.7.4
- **Date Handling:** date-fns 3.6.0

---

## Architecture Overview

### Application Structure
```
src/
├── pages/              # Page components
│   ├── admin/         # Admin dashboard pages
│   ├── Home.tsx       # Landing page
│   ├── Catalog.tsx    # Product catalog
│   ├── Cart.tsx       # Shopping cart
│   ├── MyOrders.tsx   # Customer orders
│   └── ...
├── components/        # Reusable components
│   ├── admin/        # Admin-specific components
│   ├── ui/           # UI component library
│   └── ...
├── hooks/            # Custom React hooks
├── integrations/     # Third-party integrations (Supabase)
├── lib/              # Utility functions
├── services/         # Business logic services
└── types/            # TypeScript type definitions
```

### Key Providers & Context
1. **AuthProvider** - User authentication state
2. **CartProvider** - Shopping cart management (database-backed)
3. **PricingProvider** - Dynamic pricing based on customer type
4. **QueryClientProvider** - React Query for data fetching

---

## User Roles & Authentication

### Role System
The platform supports 4 distinct user roles defined in the database:

1. **Customer** - Regular shoppers
2. **Merchant** - Business partners with special pricing
3. **Staff** - Warehouse and operations personnel
4. **Admin** - System administrators

### Authentication Flow
- Phone-based authentication (Supabase Auth)
- Password-based login
- Username support during registration
- Customer profile creation on signup
- Role-based access control (RBAC)

### Access Control
- **Admin Routes:** Protected by `ProtectedAdminRoute` component
- **Allowed Roles:** Configurable per route (default: admin, staff)
- **Fallback:** Unauthorized users redirected to login or home

---

## Admin Dashboard Features

### 1. Dashboard (Main Overview)
**Path:** `/admin`

**Features:**
- **Key Metrics:**
  - Total Revenue (MYR)
  - Total Orders count
  - Customer count
  - Product count
- **Recent Orders:** Last 5 orders with:
  - Order number, status, customer info
  - Payment details
  - Quick navigation to order details
- **Visual Stats:** Card-based KPI display

---

### 2. Products Management
**Path:** `/admin/products`

**Features:**
- **Product CRUD Operations:**
  - Create, Read, Update, Delete products
  - Product attributes: SKU, name, description, brand, model
  - Pricing: Regular price, merchant price
  - Stock management: Stock on hand, reorder level
  - Product specifications: Weight, dimensions, year range
  - SEO: Keywords array, slug
- **Product Variants:** Support for product variations
- **Product Images:** Multiple images per product
- **Category Assignment:** Link products to categories
- **Search & Filter:** Real-time product search
- **Status Toggle:** Active/inactive products

---

### 3. Enhanced Products Management
**Path:** `/admin/products-advanced` and `/admin/products-enhanced`

**Advanced Features:**
- Enhanced product editor
- Advanced variant management
- SEO keyword optimization
- Bulk operations
- Component library integration

---

### 4. Orders Management
**Path:** `/admin/orders`

**Features:**
- **Order List View:**
  - Comprehensive order table with all details
  - Order number, customer info, payment state
  - Order status, total amount
  - Created date, delivery method
- **Order Status Management:**
  - PLACED → PENDING_PAYMENT → PAYMENT_PROCESSING
  - PAYMENT_VERIFIED → PROCESSING → PACKING
  - DISPATCHED → DELIVERED → COMPLETED
  - Support for CANCELLED, REJECTED states
- **Payment State Tracking:**
  - UNPAID, SUBMITTED, APPROVED, REJECTED, ON_CREDIT
- **Order Details:**
  - Full order breakdown with line items
  - Customer information
  - Delivery address
  - Payment gateway responses
  - Order notes
- **Invoice Generation:**
  - HTML to PDF invoice creation
  - Download capability
- **Search & Filtering:**
  - Search by order number, customer name
  - Filter by status
- **Responsive Design:**
  - Desktop table view
  - Mobile card view

---

### 5. Archived Orders
**Path:** `/admin/archived-orders`

**Features:**
- View completed orders
- Historical order data
- Search and filter archived orders
- Order analytics

---

### 6. Order Verification
**Path:** `/admin/order-verification`

**Features:**
- **Payment Verification Queue:**
  - Orders pending payment verification
  - Payment proof review
  - Payment gateway response analysis
- **Approval/Rejection:**
  - Approve verified payments
  - Reject fraudulent/invalid payments
  - Add verification notes
- **Order Processing:**
  - Set estimated delivery dates
  - Add processing notes
  - Transition to warehouse
- **Real-time Updates:**
  - Fetch pending orders via RPC function
  - Live status updates

---

### 7. Warehouse Operations
**Path:** `/admin/warehouse-operations`

**Features:**
- **Order Status Workflow:**
  - PROCESSING → WAREHOUSE_ASSIGNED
  - PICKING → PACKING → READY_FOR_DELIVERY
  - OUT_FOR_DELIVERY → DELIVERED
- **Workflow Tabs:**
  - Tab-based interface for each status
  - Drag-and-drop status updates
- **Order Assignment:**
  - Assign orders to warehouse staff
  - Track assigned personnel
- **Order Details:**
  - Full order item breakdown
  - Customer delivery information
  - Internal notes system
  - Processing notes
- **Batch Operations:**
  - Update multiple orders
  - Bulk status changes
- **Visual Status Tracking:**
  - Color-coded status badges
  - Progress indicators
  - Status descriptions with icons

---

### 8. Inventory Alerts
**Path:** `/admin/inventory-alerts`

**Features:**
- Low stock warnings
- Reorder level monitoring
- Stock movement tracking
- Inventory reports

---

### 9. Customers Management
**Path:** `/admin/customers`

**Features:**
- **Customer Database:**
  - Full customer profile listing
  - Customer type management (normal, merchant)
  - Contact information
  - Account status
- **Customer Type System:**
  - Normal customers
  - Merchant customers
  - Custom customer types
  - Pricing tier assignment
- **Customer Details:**
  - Personal information
  - Order history
  - Address book
  - Preferences
- **Merchant Applications:**
  - Review merchant registration requests
  - Approve/reject applications
  - Assign merchant codes
  - Business information verification
- **Search & Filter:**
  - Search by name, phone, email
  - Filter by customer type
  - Sort by various fields

---

### 10. Voucher Management
**Path:** `/admin/vouchers`

**Features:**
- **Voucher Creation:**
  - Generate unique voucher codes
  - Set discount type (percentage or fixed amount)
  - Configure discount value
  - Maximum discount caps
  - Minimum purchase requirements
- **Usage Controls:**
  - Total usage limit
  - Per-user usage limit
  - Customer type restrictions (ALL, NORMAL, MERCHANT)
  - Validity dates (from/to)
- **Voucher Management:**
  - Edit existing vouchers
  - Toggle active/inactive status
  - Track usage statistics
  - Delete vouchers
- **Admin Notes:**
  - Internal notes for vouchers
  - Usage tracking
  - Performance monitoring

---

### 11. Premium Partners Management
**Path:** `/admin/premium-partners`

**Features:**
- Manage merchant partner listings
- Featured shop management
- Partner verification
- Shop profile moderation

---

### 12. Knowledge Base
**Path:** `/admin/knowledge-base`

**Features:**
- **Content Management:**
  - Create manual knowledge base entries
  - Title, content, category, tags
  - Customer scenarios
  - Related questions
  - Key points highlighting
- **AI-Powered PDF Processing:**
  - Upload PDF documents
  - Automatic AI content extraction
  - Page-by-page processing
  - Confidence scoring
  - AI-generated summaries
- **Document Management:**
  - PDF library
  - Document metadata
  - Processing status tracking
  - File size and page count
- **Content Organization:**
  - Categories: Product Info, Shipping, Support, Policies, etc.
  - Tag system
  - Priority levels
  - Approval workflow
- **Search & Filter:**
  - Search by title/content
  - Filter by category
  - Show approved only
  - Sort by various criteria
- **AI Agent Integration:**
  - Customer service AI demo
  - Query knowledge base
  - Automated responses

---

### 13. User Management
**Path:** `/admin/users`

**Features:**
- System user administration
- Role assignment
- User permissions
- Account status management

---

### 14. Settings
**Path:** `/admin/settings`

**Features:**
- System configuration
- Store settings
- Payment gateway configuration
- Shipping settings
- Tax configuration
- Email/SMS settings

---

### 15. Component Library Pro
**Path:** `/admin/component-library`

**Features:**
- Automotive component catalog
- Component specifications
- Cross-reference system
- Component relationships

---

## Customer/User Features

### 1. Home Page
**Path:** `/`

**Features:**
- **Hero Section:**
  - Search functionality with auto-complete
  - Featured products showcase
  - Category quick links
- **Company Information:**
  - About section with business history (17+ years)
  - Mission, vision, values
  - Company statistics
- **Product Categories:**
  - Visual category cards
  - Quick navigation to catalog
- **Features Showcase:**
  - Quality assurance
  - Fast shipping
  - Customer support
  - Warranty information
- **Testimonials:**
  - Customer reviews
  - Success stories
- **Responsive Design:**
  - Mobile-optimized
  - Smooth animations
  - Scroll effects

---

### 2. Product Catalog
**Path:** `/catalog`

**Features:**
- **Product Grid:**
  - Responsive product cards
  - Product images
  - Price display (dynamic based on customer type)
  - Brand and model information
  - Quick view functionality
- **Search & Filters:**
  - Real-time search
  - Brand filtering
  - Category filtering
  - Price range filters
- **Pricing Display:**
  - Normal price for regular customers
  - Merchant price for merchant customers
  - Automatic pricing based on logged-in user type
- **Pagination:**
  - Mobile: 12 items per page with pagination
  - Desktop: Infinite scroll/load more
- **Product Details:**
  - Click to view full details
  - Multiple product images
  - Specifications
  - Stock availability

---

### 3. Product Details
**Path:** `/product/:id`

**Features:**
- Detailed product information
- Image gallery
- Specifications
- Add to cart functionality
- Related products
- Reviews and ratings

---

### 4. Shopping Cart
**Path:** `/cart`

**Features:**
- **Cart Management:**
  - Database-backed cart (persists across sessions)
  - Guest cart support (with guest_key)
  - Quantity adjustment (+/-)
  - Remove items
  - Item selection for checkout
- **Bulk Actions:**
  - Select all items
  - Select specific items for checkout
  - Clear cart
- **Price Calculations:**
  - Item subtotals
  - Cart subtotal
  - Tax calculation
  - Shipping fees
  - Discount application
  - Grand total
- **Checkout Flow:**
  - Checkout modal
  - Address selection/creation
  - Payment method selection
  - Order review
  - Place order
- **Authentication:**
  - Login required
  - Redirect to auth if not logged in
- **Responsive Design:**
  - Mobile-optimized cart view
  - Desktop table layout

---

### 5. My Orders
**Path:** `/my-orders`

**Features:**
- **Order History:**
  - List of all customer orders
  - Order number, date, status
  - Total amount
  - Payment state
- **Order Details Modal:**
  - Full order breakdown
  - Order items with quantities and prices
  - Delivery information
  - Payment details
  - Order status tracking
  - Voucher information (if applied)
- **Order Status Tracking:**
  - Real-time status updates
  - Status badges
  - Delivery tracking (when applicable)
- **Expandable Orders:**
  - Click to expand order details
  - Deep linking support (expand specific order)
- **Search & Filter:**
  - Search orders
  - Filter by status

---

### 6. My Vouchers
**Path:** `/my-vouchers`

**Features:**
- **Available Vouchers:**
  - View all vouchers available to the customer
  - Based on customer type (normal/merchant)
  - Active vouchers only
- **Voucher Information:**
  - Voucher code
  - Discount type and value
  - Minimum purchase requirement
  - Maximum discount cap
  - Expiry date
  - Usage limits
  - Times used by customer
- **Voucher Actions:**
  - Copy voucher code to clipboard
  - Apply to cart/checkout
  - View terms and conditions
- **Voucher Eligibility:**
  - Check if customer can still use voucher
  - Usage count tracking
  - Eligibility indicators

---

### 7. Find Shops
**Path:** `/find-shops`

**Features:**
- **Shop Directory:**
  - Browse merchant partner shops
  - Shop listings with details
- **Search & Filters:**
  - Search by shop name
  - Filter by state (Malaysian states)
  - Filter by services offered
  - Business type filtering
- **Shop Information:**
  - Business name and type
  - Contact information (phone, email)
  - Address and location
  - Operating hours
  - Services offered
  - Subscription plan (basic/premium/featured)
  - Logo and cover images
  - Shop photos
  - View count
- **Shop Details:**
  - View full shop profile
  - Social media links (website, Facebook, Instagram)
  - Featured badge for premium partners
  - Display priority sorting
- **Inquiry System:**
  - Contact shop directly
  - Inquiry form
  - Customer message to shop

---

### 8. Shop Details
**Path:** `/shop/:shopId`

**Features:**
- Detailed shop profile
- Photo gallery
- Service listings
- Contact form
- Map integration
- Operating hours
- Customer reviews

---

### 9. Payment Gateway
**Path:** `/payment-gateway`

**Features:**
- Payment processing
- Multiple payment methods
- Payment proof upload
- Transaction confirmation

---

### 10. Authentication
**Path:** `/auth`

**Features:**
- **Login:**
  - Phone + password login
  - Session management
- **Registration:**
  - Phone number registration
  - Username creation
  - Password setup
  - Auto customer profile creation
- **User Profile:**
  - View/edit profile
  - Change password
  - Manage addresses

---

## Merchant Features

### 1. Merchant Dashboard
**Path:** `/merchant/wallet`

**Features:**
- **Wallet Overview:**
  - Points balance
  - Credit balance
  - Total earned/spent points
- **Merchant Profile:**
  - Company information
  - Business type
  - Merchant tier
  - Pricing type
  - Credit limit
- **Registration Status:**
  - View application status
  - Track approval process
- **Wallet Transactions:**
  - Transaction history
  - Points earned/spent
  - Credit usage
  - Balance tracking
- **Order Statistics:**
  - Total orders
  - Order value
  - Savings from merchant pricing
- **Promotions:**
  - View exclusive merchant promotions
  - Special offers
- **Favorites:**
  - Saved products
  - Quick reorder

---

### 2. Merchant Promotions
**Path:** `/merchant/promotions`

**Features:**
- View merchant-specific promotions
- Exclusive deals
- Bulk order discounts
- Seasonal offers

---

### 3. Merchant Registration
**Path:** `/merchant-register`

**Features:**
- **Registration Form:**
  - Company name
  - Business registration number
  - Tax ID
  - Business type
  - Address
  - Contact information
- **Merchant Code System:**
  - Enter merchant code
  - Code validation
  - Merchant tier assignment
- **Application Tracking:**
  - Submission confirmation
  - Status updates
  - Admin review process

---

### 4. Premium Partner Program
**Path:** `/premium-partner`

**Features:**
- Premium partner registration
- Enhanced shop listings
- Marketing tools
- Analytics dashboard

---

## Database Schema

### Core Tables

#### 1. **profiles**
User authentication profiles
- id, full_name, phone_e164
- role: customer | merchant | staff | admin
- credit_limit, is_phone_verified
- tenant_id (multi-tenancy support)

#### 2. **customer_profiles**
Extended customer information
- user_id (FK to profiles)
- username, email, phone
- customer_type: normal | merchant
- date_of_birth, gender
- address (JSONB)
- preferences (JSONB)
- is_active

#### 3. **products**
Product catalog
- name, slug, description, sku
- brand, model, year_from, year_to
- price_regular, price_merchant
- stock_on_hand, reorder_level
- weight_kg, dimensions_cm
- keywords (array)
- category_id (FK)
- active status

#### 4. **product_variants**
Product variations
- product_id (FK)
- name, sku
- price_regular, price_merchant
- stock_on_hand
- components (JSONB)

#### 5. **product_images**
Product image gallery
- product_id (FK)
- url, alt_text
- is_primary, sort_order

#### 6. **categories**
Product categories
- name, slug, description
- parent_id (self-referencing)
- image_url, sort_order
- active status

#### 7. **orders**
Customer orders
- order_no, user_id (FK)
- address_id (FK)
- status (enum): PLACED, PENDING_VERIFICATION, VERIFIED, PACKING, DISPATCHED, DELIVERED, COMPLETED, CANCELLED, REJECTED
- payment_state (enum): UNPAID, SUBMITTED, APPROVED, REJECTED, ON_CREDIT
- subtotal, tax, discount, shipping_fee, total
- currency (default: MYR)
- notes

#### 8. **order_items**
Order line items
- order_id (FK)
- product_id (FK)
- quantity
- unit_price, total_price

#### 9. **carts**
Shopping carts
- user_id (FK) or guest_key
- status: active | checkout | abandoned
- tenant_id

#### 10. **cart_items**
Cart line items
- cart_id (FK)
- product_id (FK)
- quantity, unit_price

#### 11. **addresses**
Customer addresses
- user_id (FK)
- label, line1, line2
- city, state, postcode, country
- is_default

#### 12. **vouchers**
Discount vouchers
- code, name, description
- discount_type: PERCENTAGE | FIXED_AMOUNT
- discount_value
- max_discount_amount
- min_purchase_amount
- max_usage_total, max_usage_per_user
- customer_type_restriction: ALL | NORMAL | MERCHANT
- valid_from, valid_until
- is_active, current_usage_count
- admin_notes

#### 13. **payment_proofs**
Payment verification
- order_id (FK)
- url (file upload)
- original_filename
- result: approved | rejected
- notes
- reviewed_by (FK), reviewed_at

#### 14. **stock_movements**
Inventory tracking
- product_id (FK)
- type: RECEIPT | SALE | ADJUSTMENT | RESERVATION | RELEASE
- quantity
- reference, notes

#### 15. **merchant_registrations**
Merchant applications
- customer_id (FK)
- code_id (FK to merchant_codes)
- company_name
- business_registration_no, tax_id
- business_type
- address
- status: pending | approved | rejected
- rejection_reason

#### 16. **kb_entries** (Knowledge Base Entries)
Customer support content
- title, content
- category, tags (array)
- source: manual | pdf_ai_generated | imported
- source_document_id (FK)
- page_number
- confidence_score
- ai_generated, is_approved
- priority
- customer_scenarios (array)
- related_questions (array)
- key_points (array)

#### 17. **kb_documents**
Knowledge base documents (PDFs)
- title, description
- file_name, file_size
- total_pages
- ai_processing_status: pending | processing | completed | failed

---

## Key Features

### 1. Multi-Role System
- 4 distinct user roles with different dashboards
- Role-based access control
- Dynamic UI based on role

### 2. Dynamic Pricing
- Different prices for normal vs merchant customers
- Automatic price display based on logged-in user
- Merchant tier system

### 3. Advanced Order Management
- Multi-stage order workflow
- Payment verification system
- Warehouse operations integration
- Real-time status tracking

### 4. Inventory Management
- Stock tracking
- Low stock alerts
- Reorder level management
- Stock movement history

### 5. Voucher System
- Flexible discount creation
- Customer type targeting
- Usage limits and tracking
- Minimum purchase requirements

### 6. Knowledge Base with AI
- PDF upload and processing
- AI-powered content extraction
- OpenAI integration
- Customer service automation

### 7. Merchant Partner Program
- Merchant registration system
- Merchant code verification
- Points and credit system
- Exclusive promotions

### 8. Shop Directory
- Merchant shop listings
- Subscription tiers (basic/premium/featured)
- Location-based search
- Inquiry system

### 9. Multi-Tenancy Support
- tenant_id field across tables
- Support for multiple stores/businesses
- Data isolation

### 10. Responsive Design
- Mobile-first approach
- Desktop and mobile optimized views
- Adaptive UI components

### 11. Performance Optimizations
- React Query for caching
- Database indexes
- Optimized queries
- Image optimization

### 12. Security Features
- Phone-based authentication
- Password hashing (Supabase Auth)
- Role-based authorization
- Protected routes
- SQL injection prevention (Supabase)

---

## API & Database Functions

### RPC Functions (Database)
1. `get_admin_orders` - Fetch orders for admin with enhanced data
2. `get_orders_pending_verification` - Get orders awaiting payment verification
3. `get_available_vouchers_for_customer` - Fetch eligible vouchers for a customer
4. And more...

### Database Views
1. `admin_orders_enhanced` - Enhanced order view with customer data
2. And more...

---

## Environment & Configuration

### Required Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- OpenAI API key (for knowledge base AI features)

### Build & Development
- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Type Check:** `npm run type-check`
- **Lint:** `npm run lint`

---

## Deployment
- Built with Vite for optimal production builds
- Deployable to Lovable, Vercel, Netlify, or any static host
- Supabase backend (cloud-hosted)

---

## Project Statistics

- **Years of Business:** 17+
- **Business Partners:** 500+
- **Product Categories:** 100+
- **Happy Customers:** 5000+

---

## Future Enhancements

Based on the codebase structure, potential areas for expansion:
1. Mobile app development (React Native)
2. Advanced analytics dashboard
3. Real-time chat support
4. Email/SMS notifications
5. Multi-language support
6. Advanced reporting tools
7. API for third-party integrations

---

## Notes

- The project follows modern React best practices
- TypeScript for type safety
- Component-driven architecture
- shadcn/ui for consistent design system
- Supabase for backend as a service
- Real-time capabilities ready (Supabase realtime subscriptions)

---

**Last Updated:** 2025-10-05
**Project Status:** Active Development
**Version:** 0.0.0 (as per package.json)
