# Premium Partner / Authorized Reseller System ✅

## Overview

A complete premium partnership system that allows merchant customers to apply for becoming authorized Auto Lab resellers with monthly subscription plans. This provides them with exposure on a public "Find Authorized Shops" page where customers can discover nearby shops for installation and services.

## Features Implemented

### 1. ✅ Database Schema (`database/premium-partner-system.sql`)

**Tables Created:**
- `premium_partnerships` - Main partnership records
- `subscription_payments` - Payment history tracking
- `partner_inquiries` - Customer inquiry tracking

**Key Fields:**
- Business information (name, type, registration)
- Location details (address, city, state, coordinates)
- Contact information (phone, email, social media)
- Subscription details (plan, status, fees, dates)
- Admin approval workflow
- Statistics tracking (views, clicks, inquiries)

**Functions Created:**
- `has_active_partnership(merchant_id)` - Check if merchant has active partnership
- `get_active_partnerships(state, city, service_type)` - Get public shop listings with filters
- `increment_partnership_views(partnership_id)` - Track profile views
- `increment_partnership_clicks(partnership_id)` - Track contact clicks
- `increment_partnership_inquiries(partnership_id)` - Track customer inquiries

**Subscription Plans:**
- **BASIC** (RM 100/month): Standard listing, contact details, basic stats
- **PREMIUM** (RM 200/month): Priority placement, premium badge, social media links, inquiry system
- **FEATURED** (RM 300/month): Top placement (first 3), featured badge, custom logo/cover, detailed analytics

### 2. ✅ Merchant Premium Partner Page (`src/pages/PremiumPartner.tsx`)

**Features:**
- **Access Control**: Only accessible by merchant customers
- **Plan Selection**: Visual cards showing all 3 subscription plans with features
- **Application Form**:
  - Business Information (name, registration, type, description)
  - Contact Details (person, phone, email)
  - Location (Google Maps autocomplete, city, state, postcode)
  - Services Offered (multi-select buttons)
  - Social Media Links (website, Facebook, Instagram)
- **Status Dashboard**:
  - Application status (Pending/Active/Suspended/Cancelled)
  - Rejection reasons (if applicable)
  - Subscription details (plan, monthly fee, validity)
  - Performance statistics (views, clicks, inquiries)
- **Update Capability**: Merchants can update their information anytime

**User Flow:**
1. Merchant logs in and navigates to Premium Partner page
2. Selects desired subscription plan
3. Fills in business details and location
4. Submits application for admin review
5. Receives notification upon approval/rejection
6. Once approved, appears on public Find Shops page

### 3. ✅ Public Find Shops Page (`src/pages/FindShops.tsx`)

**Features:**
- **Smart Filtering**:
  - Search by business name or city
  - Filter by state (all Malaysian states)
  - Filter by services offered
  - Real-time filtering updates
- **Shop Listings**:
  - Grid layout with shop cards
  - Shows business name, type, location, services
  - Displays subscription plan badges (Featured/Premium/Basic)
  - Featured partners highlighted with gold border
- **Shop Details Modal**:
  - Full business information
  - All contact methods (phone, email, website, social media)
  - Services offered
  - Operating hours
  - Location with "Get Directions" button
- **Customer Inquiry System**:
  - Send inquiry form (name, phone, email, message)
  - Tracked in database
  - Merchant receives inquiry count
- **Analytics Tracking**:
  - Automatic view counting when shop details opened
  - Click tracking for all contact methods
  - Inquiry tracking

**User Flow:**
1. Customer navigates to Find Shops page
2. Browses or filters authorized shops by location/services
3. Clicks on shop card to view full details
4. Contacts shop via phone/email or sends inquiry
5. Gets directions to shop location

### 4. ✅ Admin Premium Partners Management (`src/pages/admin/PremiumPartners.tsx`)

**Features:**
- **Statistics Dashboard**:
  - Total partners count
  - Pending review count
  - Active partners count
  - Monthly revenue calculation
- **Application Review**:
  - Approve/Reject pending applications
  - Set subscription duration (1/3/6/12 months)
  - Provide rejection reasons
- **Partner Management**:
  - View all partnerships with full details
  - Filter by status (ALL/PENDING/ACTIVE/SUSPENDED/CANCELLED/EXPIRED)
  - Search by business name, city, or contact person
- **Status Control**:
  - Activate/Suspend partnerships
  - Mark as Featured (top placement)
  - Adjust display priority
- **Analytics View**:
  - Views, clicks, inquiries per partner
  - Monthly fee tracking
  - Contact information

**Admin Actions:**
1. Review new partnership applications
2. Approve with subscription duration selection
3. Reject with detailed reason
4. Manage active partnerships (suspend/activate)
5. Toggle featured status for premium visibility
6. Monitor performance statistics

### 5. ✅ Navigation & Routes

**Routes Added:**
- `/premium-partner` - Merchant premium partner application (merchant only)
- `/find-shops` - Public authorized shops finder (all users)
- `/admin/premium-partners` - Admin partnership management (admin only)

**Navigation Updates:**
- **Public Header**: Added "Find Shops" link (visible to all)
- **Admin Sidebar**: Added "Premium Partners" with Crown icon
- **Mobile Navigation**: Included Find Shops link

## Database Setup

