-- Admin Customer Management Functions
-- These functions bypass RLS for admin operations

-- Function to delete a customer profile (admin only)
-- Safely handles tables that may not exist
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

  -- Delete related records first (safely handle missing tables)
  -- Each block catches "relation does not exist" errors

  -- Delete from voucher_usage
  BEGIN
    DELETE FROM voucher_usage WHERE customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from vouchers (assigned_to_customer_id)
  BEGIN
    DELETE FROM vouchers WHERE assigned_to_customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from customer_vouchers
  BEGIN
    DELETE FROM customer_vouchers WHERE customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from points_ledger
  BEGIN
    DELETE FROM points_ledger WHERE customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from reward_redemptions
  BEGIN
    DELETE FROM reward_redemptions WHERE customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from notification_preferences
  BEGIN
    DELETE FROM notification_preferences WHERE customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from merchant_registrations
  BEGIN
    DELETE FROM merchant_registrations WHERE customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from secondhand_listings
  BEGIN
    DELETE FROM secondhand_listings WHERE seller_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete from product_reviews
  BEGIN
    DELETE FROM product_reviews WHERE customer_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Delete cart items for this user
  BEGIN
    DELETE FROM cart_items WHERE user_id = v_user_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Nullify orders reference (don't delete orders, just remove customer link)
  BEGIN
    UPDATE orders SET customer_profile_id = NULL WHERE customer_profile_id = p_customer_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Now delete the customer profile
  DELETE FROM customer_profiles WHERE id = p_customer_id;

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
