-- Quick Fix for Payment Processing
-- This creates the process_payment_response function to handle payment status updates

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS process_payment_response(uuid, text, jsonb);

-- Create the payment processing function
CREATE OR REPLACE FUNCTION process_payment_response(
  p_order_id UUID,
  p_status TEXT,
  p_payment_details JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_new_payment_state TEXT;
  v_new_status TEXT; -- Using TEXT to avoid enum type issues
BEGIN
  -- Map payment status to payment_state values
  IF p_status = 'success' OR p_status = 'SUCCESS' THEN
    v_new_payment_state := 'SUCCESS';
    v_new_status := 'PROCESSING';  -- Order moves to processing after successful payment
  ELSIF p_status = 'failed' OR p_status = 'FAILED' OR p_status = 'unsuccessful' THEN
    v_new_payment_state := 'FAILED';
    v_new_status := 'PENDING_PAYMENT';  -- Keep as pending payment for retry
  ELSE
    v_new_payment_state := 'PENDING';
    v_new_status := 'PENDING_PAYMENT';
  END IF;

  -- Update order with new payment state
  UPDATE orders
  SET
    payment_state = v_new_payment_state,
    status = v_new_status,
    payment_gateway_response = p_payment_details,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found', p_order_id;
  END IF;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'payment_state', v_new_payment_state,
    'status', v_new_status,
    'message', 'Payment processed successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_payment_response(UUID, TEXT, JSONB) TO authenticated, anon;

-- Success message
SELECT '✅ Payment processing function created successfully!' as status;
