# AutoLab System Setup Guide

Complete setup guide for the AutoLab automotive accessories wholesale platform.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [Admin Authentication](#admin-authentication)
4. [Customer Tiers System](#customer-tiers-system)
5. [Installation Guides](#installation-guides)
6. [Premium Partners](#premium-partners)
7. [Points & Voucher System](#points--voucher-system)
8. [Product Reviews](#product-reviews)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Git

### Installation
```bash
npm install
npm run dev
```

### Environment Variables
Create `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Database Setup

### Required SQL Scripts (Run in order)

1. **Admin Authentication System**
   ```sql
   -- File: database/setup-admin-auth-system.sql
   -- Creates admin_profiles table and login functions
   ```

2. **Premium Partnerships**
   ```sql
   -- File: database/premium-partner-system.sql
   -- Creates partnership tables and policies
   ```

3. **Customer Tiers System**
   ```sql
   -- File: database/customer-tiers-system.sql
   -- Creates tier tables with 5 default tiers
   ```

4. **Installation Guides**
   ```sql
   -- File: database/installation-guides-system.sql
   -- Creates guide tables for enterprise merchants
   ```

5. **Product Reviews**
   ```sql
   -- File: database/product-reviews-migration.sql
   -- Creates review system with moderation
   ```

6. **Voucher System**
   ```sql
   -- File: database/voucher-system.sql
   -- Creates voucher tables and validation functions
   ```

### RLS Policy Fixes (If admin features don't work)

Since admins use localStorage authentication (not Supabase Auth), RLS policies need to be disabled:

```sql
-- File: database/fix-customer-tiers-rls-NO-RLS.sql
-- Disables RLS for customer_tiers table

-- File: database/fix-installation-guides-rls.sql
-- Disables RLS for installation_guides tables

-- File: database/fix-premium-partnership-rls.sql
-- Disables RLS for premium_partnerships tables

-- File: database/fix-subscription-plan-constraint-v3.sql
-- Fixes subscription plan constraint for professional/enterprise
```

---

## Admin Authentication

**Login URL:** `/auth` → Click "Admin" tab

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change password immediately after first login!**

### How It Works
- Admins use **username/password** (not Supabase Auth)
- Credentials stored in `admin_profiles` table
- Session stored in **localStorage**
- Protected by `ProtectedAdminRoute` component

### Admin Roles
- `admin` - Full access
- `manager` - Most features
- `staff` - Limited access

---

## Customer Tiers System

### 5 Tier Levels
1. **Platinum** - RM5,000/month spending
2. **Gold** - RM3,000/month spending
3. **Silver** - RM1,500/month spending
4. **Bronze** - RM500/month spending
5. **Standard** - RM0/month (default)

### Benefits Per Tier
- **Discount percentage** (0-15%)
- **Points multiplier** (1.0x - 3.0x)
- **Free shipping threshold**
- **Priority support**
- **Early access to new products**

### Admin Panel
- **Location:** `/admin/customer-tiers`
- **Features:**
  - Edit tier requirements (monthly spending)
  - Configure benefits (discount, points)
  - Toggle active/inactive
  - Set display order

### How Tier Upgrades Work
- **Automatic upgrade** when monthly spending meets threshold
- **Monthly reset** on 1st of each month
- Triggers and functions handle tier progression
- History tracked in `tier_upgrade_history` table

---

## Installation Guides

### Purpose
Video installation guides for **enterprise merchants only** (Professional plan merchants can't access).

### Admin Panel
- **Location:** `/admin/installation-guides`
- **Add Guide:**
  - Title *
  - Description
  - Category (Head Unit, Camera, Dashcam, etc.)
  - Difficulty (Easy/Medium/Hard)
  - Car Brand & Model
  - Video URL * (YouTube/Vimeo)
  - Thumbnail Image URL
  - Published status

### Merchant Access
- Enterprise merchants see guides in **Merchant Console → Guides** tab
- Guides filtered by car model, category, difficulty
- View count and engagement tracked

---

## Premium Partners

### Subscription Plans
- **Professional** - RM99/year (basic features)
- **Enterprise** - RM388/year (includes installation guides)

### Admin Panel
- **Location:** `/admin/premium-partners`

### Features
- **Edit Subscription** - Full manual control:
  - Change plan (professional ↔ enterprise)
  - Set start/end dates
  - Change status (ACTIVE, SUSPENDED, PENDING, etc.)
  - Adjust yearly fee
  - Toggle admin approval
  - Mark as featured

- **Extend Subscription** - Quick renewal
  - Add months to existing subscription
  - Record payment details
  - Log renewal history

- **View Renewal History** - Track all subscription changes

### Merchant Signup Flow
1. Merchant signs up → Automatically gets **Professional plan**
2. Admin reviews and approves partnership
3. Merchant can upgrade to Enterprise in their console
4. Admin can manually adjust subscription details anytime

---

## Points & Voucher System

### How Points Work

**Earning Points:**
- 1 point = RM1 spent
- Multiplied by tier level:
  - Standard: 1.0x
  - Bronze: 1.2x
  - Silver: 1.5x
  - Gold: 2.0x
  - Platinum: 3.0x

**Using Points:**
- **Vouchers:** Redeem points for discount vouchers
  - 500 pts = RM10 OFF
  - 1,000 pts = RM25 OFF
  - 2,000 pts = RM50 OFF
- **Free Shipping:** Some tiers get free shipping
- **Free Products:** Special promotions

### Voucher System

**Types:**
- Percentage discount (e.g., 10% OFF)
- Fixed amount (e.g., RM50 OFF)
- Free shipping
- Points redemption vouchers

**Validation:**
- Min order amount requirement
- Max discount cap
- Usage limits per customer
- Expiry date checking
- Category restrictions

---

## Product Reviews

### Features
- **Star rating** (1-5 stars)
- **Review text** (optional)
- **Review images** (up to 3 photos)
- **Admin moderation** (approve/reject)

### Admin Panel
- **Location:** `/admin/review-moderation`
- **Actions:**
  - Approve pending reviews
  - Reject with reason
  - Delete inappropriate reviews
  - View all reviews by status

### RLS Policies
- Customers can create reviews
- Only approved reviews visible publicly
- Admins see all reviews

---

## Troubleshooting

### Admin Features Not Working

**Symptom:** Can't edit tiers, guides, or partnerships

**Solution:** Run RLS fix scripts
```sql
-- Disable RLS on admin tables
\i database/fix-customer-tiers-rls-NO-RLS.sql
\i database/fix-installation-guides-rls.sql
\i database/fix-premium-partnership-rls.sql
```

### Subscription Plan Error

**Error:** "new row violates constraint subscription_plan_check"

**Solution:** Update constraint
```sql
\i database/fix-subscription-plan-constraint-v3.sql
```

### Tier Not Upgrading Automatically

**Check:**
1. Monthly spending tracked correctly?
2. Trigger exists? `SELECT * FROM pg_trigger WHERE tgname = 'trigger_check_customer_tier';`
3. Tier requirements set? Check `customer_tiers` table

### Reviews Not Showing

**Check:**
1. Reviews approved? Status = 'approved'
2. RLS policies allow SELECT?
3. Check `product_reviews` table directly

---

## Admin Panel Navigation

- **Dashboard** - `/admin`
- **Products** - `/admin/products`
- **Orders** - `/admin/orders`
- **Customers** - `/admin/customers`
- **Customer Tiers** - `/admin/customer-tiers` ⭐
- **Premium Partners** - `/admin/premium-partners` ⭐
- **Installation Guides** - `/admin/installation-guides` ⭐
- **Vouchers** - `/admin/voucher-management`
- **Reviews** - `/admin/review-moderation` ⭐
- **Warehouse** - `/admin/warehouse-operations`
- **Settings** - `/admin/settings`

---

## Key Database Tables

### Core Tables
- `products` - Product catalog
- `orders` - Customer orders
- `customer_profiles` - Customer data
- `admin_profiles` - Admin users

### Tier System
- `customer_tiers` - Tier definitions
- `tier_upgrade_history` - Tier changes

### Partners
- `premium_partnerships` - Merchant subscriptions
- `partnership_renewal_history` - Renewal tracking

### Guides
- `installation_guides` - Video guides
- `guide_views` - View tracking
- `guide_likes` - Engagement

### Reviews
- `product_reviews` - Customer reviews
- `review_images` - Review photos

### Vouchers
- `vouchers` - Voucher definitions
- `voucher_usage` - Usage tracking
- `points_transactions` - Points history

---

## Monthly Maintenance

### 1st of Each Month
- **Customer tier spending resets** (automatic via trigger)
- **Check expired subscriptions** (mark as EXPIRED)
- **Review voucher expiries**

### Regular Tasks
- **Approve pending reviews**
- **Review partnership applications**
- **Monitor tier progression**
- **Check guide engagement**

---

## Production Deployment

1. **Environment Variables**
   - Set production Supabase URL
   - Use production anon key
   - Enable RLS on all tables

2. **Database**
   - Run all migration scripts
   - Create admin user
   - Set up cron jobs for monthly reset

3. **Security**
   - Change default admin password
   - Review RLS policies
   - Enable rate limiting
   - Set up backup schedule

4. **Build**
   ```bash
   npm run build
   npm run preview  # Test production build
   ```

---

## Support

For issues or questions:
1. Check this guide first
2. Review SQL error messages
3. Check Supabase logs
4. Verify RLS policies in Supabase dashboard

---

**Last Updated:** November 2024
**Version:** 2.0