**Run this SQL file in Supabase SQL Editor:**
```sql
database/premium-partner-system.sql
```

This will create:
- All required tables with proper structure
- RLS policies for security
- Helper functions for partnerships
- Subscription plans configuration

## How It Works

### For Merchants:
1. Navigate to Premium Partner page (dashboard menu)
2. Choose subscription plan (Basic/Premium/Featured)
3. Fill application form with business details
4. Submit for admin review
5. Wait for approval notification
6. Once approved, shop appears on Find Shops page
7. View analytics (views, clicks, inquiries)
8. Update information anytime

### For Customers:
1. Visit "Find Shops" page from main navigation
2. Search/filter by location or services needed
3. View shop details and services offered
4. Contact shop via phone, email, or inquiry form
5. Get directions using Google Maps integration

### For Admins:
1. Go to Admin → Premium Partners
2. Review pending applications
3. Approve with duration or reject with reason
4. Manage active partnerships
5. Monitor revenue and statistics
6. Toggle featured status for top placement

## Business Logic

### Application Workflow:
1. **Submit** → Status: PENDING, Approved: false
2. **Admin Approves** → Status: ACTIVE, Approved: true, Set dates
3. **Admin Rejects** → Status: CANCELLED, Approved: false, Add reason
4. **Admin Suspends** → Status: SUSPENDED (can reactivate)

### Visibility Rules:
- Only ACTIVE + Approved + Not Expired partnerships appear on Find Shops
- Featured partnerships show at top
- Priority sorting: Featured → Premium → Basic → Creation date

### Statistics Tracking:
- **Views**: Incremented when shop details modal opened
- **Clicks**: Incremented when contact methods clicked
- **Inquiries**: Incremented when inquiry form submitted

## Subscription Management

**Plans:**
| Plan | Price | Features |
|------|-------|----------|
| Basic | RM 100/month | Standard listing, contact display, basic stats |
| Premium | RM 200/month | Priority placement, premium badge, social links, inquiries |
| Featured | RM 300/month | Top 3 placement, featured badge, logo/cover, advanced analytics |

**Duration Options:**
- 1 Month
- 3 Months
- 6 Months
- 12 Months

**Billing:**
- Tracked in `subscription_payments` table
- Next billing date calculated automatically
- Status changes to EXPIRED when end date passed (manual for now)

## Security (RLS Policies)

**premium_partnerships:**
- Merchants can view/create/update their own partnerships only
- Public can view ACTIVE + approved partnerships only
- Admins have full access

**subscription_payments:**
- Merchants can view their own payment history
- Admins have full access

**partner_inquiries:**
- Anyone can create inquiries
- Partners can view inquiries sent to them
- Admins have full access

## Future Enhancements (Optional)

1. **Automatic Billing**:
   - Stripe/payment gateway integration
   - Auto-renewal before expiration
   - Payment reminders

2. **Enhanced Analytics**:
   - Conversion tracking
   - Inquiry response rate
   - Customer feedback/ratings

3. **Merchant Dashboard**:
   - Dedicated merchant portal
   - View/respond to inquiries
   - Update availability status
   - Upload photos/portfolio

4. **Advanced Features**:
   - Online booking system
   - Service packages/pricing
   - Customer reviews/ratings
   - Photo gallery

5. **Notifications**:
   - Email notifications for approvals/rejections
   - SMS alerts for new inquiries
   - Expiry reminders

## Files Created/Modified

**New Files:**
- `database/premium-partner-system.sql` - Database schema
- `src/pages/PremiumPartner.tsx` - Merchant application page
- `src/pages/FindShops.tsx` - Public shop finder
- `src/pages/admin/PremiumPartners.tsx` - Admin management

**Modified Files:**
- `src/App.tsx` - Added routes
- `src/components/Header.tsx` - Added Find Shops link
- `src/components/admin/AdminLayout.tsx` - Added Premium Partners to sidebar

## Testing Steps

### 1. Database Setup:
```sql
-- Run in Supabase SQL Editor
database/premium-partner-system.sql
```

### 2. Test Merchant Application:
1. Login as merchant customer
2. Go to `/premium-partner`
3. Select a subscription plan
4. Fill application form
5. Submit application
6. Verify status shows "Pending Review"

### 3. Test Admin Review:
1. Login as admin
2. Go to Admin → Premium Partners
3. See pending application
4. Click "Approve"
5. Set duration (e.g., 3 months)
6. Confirm approval
7. Verify status changed to ACTIVE

### 4. Test Public Find Shops:
1. Logout or use incognito
2. Go to `/find-shops`
3. See approved shop in listing
4. Test filters (state, services)
5. Click on shop card
6. Verify all contact methods work
7. Send inquiry
8. Check analytics incremented

### 5. Test Statistics:
1. As merchant, go to Premium Partner page
2. Verify views/clicks/inquiries showing
3. As admin, check revenue calculations
4. Test featured toggle

## Result

✅ **Complete Premium Partner System**
- Merchant application process with admin approval
- Public shop finder with smart filtering
- Analytics tracking and revenue monitoring
- Three-tier subscription plans
- Full CRUD operations for admins
- Secure with RLS policies
- Mobile responsive design

The system is production-ready and provides a complete monetization opportunity through merchant subscriptions while adding value for customers through authorized shop discovery!
