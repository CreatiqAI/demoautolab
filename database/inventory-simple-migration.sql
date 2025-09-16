-- Simple Inventory Management System Migration
-- This version avoids complex references that might cause errors

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

-- 2. Create inventory table (without foreign key constraints initially)
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  component_sku text NOT NULL UNIQUE,
  component_name text NOT NULL,
  category_id uuid,
  supplier_id uuid,
  current_stock integer DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  max_stock_level integer DEFAULT 100,
  reorder_point integer DEFAULT 15,
  unit_cost numeric(10, 2) DEFAULT 0.00,
  selling_price numeric(10, 2) DEFAULT 0.00,
  location text,
  barcode text,
  last_restocked timestamptz,
  last_sold timestamptz,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create stock movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL CHECK (quantity != 0),
  reference_type text,
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
  inventory_id uuid NOT NULL,
  quantity_ordered integer NOT NULL CHECK (quantity_ordered > 0),
  quantity_received integer DEFAULT 0,
  unit_cost numeric(10, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 6. Create stock alerts table
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory (component_sku);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory (category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory (current_stock);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers (is_active);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON stock_alerts (is_resolved);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_inventory ON stock_alerts (inventory_id);

-- Insert sample suppliers
INSERT INTO suppliers (name, company_name, contact_person, email, phone, address, city, payment_terms, lead_time_days, minimum_order_amount)
VALUES
  ('AutoTech Supplies', 'AutoTech Supplies Sdn Bhd', 'John Tan', 'sales@autotech.my', '+60123456789', '123 Industrial Park', 'Shah Alam', 'NET 30', 5, 500.00),
  ('Premium Auto Parts', 'Premium Auto Parts Malaysia', 'Sarah Wong', 'orders@premiumauto.my', '+60198765432', '456 Auto Street', 'Petaling Jaya', 'NET 15', 3, 300.00),
  ('Shade Solutions Ltd', 'Shade Solutions Limited', 'Ahmad Rahman', 'info@shadesolutions.my', '+60187654321', '789 Manufacturing Ave', 'Klang', 'NET 45', 7, 200.00),
  ('Digital Auto Systems', 'Digital Auto Systems Sdn Bhd', 'Lisa Chen', 'procurement@digitalauto.my', '+60176543210', '321 Tech Hub', 'Cyberjaya', 'NET 30', 10, 1000.00),
  ('LED Solutions Pro', 'LED Solutions Pro Malaysia', 'Kumar Singh', 'sales@ledsolutions.my', '+60165432109', '654 Light Industrial', 'Subang Jaya', 'NET 30', 4, 150.00)
ON CONFLICT (name) DO NOTHING;

-- Insert sample inventory (using supplier IDs)
INSERT INTO inventory (component_sku, component_name, supplier_id, current_stock, min_stock_level, max_stock_level, reorder_point, unit_cost, selling_price, location)
SELECT
  'BM-026N', 'BMW X3 9 Inch Casing', s.id, 2, 10, 50, 15, 45.00, 89.00, 'Warehouse A-1'
FROM suppliers s WHERE s.name = 'AutoTech Supplies'
ON CONFLICT (component_sku) DO NOTHING;

INSERT INTO inventory (component_sku, component_name, supplier_id, current_stock, min_stock_level, max_stock_level, reorder_point, unit_cost, selling_price, location)
SELECT
  'MC-R53CS', 'Mini Cooper R53 9 Inch Casing', s.id, 5, 15, 60, 20, 52.00, 95.00, 'Warehouse A-2'
FROM suppliers s WHERE s.name = 'Premium Auto Parts'
ON CONFLICT (component_sku) DO NOTHING;

INSERT INTO inventory (component_sku, component_name, supplier_id, current_stock, min_stock_level, max_stock_level, reorder_point, unit_cost, selling_price, location)
SELECT
  'NS-PLUS-01', 'NinjaShades Plus Magnetic Sunshade', s.id, 8, 12, 40, 15, 28.00, 55.00, 'Warehouse B-1'
FROM suppliers s WHERE s.name = 'Shade Solutions Ltd'
ON CONFLICT (component_sku) DO NOTHING;

INSERT INTO inventory (component_sku, component_name, supplier_id, current_stock, min_stock_level, max_stock_level, reorder_point, unit_cost, selling_price, location)
SELECT
  'HD-AUDIO-12', '12.5 Inch Android Head Unit', s.id, 15, 20, 80, 25, 85.00, 180.00, 'Warehouse C-1'
FROM suppliers s WHERE s.name = 'Digital Auto Systems'
ON CONFLICT (component_sku) DO NOTHING;

INSERT INTO inventory (component_sku, component_name, supplier_id, current_stock, min_stock_level, max_stock_level, reorder_point, unit_cost, selling_price, location)
SELECT
  'LED-AMB-001', 'Ambient LED Light Strip', s.id, 25, 30, 100, 35, 15.00, 35.00, 'Warehouse D-1'
FROM suppliers s WHERE s.name = 'LED Solutions Pro'
ON CONFLICT (component_sku) DO NOTHING;

-- Create the essential view that the React app needs
CREATE OR REPLACE VIEW active_stock_alerts_detailed AS
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
  i.component_sku,
  i.component_name,
  i.current_stock,
  i.min_stock_level,
  i.max_stock_level,
  i.reorder_point,
  i.unit_cost,
  i.selling_price,
  i.location,
  s.name as supplier_name,
  s.company_name as supplier_company,
  s.lead_time_days as supplier_lead_time,
  (i.max_stock_level - i.current_stock) as suggested_reorder_quantity,
  (i.max_stock_level - i.current_stock) * i.unit_cost as suggested_reorder_cost
FROM stock_alerts sa
JOIN inventory i ON sa.inventory_id = i.id
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE sa.is_resolved = false
ORDER BY
  CASE sa.alert_level
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  sa.created_at DESC;

-- Enable RLS and create simple policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Simple policies for authenticated users
CREATE POLICY "suppliers_policy" ON suppliers FOR ALL USING (true);
CREATE POLICY "inventory_policy" ON inventory FOR ALL USING (true);
CREATE POLICY "stock_movements_policy" ON stock_movements FOR ALL USING (true);
CREATE POLICY "restock_orders_policy" ON restock_orders FOR ALL USING (true);
CREATE POLICY "restock_order_items_policy" ON restock_order_items FOR ALL USING (true);
CREATE POLICY "stock_alerts_policy" ON stock_alerts FOR ALL USING (true);

-- Generate some sample stock alerts for low stock items
INSERT INTO stock_alerts (inventory_id, alert_type, alert_level, message, suggested_action)
SELECT
  i.id,
  'low_stock',
  'critical',
  'CRITICAL LOW STOCK: ' || i.component_name || ' (' || i.component_sku || ') - Only ' || i.current_stock || ' units remaining',
  'Create urgent restock order for ' || (i.max_stock_level - i.current_stock) || ' units'
FROM inventory i
WHERE i.current_stock < i.min_stock_level
ON CONFLICT DO NOTHING;

-- Function to generate order numbers
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

-- Success message
SELECT 'Inventory system created successfully! Tables: suppliers, inventory, stock_movements, restock_orders, restock_order_items, stock_alerts, and view: active_stock_alerts_detailed' as result;