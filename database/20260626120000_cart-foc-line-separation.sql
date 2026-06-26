-- ============================================================================
-- Separate FOC free-gift cart lines from paid purchases of the same component
-- ----------------------------------------------------------------------------
-- The cart (user_cart) keyed rows on (user, guest, component_id) only, so a
-- component could exist as exactly ONE row. That made a free gift (RM0) and a
-- paid purchase of the same component collapse into one row: quantities summed
-- and unit_price was overwritten by the last write. On reload a gift came back
-- at its original price and lost its bundle grouping.
--
-- Fix: add an `is_foc` flag and key the cart on
--   (user, guest, component_id, product_context, is_foc)
-- so a component can appear once as a free gift (is_foc = true, RM0) and once as
-- a paid buy (is_foc = false), and gifts from different products no longer merge.
-- The cart RPCs are re-created to carry is_foc through add / remove / read.
-- ============================================================================

-- 1. Discriminator column ----------------------------------------------------
ALTER TABLE public.user_cart
  ADD COLUMN IF NOT EXISTS is_foc BOOLEAN NOT NULL DEFAULT false;

-- 2. Re-key the cart (new key is a superset of the old, so existing rows are
--    already unique under it — no data conflict). --------------------------
ALTER TABLE public.user_cart DROP CONSTRAINT IF EXISTS unique_user_cart_item;
ALTER TABLE public.user_cart
  ADD CONSTRAINT unique_user_cart_item
  UNIQUE NULLS NOT DISTINCT (user_id, guest_session, component_id, product_context, is_foc);

-- 3. add_item_to_cart: carry is_foc; match existing line by component +
--    product_context + is_foc; keep total_price in sync. ------------------
DROP FUNCTION IF EXISTS public.add_item_to_cart(uuid, text, text, text, integer, numeric, uuid, text);

CREATE OR REPLACE FUNCTION public.add_item_to_cart(
  p_component_id uuid,
  p_component_sku text,
  p_component_name text,
  p_product_context text,
  p_quantity integer,
  p_unit_price numeric,
  p_user_id uuid DEFAULT NULL::uuid,
  p_guest_session text DEFAULT NULL::text,
  p_is_foc boolean DEFAULT false
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
        product_context, quantity, unit_price, is_foc
    )
    VALUES (
        target_user_id, target_guest_session, p_component_id, p_component_sku, p_component_name,
        p_product_context, final_quantity, p_unit_price, p_is_foc
    )
    ON CONFLICT (user_id, guest_session, component_id, product_context, is_foc)
    DO UPDATE SET
        quantity = final_quantity,
        unit_price = EXCLUDED.unit_price,
        updated_at = NOW();

    RETURN json_build_object('success', true, 'quantity', final_quantity, 'message', 'Item added to cart');
END;
$function$;

-- 4. remove_item_from_cart: optionally target a specific line by
--    product_context + is_foc (NULL params = match any, old behaviour). ----
DROP FUNCTION IF EXISTS public.remove_item_from_cart(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.remove_item_from_cart(
  p_component_id uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_guest_session text DEFAULT NULL::text,
  p_product_context text DEFAULT NULL::text,
  p_is_foc boolean DEFAULT NULL::boolean
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());

    DELETE FROM public.user_cart
    WHERE (user_id = target_user_id OR guest_session = p_guest_session)
      AND component_id = p_component_id
      AND (p_product_context IS NULL OR product_context IS NOT DISTINCT FROM p_product_context)
      AND (p_is_foc IS NULL OR is_foc = p_is_foc);

    RETURN json_build_object('success', true, 'message', 'Item removed from cart');
END;
$function$;

-- 5. get_user_cart_items: expose is_foc so the client can render gifts as
--    free/bundled regardless of any later price edits. --------------------
DROP FUNCTION IF EXISTS public.get_user_cart_items(uuid, text);

CREATE OR REPLACE FUNCTION public.get_user_cart_items(
  p_user_id uuid DEFAULT NULL::uuid,
  p_guest_session text DEFAULT NULL::text
)
 RETURNS TABLE(id uuid, component_sku text, component_name text, product_context text, quantity integer, unit_price numeric, total_price numeric, is_foc boolean)
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
           uc.quantity, uc.unit_price, uc.total_price, uc.is_foc
    FROM public.user_cart uc
    WHERE (uc.user_id = target_user_id OR uc.guest_session = p_guest_session)
    ORDER BY uc.created_at DESC;
END;
$function$;
