-- =====================================================
-- RESTORE STOCK ALERTS VIEW (WITHOUT SUPPLIERS)
-- =====================================================
-- Recreate the active_stock_alerts_detailed view without supplier dependencies

-- First, make sure we have the category_name column
ALTER TABLE component_library ADD COLUMN IF NOT EXISTS category_name TEXT;

-- Recreate the active_stock_alerts_detailed view WITHOUT supplier references
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
  COALESCE(cl.category_name, cl.component_type) as category_name,
  cl.stock_level as current_stock,
  COALESCE(cl.min_stock_level, 10) as min_stock_level,
  COALESCE(cl.max_stock_level, 100) as max_stock_level,
  COALESCE(cl.reorder_point, 15) as reorder_point,
  cl.merchant_price as unit_cost,
  cl.normal_price as selling_price,
  COALESCE(cl.location, 'Main Warehouse') as location,
  'Default Supplier' as supplier_name,
  'Auto Lab Supplies' as supplier_company,
  7 as supplier_lead_time,
  GREATEST(0, COALESCE(cl.max_stock_level, 100) - cl.stock_level) as suggested_reorder_quantity,
  GREATEST(0, COALESCE(cl.max_stock_level, 100) - cl.stock_level) * cl.merchant_price as suggested_reorder_cost
FROM stock_alerts sa
JOIN component_library cl ON sa.component_id = cl.id
WHERE sa.is_resolved = false AND cl.is_active = true
ORDER BY
  CASE sa.alert_level
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  sa.created_at DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Stock alerts view restored successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'View: active_stock_alerts_detailed';
  RAISE NOTICE 'Status: Ready (without supplier dependencies)';
  RAISE NOTICE '';
  RAISE NOTICE 'Stock alerts should now work correctly!';
END $$;
