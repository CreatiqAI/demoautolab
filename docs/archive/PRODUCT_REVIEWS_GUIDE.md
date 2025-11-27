# Product Reviews & Comments System

## Overview

A comprehensive customer review and rating system has been integrated into the AutoMot Hub platform. This feature allows customers to leave detailed reviews with star ratings for products, and enables other customers to find helpful reviews.

## Features

### For Customers:
- ⭐ **5-Star Rating System** - Rate products from 1 to 5 stars
- 📝 **Written Reviews** - Add detailed feedback with optional title
- ✅ **Verified Purchase Badge** - Automatically marked for authenticated users
- 👍 **Helpful Votes** - Mark reviews as helpful to surface quality feedback
- 🔒 **Moderation** - All reviews are pending admin approval before going live
- 📧 **Guest & Authenticated Reviews** - Both logged-in and guest users can review

### For Admins:
- ✅ **Review Moderation** - Approve, reject, or edit reviews before publication
- 📊 **Review Statistics** - Average ratings, rating distribution, total reviews
- 🎯 **Verified Purchase Tracking** - Identify reviews from actual customers

## Database Schema

### Tables Created

1. **`product_reviews`** - Main reviews table
   - Stores customer name, email, rating (1-5), title, comment
   - Tracks status (pending/approved/rejected)
   - Helpful vote count and verified purchase status
   - Supports both authenticated and guest users

2. **`review_helpful_votes`** - Tracks "helpful" votes
   - Prevents duplicate votes from same user
   - Uses user email or session identifier

### Database Functions

1. **`get_product_review_stats(product_id)`**
   - Returns total reviews, average rating, rating distribution (5★ to 1★)

2. **`get_product_reviews(product_id, limit, offset, sort_by)`**
   - Returns paginated reviews with sorting options:
     - `recent` - Most recent first (default)
     - `rating_high` - Highest rated first
     - `rating_low` - Lowest rated first
     - `helpful` - Most helpful first

3. **`mark_review_helpful(review_id, user_identifier)`**
   - Records helpful vote and prevents duplicates
   - Updates helpful_count automatically

## Installation & Setup

### Step 1: Run Database Migration

You need to execute the SQL migration to create the necessary tables and functions.

**Option A: Using Supabase Dashboard**
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the entire contents of `database/product-reviews-migration.sql`
4. Paste and execute the SQL

**Option B: Using Supabase CLI**
```bash
# Make sure you're connected to your Supabase project
npx supabase db push

# Or run the migration file directly
psql -h YOUR_DB_HOST -U postgres -d postgres -f database/product-reviews-migration.sql
```

### Step 2: Update TypeScript Types (Already Done)

The TypeScript types in `src/integrations/supabase/types.ts` have been updated with:
- `product_reviews` table types (Row, Insert, Update)
- `review_helpful_votes` table types

### Step 3: No Additional Dependencies Required

All UI components use existing dependencies:
- React
- Lucide icons (already installed)
- Shadcn UI components (already installed)

## Components

### `<ReviewsSection />`

Displays all approved reviews for a product with statistics and filtering.

**Props:**
- `productId: string` - The product ID to fetch reviews for
- `onWriteReview: () => void` - Callback when user clicks "Write a Review"

**Features:**
- Average rating display with star visualization
- Rating distribution bar chart (5★ to 1★)
- Review list with sorting options
- Helpful voting system
- Verified purchase badges
- Empty state when no reviews exist

**Usage:**
```tsx
<ReviewsSection
  productId={product.id}
  onWriteReview={() => setShowReviewForm(true)}
/>
```

### `<ReviewForm />`

Form for customers to submit new reviews.

**Props:**
- `productId: string` - The product being reviewed
- `onSuccess?: () => void` - Callback after successful submission
- `onCancel?: () => void` - Callback when user cancels

**Features:**
- Interactive star rating selector
- Name and email fields (both required)
- Optional review title
- Review comment (required, max 2000 characters)
- Character counter
- Email validation
- Auto-detects authenticated users

**Usage:**
```tsx
<ReviewForm
  productId={product.id}
  onSuccess={() => {
    setShowReviewForm(false);
    // Optionally refresh reviews
  }}
  onCancel={() => setShowReviewForm(false)}
/>
```

## Integration in ProductDetails Page

The reviews section has been integrated into `src/pages/ProductDetails.tsx`:

1. **Location**: Below the component selection area, separated by a border
2. **Responsive**: Centered with max-width constraints
3. **Toggle**: Shows either ReviewsSection or ReviewForm based on state
4. **Automatic Refresh**: Reviews update after submission

## Review Workflow

### Customer Journey:

1. **Browse Product** → Customer views product details page
2. **Scroll to Reviews** → Reviews section displays existing reviews and stats
3. **Click "Write a Review"** → Review form appears
4. **Fill Form**:
   - Select star rating (required)
   - Enter name and email (required)
   - Add title (optional)
   - Write review comment (required)
5. **Submit** → Review is saved with status "pending"
6. **Confirmation** → Toast notification confirms submission
7. **Wait for Approval** → Admin reviews and approves

