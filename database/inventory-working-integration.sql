-- Working Inventory System Integration with component_library
-- This uses your existing component_library table and avoids column name conflicts

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'Malaysia',
  payment_terms text,
  lead_time_days integer DEFAULT 7,
  minimum_order_amount numeric(10, 2) DEFAULT 0.00,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add inventory columns to component_library table safely
DO $$
BEGIN
  -- Add columns only if they don't exist
  BEGIN
    ALTER TABLE public.component_library ADD COLUMN supplier_id uuid;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.component_library ADD COLUMN min_stock_level integer DEFAULT 10;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.component_library ADD COLUMN max_stock_level integer DEFAULT 100;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.component_library ADD COLUMN reorder_point integer DEFAULT 15;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.component_library ADD COLUMN location text;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.component_library ADD COLUMN last_restocked timestamptz;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 3. Create stock alerts table (use inventory_id to match React component expectations)
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid NOT NULL, -- This will reference component_library.id
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'reorder_suggestion')),
  alert_level text NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  suggested_action text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 4. Create restock orders table
CREATE TABLE IF NOT EXISTS public.restock_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
  order_date timestamptz DEFAULT now(),
  expected_delivery_date timestamptz,
  received_date timestamptz,
  total_amount numeric(10, 2) DEFAULT 0.00,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create restock order items table
