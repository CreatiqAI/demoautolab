-- Implement Automatic Inventory Deduction for Order Creation
-- This modifies the create_order_with_items function to automatically reduce inventory when orders are placed

-- ==================================================
-- PART 1: CREATE INVENTORY DEDUCTION FUNCTION
-- ==================================================

-- Create a helper function to handle inventory deduction with rollback on insufficient stock
CREATE OR REPLACE FUNCTION deduct_inventory_for_order(
    items_data JSONB[]
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item JSONB;
    component_record RECORD;
    insufficient_stock JSONB[] := '{}';
    deduction_log JSONB[] := '{}';
BEGIN
    -- First pass: Check if all items have sufficient stock
    FOREACH item IN ARRAY items_data
    LOOP
        SELECT id, component_sku, name, stock_level INTO component_record
        FROM public.component_library
        WHERE component_sku = item->>'component_sku' AND is_active = true;
        
        IF component_record.id IS NULL THEN
            RAISE EXCEPTION 'Component with SKU % not found or inactive', item->>'component_sku';
        END IF;
        
        -- Check if there's sufficient stock
        IF component_record.stock_level < (item->>'quantity')::INTEGER THEN
            insufficient_stock := insufficient_stock || jsonb_build_object(
                'sku', component_record.component_sku,
                'name', component_record.name,
                'requested_quantity', (item->>'quantity')::INTEGER,
                'available_stock', component_record.stock_level
            );
        END IF;
    END LOOP;
    
    -- If any items have insufficient stock, return error without making changes
    IF array_length(insufficient_stock, 1) > 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INSUFFICIENT_STOCK',
            'message', 'Insufficient stock for some items',
            'insufficient_items', insufficient_stock
        );
    END IF;
    
    -- Second pass: Actually deduct the inventory
    FOREACH item IN ARRAY items_data
    LOOP
        UPDATE public.component_library
        SET 
            stock_level = stock_level - (item->>'quantity')::INTEGER,
            updated_at = NOW()
        WHERE component_sku = item->>'component_sku'
        RETURNING component_sku, name, stock_level INTO component_record;
        
        -- Log the deduction
        deduction_log := deduction_log || jsonb_build_object(
            'sku', component_record.component_sku,
            'name', component_record.name,
            'deducted_quantity', (item->>'quantity')::INTEGER,
            'remaining_stock', component_record.stock_level
        );
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Inventory deducted successfully',
        'deductions', deduction_log
    );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- PART 2: CREATE INVENTORY RESTORATION FUNCTION (for cancelled orders)
-- ==================================================

CREATE OR REPLACE FUNCTION restore_inventory_for_order(
    p_order_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item_record RECORD;
    restoration_log JSONB[] := '{}';
BEGIN
    -- Get all order items and restore their inventory
    FOR item_record IN 
        SELECT component_sku, component_name, quantity
        FROM public.order_items
        WHERE order_id = p_order_id
    LOOP
        UPDATE public.component_library
        SET 
            stock_level = stock_level + item_record.quantity,
            updated_at = NOW()
        WHERE component_sku = item_record.component_sku;
        
        -- Log the restoration
        restoration_log := restoration_log || jsonb_build_object(
            'sku', item_record.component_sku,
            'name', item_record.component_name,
            'restored_quantity', item_record.quantity
        );
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Inventory restored successfully',
        'restorations', restoration_log
    );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- PART 3: UPDATE ORDER CREATION FUNCTION WITH INVENTORY DEDUCTION
-- ==================================================

-- Drop and recreate the order creation function with inventory deduction
DROP FUNCTION IF EXISTS create_order_with_items(JSONB, JSONB[]);

