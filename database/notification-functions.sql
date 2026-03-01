-- ============================================================================
-- NOTIFICATION SYSTEM - SQL Functions
-- ============================================================================
-- Functions required by the n8n notification workflows:
-- 1. Order Notifications → WhatsApp
-- 2. Return Notifications → WhatsApp
-- 3. Admin Alerts → WhatsApp
-- 4. Payment Reminders → WhatsApp
-- ============================================================================


-- ============================================================================
-- 1. RETURN NOTIFICATION HELPER
-- ============================================================================
-- Used by return-notifications-workflow.json to fetch customer & order info
-- when a return status changes (returns table only has customer_id, not phone)

CREATE OR REPLACE FUNCTION get_return_notification_data(
  p_return_id UUID,
  p_customer_id UUID
)
RETURNS TABLE(
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  order_no TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.full_name::TEXT AS customer_name,
    COALESCE(p.phone, '')::TEXT AS customer_phone,
    COALESCE(a.email, '')::TEXT AS customer_email,
    COALESCE(o.order_no, '')::TEXT AS order_no
  FROM returns r
  JOIN profiles p ON p.id = r.customer_id
  LEFT JOIN auth.users a ON a.id = r.customer_id
  LEFT JOIN orders o ON o.id = r.order_id
  WHERE r.id = p_return_id
    AND r.customer_id = p_customer_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. UNPAID ORDERS FOR PAYMENT REMINDERS
-- ============================================================================
-- Used by payment-reminder-workflow.json (daily cron)
-- Returns orders that are UNPAID and within auto-cancel window (72 hours)
-- Includes hours_since_order for tiered reminder messages

CREATE OR REPLACE FUNCTION get_unpaid_orders_for_reminder()
RETURNS TABLE(
  order_id UUID,
  order_no TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  total DECIMAL,
  created_at TIMESTAMPTZ,
  hours_since_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.order_no::TEXT,
    o.customer_name::TEXT,
    o.customer_phone::TEXT,
    COALESCE(o.customer_email, '')::TEXT AS customer_email,
    o.total,
    o.created_at,
    EXTRACT(EPOCH FROM (NOW() - o.created_at))::INTEGER / 3600 AS hours_since_order
  FROM orders o
  WHERE o.payment_state = 'UNPAID'
    AND o.status NOT IN ('CANCELLED', 'REJECTED')
    -- Only remind for orders between 6 hours and 72 hours old
    AND o.created_at > NOW() - INTERVAL '72 hours'
    AND o.created_at < NOW() - INTERVAL '6 hours'
  ORDER BY o.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 3. LOW STOCK CHECKER
-- ============================================================================
-- Used by admin-alerts-workflow.json to find products below reorder level
-- Can be called via scheduled n8n webhook or Supabase cron

CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  component_sku TEXT,
  component_name TEXT,
  current_stock INTEGER,
  reorder_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name::TEXT AS product_name,
    pc.sku::TEXT AS component_sku,
    pc.name::TEXT AS component_name,
    COALESCE(pc.stock, 0)::INTEGER AS current_stock,
    COALESCE(pc.reorder_level, 5)::INTEGER AS reorder_level
  FROM product_components pc
  JOIN products p ON p.id = pc.product_id
  WHERE pc.stock <= COALESCE(pc.reorder_level, 5)
    AND pc.stock >= 0
  ORDER BY pc.stock ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 4. RETURN STATUS CHANGE WEBHOOK LOGGER
-- ============================================================================
-- Similar to the order webhook logger, this logs return status changes
-- for processing by n8n

CREATE OR REPLACE FUNCTION log_return_status_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload JSONB;
BEGIN
  -- Only trigger on status changes or new returns
  IF TG_OP = 'INSERT' OR
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN

    webhook_payload := jsonb_build_object(
      'event', CASE
        WHEN TG_OP = 'INSERT' THEN 'RETURN_CREATED'
        ELSE 'RETURN_STATUS_CHANGED'
      END,
      'timestamp', NOW()::TEXT,
      'table', 'returns',
      'type', TG_OP,
      'record', jsonb_build_object(
        'id', NEW.id,
        'return_no', NEW.return_no,
        'order_id', NEW.order_id,
        'customer_id', NEW.customer_id,
        'status', NEW.status,
        'reason', NEW.reason,
        'reason_details', NEW.reason_details,
        'refund_method', NEW.refund_method,
        'refund_amount', NEW.refund_amount,
        'return_shipping_free', NEW.return_shipping_free,
        'return_tracking_number', NEW.return_tracking_number,
        'return_courier', NEW.return_courier,
        'admin_notes', NEW.admin_notes,
        'rejection_reason', NEW.rejection_reason,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at
      ),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'status', OLD.status
      ) ELSE '{}'::JSONB END
    );

    -- Log to webhook_logs table
    INSERT INTO webhook_logs (
      event_type,
      payload,
      status
    ) VALUES (
      webhook_payload->>'event',
      webhook_payload,
      'PENDING'
    );

    -- Notify real-time listeners
    PERFORM pg_notify('return_webhooks', webhook_payload::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on returns table
DROP TRIGGER IF EXISTS return_status_webhook_trigger ON returns;

CREATE TRIGGER return_status_webhook_trigger
  AFTER INSERT OR UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION log_return_status_webhook();


-- ============================================================================
-- 5. ADMIN ALERT WEBHOOK LOGGER (for new orders)
-- ============================================================================
-- Logs new orders specifically for admin alerts
-- Separate from the customer notification logger

CREATE OR REPLACE FUNCTION log_admin_alert_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload JSONB;
BEGIN
  -- New order → admin alert
  IF TG_OP = 'INSERT' THEN
    webhook_payload := jsonb_build_object(
      'alert_type', 'NEW_ORDER',
      'table', 'orders',
      'type', 'INSERT',
      'data', jsonb_build_object(
        'order_no', NEW.order_no,
        'customer_name', NEW.customer_name,
        'customer_phone', NEW.customer_phone,
        'total', NEW.total,
        'payment_state', NEW.payment_state,
        'delivery_method', NEW.delivery_method,
        'item_count', NEW.item_count,
        'created_at', NEW.created_at
      )
    );

    INSERT INTO webhook_logs (
      event_type,
      payload,
      status,
      order_id
    ) VALUES (
      'ADMIN_NEW_ORDER',
      webhook_payload,
      'PENDING',
      NEW.id
    );

    PERFORM pg_notify('admin_alerts', webhook_payload::TEXT);
  END IF;

  -- Payment submitted → admin alert
  IF TG_OP = 'UPDATE' AND
     OLD.payment_state IS DISTINCT FROM NEW.payment_state AND
     NEW.payment_state = 'SUBMITTED' THEN

    webhook_payload := jsonb_build_object(
      'alert_type', 'PAYMENT_SUBMITTED',
      'table', 'orders',
      'type', 'UPDATE',
      'data', jsonb_build_object(
        'order_no', NEW.order_no,
        'customer_name', NEW.customer_name,
        'total', NEW.total,
        'created_at', NEW.updated_at
      )
    );

    INSERT INTO webhook_logs (
      event_type,
      payload,
      status,
      order_id
    ) VALUES (
      'ADMIN_PAYMENT_SUBMITTED',
      webhook_payload,
      'PENDING',
      NEW.id
    );

    PERFORM pg_notify('admin_alerts', webhook_payload::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for admin alerts on orders table
DROP TRIGGER IF EXISTS admin_alert_webhook_trigger ON orders;

CREATE TRIGGER admin_alert_webhook_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_alert_webhook();


-- New return → admin alert
CREATE OR REPLACE FUNCTION log_admin_return_alert()
RETURNS TRIGGER AS $$
DECLARE
  webhook_payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    webhook_payload := jsonb_build_object(
      'alert_type', 'NEW_RETURN',
      'table', 'returns',
      'type', 'INSERT',
      'data', jsonb_build_object(
        'return_no', NEW.return_no,
        'reason', NEW.reason,
        'refund_method', NEW.refund_method,
        'customer_id', NEW.customer_id,
        'order_id', NEW.order_id,
        'created_at', NEW.created_at
      )
    );

    INSERT INTO webhook_logs (
      event_type,
      payload,
      status
    ) VALUES (
      'ADMIN_NEW_RETURN',
      webhook_payload,
      'PENDING'
    );

    PERFORM pg_notify('admin_alerts', webhook_payload::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS admin_return_alert_trigger ON returns;

CREATE TRIGGER admin_return_alert_trigger
  AFTER INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_return_alert();


-- ============================================================================
-- 6. AUTO-CANCEL UNPAID ORDERS (72+ hours)
-- ============================================================================
-- Can be called by a daily n8n scheduled workflow or Supabase cron

CREATE OR REPLACE FUNCTION auto_cancel_unpaid_orders()
RETURNS TABLE(
  cancelled_order_no TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH cancelled AS (
    UPDATE orders
    SET
      status = 'CANCELLED',
      updated_at = NOW()
    WHERE payment_state = 'UNPAID'
      AND status NOT IN ('CANCELLED', 'REJECTED')
      AND created_at < NOW() - INTERVAL '72 hours'
    RETURNING order_no, orders.customer_name, orders.customer_phone, orders.total
  )
  SELECT
    c.order_no::TEXT AS cancelled_order_no,
    c.customer_name::TEXT,
    c.customer_phone::TEXT,
    c.total
  FROM cancelled c;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_return_notification_data TO service_role;
GRANT EXECUTE ON FUNCTION get_unpaid_orders_for_reminder TO service_role;
GRANT EXECUTE ON FUNCTION get_low_stock_products TO service_role;
GRANT EXECUTE ON FUNCTION auto_cancel_unpaid_orders TO service_role;

-- Also grant to anon for webhook-based calls using service_role key
GRANT EXECUTE ON FUNCTION get_return_notification_data TO anon;
GRANT EXECUTE ON FUNCTION get_unpaid_orders_for_reminder TO anon;
GRANT EXECUTE ON FUNCTION get_low_stock_products TO anon;
GRANT EXECUTE ON FUNCTION auto_cancel_unpaid_orders TO anon;


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Notification functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - get_return_notification_data(p_return_id, p_customer_id)';
  RAISE NOTICE '  - get_unpaid_orders_for_reminder()';
  RAISE NOTICE '  - get_low_stock_products()';
  RAISE NOTICE '  - auto_cancel_unpaid_orders()';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  - return_status_webhook_trigger (on returns table)';
  RAISE NOTICE '  - admin_alert_webhook_trigger (on orders table)';
  RAISE NOTICE '  - admin_return_alert_trigger (on returns table)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Set up Supabase Database Webhooks pointing to your n8n endpoints.';
END $$;
