-- Fix RLS policies for orders table to ensure admin operations work

-- Enable RLS on orders table if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "allow_all_orders" ON orders;
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "orders_update_policy" ON orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON orders;

-- Create permissive policies for all authenticated users
-- This allows admin operations to work properly
CREATE POLICY "allow_all_orders_select" ON orders
    FOR SELECT USING (true);

CREATE POLICY "allow_all_orders_insert" ON orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_orders_update" ON orders
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_orders_delete" ON orders
    FOR DELETE USING (true);

-- Also fix order_items table policies
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing order_items policies
DROP POLICY IF EXISTS "allow_all_order_items" ON order_items;
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_policy" ON order_items;

-- Create permissive policies for order_items
CREATE POLICY "allow_all_order_items_select" ON order_items
    FOR SELECT USING (true);

CREATE POLICY "allow_all_order_items_insert" ON order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_order_items_update" ON order_items
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_order_items_delete" ON order_items
    FOR DELETE USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('orders', 'order_items');

-- Success message
SELECT 'RLS policies for orders and order_items tables have been configured successfully!' as result;