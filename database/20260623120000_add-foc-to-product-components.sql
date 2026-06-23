-- ============================================================================
-- FOC (free-of-charge) bundle support on product components
-- ----------------------------------------------------------------------------
-- Lets an admin mark a component on a product as a free gift (FOC). The gift is
-- given at RM0 only when the product's designated "main item" (trigger) is also
-- in the order; otherwise it stays a normal paid add-on.
-- e.g. Honda City ALK262 casing (main item) -> US.V4 speaker + harness (FOC).
-- ============================================================================

ALTER TABLE product_components
  ADD COLUMN IF NOT EXISTS is_foc          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS foc_quantity    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_foc_trigger  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN product_components.is_foc IS 'Given free (RM0) when a trigger/main component is also in the order.';
COMMENT ON COLUMN product_components.foc_quantity IS 'Fixed number of free units granted per order (default 1).';
COMMENT ON COLUMN product_components.is_foc_trigger IS 'The main item; buying it unlocks the FOC gifts in this product.';