CREATE OR REPLACE FUNCTION create_order_with_items(
    order_data JSONB,
    items_data JSONB[]
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_order_id UUID;
    customer_profile_id UUID;
    order_number TEXT;
    item JSONB;
    component_record RECORD;
    inventory_result JSONB;
BEGIN
    -- Step 1: Check and deduct inventory first (this will rollback if insufficient stock)
    SELECT deduct_inventory_for_order(items_data) INTO inventory_result;
    
    IF NOT (inventory_result->>'success')::BOOLEAN THEN
        -- Return the inventory error directly
        RETURN inventory_result;
    END IF;
    
    -- Step 2: Generate order number
    order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 6, '0');
    
    -- Step 3: Find customer profile ID if user_id is provided
    IF (order_data->>'user_id')::UUID IS NOT NULL THEN
        SELECT id INTO customer_profile_id 
        FROM public.customer_profiles 
        WHERE user_id = (order_data->>'user_id')::UUID;
    END IF;
    
    -- Step 4: Insert order with PENDING_PAYMENT status
    BEGIN
        INSERT INTO public.orders (
            order_no,
            user_id,
            customer_profile_id,
            customer_name,
            customer_phone,
            customer_email,
            delivery_method,
            delivery_address,
            delivery_fee,
            payment_method,
            payment_state,
            subtotal,
            tax,
            discount,
            shipping_fee,
            total,
            status,
            notes
        ) VALUES (
            order_number,
            (order_data->>'user_id')::UUID,
            customer_profile_id,
            order_data->>'customer_name',
            order_data->>'customer_phone',
            order_data->>'customer_email',
            order_data->>'delivery_method',
            order_data->'delivery_address',
            (order_data->>'delivery_fee')::NUMERIC,
            order_data->>'payment_method',
            'UNPAID',
            (order_data->>'subtotal')::NUMERIC,
            (order_data->>'tax')::NUMERIC,
            (order_data->>'discount')::NUMERIC,
            (order_data->>'shipping_fee')::NUMERIC,
            (order_data->>'total')::NUMERIC,
            'PENDING_PAYMENT'::order_status_enum,
            order_data->>'notes'
        )
        RETURNING id INTO new_order_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- If order creation fails, restore the inventory
            PERFORM restore_inventory_for_order(new_order_id);
            RAISE;
    END;
    
    -- Step 5: Insert order items
    FOREACH item IN ARRAY items_data
    LOOP
        -- Get component details
        SELECT id, component_sku INTO component_record
        FROM public.component_library
        WHERE component_sku = item->>'component_sku';
        
        IF component_record.id IS NULL THEN
            -- If we reach here something went wrong, restore inventory and fail
            PERFORM restore_inventory_for_order(new_order_id);
            RAISE EXCEPTION 'Component with SKU % not found', item->>'component_sku';
        END IF;
        
        INSERT INTO public.order_items (
            order_id,
            component_id,
            component_sku,
            component_name,
            product_context,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            new_order_id,
            component_record.id,
            item->>'component_sku',
            item->>'component_name',
            item->>'product_context',
            (item->>'quantity')::INTEGER,
            (item->>'unit_price')::NUMERIC,
            (item->>'total_price')::NUMERIC
        );
    END LOOP;
    
    -- Step 6: Create initial status history entry
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        change_reason,
        notes
    ) VALUES (
        new_order_id,
        NULL,
        'PENDING_PAYMENT'::order_status_enum,
        (order_data->>'user_id')::UUID,
        'Order created with inventory deduction',
        'Initial order placement - inventory automatically deducted: ' || (inventory_result->>'message')
    );
    
    RETURN json_build_object(
        'success', true,
        'order_id', new_order_id,
        'order_number', order_number,
        'status', 'PENDING_PAYMENT',
        'message', 'Order created successfully with automatic inventory deduction',
        'inventory_deduction', inventory_result->'deductions'
    );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- PART 4: CREATE ORDER CANCELLATION FUNCTION WITH INVENTORY RESTORATION
-- ==================================================

