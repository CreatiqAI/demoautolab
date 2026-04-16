-- ========================================
-- ADD IMAGE UPLOAD TO REVIEWS
-- ========================================

-- Step 1: Create review_images table
CREATE TABLE IF NOT EXISTS public.review_images (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT review_images_pkey PRIMARY KEY (id),
  CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id)
    REFERENCES product_reviews (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_review_images_review_id
  ON public.review_images USING btree (review_id) TABLESPACE pg_default;

-- Step 2: Enable RLS on review_images
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for review_images
CREATE POLICY "Anyone can view review images"
  ON review_images FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert review images"
  ON review_images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete review images"
  ON review_images FOR DELETE
  USING (true);

-- Step 4: Drop and recreate get_product_reviews function to include images
-- We need to drop the existing function first because we're changing the return type
DROP FUNCTION IF EXISTS get_product_reviews(UUID, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION get_product_reviews(
  p_product_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'recent'
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
  created_at TIMESTAMPTZ,
  images JSON
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
    pr.created_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ri.id,
            'url', ri.image_url,
            'display_order', ri.display_order
          ) ORDER BY ri.display_order
        )
        FROM review_images ri
        WHERE ri.review_id = pr.id
      ),
      '[]'::json
    ) as images
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

-- Step 5: Create storage bucket for review images
-- Note: This needs to be run in Supabase Dashboard or via API
-- You can also create it manually in the Storage section

INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Create storage policies for review-images bucket
CREATE POLICY "Anyone can upload review images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-images');

CREATE POLICY "Anyone can view review images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

CREATE POLICY "Anyone can delete review images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'review-images');

-- Step 7: Add comment
COMMENT ON TABLE review_images IS 'Stores images uploaded by customers with their product reviews';

-- Step 8: Verify setup
SELECT 'Review images table created successfully!' as status;
SELECT COUNT(*) as review_images_count FROM review_images;

-- Check if storage bucket exists
SELECT
  'Storage bucket check' as check,
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'review-images';
