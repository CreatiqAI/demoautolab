-- =====================================================
-- REMOVE UNUSED FEATURES
-- =====================================================
-- Remove route management and supplier management features

-- Drop route-related tables
DROP TABLE IF EXISTS route_stops CASCADE;
DROP TABLE IF EXISTS delivery_routes CASCADE;
DROP TABLE IF EXISTS route_optimization_logs CASCADE;

-- Drop supplier-related tables
DROP TABLE IF EXISTS restock_order_items CASCADE;
DROP TABLE IF EXISTS restock_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Drop route-related functions
DROP FUNCTION IF EXISTS optimize_delivery_route(uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_route_distance(jsonb[]) CASCADE;
DROP FUNCTION IF EXISTS get_route_summary(uuid) CASCADE;

-- Drop supplier-related functions
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Unused features removed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Removed:';
  RAISE NOTICE '  - Route Management tables and functions';
  RAISE NOTICE '  - Supplier Management tables';
  RAISE NOTICE '  - Restock Order tables';
  RAISE NOTICE '';
  RAISE NOTICE 'System cleaned up and ready!';
END $$;
