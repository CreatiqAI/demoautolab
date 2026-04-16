-- Add per-product component remark field
-- This allows admins to annotate components differently per product
-- e.g., CB-701# under BMW → "H Spec", CB-701# under Mercedes → "X Spec"
ALTER TABLE product_components ADD COLUMN IF NOT EXISTS remark TEXT DEFAULT NULL;