### Admin Workflow:

1. **Review Submission** → New review appears in `product_reviews` table with `status = 'pending'`
2. **Admin Reviews** → (You'll need to create an admin panel for this)
3. **Approve/Reject**:
   - Update `status` to 'approved' or 'rejected'
   - Set `approved_at` and `approved_by` fields
4. **Published** → Approved reviews appear on product page

## Admin Panel Integration (TODO)

You'll want to create an admin page to manage reviews. Here's a suggested implementation:

### Create `src/pages/admin/ReviewModeration.tsx`

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const ReviewModeration = () => {
  const [pendingReviews, setPendingReviews] = useState([]);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    const { data } = await supabase
      .from('product_reviews')
      .select(`
        *,
        products_new (name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setPendingReviews(data || []);
  };

  const handleApprove = async (reviewId: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('product_reviews')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id
      })
      .eq('id', reviewId);

    fetchPendingReviews();
  };

  const handleReject = async (reviewId: string) => {
    await supabase
      .from('product_reviews')
      .update({ status: 'rejected' })
      .eq('id', reviewId);

    fetchPendingReviews();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Review Moderation</h1>

      <div className="space-y-4">
        {pendingReviews.map((review: any) => (
          <div key={review.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold">{review.customer_name}</h3>
                <p className="text-sm text-gray-600">{review.customer_email}</p>
                <p className="text-sm text-gray-500">
                  Product: {review.products_new?.name}
                </p>
              </div>
              <Badge>⭐ {review.rating}/5</Badge>
            </div>

            {review.title && (
              <h4 className="font-medium mb-2">{review.title}</h4>
            )}

            <p className="text-gray-700 mb-4">{review.comment}</p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(review.id)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(review.id)}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Row Level Security (RLS)

The migration includes RLS policies:

### `product_reviews` Policies:
- ✅ **Public Read** - Anyone can view approved reviews
- ✅ **Public Insert** - Anyone can submit reviews (status defaults to pending)
- ✅ **User Update** - Users can update their own pending reviews only

### `review_helpful_votes` Policies:
- ✅ **Public Read** - Anyone can see vote counts
- ✅ **Public Insert** - Anyone can vote (duplicates prevented by unique constraint)

## Data Privacy

- Customer emails are **NOT displayed publicly** - only name is shown
- Emails are stored for admin purposes and preventing duplicate reviews
- Guest users can submit reviews without authentication
- All reviews require moderation before publication

## Testing Checklist

- [x] Database migration runs successfully
- [x] TypeScript types updated
- [x] ReviewsSection displays correctly on ProductDetails page
- [x] ReviewForm accepts input and validates data
- [ ] Review submission creates pending review in database
- [ ] Star rating selector works correctly
- [ ] Helpful voting prevents duplicate votes
- [ ] Review statistics calculate correctly
- [ ] Sorting options work (recent, rating high/low, helpful)
- [ ] Guest users can submit reviews
- [ ] Authenticated users can submit reviews
- [ ] Admin can approve/reject reviews
- [ ] Approved reviews appear on product page
- [ ] Rejected reviews do not appear

## Future Enhancements

1. **Email Notifications**
   - Notify customer when review is approved
   - Notify admin when new review is submitted

2. **Review Images**
   - Allow customers to upload photos with reviews
   - Add image gallery to review cards

3. **Review Responses**
   - Allow shop owners to respond to reviews
   - Display responses below original review

4. **Review Incentives**
   - Offer discount codes for verified reviews
   - Gamification with review badges

5. **Advanced Filtering**
   - Filter by star rating (show only 5★, 4★, etc.)
   - Filter by verified purchase only
   - Search within reviews

6. **Analytics Dashboard**
   - Review trends over time
   - Product comparison by ratings
   - Most helpful reviewers

## Support

For questions or issues with the review system:
- Check database logs for SQL errors
- Verify RLS policies are enabled
- Ensure product_id is being passed correctly
- Check browser console for JavaScript errors

## API Reference

### Submitting a Review

```typescript
const { error } = await supabase
  .from('product_reviews')
  .insert({
    product_id: 'uuid',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    rating: 5,
    title: 'Great product!',
    comment: 'This exceeded my expectations...',
    status: 'pending'
  });
```

### Fetching Reviews

```typescript
const { data } = await supabase
  .rpc('get_product_reviews', {
    p_product_id: 'uuid',
    p_limit: 20,
    p_offset: 0,
    p_sort_by: 'recent'
  });
```

### Fetching Review Stats

```typescript
const { data } = await supabase
  .rpc('get_product_review_stats', {
    p_product_id: 'uuid'
  });
```

### Marking Review as Helpful

```typescript
const { data } = await supabase
  .rpc('mark_review_helpful', {
    p_review_id: 'uuid',
    p_user_identifier: 'user_email_or_session_id'
  });
```

---

**Version**: 1.0.0
**Last Updated**: 2025-10-10
**Author**: AutoMot Hub Development Team
