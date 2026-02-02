-- Admin Customer Management Functions
-- These functions bypass RLS for admin operations

-- Function to delete a customer profile (admin only)
CREATE OR REPLACE FUNCTION admin_delete_customer(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
  v_user_id uuid;
BEGIN
  -- Get customer info before deletion
  SELECT full_name, user_id INTO v_customer_name, v_user_id
  FROM customer_profiles
  WHERE id = p_customer_id;

  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer not found'
    );
  END IF;

  -- Delete related records first (if not handled by foreign key cascades)
  -- Delete from points_ledger
  DELETE FROM points_ledger WHERE customer_id = p_customer_id;

  -- Delete from reward_redemptions
  DELETE FROM reward_redemptions WHERE customer_id = p_customer_id;

  -- Delete from notification_preferences
  DELETE FROM notification_preferences WHERE customer_id = p_customer_id;

  -- Delete from customer_vouchers
  DELETE FROM customer_vouchers WHERE customer_id = p_customer_id;

  -- Delete from merchant_registrations
  DELETE FROM merchant_registrations WHERE customer_id = p_customer_id;

  -- Delete from secondhand_listings
  DELETE FROM secondhand_listings WHERE seller_id = p_customer_id;

  -- Now delete the customer profile
  DELETE FROM customer_profiles WHERE id = p_customer_id;

  -- Optionally delete the auth user (be careful with this)
  -- If you want to also delete the auth user, uncomment:
  -- IF v_user_id IS NOT NULL THEN
  --   DELETE FROM auth.users WHERE id = v_user_id;
  -- END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_customer', v_customer_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to suspend a customer account (admin only)
CREATE OR REPLACE FUNCTION admin_suspend_customer(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
BEGIN
  -- Update customer to inactive
  UPDATE customer_profiles
  SET
    is_active = false,
    updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING full_name INTO v_customer_name;

  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer_name', v_customer_name,
    'status', 'suspended'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to reactivate a customer account (admin only)
CREATE OR REPLACE FUNCTION admin_reactivate_customer(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
BEGIN
  -- Update customer to active
  UPDATE customer_profiles
  SET
    is_active = true,
    updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING full_name INTO v_customer_name;

  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer_name', v_customer_name,
    'status', 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions to authenticated users (admin check should be done at app level)
GRANT EXECUTE ON FUNCTION admin_delete_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reactivate_customer(uuid) TO authenticated;
