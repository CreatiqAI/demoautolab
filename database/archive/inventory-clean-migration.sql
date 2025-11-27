-- Clean Inventory System Migration - Avoids View Column Conflicts
-- This creates a working inventory system integrated with component_library

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

-- 2. Create stock alerts table first (before any views)
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid NOT NULL, -- References component_library.id
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'reorder_suggestion')),
  alert_level text NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  suggested_action text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 3. Create restock orders table
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

-- 4. Create restock order items table
CREATE TABLE IF NOT EXISTS public.restock_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restock_order_id uuid NOT NULL,
  inventory_id uuid NOT NULL, -- References component_library.id
  quantity_ordered integer NOT NULL CHECK (quantity_ordered > 0),
  quantity_received integer DEFAULT 0,
  unit_cost numeric(10, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 5. Drop existing problematic views if they exist
DROP VIEW IF EXISTS public.active_stock_alerts_detailed;
DROP VIEW IF EXISTS public.inventory_with_alerts;

-- 6. Add inventory columns to component_library safely
DO $$
BEGIN
  -- Add supplier_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'component_library'
    AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE public.component_library ADD COLUMN supplier_id uuid;
  END IF;

  -- Add min_stock_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'component_library'
    AND column_name = 'min_stock_level'
  ) THEN
    ALTER TABLE public.component_library ADD COLUMN min_stock_level integer DEFAULT 10;
  END IF;

  -- Add max_stock_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'component_library'
    AND column_name = 'max_stock_level'
  ) THEN
    ALTER TABLE public.component_library ADD COLUMN max_stock_level integer DEFAULT 100;
  END IF;

  -- Add reorder_point column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'component_library'
    AND column_name = 'reorder_point'
  ) THEN
    ALTER TABLE public.component_library ADD COLUMN reorder_point integer DEFAULT 15;
  END IF;

  -- Add warehouse_location column (avoid 'location' name conflict)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'component_library'
    AND column_name = 'warehouse_location'
  ) THEN
    ALTER TABLE public.component_library ADD COLUMN warehouse_location text;
  END IF;

  -- Add last_restocked column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'component_library'
    AND column_name = 'last_restocked'
  ) THEN
    ALTER TABLE public.component_library ADD COLUMN last_restocked timestamptz;
  END IF;