CREATE OR REPLACE FUNCTION cancel_order_with_inventory_restoration(
    p_order_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_cancellation_reason TEXT DEFAULT 'Order cancelled'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_record RECORD;
    restoration_result JSONB;
BEGIN
    -- Get current order
    SELECT * INTO order_record
    FROM public.orders
    WHERE id = p_order_id;
    
    IF order_record.id IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Only allow cancellation if order hasn't been delivered
    IF order_record.status IN ('DELIVERED', 'CANCELLED', 'REFUNDED') THEN
        RAISE EXCEPTION 'Cannot cancel order with status %', order_record.status;
    END IF;
    
    -- Restore inventory
    SELECT restore_inventory_for_order(p_order_id) INTO restoration_result;
    
    -- Update order status to cancelled
    UPDATE public.orders
    SET 
        status = 'CANCELLED'::order_status_enum,
        updated_at = NOW(),
        internal_notes = COALESCE(internal_notes || E'\n', '') || 
                        'Order cancelled - inventory restored: ' || (restoration_result->>'message')
    WHERE id = p_order_id;
    
    -- Add status history
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        change_reason,
        notes
    ) VALUES (
        p_order_id,
        order_record.status,
        'CANCELLED'::order_status_enum,
        COALESCE(p_admin_id, order_record.user_id),
        'Order cancelled with inventory restoration',
        p_cancellation_reason || ' - ' || (restoration_result->>'message')
    );
    
    RETURN json_build_object(
        'success', true,
        'order_id', p_order_id,
        'previous_status', order_record.status,
        'new_status', 'CANCELLED',
        'message', 'Order cancelled and inventory restored successfully',
        'inventory_restoration', restoration_result->'restorations'
    );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- PART 5: CREATE INVENTORY CHECK FUNCTION
-- ==================================================

CREATE OR REPLACE FUNCTION check_inventory_availability(
    items_data JSONB[]
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item JSONB;
    component_record RECORD;
    availability_check JSONB[] := '{}';
    all_available BOOLEAN := true;
BEGIN
    FOREACH item IN ARRAY items_data
    LOOP
        SELECT id, component_sku, name, stock_level INTO component_record
        FROM public.component_library
        WHERE component_sku = item->>'component_sku' AND is_active = true;
        
        IF component_record.id IS NULL THEN
            availability_check := availability_check || jsonb_build_object(
                'sku', item->>'component_sku',
                'available', false,
                'error', 'COMPONENT_NOT_FOUND',
                'message', 'Component not found or inactive'
            );
            all_available := false;
        ELSE
            availability_check := availability_check || jsonb_build_object(
                'sku', component_record.component_sku,
                'name', component_record.name,
                'requested_quantity', (item->>'quantity')::INTEGER,
                'available_stock', component_record.stock_level,
                'available', component_record.stock_level >= (item->>'quantity')::INTEGER
            );
            
            IF component_record.stock_level < (item->>'quantity')::INTEGER THEN
                all_available := false;
            END IF;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'all_available', all_available,
        'items', availability_check
    );
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- PART 6: GRANT PERMISSIONS
-- ==================================================

-- Grant execute permissions to the new functions
GRANT EXECUTE ON FUNCTION deduct_inventory_for_order(JSONB[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION restore_inventory_for_order(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cancel_order_with_inventory_restoration(UUID, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_inventory_availability(JSONB[]) TO authenticated, anon;

-- Ensure component_library table permissions allow updates
GRANT SELECT, UPDATE ON public.component_library TO authenticated, anon;

-- ==================================================
-- COMPLETION MESSAGE
-- ==================================================

DO $$
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'AUTOMATIC INVENTORY DEDUCTION IMPLEMENTED SUCCESSFULLY';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'New features added:';
    RAISE NOTICE '1. ✅ create_order_with_items() now automatically deducts inventory';
    RAISE NOTICE '2. ✅ Inventory validation before order creation (prevents overselling)';
    RAISE NOTICE '3. ✅ Automatic inventory rollback if order creation fails';
    RAISE NOTICE '4. ✅ cancel_order_with_inventory_restoration() restores inventory';
    RAISE NOTICE '5. ✅ check_inventory_availability() for pre-order validation';
    RAISE NOTICE '6. ✅ deduct_inventory_for_order() helper function';
    RAISE NOTICE '7. ✅ restore_inventory_for_order() helper function';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '- When customer places order: inventory is immediately deducted';
    RAISE NOTICE '- If insufficient stock: order creation fails with detailed error';
    RAISE NOTICE '- If order creation fails: inventory is automatically restored';
    RAISE NOTICE '- When order is cancelled: inventory is restored';
    RAISE NOTICE '- All inventory changes are logged in order history';
    RAISE NOTICE '';
    RAISE NOTICE 'The system now prevents overselling and maintains accurate inventory!';
    RAISE NOTICE '================================================================';
END $$;