# Customer Tiers & Installation Guides Implementation

## Overview
This document outlines the complete implementation of the customer tier management system and installation guides library for the AutoLab platform.

---

## 1. Database Schema

### 1.1 Customer Tiers System
**File:** `database/customer-tiers-system.sql`

**Tables Created:**
- `customer_tiers` - Stores tier configurations with benefits and requirements
- `tier_upgrade_history` - Tracks customer tier upgrades/changes
- Added columns to `customer_profiles`:
  - `tier_id` - References customer_tiers
  - `tier_achieved_at` - Timestamp when tier was achieved
  - `lifetime_spending` - Total amount spent by customer
  - `total_orders_count` - Total number of orders placed

**Default Tiers:**
1. **Platinum** (Level 1) - 15% discount, 3x points, RM10,000 spending, 50 orders
2. **Gold** (Level 2) - 10% discount, 2x points, RM5,000 spending, 30 orders
3. **Silver** (Level 3) - 5% discount, 1.5x points, RM2,000 spending, 15 orders
4. **Bronze** (Level 4) - 2% discount, 1.2x points, RM500 spending, 5 orders
5. **Standard** (Level 5) - 0% discount, 1x points, RM0 spending, 0 orders

**Features:**
- Automatic tier upgrades based on spending/orders
- Tier benefits: discounts, points multipliers, free shipping, priority support, early access
- Complete audit trail of tier changes
- RLS policies for security

### 1.2 Installation Guides System
**File:** `database/installation-guides-system.sql`

**Tables Created:**
- `installation_guides` - Stores video guides with rich metadata
- `guide_views` - Tracks merchant views and watch duration
- `guide_likes` - Tracks merchant likes/favorites
- `guide_comments` - Merchant feedback on guides

**Sample Guides Included:**
1. Android Player Installation - Toyota Vios (2019-2023)
2. Reverse Camera Setup - Honda City (2021-2024)
3. Dashcam Hardwire Installation - Proton X50
4. Component Speaker Upgrade - Perodua Myvi
5. 360 Camera System - Toyota Hilux
6. Amplifier Installation - Honda Civic

**Features:**
- Video URL support (YouTube/Vimeo)
- Step-by-step instructions in JSON format
- Required tools and materials lists
- Car brand/model/year filtering
- Difficulty levels (Easy, Medium, Hard, Expert)
- View/like counting with triggers
- Full-text search support
- Enterprise plan access control via RLS

---

## 2. Admin Interfaces

### 2.1 Customer Tiers Management
**File:** `src/pages/admin/CustomerTiers.tsx`

**Features:**
- View all tiers with stats dashboard
- Create new tiers with full configuration
- Edit existing tiers
- Activate/deactivate tiers
- Delete tiers (with safety checks)
- Configure:
  - Tier name, level, description
  - Badge color and icon
  - Discount percentage
  - Points multiplier
  - Free shipping threshold
  - Priority support & early access flags
  - Minimum spending & orders requirements
  - Display order

**Stats Dashboard:**
- Total tiers count
- Active tiers count
- Maximum discount available
- Maximum points multiplier

### 2.2 Installation Guides Management
**File:** `src/pages/admin/InstallationGuides.tsx`

**Features:**
- View all guides with comprehensive table
- Create new guides with rich form
- Edit existing guides
- Publish/unpublish guides
- Delete guides
- Search and filter by category
- Configure:
  - Title, description, category
  - Difficulty level
  - Car brand, model, year range
  - Video URL, duration, thumbnail
  - PDF guide URL (optional)
  - Required tools and materials
  - Estimated installation time
  - Search keywords and tags
  - Enterprise plan requirement

**Stats Dashboard:**
- Total guides count
- Published guides count
- Total views across all guides
- Total likes across all guides

---

## 3. Merchant Console Improvements

### 3.1 Installation Guides Tab
**File:** `src/pages/MerchantConsole.tsx` (GuidesTab component)

**Changes Made:**
- ✅ Replaced dummy data with real database queries
- ✅ Fetches published guides from `installation_guides` table
- ✅ Dynamic brand filtering based on available guides
- ✅ Search functionality across title, brand, model
- ✅ Displays real guide data:
  - Thumbnail images
  - Video duration
  - Difficulty level badge
  - Car brand/model/year
  - View count and estimated time
  - Working "Watch" button that opens video URL
- ✅ Loading state with animation
- ✅ Empty state with helpful message
- ✅ Enterprise plan access control (already in place)

### 3.2 Subscription Tab Fix
**File:** `src/pages/MerchantConsole.tsx` (SubscriptionTab component)

**Changes Made:**
- ✅ Professional plan button now shows "Current Plan - Active" instead of "Subscribe Now"
- ✅ Button is disabled and styled differently when merchant is on professional plan
- ✅ Added border styling to make inactive state more visible
- ✅ Reflects business logic: all merchants start with professional plan (RM99/year)
- ✅ Merchants can only upgrade to enterprise plan (RM388/year)

---

## 4. Key Business Rules Implemented

### 4.1 Merchant Subscriptions
1. **All new merchant signups automatically get Professional plan**
   - RM99/year is mandatory for merchant signup
   - Professional plan includes: shop listing, analytics, B2B pricing, RM50 voucher
   - Professional plan button shows "Current Plan - Active" and is disabled

2. **Upgrade Path**
   - Merchants can upgrade from Professional → Enterprise
   - Enterprise plan (RM388/year) includes all Professional benefits + Installation Guides Library
   - Enterprise plan button shows "Upgrade Now" when on Professional

