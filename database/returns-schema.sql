-- ============================================================================
-- RETURNS SYSTEM DATABASE SCHEMA
-- ============================================================================
-- Based on user policy:
-- - 7-day return window from delivery date
-- - Reasons: DEFECTIVE, WRONG_ITEM only (no "changed mind")
-- - Refund options: Original payment OR exchange
-- - Free return shipping only for defective items
-- ============================================================================

-- ============================================================================
-- 1. Create ENUM types (if they don't exist)
-- ============================================================================

-- Return status enum
DO $$ BEGIN
  CREATE TYPE return_status AS ENUM (
    'PENDING',           -- Customer submitted, awaiting review
    'APPROVED',          -- Admin approved, customer can ship back
    'REJECTED',          -- Admin rejected the return
    'ITEM_SHIPPED',      -- Customer shipped item back
    'ITEM_RECEIVED',     -- Warehouse received the item
    'INSPECTING',        -- Item being inspected
    'REFUND_PROCESSING', -- Refund being processed
    'EXCHANGE_PROCESSING', -- Exchange being processed
    'COMPLETED',         -- Return fully processed
    'CANCELLED'          -- Return cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Return reason enum (limited per policy)
DO $$ BEGIN
  CREATE TYPE return_reason AS ENUM (
    'DEFECTIVE',         -- Product is defective/damaged
    'WRONG_ITEM'         -- Received wrong item
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Refund method enum
DO $$ BEGIN
  CREATE TYPE refund_method AS ENUM (
    'ORIGINAL_PAYMENT',  -- Refund to original payment method
    'EXCHANGE'           -- Exchange for different item
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Create returns table
-- ============================================================================

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no TEXT UNIQUE, -- RMA-XXXXXX format, auto-generated
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES auth.users(id), -- Same as customer_profiles.user_id

  -- Return details
  reason TEXT NOT NULL, -- Using TEXT for flexibility, validated in app
  reason_details TEXT, -- Additional description from customer
  refund_method TEXT NOT NULL, -- ORIGINAL_PAYMENT or EXCHANGE

  -- Status tracking
  status TEXT DEFAULT 'PENDING',

  -- Shipping info
  return_shipping_free BOOLEAN DEFAULT false, -- True if defective
  return_tracking_number TEXT,
  return_courier TEXT,

  -- Amounts
  refund_amount DECIMAL(10,2),

  -- Exchange details (if applicable)
  exchange_order_id UUID REFERENCES orders(id),

  -- Admin notes
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  item_shipped_at TIMESTAMPTZ,
  item_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- 3. Create return_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),

  -- Item details (copied for record keeping)
  component_sku TEXT NOT NULL,
  component_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,

  -- Item condition
  item_condition TEXT, -- SEALED, OPENED, DAMAGED

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Create return_images table
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_return_no ON returns(return_no);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_images_return_id ON return_images(return_id);

-- ============================================================================
-- 6. Enable Row Level Security
-- ============================================================================

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_images ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS Policies for returns table
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers view own returns" ON returns;
DROP POLICY IF EXISTS "Customers create returns" ON returns;
DROP POLICY IF EXISTS "Customers update pending returns" ON returns;
DROP POLICY IF EXISTS "Admin full access returns" ON returns;

-- Customers can view their own returns
CREATE POLICY "Customers view own returns" ON returns
  FOR SELECT USING (customer_id = auth.uid());

-- Customers can create returns for their orders
CREATE POLICY "Customers create returns" ON returns
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update their pending/approved returns (add tracking, cancel)
CREATE POLICY "Customers update pending returns" ON returns
  FOR UPDATE USING (
    customer_id = auth.uid()
    AND status IN ('PENDING', 'APPROVED', 'ITEM_SHIPPED')
  );

-- Admin/Staff full access
CREATE POLICY "Admin full access returns" ON returns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- ============================================================================
-- 8. RLS Policies for return_items table
-- ============================================================================

DROP POLICY IF EXISTS "View own return items" ON return_items;
DROP POLICY IF EXISTS "Create own return items" ON return_items;
DROP POLICY IF EXISTS "Admin full access return items" ON return_items;

-- Customers can view items for their returns
CREATE POLICY "View own return items" ON return_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM returns
      WHERE returns.id = return_items.return_id
      AND returns.customer_id = auth.uid()
    )
  );

-- Customers can add items to their returns
CREATE POLICY "Create own return items" ON return_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns
      WHERE returns.id = return_items.return_id
      AND returns.customer_id = auth.uid()
      AND returns.status = 'PENDING'
    )
  );

-- Admin/Staff full access
CREATE POLICY "Admin full access return items" ON return_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- ============================================================================
-- 9. RLS Policies for return_images table
-- ============================================================================

DROP POLICY IF EXISTS "View own return images" ON return_images;
DROP POLICY IF EXISTS "Upload own return images" ON return_images;
DROP POLICY IF EXISTS "Admin full access return images" ON return_images;

-- Customers can view images for their returns
CREATE POLICY "View own return images" ON return_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM returns
      WHERE returns.id = return_images.return_id
      AND returns.customer_id = auth.uid()
    )
  );

-- Customers can upload images to their returns
CREATE POLICY "Upload own return images" ON return_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns
      WHERE returns.id = return_images.return_id
      AND returns.customer_id = auth.uid()
    )
  );

-- Admin/Staff full access
CREATE POLICY "Admin full access return images" ON return_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'staff')
      AND is_active = true
    )
  );