END $$;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_component_library_supplier ON public.component_library (supplier_id);
CREATE INDEX IF NOT EXISTS idx_component_library_stock_level ON public.component_library (stock_level);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_inventory ON public.stock_alerts (inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON public.stock_alerts (is_resolved);

-- 8. Insert sample suppliers
INSERT INTO public.suppliers (name, company_name, contact_person, email, phone, address, city, payment_terms, lead_time_days, minimum_order_amount)
VALUES
  ('AutoTech Supplies', 'AutoTech Supplies Sdn Bhd', 'John Tan', 'sales@autotech.my', '+60123456789', '123 Industrial Park', 'Shah Alam', 'NET 30', 5, 500.00),
  ('Premium Auto Parts', 'Premium Auto Parts Malaysia', 'Sarah Wong', 'orders@premiumauto.my', '+60198765432', '456 Auto Street', 'Petaling Jaya', 'NET 15', 3, 300.00),
  ('Shade Solutions Ltd', 'Shade Solutions Limited', 'Ahmad Rahman', 'info@shadesolutions.my', '+60187654321', '789 Manufacturing Ave', 'Klang', 'NET 45', 7, 200.00),
  ('Digital Auto Systems', 'Digital Auto Systems Sdn Bhd', 'Lisa Chen', 'procurement@digitalauto.my', '+60176543210', '321 Tech Hub', 'Cyberjaya', 'NET 30', 10, 1000.00),
  ('LED Solutions Pro', 'LED Solutions Pro Malaysia', 'Kumar Singh', 'sales@ledsolutions.my', '+60165432109', '654 Light Industrial', 'Subang Jaya', 'NET 30', 4, 150.00)
ON CONFLICT (name) DO NOTHING;

-- 9. Update existing component_library items with inventory data
UPDATE public.component_library
SET
  supplier_id = COALESCE(supplier_id, (
    CASE
      WHEN component_type ILIKE '%casing%' OR component_type ILIKE '%case%' THEN (SELECT id FROM suppliers WHERE name = 'AutoTech Supplies' LIMIT 1)
      WHEN component_type ILIKE '%audio%' OR component_type ILIKE '%head%' OR component_type ILIKE '%android%' THEN (SELECT id FROM suppliers WHERE name = 'Digital Auto Systems' LIMIT 1)
      WHEN component_type ILIKE '%shade%' OR component_type ILIKE '%ninja%' THEN (SELECT id FROM suppliers WHERE name = 'Shade Solutions Ltd' LIMIT 1)
      WHEN component_type ILIKE '%led%' OR component_type ILIKE '%light%' THEN (SELECT id FROM suppliers WHERE name = 'LED Solutions Pro' LIMIT 1)
      ELSE (SELECT id FROM suppliers WHERE name = 'Premium Auto Parts' LIMIT 1)
    END
  )),
  min_stock_level = COALESCE(min_stock_level,
    CASE
      WHEN COALESCE(stock_level, 0) > 50 THEN 20
      WHEN COALESCE(stock_level, 0) > 20 THEN 10
      ELSE 5
    END
  ),
  max_stock_level = COALESCE(max_stock_level,
    CASE
      WHEN COALESCE(stock_level, 0) > 50 THEN 100
      WHEN COALESCE(stock_level, 0) > 20 THEN 80
      ELSE 50
    END
  ),
  reorder_point = COALESCE(reorder_point,
    CASE
      WHEN COALESCE(stock_level, 0) > 50 THEN 30
      WHEN COALESCE(stock_level, 0) > 20 THEN 15
      ELSE 8
    END
  ),
  warehouse_location = COALESCE(warehouse_location,
    CASE
      WHEN component_type ILIKE '%casing%' OR component_type ILIKE '%case%' THEN 'Warehouse A - Casings'
      WHEN component_type ILIKE '%audio%' OR component_type ILIKE '%head%' OR component_type ILIKE '%android%' THEN 'Warehouse C - Electronics'
      WHEN component_type ILIKE '%shade%' OR component_type ILIKE '%ninja%' THEN 'Warehouse B - Accessories'
      WHEN component_type ILIKE '%led%' OR component_type ILIKE '%light%' THEN 'Warehouse D - Lighting'
      ELSE 'Warehouse General'
    END
  )
WHERE is_active = true;

-- 10. Create the clean active_stock_alerts_detailed view
CREATE VIEW public.active_stock_alerts_detailed AS
SELECT
  sa.id,
  sa.inventory_id,
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
  COALESCE(cl.stock_level, 0) as current_stock,
  COALESCE(cl.min_stock_level, 10) as min_stock_level,
  COALESCE(cl.max_stock_level, 100) as max_stock_level,
  COALESCE(cl.reorder_point, 15) as reorder_point,
  COALESCE(cl.merchant_price, 0) as unit_cost,
  COALESCE(cl.warehouse_location, 'Unknown') as location,
  '' as category_name, -- Placeholder
  COALESCE(s.name, 'No Supplier') as supplier_name,
  COALESCE(s.company_name, 'No Company') as supplier_company,
  COALESCE(s.lead_time_days, 7) as supplier_lead_time,
  GREATEST(0, COALESCE(cl.max_stock_level, 100) - COALESCE(cl.stock_level, 0)) as suggested_reorder_quantity,
  GREATEST(0, COALESCE(cl.max_stock_level, 100) - COALESCE(cl.stock_level, 0)) * COALESCE(cl.merchant_price, 0) as suggested_reorder_cost
FROM stock_alerts sa
JOIN component_library cl ON sa.inventory_id = cl.id
LEFT JOIN suppliers s ON cl.supplier_id = s.id
WHERE sa.is_resolved = false
  AND COALESCE(cl.is_active, true) = true
ORDER BY
  CASE sa.alert_level
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  sa.created_at DESC;

-- 11. Generate real stock alerts based on component_library data
DELETE FROM stock_alerts WHERE is_resolved = false; -- Clear any existing alerts

INSERT INTO public.stock_alerts (inventory_id, alert_type, alert_level, message, suggested_action)
SELECT
  cl.id,
  CASE
    WHEN COALESCE(cl.stock_level, 0) = 0 THEN 'out_of_stock'
    WHEN COALESCE(cl.stock_level, 0) <= (COALESCE(cl.min_stock_level, 10) * 0.5) THEN 'low_stock'
    WHEN COALESCE(cl.stock_level, 0) < COALESCE(cl.min_stock_level, 10) THEN 'low_stock'
    ELSE 'reorder_suggestion'
  END,
  CASE
    WHEN COALESCE(cl.stock_level, 0) = 0 THEN 'critical'
    WHEN COALESCE(cl.stock_level, 0) <= (COALESCE(cl.min_stock_level, 10) * 0.5) THEN 'critical'
    WHEN COALESCE(cl.stock_level, 0) < COALESCE(cl.min_stock_level, 10) THEN 'warning'
    ELSE 'info'
  END,
  CASE
    WHEN COALESCE(cl.stock_level, 0) = 0 THEN 'OUT OF STOCK: ' || COALESCE(cl.name, 'Unknown Item') || ' (' || COALESCE(cl.component_sku, 'NO-SKU') || ')'
    WHEN COALESCE(cl.stock_level, 0) <= (COALESCE(cl.min_stock_level, 10) * 0.5) THEN 'CRITICAL LOW STOCK: ' || COALESCE(cl.name, 'Unknown Item') || ' (' || COALESCE(cl.component_sku, 'NO-SKU') || ') - Only ' || COALESCE(cl.stock_level, 0) || ' units remaining'
    WHEN COALESCE(cl.stock_level, 0) < COALESCE(cl.min_stock_level, 10) THEN 'LOW STOCK: ' || COALESCE(cl.name, 'Unknown Item') || ' (' || COALESCE(cl.component_sku, 'NO-SKU') || ') - ' || COALESCE(cl.stock_level, 0) || ' units below minimum'
    ELSE 'REORDER POINT REACHED: ' || COALESCE(cl.name, 'Unknown Item') || ' (' || COALESCE(cl.component_sku, 'NO-SKU') || ')'
  END,
  CASE
    WHEN COALESCE(cl.stock_level, 0) = 0 THEN 'Create immediate restock order for ' || COALESCE(cl.max_stock_level, 100) || ' units'
    WHEN COALESCE(cl.stock_level, 0) <= (COALESCE(cl.min_stock_level, 10) * 0.5) THEN 'Create urgent restock order for ' || (COALESCE(cl.max_stock_level, 100) - COALESCE(cl.stock_level, 0)) || ' units'
    WHEN COALESCE(cl.stock_level, 0) < COALESCE(cl.min_stock_level, 10) THEN 'Consider restock order for ' || (COALESCE(cl.max_stock_level, 100) - COALESCE(cl.stock_level, 0)) || ' units'
    ELSE 'Consider placing restock order soon'
  END
FROM component_library cl
WHERE COALESCE(cl.is_active, true) = true
  AND (
    COALESCE(cl.stock_level, 0) = 0
    OR COALESCE(cl.stock_level, 0) <= COALESCE(cl.min_stock_level, 10)
    OR COALESCE(cl.stock_level, 0) <= COALESCE(cl.reorder_point, 15)
  );

-- 12. Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer;
BEGIN
  SELECT COALESCE(MAX(CAST(substring(order_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO counter
  FROM restock_orders
  WHERE order_number LIKE 'RO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';

  new_number := 'RO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::text, 4, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 13. Enable RLS and create simple policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_order_items ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all authenticated users
CREATE POLICY "allow_all_suppliers" ON suppliers FOR ALL USING (true);
CREATE POLICY "allow_all_stock_alerts" ON stock_alerts FOR ALL USING (true);
CREATE POLICY "allow_all_restock_orders" ON restock_orders FOR ALL USING (true);
CREATE POLICY "allow_all_restock_order_items" ON restock_order_items FOR ALL USING (true);

-- 14. Success message with count of alerts created
SELECT
  'SUCCESS: Inventory system integrated with component_library! ' ||
  'Created ' || (SELECT COUNT(*) FROM stock_alerts WHERE is_resolved = false) || ' stock alerts. ' ||
  'Updated ' || (SELECT COUNT(*) FROM component_library WHERE supplier_id IS NOT NULL) || ' components with supplier data. ' ||
  'Tables: suppliers (' || (SELECT COUNT(*) FROM suppliers) || ' records), ' ||
  'stock_alerts, restock_orders, restock_order_items. ' ||
  'View: active_stock_alerts_detailed ready!' as result;