-- ============================================================================
-- WEBHOOK SETUP FOR N8N INTEGRATION
-- ============================================================================
-- This script sets up database triggers and functions to send webhook
-- notifications to n8n when order status changes occur.
--
-- The webhook payload can then be processed by n8n to:
-- 1. Send to 2ndu.ai for WhatsApp notifications
-- 2. Update external systems
-- 3. Trigger other automated workflows
-- ============================================================================

-- Configuration: Replace with your actual n8n webhook URL
-- You can set this as a secret in Supabase or hardcode during setup
-- ALTER DATABASE postgres SET app.webhook_url = 'https://your-n8n-instance.com/webhook/xxxxx';

-- ============================================================================
-- 1. Create the webhook_logs table to track outgoing webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON webhook_logs(order_id);

-- ============================================================================
-- 2. Create the webhook notification function
-- ============================================================================
-- Note: Supabase Edge Functions or Database Webhooks are recommended for
-- production use. This SQL function logs the webhook data which can be
-- processed by a scheduled job or Supabase Edge Function.

CREATE OR REPLACE FUNCTION log_order_status_webhook()
RETURNS TRIGGER AS $$
DECLARE
    webhook_payload JSONB;
    customer_phone TEXT;
    customer_name TEXT;
BEGIN
    -- Only trigger on status changes or new orders
    IF TG_OP = 'INSERT' OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR
       (TG_OP = 'UPDATE' AND OLD.courier_tracking_number IS DISTINCT FROM NEW.courier_tracking_number) THEN

        -- Get customer info
        customer_phone := NEW.customer_phone;
        customer_name := NEW.customer_name;

        -- Build webhook payload
        webhook_payload := jsonb_build_object(
            'event', CASE
                WHEN TG_OP = 'INSERT' THEN 'ORDER_CREATED'
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'ORDER_STATUS_CHANGED'
                WHEN OLD.courier_tracking_number IS DISTINCT FROM NEW.courier_tracking_number THEN 'TRACKING_NUMBER_ADDED'
                ELSE 'ORDER_UPDATED'
            END,
            'timestamp', NOW()::TEXT,
            'order', jsonb_build_object(
                'id', NEW.id,
                'order_no', NEW.order_no,
                'status', NEW.status,
                'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
                'payment_state', NEW.payment_state,
                'total', NEW.total,
                'delivery_method', NEW.delivery_method,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at
            ),
            'customer', jsonb_build_object(
                'name', customer_name,
                'phone', customer_phone,
                'email', NEW.customer_email
            ),
            'courier', jsonb_build_object(
                'provider', NEW.courier_provider,
                'tracking_number', NEW.courier_tracking_number,
                'shipment_id', NEW.courier_shipment_id
            ),
            'delivery_address', NEW.delivery_address
        );

        -- Log the webhook for processing
        INSERT INTO webhook_logs (
            event_type,
            payload,
            status,
            order_id
        ) VALUES (
            webhook_payload->>'event',
            webhook_payload,
            'PENDING',
            NEW.id
        );

        -- Notify via pg_notify for real-time listeners (optional)
        PERFORM pg_notify('order_webhooks', webhook_payload::TEXT);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Create the trigger on orders table
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS order_status_webhook_trigger ON orders;

-- Create new trigger
CREATE TRIGGER order_status_webhook_trigger
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_webhook();

-- ============================================================================
-- 4. Create a view to easily see pending webhooks
-- ============================================================================

CREATE OR REPLACE VIEW pending_webhooks AS
SELECT
    wl.id,
    wl.event_type,
    wl.payload,
    wl.created_at,
    wl.retry_count,
    o.order_no,
    o.customer_name,
    o.customer_phone
FROM webhook_logs wl
LEFT JOIN orders o ON wl.order_id = o.id
WHERE wl.status = 'PENDING'
ORDER BY wl.created_at ASC;

-- ============================================================================
-- 5. Function to mark webhook as sent (called by Edge Function)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_webhook_sent(
    p_webhook_id UUID,
    p_response_code INTEGER DEFAULT NULL,
    p_response_body TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE webhook_logs
    SET
        status = 'SENT',
        sent_at = NOW(),
        response_code = p_response_code,
        response_body = p_response_body
    WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Function to mark webhook as failed (called by Edge Function)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_webhook_failed(
    p_webhook_id UUID,
    p_error_message TEXT,
    p_response_code INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE webhook_logs
    SET
        status = 'FAILED',
        error_message = p_error_message,
        response_code = p_response_code,
        retry_count = retry_count + 1
    WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Function to retry failed webhooks (can be called by cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_failed_webhooks_for_retry(
    p_max_retries INTEGER DEFAULT 3
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE webhook_logs
    SET status = 'PENDING'
    WHERE status = 'FAILED'
    AND retry_count < p_max_retries
    AND created_at > NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Cleanup function for old webhook logs
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_logs
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
    AND status = 'SENT';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- 1. SUPABASE DATABASE WEBHOOKS (Recommended for production):
--    Go to Supabase Dashboard > Database > Webhooks
--    Create a new webhook:
--    - Name: order-status-notifications
--    - Table: orders
--    - Events: INSERT, UPDATE
--    - HTTP Request: POST to your n8n webhook URL
--    - HTTP Headers: Content-Type: application/json
--
-- 2. EDGE FUNCTION APPROACH (More control):
--    Create a Supabase Edge Function that:
--    a. Listens to pg_notify('order_webhooks')
--    b. Or polls the pending_webhooks view
--    c. Sends HTTP POST to n8n
--    d. Calls mark_webhook_sent() or mark_webhook_failed()
--
-- 3. N8N WORKFLOW EXAMPLE:
--    Webhook Node (receive) ->
--    IF Node (check event type) ->
--    HTTP Node (send to 2ndu.ai WhatsApp API)
--
-- 4. SAMPLE N8N PAYLOAD:
--    {
--      "event": "ORDER_STATUS_CHANGED",
--      "timestamp": "2024-01-15T10:30:00Z",
--      "order": {
--        "id": "uuid",
--        "order_no": "ORD-ABC123",
--        "status": "OUT_FOR_DELIVERY",
--        "previous_status": "READY_FOR_DELIVERY",
--        ...
--      },
--      "customer": {
--        "name": "John Doe",
--        "phone": "+60123456789",
--        "email": "john@example.com"
--      },
--      "courier": {
--        "provider": "JNT",
--        "tracking_number": "JNT123456789"
--      }
--    }
--
-- ============================================================================

-- Grant permissions
GRANT SELECT ON pending_webhooks TO authenticated;
GRANT EXECUTE ON FUNCTION mark_webhook_sent TO service_role;
GRANT EXECUTE ON FUNCTION mark_webhook_failed TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Webhook setup completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up Supabase Database Webhook or Edge Function';
    RAISE NOTICE '2. Configure n8n webhook endpoint';
    RAISE NOTICE '3. Connect n8n to 2ndu.ai WhatsApp API';
END $$;