-- ============================================================================
-- 10. Function to generate RMA number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_rma_number()
RETURNS TEXT AS $$
DECLARE
  new_rma TEXT;
  counter INTEGER;
  year_month TEXT;
BEGIN
  -- Format: RMA-YYMM-XXXXX (e.g., RMA-2602-00001)
  year_month := TO_CHAR(NOW(), 'YYMM');

  -- Count returns this month + 1
  SELECT COUNT(*) + 1 INTO counter
  FROM returns
  WHERE return_no LIKE 'RMA-' || year_month || '-%';

  new_rma := 'RMA-' || year_month || '-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_rma;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. Trigger to auto-generate RMA number
-- ============================================================================

CREATE OR REPLACE FUNCTION set_return_rma_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_no IS NULL THEN
    NEW.return_no := generate_rma_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_rma_number ON returns;
CREATE TRIGGER trigger_set_rma_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_rma_number();

-- ============================================================================
-- 12. Trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_return_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_return_timestamp ON returns;
CREATE TRIGGER trigger_update_return_timestamp
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_return_timestamp();

-- ============================================================================
-- 13. Trigger to auto-set return_shipping_free based on reason
-- ============================================================================

CREATE OR REPLACE FUNCTION set_return_shipping_free()
RETURNS TRIGGER AS $$
BEGIN
  -- Free return shipping only for defective items
  IF NEW.reason = 'DEFECTIVE' THEN
    NEW.return_shipping_free := true;
  ELSE
    NEW.return_shipping_free := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_return_shipping_free ON returns;
CREATE TRIGGER trigger_set_return_shipping_free
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_shipping_free();

-- ============================================================================
-- 14. Function to check return eligibility (7-day window)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_return_eligibility(p_order_id UUID)
RETURNS TABLE(
  eligible BOOLEAN,
  reason TEXT,
  days_remaining INTEGER,
  order_status TEXT,
  delivery_date TIMESTAMPTZ
) AS $$
DECLARE
  order_record RECORD;
  v_delivery_date TIMESTAMPTZ;
  days_since_delivery INTEGER;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'Order not found'::TEXT,
      0::INTEGER,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Check if order is delivered
  IF order_record.status NOT IN ('DELIVERED', 'COMPLETED') THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'Order has not been delivered yet. Returns can only be requested for delivered orders.'::TEXT,
      0::INTEGER,
      order_record.status::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Use delivered_at or updated_at as delivery date
  v_delivery_date := COALESCE(order_record.delivered_at, order_record.updated_at);
  days_since_delivery := EXTRACT(DAY FROM NOW() - v_delivery_date)::INTEGER;

  -- Check 7-day window
  IF days_since_delivery > 7 THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'Return window has expired. Returns must be requested within 7 days of delivery.'::TEXT,
      0::INTEGER,
      order_record.status::TEXT,
      v_delivery_date;
    RETURN;
  END IF;

  -- Check if active return already exists
  IF EXISTS (
    SELECT 1 FROM returns
    WHERE order_id = p_order_id
    AND status NOT IN ('CANCELLED', 'REJECTED', 'COMPLETED')
  ) THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'An active return request already exists for this order.'::TEXT,
      0::INTEGER,
      order_record.status::TEXT,
      v_delivery_date;
    RETURN;
  END IF;

  -- Eligible!
  RETURN QUERY SELECT
    true::BOOLEAN,
    'Eligible for return'::TEXT,
    (7 - days_since_delivery)::INTEGER,
    order_record.status::TEXT,
    v_delivery_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 15. Function to calculate refund amount for return items
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_return_refund(p_return_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_refund DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO total_refund
  FROM return_items
  WHERE return_id = p_return_id;

  RETURN total_refund;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 16. Trigger to auto-calculate refund amount when return items change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_return_refund_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the refund_amount on the parent return
  UPDATE returns
  SET refund_amount = calculate_return_refund(
    COALESCE(NEW.return_id, OLD.return_id)
  )
  WHERE id = COALESCE(NEW.return_id, OLD.return_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_return_refund ON return_items;
CREATE TRIGGER trigger_update_return_refund
  AFTER INSERT OR UPDATE OR DELETE ON return_items
  FOR EACH ROW
  EXECUTE FUNCTION update_return_refund_amount();

-- ============================================================================
-- 17. View for pending returns (admin dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW pending_returns AS
SELECT
  r.id,
  r.return_no,
  r.order_id,
  r.customer_id,
  r.reason,
  r.reason_details,
  r.refund_method,
  r.status,
  r.refund_amount,
  r.created_at,
  r.updated_at,
  o.order_no,
  o.customer_name,
  o.customer_phone,
  o.customer_email,
  (SELECT COUNT(*) FROM return_items ri WHERE ri.return_id = r.id) as item_count
FROM returns r
JOIN orders o ON r.order_id = o.id
WHERE r.status = 'PENDING'
ORDER BY r.created_at ASC;

-- ============================================================================
-- 18. Grant permissions
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT ON pending_returns TO authenticated;
GRANT EXECUTE ON FUNCTION check_return_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_return_refund TO authenticated;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Returns system schema created successfully!';
  RAISE NOTICE 'Tables created: returns, return_items, return_images';
  RAISE NOTICE 'Functions created: generate_rma_number, check_return_eligibility, calculate_return_refund';
  RAISE NOTICE 'Policy: 7-day return window, DEFECTIVE/WRONG_ITEM reasons only';
END $$;
