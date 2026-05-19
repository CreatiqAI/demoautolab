-- 20260519200000_products-deleted-at.sql
-- Decouple soft-delete from the `active` flag on products_new.
--
-- Before this migration the Delete button set `active = false`, and the
-- Recently Deleted tab queried `active = false`. The Active tab had no filter
-- on `active`, so deleted products kept showing up on refresh. We also lost
-- the ability to mark a product "not available for purchase" without making
-- it look deleted.
--
-- After this migration:
--   * `deleted_at IS NULL`     → product is live and editable
--   * `deleted_at IS NOT NULL` → product is in the Recently Deleted bucket
--   * `active`                 → admin-controlled "available for purchase" toggle
--                                (orthogonal to deletion)
--
-- Backfill: every product currently with active = false is treated as
-- soft-deleted (deleted_at = updated_at). That matches what the Recently
-- Deleted tab was already showing, so the user's mental model is preserved.

ALTER TABLE products_new
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE products_new
   SET deleted_at = COALESCE(updated_at, NOW())
 WHERE active = false
   AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_new_deleted_at
  ON products_new (deleted_at)
  WHERE deleted_at IS NOT NULL;
