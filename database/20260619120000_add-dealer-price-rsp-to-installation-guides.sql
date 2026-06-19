-- ============================================================================
-- ADD DEALER PRICE + RSP TO PRODUCT INSTALLATION GUIDES
-- Adds two pricing reference columns shown to merchants alongside the
-- existing Installation Price on the product installation guide.
-- ============================================================================

ALTER TABLE product_installation_guides
  ADD COLUMN IF NOT EXISTS dealer_price DECIMAL(10,2),   -- Dealer/wholesale price in RM
  ADD COLUMN IF NOT EXISTS rsp DECIMAL(10,2);            -- Recommended selling price in RM

COMMENT ON COLUMN product_installation_guides.dealer_price IS 'Dealer/wholesale price in RM';
COMMENT ON COLUMN product_installation_guides.rsp IS 'Recommended selling price (RSP) in RM';
