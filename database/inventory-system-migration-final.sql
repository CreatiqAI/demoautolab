-- Complete Inventory Management System Migration - FINAL FIXED VERSION
-- Run this SQL to create the inventory system with suppliers

-- 1. Create suppliers table first
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text NULL,
  contact_person text NULL,
  email text NULL,
  phone text NULL,
  address text NULL,
  city text NULL,
  country text NULL DEFAULT 'Malaysia',
  payment_terms text NULL,
  lead_time_days integer NULL DEFAULT 7,
  minimum_order_amount numeric(10, 2) NULL DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT suppliers_name_key UNIQUE (name)
);

-- 2. Create inventory table (enhanced version)
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  component_sku text NOT NULL,
  component_name text NOT NULL,
  category_id uuid NULL,
  supplier_id uuid NULL,
  current_stock integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 10,
  max_stock_level integer NOT NULL DEFAULT 100,
  reorder_point integer NOT NULL DEFAULT 15,
  unit_cost numeric(10, 2) NOT NULL DEFAULT 0.00,
  selling_price numeric(10, 2) NOT NULL DEFAULT 0.00,
  location text NULL,
  barcode text NULL,
  last_restocked timestamp with time zone NULL,
  last_sold timestamp with time zone NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_component_sku_key UNIQUE (component_sku),
  CONSTRAINT inventory_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT inventory_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
  CONSTRAINT inventory_stock_positive CHECK (current_stock >= 0),
  CONSTRAINT inventory_min_max_check CHECK (max_stock_level >= min_stock_level),
  CONSTRAINT inventory_reorder_check CHECK (reorder_point >= min_stock_level)
);

-- 3. Create stock movements table for tracking inventory changes
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL,
  reference_type text NULL, -- 'order', 'restock', 'adjustment', 'return', 'damage'
  reference_id uuid NULL,
  unit_cost numeric(10, 2) NULL,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movements_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE,
  CONSTRAINT stock_movements_quantity_check CHECK (quantity != 0)
);

-- 4. Create restock orders table
CREATE TABLE IF NOT EXISTS public.restock_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  supplier_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
  order_date timestamp with time zone NOT NULL DEFAULT now(),
  expected_delivery_date timestamp with time zone NULL,
  received_date timestamp with time zone NULL,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0.00,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restock_orders_pkey PRIMARY KEY (id),
  CONSTRAINT restock_orders_order_number_key UNIQUE (order_number),
  CONSTRAINT restock_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

-- 5. Create restock order items table
CREATE TABLE IF NOT EXISTS public.restock_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restock_order_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer NOT NULL DEFAULT 0,
  unit_cost numeric(10, 2) NOT NULL,
  total_cost numeric(10, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restock_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT restock_order_items_restock_order_id_fkey FOREIGN KEY (restock_order_id) REFERENCES restock_orders (id) ON DELETE CASCADE,
  CONSTRAINT restock_order_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES inventory (id),
  CONSTRAINT restock_order_items_quantity_positive CHECK (quantity_ordered > 0),
  CONSTRAINT restock_order_items_received_valid CHECK (quantity_received >= 0 AND quantity_received <= quantity_ordered)
);

