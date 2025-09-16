-- Inventory System Integration with Existing component_library Table
-- This uses your existing component_library table as the source of truth for inventory

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

-- 2. Add inventory-related columns to existing component_library table (if they don't exist)
DO $$
BEGIN
  -- Add supplier_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='component_library' AND column_name='supplier_id') THEN
    ALTER TABLE public.component_library ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);
  END IF;

  -- Add min_stock_level column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='component_library' AND column_name='min_stock_level') THEN
    ALTER TABLE public.component_library ADD COLUMN min_stock_level integer DEFAULT 10;
  END IF;

  -- Add max_stock_level column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='component_library' AND column_name='max_stock_level') THEN
    ALTER TABLE public.component_library ADD COLUMN max_stock_level integer DEFAULT 100;
  END IF;

  -- Add reorder_point column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='component_library' AND column_name='reorder_point') THEN
    ALTER TABLE public.component_library ADD COLUMN reorder_point integer DEFAULT 15;
  END IF;

  -- Add location column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='component_library' AND column_name='location') THEN
    ALTER TABLE public.component_library ADD COLUMN location text;
  END IF;

  -- Add last_restocked column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='component_library' AND column_name='last_restocked') THEN
    ALTER TABLE public.component_library ADD COLUMN last_restocked timestamptz;
  END IF;
END $$;

