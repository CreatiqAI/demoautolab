-- ============================================================================
-- Track which cart line is the FOC "trigger" (the main item that unlocks gifts)
-- ----------------------------------------------------------------------------
-- A product can offer the same component both as a paid add-on AND as a free
-- gift (e.g. casing page lists AL-19/V260 with an "ADD" price and "FREE when you
-- add the casing"). Buying the paid copy gives it the casing's product_context,
-- so the cart could not tell it apart from the casing (the real trigger) and
-- wrongly folded it into the bundle's main items, scaling the gifts off the
-- combined quantity.
--
-- Fix: persist is_foc_trigger on the cart line. Only trigger lines are the
-- bundle's mains (gifts scale with them); every other paid line stands alone.
-- Not part of the unique key (a line's trigger-ness is fixed by the product).
-- ============================================================================

ALTER TABLE public.user_cart
  ADD COLUMN IF NOT EXISTS is_foc_trigger BOOLEAN NOT NULL DEFAULT false;

-- add_item_to_cart: carry is_foc_trigger through (keep it in sync on re-add).
DROP FUNCTION IF EXISTS public.add_item_to_cart(uuid, text, text, text, integer, numeric, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.add_item_to_cart(
  p_component_id uuid,
  p_component_sku text,
  p_component_name text,
  p_product_context text,
  p_quantity integer,
  p_unit_price numeric,
  p_user_id uuid DEFAULT NULL::uuid,
  p_guest_session text DEFAULT NULL::text,
  p_is_foc boolean DEFAULT false,
  p_is_foc_trigger boolean DEFAULT false
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
    target_guest_session TEXT;
    existing_quantity INTEGER := 0;
    final_quantity INTEGER;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());
    target_guest_session := p_guest_session;

    SELECT quantity INTO existing_quantity
    FROM public.user_cart
    WHERE (user_id = target_user_id OR guest_session = target_guest_session)
      AND component_id = p_component_id
      AND product_context IS NOT DISTINCT FROM p_product_context
      AND is_foc = p_is_foc;

    final_quantity := COALESCE(existing_quantity, 0) + p_quantity;

    -- NOTE: total_price is a GENERATED column (quantity * unit_price); never write it.
    INSERT INTO public.user_cart (
        user_id, guest_session, component_id, component_sku, component_name,
        product_context, quantity, unit_price, is_foc, is_foc_trigger
    )
    VALUES (
        target_user_id, target_guest_session, p_component_id, p_component_sku, p_component_name,
        p_product_context, final_quantity, p_unit_price, p_is_foc, p_is_foc_trigger
    )
    ON CONFLICT (user_id, guest_session, component_id, product_context, is_foc)
    DO UPDATE SET
        quantity = final_quantity,
        unit_price = EXCLUDED.unit_price,
        is_foc_trigger = EXCLUDED.is_foc_trigger,
        updated_at = NOW();

    RETURN json_build_object('success', true, 'quantity', final_quantity, 'message', 'Item added to cart');
END;
$function$;

-- get_user_cart_items: expose is_foc_trigger so the client can pick the mains.
DROP FUNCTION IF EXISTS public.get_user_cart_items(uuid, text);

CREATE OR REPLACE FUNCTION public.get_user_cart_items(
  p_user_id uuid DEFAULT NULL::uuid,
  p_guest_session text DEFAULT NULL::text
)
 RETURNS TABLE(id uuid, component_sku text, component_name text, product_context text, quantity integer, unit_price numeric, total_price numeric, is_foc boolean, is_foc_trigger boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());

    RETURN QUERY
    SELECT uc.id, uc.component_sku, uc.component_name, uc.product_context,
           uc.quantity, uc.unit_price, uc.total_price, uc.is_foc, uc.is_foc_trigger
    FROM public.user_cart uc
    WHERE (uc.user_id = target_user_id OR uc.guest_session = p_guest_session)
    ORDER BY uc.created_at DESC;
END;
$function$;
