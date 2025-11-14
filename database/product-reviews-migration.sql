-- Product Reviews and Comments Migration
-- This migration creates tables and functions for customer product reviews

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,

  -- Customer information (supports both authenticated and guest users)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  user_id UUID NULL, -- FK to auth.users if authenticated, NULL for guests

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NULL,
  comment TEXT NOT NULL,

  -- Review metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  helpful_count INTEGER NOT NULL DEFAULT 0,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID NULL,

  CONSTRAINT product_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products_new (id) ON DELETE CASCADE,
  CONSTRAINT product_reviews_email_check CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews USING btree (product_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews USING btree (rating) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews USING btree (user_id) TABLESPACE pg_default;

-- Create updated_at trigger
CREATE TRIGGER set_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create helpful_votes table for tracking who found reviews helpful
CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  user_identifier TEXT NOT NULL, -- email or session ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT review_helpful_votes_pkey PRIMARY KEY (id),
  CONSTRAINT review_helpful_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES product_reviews (id) ON DELETE CASCADE,
  CONSTRAINT review_helpful_votes_unique UNIQUE (review_id, user_identifier)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON public.review_helpful_votes USING btree (review_id) TABLESPACE pg_default;

-- Function to get product review statistics
CREATE OR REPLACE FUNCTION get_product_review_stats(p_product_id UUID)
RETURNS TABLE(
  total_reviews BIGINT,
  average_rating NUMERIC(3, 2),
  rating_5_count BIGINT,
  rating_4_count BIGINT,
  rating_3_count BIGINT,
  rating_2_count BIGINT,
  rating_1_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_reviews,
    ROUND(AVG(rating), 2) AS average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END)::BIGINT AS rating_5_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END)::BIGINT AS rating_4_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END)::BIGINT AS rating_3_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END)::BIGINT AS rating_2_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END)::BIGINT AS rating_1_count
  FROM product_reviews
  WHERE product_id = p_product_id
    AND status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- Function to get approved reviews for a product
CREATE OR REPLACE FUNCTION get_product_reviews(
  p_product_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'recent' -- 'recent', 'rating_high', 'rating_low', 'helpful'
)
RETURNS TABLE(
  id UUID,
  product_id UUID,
  customer_name TEXT,
  rating INTEGER,
  title TEXT,
  comment TEXT,
  helpful_count INTEGER,
  verified_purchase BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    pr.product_id,
    pr.customer_name,
    pr.rating,
    pr.title,
    pr.comment,
    pr.helpful_count,
    pr.verified_purchase,
    pr.created_at
  FROM product_reviews pr
  WHERE pr.product_id = p_product_id
    AND pr.status = 'approved'
  ORDER BY
    CASE
      WHEN p_sort_by = 'recent' THEN pr.created_at
    END DESC,
    CASE
      WHEN p_sort_by = 'rating_high' THEN pr.rating
    END DESC,
    CASE
      WHEN p_sort_by = 'rating_low' THEN pr.rating
    END ASC,
    CASE
      WHEN p_sort_by = 'helpful' THEN pr.helpful_count
    END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to increment helpful count
CREATE OR REPLACE FUNCTION mark_review_helpful(
  p_review_id UUID,
  p_user_identifier TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_voted BOOLEAN;
BEGIN
  -- Check if user already voted
  SELECT EXISTS(
    SELECT 1 FROM review_helpful_votes
    WHERE review_id = p_review_id AND user_identifier = p_user_identifier
  ) INTO v_already_voted;

  IF v_already_voted THEN
    RETURN FALSE;
  END IF;

  -- Insert vote
  INSERT INTO review_helpful_votes (review_id, user_identifier)
  VALUES (p_review_id, p_user_identifier);

  -- Update helpful count
  UPDATE product_reviews
  SET helpful_count = helpful_count + 1
  WHERE id = p_review_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for product_reviews
-- ========================================
-- NOTE: These policies are permissive because admin auth uses localStorage
-- Access control is handled at the application/route level via ProtectedAdminRoute

-- Allow all to view reviews (filtering by status happens in application)
CREATE POLICY "Allow all to view reviews"
  ON product_reviews FOR SELECT
  USING (true);

-- Allow all to insert reviews (customers submitting reviews)
CREATE POLICY "Allow all to insert reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (true);

-- Allow all to update reviews (admins moderating)
CREATE POLICY "Allow all to update reviews"
  ON product_reviews FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow all to delete reviews (admins removing)
CREATE POLICY "Allow all to delete reviews"
  ON product_reviews FOR DELETE
  USING (true);

-- ========================================
-- RLS Policies for review_helpful_votes
-- ========================================
CREATE POLICY "Allow all to view helpful votes"
  ON review_helpful_votes FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert helpful votes"
  ON review_helpful_votes FOR INSERT
  WITH CHECK (true);

-- Sample data for testing (optional - remove in production)
-- INSERT INTO product_reviews (product_id, customer_name, customer_email, rating, title, comment, status, verified_purchase)
-- SELECT
--   id,
--   'John Doe',
--   'john@example.com',
--   5,
--   'Excellent Product!',
--   'This product exceeded my expectations. Quality is top-notch and delivery was fast.',
--   'approved',
--   true
-- FROM products_new LIMIT 1;

COMMENT ON TABLE product_reviews IS 'Customer reviews and ratings for products';
COMMENT ON TABLE review_helpful_votes IS 'Tracks which users found reviews helpful';
COMMENT ON FUNCTION get_product_review_stats IS 'Returns review statistics including average rating and rating distribution';
COMMENT ON FUNCTION get_product_reviews IS 'Returns paginated approved reviews for a product with sorting options';
COMMENT ON FUNCTION mark_review_helpful IS 'Marks a review as helpful and prevents duplicate votes';