-- 6. Create stock alerts table (enhanced)
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'reorder_suggestion')),
  alert_level text NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  suggested_action text NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone NULL,
  resolved_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT stock_alerts_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES inventory (id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_current_stock ON public.inventory USING btree (current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_min_stock ON public.inventory USING btree (min_stock_level);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON public.inventory USING btree (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory USING btree (component_sku);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON public.inventory USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON public.stock_movements USING btree (inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements USING btree (movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers USING btree (name);

CREATE INDEX IF NOT EXISTS idx_restock_orders_status ON public.restock_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_restock_orders_supplier ON public.restock_orders USING btree (supplier_id);
CREATE INDEX IF NOT EXISTS idx_restock_orders_date ON public.restock_orders USING btree (order_date);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON public.stock_alerts USING btree (is_resolved);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_level ON public.stock_alerts USING btree (alert_level);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_inventory ON public.stock_alerts USING btree (inventory_id);

-- Create or replace function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS set_suppliers_updated_at ON suppliers;
CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_inventory_updated_at ON inventory;
CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_restock_orders_updated_at ON restock_orders;
CREATE TRIGGER set_restock_orders_updated_at
  BEFORE UPDATE ON restock_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Function to automatically create stock alerts when stock is low
CREATE OR REPLACE FUNCTION check_stock_levels() RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing alerts for this inventory item
  DELETE FROM stock_alerts
  WHERE inventory_id = NEW.id
    AND alert_type IN ('low_stock', 'out_of_stock')
    AND is_resolved = false;

  -- Check stock levels and create appropriate alerts
  IF NEW.current_stock = 0 THEN
    INSERT INTO stock_alerts (inventory_id, alert_type, alert_level, message, suggested_action)
    VALUES (
      NEW.id,
      'out_of_stock',
      'critical',
      'OUT OF STOCK: ' || NEW.component_name || ' (' || NEW.component_sku || ')',
      'Create immediate restock order for ' || NEW.max_stock_level || ' units'
    );
  ELSIF NEW.current_stock <= (NEW.min_stock_level * 0.5) THEN
    INSERT INTO stock_alerts (inventory_id, alert_type, alert_level, message, suggested_action)
    VALUES (
      NEW.id,
      'low_stock',
      'critical',
      'CRITICAL LOW STOCK: ' || NEW.component_name || ' (' || NEW.component_sku || ') - Only ' || NEW.current_stock || ' units remaining',
      'Create urgent restock order for ' || (NEW.max_stock_level - NEW.current_stock) || ' units'
    );
  ELSIF NEW.current_stock < NEW.min_stock_level THEN
    INSERT INTO stock_alerts (inventory_id, alert_type, alert_level, message, suggested_action)
    VALUES (
      NEW.id,
      'low_stock',
      'warning',
      'LOW STOCK: ' || NEW.component_name || ' (' || NEW.component_sku || ') - ' || NEW.current_stock || ' units below minimum',
      'Consider restock order for ' || (NEW.max_stock_level - NEW.current_stock) || ' units'
    );
  ELSIF NEW.current_stock <= NEW.reorder_point THEN
    INSERT INTO stock_alerts (inventory_id, alert_type, alert_level, message, suggested_action)
    VALUES (
      NEW.id,
      'reorder_suggestion',
      'info',
      'REORDER POINT REACHED: ' || NEW.component_name || ' (' || NEW.component_sku || ')',
      'Consider placing restock order soon'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stock alert generation
DROP TRIGGER IF EXISTS trigger_check_stock_levels ON inventory;
CREATE TRIGGER trigger_check_stock_levels
  AFTER INSERT OR UPDATE OF current_stock ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_levels();

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  current_date_str TEXT;
BEGIN
  current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT 'RO-' || current_date_str || '-' || LPAD(
    COALESCE(
      (SELECT MAX(CAST(RIGHT(order_number, 4) AS INTEGER)) + 1
       FROM restock_orders
       WHERE order_number LIKE 'RO-' || current_date_str || '-%'),
      1
    )::TEXT,
    4,
    '0'
  ) INTO new_number;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Insert sample suppliers
INSERT INTO public.suppliers (name, company_name, contact_person, email, phone, address, city, payment_terms, lead_time_days, minimum_order_amount) VALUES
  ('AutoTech Supplies', 'AutoTech Supplies Sdn Bhd', 'John Tan', 'sales@autotech.my', '+60123456789', '123 Industrial Park', 'Shah Alam', 'NET 30', 5, 500.00),
  ('Premium Auto Parts', 'Premium Auto Parts Malaysia', 'Sarah Wong', 'orders@premiumauto.my', '+60198765432', '456 Auto Street', 'Petaling Jaya', 'NET 15', 3, 300.00),
  ('Shade Solutions Ltd', 'Shade Solutions Limited', 'Ahmad Rahman', 'info@shadesolutions.my', '+60187654321', '789 Manufacturing Ave', 'Klang', 'NET 45', 7, 200.00),
  ('Digital Auto Systems', 'Digital Auto Systems Sdn Bhd', 'Lisa Chen', 'procurement@digitalauto.my', '+60176543210', '321 Tech Hub', 'Cyberjaya', 'NET 30', 10, 1000.00),
  ('LED Solutions Pro', 'LED Solutions Pro Malaysia', 'Kumar Singh', 'sales@ledsolutions.my', '+60165432109', '654 Light Industrial', 'Subang Jaya', 'NET 30', 4, 150.00)
ON CONFLICT (name) DO NOTHING;

-- Insert sample inventory data with proper supplier relationships
INSERT INTO public.inventory (component_sku, component_name, category_id, supplier_id, current_stock, min_stock_level, max_stock_level, reorder_point, unit_cost, selling_price, location) VALUES
  ('BM-026N', 'BMW X3 9 Inch Casing',
   (SELECT id FROM categories WHERE name ILIKE '%9%inch%' OR name ILIKE '%casing%' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'AutoTech Supplies' LIMIT 1),
   2, 10, 50, 15, 45.00, 89.00, 'Warehouse A-1'),
  ('MC-R53CS', 'Mini Cooper R53 9 Inch Casing',
   (SELECT id FROM categories WHERE name ILIKE '%9%inch%' OR name ILIKE '%casing%' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'Premium Auto Parts' LIMIT 1),
   5, 15, 60, 20, 52.00, 95.00, 'Warehouse A-2'),
  ('NS-PLUS-01', 'NinjaShades Plus Magnetic Sunshade',
   (SELECT id FROM categories WHERE name ILIKE '%shade%' OR name ILIKE '%ninja%' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'Shade Solutions Ltd' LIMIT 1),
   8, 12, 40, 15, 28.00, 55.00, 'Warehouse B-1'),
  ('HD-AUDIO-12', '12.5 Inch Android Head Unit',
   (SELECT id FROM categories WHERE name ILIKE '%12%inch%' OR name ILIKE '%android%' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'Digital Auto Systems' LIMIT 1),
   15, 20, 80, 25, 85.00, 180.00, 'Warehouse C-1'),
  ('LED-AMB-001', 'Ambient LED Light Strip',
   (SELECT id FROM categories WHERE name ILIKE '%led%' OR name ILIKE '%light%' LIMIT 1),
   (SELECT id FROM suppliers WHERE name = 'LED Solutions Pro' LIMIT 1),
   25, 30, 100, 35, 15.00, 35.00, 'Warehouse D-1')
ON CONFLICT (component_sku) DO NOTHING;

-- Create useful views for easy querying
CREATE OR REPLACE VIEW inventory_with_alerts AS
SELECT
  i.*,
  c.name as category_name,
  s.name as supplier_name,
  s.company_name as supplier_company,
  s.contact_person as supplier_contact,
  s.email as supplier_email,
  s.phone as supplier_phone,
  s.lead_time_days as supplier_lead_time,
  CASE
    WHEN i.current_stock = 0 THEN 'out_of_stock'
    WHEN i.current_stock <= (i.min_stock_level * 0.5) THEN 'critical'
    WHEN i.current_stock < i.min_stock_level THEN 'low'
    WHEN i.current_stock <= i.reorder_point THEN 'warning'
    ELSE 'good'
  END as stock_status,
  GREATEST(0, i.max_stock_level - i.current_stock) as suggested_reorder_quantity,
  (i.max_stock_level - i.current_stock) * i.unit_cost as suggested_reorder_cost,
  CASE
    WHEN i.last_restocked IS NOT NULL
    THEN EXTRACT(days FROM (now() - i.last_restocked))::integer
    ELSE NULL
  END as days_since_restock,
  -- Count active alerts
  (SELECT COUNT(*) FROM stock_alerts sa
   WHERE sa.inventory_id = i.id AND sa.is_resolved = false) as active_alerts_count
FROM inventory i
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE i.is_active = true;

-- Create view for active alerts with full details
CREATE OR REPLACE VIEW active_stock_alerts_detailed AS
SELECT
  sa.*,
  i.component_sku,
  i.component_name,
  i.current_stock,
  i.min_stock_level,
  i.max_stock_level,
  i.reorder_point,
  i.unit_cost,
  i.location,
  c.name as category_name,
  s.name as supplier_name,
  s.company_name as supplier_company,
  s.lead_time_days as supplier_lead_time,
  GREATEST(0, i.max_stock_level - i.current_stock) as suggested_reorder_quantity,
  (i.max_stock_level - i.current_stock) * i.unit_cost as suggested_reorder_cost
FROM stock_alerts sa
JOIN inventory i ON sa.inventory_id = i.id
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE sa.is_resolved = false
ORDER BY
  CASE sa.alert_level
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  sa.created_at DESC;

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Enable all for authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON inventory;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON stock_movements;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON restock_orders;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON restock_order_items;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON stock_alerts;

-- Create RLS policies for authenticated users (correct syntax)
CREATE POLICY "Enable all for authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON inventory FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON stock_movements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON restock_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON restock_order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON stock_alerts FOR ALL USING (auth.role() = 'authenticated');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Inventory Management System migration completed successfully!';
    RAISE NOTICE 'Created tables: suppliers, inventory, stock_movements, restock_orders, restock_order_items, stock_alerts';
    RAISE NOTICE 'Created views: inventory_with_alerts, active_stock_alerts_detailed';
    RAISE NOTICE 'Sample data has been inserted for suppliers and inventory items.';
    RAISE NOTICE 'Row Level Security has been enabled with proper policies.';
END $$;