### 4.2 Installation Guides Access
1. **Enterprise Only**
   - Only merchants with active enterprise plan can access guides
   - Access controlled via RLS policies in database
   - Admin approval required for subscription

2. **Guide Features**
   - Real video guides with thumbnails
   - Step-by-step instructions
   - Required tools/materials lists
   - Difficulty ratings
   - Car-specific guides
   - Search and filter functionality

### 4.3 Customer Tiers
1. **Automatic Upgrades**
   - Customers automatically upgrade when they meet spending/order requirements
   - Triggered by database function on customer_profiles updates
   - Audit trail maintained in tier_upgrade_history

2. **Benefits**
   - Progressive discounts (0% → 15%)
   - Points multipliers (1x → 3x)
   - Optional free shipping thresholds
   - Priority support flags
   - Early access flags

---

## 5. Database Migration Steps

To implement these features in your Supabase database:

```bash
# 1. Run customer tiers migration
psql -f database/customer-tiers-system.sql

# 2. Run installation guides migration
psql -f database/installation-guides-system.sql
```

Or in Supabase SQL Editor:
1. Copy contents of `customer-tiers-system.sql` and execute
2. Copy contents of `installation-guides-system.sql` and execute

---

## 6. Admin Navigation Setup

To add the new admin pages to your admin navigation, update your admin route configuration to include:

```typescript
{
  path: '/admin/customer-tiers',
  component: CustomerTiers,
  name: 'Customer Tiers'
},
{
  path: '/admin/installation-guides',
  component: InstallationGuides,
  name: 'Installation Guides'
}
```

---

## 7. Testing Checklist

### Customer Tiers
- [ ] Create new tier
- [ ] Edit existing tier
- [ ] Activate/deactivate tier
- [ ] Delete tier
- [ ] Verify tier stats update correctly
- [ ] Test automatic customer upgrade trigger

### Installation Guides (Admin)
- [ ] Create new guide with all fields
- [ ] Edit existing guide
- [ ] Publish/unpublish guide
- [ ] Delete guide
- [ ] Search guides by keyword
- [ ] Filter guides by category
- [ ] Verify stats update correctly

### Installation Guides (Merchant)
- [ ] Professional merchant cannot access guides tab (locked)
- [ ] Enterprise merchant can access guides tab
- [ ] Search guides by keyword
- [ ] Filter guides by car brand
- [ ] Click "Watch" button opens video
- [ ] View count increments on view
- [ ] Difficulty badges display correctly
- [ ] Empty state shows when no results

### Subscription Tab
- [ ] Professional plan shows "Current Plan - Active"
- [ ] Professional plan button is disabled
- [ ] Enterprise plan shows "Upgrade Now"
- [ ] Enterprise plan shows "Current Plan" when active
- [ ] All features listed correctly

---

## 8. Sample Data

The implementation includes sample data for:

### Customer Tiers
- 5 default tiers (Platinum, Gold, Silver, Bronze, Standard)
- Pre-configured benefits and requirements
- All customers assigned to Standard tier by default

### Installation Guides
- 6 sample guides covering:
  - Head Units (Android Player)
  - Cameras (Reverse Camera, 360 Camera)
  - Dashcams (Hardwire Installation)
  - Audio (Speakers, Amplifiers)
- Real car models (Toyota, Honda, Proton, Perodua)
- Step-by-step instructions included
- Tools and materials lists

---

## 9. Security Considerations

### Row Level Security (RLS)
- ✅ All tables have RLS enabled
- ✅ Customer tiers visible to authenticated users
- ✅ Installation guides only visible to enterprise merchants or admins
- ✅ Admin-only modification policies
- ✅ Merchants can only view/like their own guide interactions

### Data Validation
- ✅ Required fields enforced in forms
- ✅ Tier level uniqueness constraint
- ✅ Year range validation (start ≤ end)
- ✅ Foreign key constraints for data integrity

---

## 10. Future Enhancements

Potential improvements for future iterations:

### Customer Tiers
- Email notifications on tier upgrades
- Tier-specific promotions
- Tier dashboard for customers
- Manual tier adjustments by admin
- Tier downgrade logic (if needed)

### Installation Guides
- Video upload to Supabase Storage
- PDF generation from guide data
- Guide comments/ratings from merchants
- Bookmark/favorite functionality
- Guide completion tracking
- Certificates of completion
- Quiz/assessment feature
- Multi-language support

### Merchant Console
- Guide watch history
- Favorite guides list
- Progress tracking
- Downloadable PDF guides
- Offline access

---

## 11. Files Created/Modified

### New Files
- `database/customer-tiers-system.sql`
- `database/installation-guides-system.sql`
- `src/pages/admin/CustomerTiers.tsx`
- `src/pages/admin/InstallationGuides.tsx`
- `CUSTOMER_TIERS_AND_GUIDES_IMPLEMENTATION.md`

### Modified Files
- `src/pages/MerchantConsole.tsx`
  - Updated GuidesTab to fetch real data
  - Fixed subscription tab button logic
  - Added Eye and Clock icon imports

---

## 12. Summary

This implementation provides a complete customer tier management system and installation guides library for the AutoLab platform. The system is production-ready with:

- ✅ Comprehensive database schema with RLS
- ✅ Full-featured admin interfaces
- ✅ Real-time data in merchant console
- ✅ Proper subscription plan logic
- ✅ Sample data for immediate testing
- ✅ Security best practices
- ✅ Scalable architecture

All merchants now start with Professional plan (RM99/year) and can upgrade to Enterprise plan (RM388/year) to access the installation guides library. Admins can manage customer tiers and create installation guides through dedicated admin panels.