-- 3. Create stock movements table (tracks changes to component_library.stock_level)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id uuid NOT NULL REFERENCES public.component_library(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL CHECK (quantity != 0),
  reference_type text, -- 'order', 'restock', 'adjustment', 'return', 'damage'
  reference_id uuid,
  unit_cost numeric(10, 2),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 4. Create restock orders table
CREATE TABLE IF NOT EXISTS public.restock_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
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

-- 5. Create restock order items table (references component_library)
CREATE TABLE IF NOT EXISTS public.restock_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restock_order_id uuid NOT NULL REFERENCES public.restock_orders(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.component_library(id),
  quantity_ordered integer NOT NULL CHECK (quantity_ordered > 0),
  quantity_received integer DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost numeric(10, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 6. Create stock alerts table (references component_library)
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id uuid NOT NULL REFERENCES public.component_library(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'reorder_suggestion')),
  alert_level text NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  suggested_action text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_component_library_supplier ON public.component_library (supplier_id);
CREATE INDEX IF NOT EXISTS idx_component_library_stock_level ON public.component_library (stock_level);
CREATE INDEX IF NOT EXISTS idx_component_library_min_stock ON public.component_library (min_stock_level);
CREATE INDEX IF NOT EXISTS idx_stock_movements_component ON public.stock_movements (component_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_component ON public.stock_alerts (component_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON public.stock_alerts (is_resolved);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers (is_active);

-- Insert sample suppliers
INSERT INTO public.suppliers (name, company_name, contact_person, email, phone, address, city, payment_terms, lead_time_days, minimum_order_amount)
VALUES
  ('AutoTech Supplies', 'AutoTech Supplies Sdn Bhd', 'John Tan', 'sales@autotech.my', '+60123456789', '123 Industrial Park', 'Shah Alam', 'NET 30', 5, 500.00),
  ('Premium Auto Parts', 'Premium Auto Parts Malaysia', 'Sarah Wong', 'orders@premiumauto.my', '+60198765432', '456 Auto Street', 'Petaling Jaya', 'NET 15', 3, 300.00),
  ('Shade Solutions Ltd', 'Shade Solutions Limited', 'Ahmad Rahman', 'info@shadesolutions.my', '+60187654321', '789 Manufacturing Ave', 'Klang', 'NET 45', 7, 200.00),
  ('Digital Auto Systems', 'Digital Auto Systems Sdn Bhd', 'Lisa Chen', 'procurement@digitalauto.my', '+60176543210', '321 Tech Hub', 'Cyberjaya', 'NET 30', 10, 1000.00),
  ('LED Solutions Pro', 'LED Solutions Pro Malaysia', 'Kumar Singh', 'sales@ledsolutions.my', '+60165432109', '654 Light Industrial', 'Subang Jaya', 'NET 30', 4, 150.00)
ON CONFLICT (name) DO NOTHING;

-- Update existing component_library items with supplier relationships and inventory settings
UPDATE public.component_library
SET
  supplier_id = (SELECT id FROM suppliers WHERE name = 'AutoTech Supplies' LIMIT 1),
  min_stock_level = CASE
    WHEN component_type = 'casing' THEN 10
    WHEN component_type = 'audio' THEN 20
    ELSE 15
  END,
  max_stock_level = CASE
    WHEN component_type = 'casing' THEN 50
    WHEN component_type = 'audio' THEN 80
    ELSE 60
  END,
  reorder_point = CASE
    WHEN component_type = 'casing' THEN 15
    WHEN component_type = 'audio' THEN 25
    ELSE 20
  END,
  location = CASE
    WHEN component_type = 'casing' THEN 'Warehouse A'
    WHEN component_type = 'audio' THEN 'Warehouse C'
    ELSE 'Warehouse B'
  END
WHERE supplier_id IS NULL;

-- Create the active_stock_alerts_detailed view using component_library
CREATE OR REPLACE VIEW public.active_stock_alerts_detailed AS
SELECT
  sa.id,
  sa.component_id as inventory_id, -- For compatibility with existing React code
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
  cl.normal_price as selling_price,
  cl.location,
  s.name as supplier_name,
  s.company_name as supplier_company,
  s.lead_time_days as supplier_lead_time,
  GREATEST(0, cl.max_stock_level - cl.stock_level) as suggested_reorder_quantity,
  GREATEST(0, cl.max_stock_level - cl.stock_level) * cl.merchant_price as suggested_reorder_cost
FROM stock_alerts sa
JOIN component_library cl ON sa.component_id = cl.id
LEFT JOIN suppliers s ON cl.supplier_id = s.id
WHERE sa.is_resolved = false AND cl.is_active = true
ORDER BY
  CASE sa.alert_level
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  sa.created_at DESC;

-- Create a view for inventory with alerts using component_library
CREATE OR REPLACE VIEW public.inventory_with_alerts AS
SELECT
  cl.*,
  cl.stock_level as current_stock, -- Alias for compatibility
  c.name as category_name,
  s.name as supplier_name,
  s.company_name as supplier_company,
  s.contact_person as supplier_contact,
  s.email as supplier_email,
  s.phone as supplier_phone,
  s.lead_time_days as supplier_lead_time,
  CASE
    WHEN cl.stock_level = 0 THEN 'out_of_stock'
    WHEN cl.stock_level <= (cl.min_stock_level * 0.5) THEN 'critical'
    WHEN cl.stock_level < cl.min_stock_level THEN 'low'
    WHEN cl.stock_level <= cl.reorder_point THEN 'warning'
    ELSE 'good'
  END as stock_status,
  GREATEST(0, cl.max_stock_level - cl.stock_level) as suggested_reorder_quantity,
  GREATEST(0, cl.max_stock_level - cl.stock_level) * cl.merchant_price as suggested_reorder_cost,
  CASE
    WHEN cl.last_restocked IS NOT NULL
    THEN EXTRACT(days FROM (now() - cl.last_restocked))::integer
    ELSE NULL
  END as days_since_restock,
  (SELECT COUNT(*) FROM stock_alerts sa
   WHERE sa.component_id = cl.id AND sa.is_resolved = false) as active_alerts_count
FROM component_library cl
LEFT JOIN categories c ON cl.component_type = c.name -- Assuming component_type matches category name
LEFT JOIN suppliers s ON cl.supplier_id = s.id
WHERE cl.is_active = true;

-- Function to generate stock alerts for low stock components
CREATE OR REPLACE FUNCTION generate_stock_alerts()
RETURNS void AS $$
BEGIN
  -- Clear existing unresolved alerts
  DELETE FROM stock_alerts WHERE is_resolved = false;

  -- Generate alerts for out of stock items
  INSERT INTO stock_alerts (component_id, alert_type, alert_level, message, suggested_action)
  SELECT
    cl.id,
    'out_of_stock',
    'critical',
    'OUT OF STOCK: ' || cl.name || ' (' || cl.component_sku || ')',
    'Create immediate restock order for ' || cl.max_stock_level || ' units'
  FROM component_library cl
  WHERE cl.stock_level = 0 AND cl.is_active = true;

  -- Generate alerts for critical low stock items
  INSERT INTO stock_alerts (component_id, alert_type, alert_level, message, suggested_action)
  SELECT
    cl.id,
    'low_stock',
    'critical',
    'CRITICAL LOW STOCK: ' || cl.name || ' (' || cl.component_sku || ') - Only ' || cl.stock_level || ' units remaining',
    'Create urgent restock order for ' || (cl.max_stock_level - cl.stock_level) || ' units'
  FROM component_library cl
  WHERE cl.stock_level > 0
    AND cl.stock_level <= (cl.min_stock_level * 0.5)
    AND cl.is_active = true;

  -- Generate alerts for low stock items
  INSERT INTO stock_alerts (component_id, alert_type, alert_level, message, suggested_action)
  SELECT
    cl.id,
    'low_stock',
    'warning',
    'LOW STOCK: ' || cl.name || ' (' || cl.component_sku || ') - ' || cl.stock_level || ' units below minimum',
    'Consider restock order for ' || (cl.max_stock_level - cl.stock_level) || ' units'
  FROM component_library cl
  WHERE cl.stock_level > (cl.min_stock_level * 0.5)
    AND cl.stock_level < cl.min_stock_level
    AND cl.is_active = true;

  -- Generate alerts for reorder point reached
  INSERT INTO stock_alerts (component_id, alert_type, alert_level, message, suggested_action)
  SELECT
    cl.id,
    'reorder_suggestion',
    'info',
    'REORDER POINT REACHED: ' || cl.name || ' (' || cl.component_sku || ')',
    'Consider placing restock order soon'
  FROM component_library cl
  WHERE cl.stock_level >= cl.min_stock_level
    AND cl.stock_level <= cl.reorder_point
    AND cl.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
BEGIN
  SELECT 'RO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(
    COALESCE(
      (SELECT MAX(CAST(substring(order_number FROM '(\d+)$') AS INTEGER)) + 1
       FROM restock_orders
       WHERE order_number LIKE 'RO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'),
      1
    )::text,
    4,
    '0'
  ) INTO new_number;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "suppliers_policy" ON suppliers FOR ALL USING (true);
CREATE POLICY "stock_movements_policy" ON stock_movements FOR ALL USING (true);
CREATE POLICY "restock_orders_policy" ON restock_orders FOR ALL USING (true);
CREATE POLICY "restock_order_items_policy" ON restock_order_items FOR ALL USING (true);
CREATE POLICY "stock_alerts_policy" ON stock_alerts FOR ALL USING (true);

-- Generate initial stock alerts based on current component_library data
SELECT generate_stock_alerts();

-- Success message
SELECT
  'Inventory system successfully integrated with component_library table! ' ||
  'Tables created: suppliers, stock_movements, restock_orders, restock_order_items, stock_alerts. ' ||
  'Views created: active_stock_alerts_detailed, inventory_with_alerts. ' ||
  'Stock alerts generated based on current component_library stock levels.' as result;