CREATE TABLE IF NOT EXISTS public.restock_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restock_order_id uuid NOT NULL,
  inventory_id uuid NOT NULL, -- This will reference component_library.id
  quantity_ordered integer NOT NULL CHECK (quantity_ordered > 0),
  quantity_received integer DEFAULT 0,
  unit_cost numeric(10, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_component_library_supplier ON public.component_library (supplier_id);
CREATE INDEX IF NOT EXISTS idx_component_library_stock_level ON public.component_library (stock_level);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_inventory ON public.stock_alerts (inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON public.stock_alerts (is_resolved);

-- 7. Insert sample suppliers
INSERT INTO public.suppliers (name, company_name, contact_person, email, phone, address, city, payment_terms, lead_time_days, minimum_order_amount)
VALUES
  ('AutoTech Supplies', 'AutoTech Supplies Sdn Bhd', 'John Tan', 'sales@autotech.my', '+60123456789', '123 Industrial Park', 'Shah Alam', 'NET 30', 5, 500.00),
  ('Premium Auto Parts', 'Premium Auto Parts Malaysia', 'Sarah Wong', 'orders@premiumauto.my', '+60198765432', '456 Auto Street', 'Petaling Jaya', 'NET 15', 3, 300.00),
  ('Shade Solutions Ltd', 'Shade Solutions Limited', 'Ahmad Rahman', 'info@shadesolutions.my', '+60187654321', '789 Manufacturing Ave', 'Klang', 'NET 45', 7, 200.00),
  ('Digital Auto Systems', 'Digital Auto Systems Sdn Bhd', 'Lisa Chen', 'procurement@digitalauto.my', '+60176543210', '321 Tech Hub', 'Cyberjaya', 'NET 30', 10, 1000.00),
  ('LED Solutions Pro', 'LED Solutions Pro Malaysia', 'Kumar Singh', 'sales@ledsolutions.my', '+60165432109', '654 Light Industrial', 'Subang Jaya', 'NET 30', 4, 150.00)
ON CONFLICT (name) DO NOTHING;

-- 8. Update component_library with inventory data
UPDATE public.component_library
SET
  supplier_id = (
    CASE
      WHEN component_type ILIKE '%casing%' THEN (SELECT id FROM suppliers WHERE name = 'AutoTech Supplies' LIMIT 1)
      WHEN component_type ILIKE '%audio%' OR component_type ILIKE '%head%' THEN (SELECT id FROM suppliers WHERE name = 'Digital Auto Systems' LIMIT 1)
      WHEN component_type ILIKE '%shade%' THEN (SELECT id FROM suppliers WHERE name = 'Shade Solutions Ltd' LIMIT 1)
      WHEN component_type ILIKE '%led%' OR component_type ILIKE '%light%' THEN (SELECT id FROM suppliers WHERE name = 'LED Solutions Pro' LIMIT 1)
      ELSE (SELECT id FROM suppliers WHERE name = 'Premium Auto Parts' LIMIT 1)
    END
  ),
  min_stock_level = COALESCE(min_stock_level,
    CASE
      WHEN stock_level > 50 THEN 20
      WHEN stock_level > 20 THEN 10
      ELSE 5
    END
  ),
  max_stock_level = COALESCE(max_stock_level,
    CASE
      WHEN stock_level > 50 THEN 100
      WHEN stock_level > 20 THEN 80
      ELSE 50
    END
  ),
  reorder_point = COALESCE(reorder_point,
    CASE
      WHEN stock_level > 50 THEN 30
      WHEN stock_level > 20 THEN 15
      ELSE 8
    END
  ),
  location = COALESCE(location,
    CASE
      WHEN component_type ILIKE '%casing%' THEN 'Warehouse A'
      WHEN component_type ILIKE '%audio%' OR component_type ILIKE '%head%' THEN 'Warehouse C'
      WHEN component_type ILIKE '%shade%' THEN 'Warehouse B'
      WHEN component_type ILIKE '%led%' OR component_type ILIKE '%light%' THEN 'Warehouse D'
      ELSE 'Warehouse General'
    END
  )
WHERE is_active = true;

-- 9. Create the active_stock_alerts_detailed view (matching React component expectations)
CREATE OR REPLACE VIEW public.active_stock_alerts_detailed AS
SELECT
  sa.id,
  sa.inventory_id, -- This matches what React component expects
  sa.alert_type,
  sa.alert_level,
  sa.message,
  sa.suggested_action,
  sa.is_resolved,
  sa.resolved_at,
  sa.resolved_by,
  sa.created_at,
  cl.component_sku,
  cl.name as component_name,
  cl.stock_level as current_stock,
  cl.min_stock_level,
  cl.max_stock_level,
  cl.reorder_point,
  cl.merchant_price as unit_cost,
  cl.location,
  '' as category_name, -- Placeholder for now
  COALESCE(s.name, 'No Supplier') as supplier_name,
  COALESCE(s.company_name, 'No Company') as supplier_company,
  COALESCE(s.lead_time_days, 7) as supplier_lead_time,
  GREATEST(0, cl.max_stock_level - cl.stock_level) as suggested_reorder_quantity,
  GREATEST(0, cl.max_stock_level - cl.stock_level) * COALESCE(cl.merchant_price, 0) as suggested_reorder_cost
FROM stock_alerts sa
JOIN component_library cl ON sa.inventory_id = cl.id
LEFT JOIN suppliers s ON cl.supplier_id = s.id
WHERE sa.is_resolved = false AND cl.is_active = true
ORDER BY
  CASE sa.alert_level
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  sa.created_at DESC;

-- 10. Generate stock alerts based on current component_library stock levels
INSERT INTO public.stock_alerts (inventory_id, alert_type, alert_level, message, suggested_action)
SELECT
  cl.id,
  CASE
    WHEN cl.stock_level = 0 THEN 'out_of_stock'
    WHEN cl.stock_level <= (cl.min_stock_level * 0.5) THEN 'low_stock'
    WHEN cl.stock_level < cl.min_stock_level THEN 'low_stock'
    ELSE 'reorder_suggestion'
  END,
  CASE
    WHEN cl.stock_level = 0 THEN 'critical'
    WHEN cl.stock_level <= (cl.min_stock_level * 0.5) THEN 'critical'
    WHEN cl.stock_level < cl.min_stock_level THEN 'warning'
    ELSE 'info'
  END,
  CASE
    WHEN cl.stock_level = 0 THEN 'OUT OF STOCK: ' || cl.name || ' (' || cl.component_sku || ')'
    WHEN cl.stock_level <= (cl.min_stock_level * 0.5) THEN 'CRITICAL LOW STOCK: ' || cl.name || ' (' || cl.component_sku || ') - Only ' || cl.stock_level || ' units remaining'
    WHEN cl.stock_level < cl.min_stock_level THEN 'LOW STOCK: ' || cl.name || ' (' || cl.component_sku || ') - ' || cl.stock_level || ' units below minimum'
    ELSE 'REORDER POINT REACHED: ' || cl.name || ' (' || cl.component_sku || ')'
  END,
  CASE
    WHEN cl.stock_level = 0 THEN 'Create immediate restock order for ' || cl.max_stock_level || ' units'
    WHEN cl.stock_level <= (cl.min_stock_level * 0.5) THEN 'Create urgent restock order for ' || (cl.max_stock_level - cl.stock_level) || ' units'
    WHEN cl.stock_level < cl.min_stock_level THEN 'Consider restock order for ' || (cl.max_stock_level - cl.stock_level) || ' units'
    ELSE 'Consider placing restock order soon'
  END
FROM component_library cl
WHERE cl.is_active = true
  AND cl.min_stock_level IS NOT NULL
  AND cl.max_stock_level IS NOT NULL
  AND (
    cl.stock_level = 0
    OR cl.stock_level <= cl.min_stock_level
    OR cl.stock_level <= cl.reorder_point
  )
ON CONFLICT DO NOTHING;

-- 11. Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
BEGIN
  SELECT 'RO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(
    COALESCE(
      (SELECT COUNT(*) + 1 FROM restock_orders WHERE order_number LIKE 'RO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'),
      1
    )::text,
    4,
    '0'
  ) INTO new_number;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 12. Enable RLS and create policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_order_items ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow all operations
CREATE POLICY "allow_all_suppliers" ON suppliers FOR ALL USING (true);
CREATE POLICY "allow_all_stock_alerts" ON stock_alerts FOR ALL USING (true);
CREATE POLICY "allow_all_restock_orders" ON restock_orders FOR ALL USING (true);
CREATE POLICY "allow_all_restock_order_items" ON restock_order_items FOR ALL USING (true);

-- Success message
SELECT
  'Inventory system successfully integrated with component_library! ' ||
  'Created ' || (SELECT COUNT(*) FROM stock_alerts WHERE is_resolved = false) || ' stock alerts based on current stock levels. ' ||
  'Tables: suppliers, stock_alerts, restock_orders, restock_order_items. ' ||
  'View: active_stock_alerts_detailed' as result;